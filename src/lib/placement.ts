/**
 * The placement algorithm.
 *
 * Arranges source silhouettes inside the target mask so that every placed
 * silhouette is complete (never clipped), never overlaps another, never
 * extends outside the target, and the result does not look tiled. It is a
 * randomised, seed-driven search — not a grid/tiling fill.
 *
 * Two modes:
 *  - reuse: sample sources at random and fill toward a density target.
 *  - use-each-once: place every source at most once, deriving an automatic
 *    base scale from the area budget and shrinking globally if not all fit.
 *
 * Runs chunked (yielding to the event loop between batches) so the UI never
 * freezes, and is deterministic for a given seed + settings.
 */
import { Rng } from './rng';
import { countVisible, createMask, diskOffsets, erodeMask } from './mask';
import { canPlace, rasterizeTransformed, stampOccupancy } from './transform';
import type {
  AngleVariation,
  GenerateResult,
  Mask,
  Placement,
  PlacementReport,
  Settings,
  SourceItem,
} from './types';

export interface GenerateParams {
  /** Full target inside mask at placement resolution. */
  target: Mask;
  /** Conversion from target natural pixels to placement pixels. */
  placementScale: number;
  sources: SourceItem[];
  settings: Settings;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

const DEG = Math.PI / 180;

/** Sample a rotation (radians) according to the variation preset. */
function sampleAngle(rng: Rng, mode: AngleVariation): number {
  switch (mode) {
    case 'none':
      return 0;
    case 'pm10':
      return rng.range(-10, 10) * DEG;
    case 'pm30':
      return rng.range(-30, 30) * DEG;
    case 'pm90':
      return rng.range(-90, 90) * DEG;
    case 'random360':
      return rng.range(0, 360) * DEG;
    default:
      return 0;
  }
}

/** Yield control so the browser can paint / stay responsive. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Flat list of inside-pixel centres to sample candidate positions from. */
function collectInsidePixels(mask: Mask): { xs: Int32Array; ys: Int32Array } {
  const { width, height, data } = mask;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x]) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  return { xs: Int32Array.from(xs), ys: Int32Array.from(ys) };
}

export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const { target, placementScale, sources, settings, onProgress, signal } = params;

  const emptyResult = (report: PlacementReport): GenerateResult => ({
    placements: [],
    report,
  });

  if (sources.length === 0) {
    return emptyResult({
      level: 'error',
      headline: 'No source images',
      detail: 'Upload at least one source silhouette to fill the shape.',
      placed: 0,
      total: 0,
      attempts: 0,
      coverage: 0,
    });
  }

  const targetLong = Math.max(target.width, target.height);
  const fullInsideArea = countVisible(target);

  const edgePx = settings.edgePadding * placementScale;
  const spacingPx = settings.spacing * placementScale;
  const allowed = erodeMask(target, edgePx);
  const inside = collectInsidePixels(allowed);
  const insideCount = inside.xs.length;

  if (insideCount === 0 || fullInsideArea === 0) {
    return emptyResult({
      level: 'error',
      headline: 'No room to place',
      detail:
        'The target region is empty after edge padding. Reduce edge padding or check the mask (try Invert).',
      placed: 0,
      total: settings.allowReuse ? 0 : sources.length,
      attempts: 0,
      coverage: 0,
    });
  }

  const disk = diskOffsets(spacingPx);
  const occupancy = createMask(target.width, target.height);
  const rng = new Rng(settings.seed);

  if (settings.allowReuse) {
    return runReuseMode({
      target: allowed,
      occupancy,
      sources,
      settings,
      rng,
      disk,
      inside,
      insideCount,
      targetLong,
      fullInsideArea,
      onProgress,
      signal,
    });
  }
  return runOnceMode({
    target: allowed,
    occupancy,
    sources,
    settings,
    rng,
    disk,
    inside,
    insideCount,
    targetLong,
    fullInsideArea,
    onProgress,
    signal,
  });
}

interface ModeContext {
  target: Mask;
  occupancy: Mask;
  sources: SourceItem[];
  settings: Settings;
  rng: Rng;
  disk: Int32Array;
  inside: { xs: Int32Array; ys: Int32Array };
  insideCount: number;
  targetLong: number;
  fullInsideArea: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Reuse mode: random sources, fill toward the density target. */
async function runReuseMode(ctx: ModeContext): Promise<GenerateResult> {
  const {
    target,
    occupancy,
    sources,
    settings,
    rng,
    disk,
    inside,
    insideCount,
    targetLong,
    fullInsideArea,
    onProgress,
    signal,
  } = ctx;

  const coverageTarget = settings.density * fullInsideArea;
  const placements: Placement[] = [];
  let covered = 0;
  let attempts = 0;
  const maxAttempts = settings.maxAttempts;
  const BATCH = 300;

  while (attempts < maxAttempts && covered < coverageTarget) {
    for (let b = 0; b < BATCH && attempts < maxAttempts && covered < coverageTarget; b++) {
      attempts++;
      const sourceIndex = rng.int(0, sources.length - 1);
      const src = sources[sourceIndex];
      const f = rng.range(settings.minSize, settings.maxSize);
      const scale = (f * targetLong) / src.longSide;
      if (!(scale > 0)) continue;
      const angle = sampleAngle(rng, settings.angleVariation);
      const t = rasterizeTransformed(src.mask, scale, angle);
      if (t.count === 0) continue;
      const c = rng.int(0, insideCount - 1);
      const ox = Math.round(inside.xs[c] - t.width / 2);
      const oy = Math.round(inside.ys[c] - t.height / 2);
      if (canPlace(t, ox, oy, target, occupancy)) {
        stampOccupancy(occupancy, t, ox, oy, disk);
        placements.push({
          sourceIndex,
          cx: ox + t.width / 2,
          cy: oy + t.height / 2,
          scale,
          angle,
        });
        covered += t.count;
      }
    }
    onProgress?.(Math.min(1, Math.max(attempts / maxAttempts, covered / coverageTarget)));
    if (signal?.aborted) break;
    await yieldToEventLoop();
  }

  const coverage = covered / fullInsideArea;
  const reachedDensity = covered >= coverageTarget;
  const report: PlacementReport = {
    level: placements.length === 0 ? 'warning' : 'success',
    headline:
      placements.length === 0
        ? 'Nothing could be placed'
        : `Placed ${placements.length} silhouettes`,
    detail:
      placements.length === 0
        ? 'Try smaller sizes, less spacing, or more rotation.'
        : reachedDensity
          ? `Reached the density target — about ${Math.round(coverage * 100)}% of the target is filled.`
          : `About ${Math.round(coverage * 100)}% filled after ${attempts} attempts. Increase max attempts or reduce size/spacing to fill more.`,
    placed: placements.length,
    total: placements.length,
    attempts,
    coverage,
  };
  return { placements, report };
}

/** Use-each-once mode: place every source once, shrinking globally if needed. */
async function runOnceMode(ctx: ModeContext): Promise<GenerateResult> {
  const {
    target,
    occupancy,
    sources,
    settings,
    rng,
    disk,
    inside,
    insideCount,
    targetLong,
    fullInsideArea,
    onProgress,
    signal,
  } = ctx;

  // Place larger / awkward silhouettes first.
  const order = sources
    .map((_, i) => i)
    .sort((a, b) => sources[b].area - sources[a].area);

  const sumArea = sources.reduce((sum, s) => sum + s.area, 0);
  // Automatic base scale from the area budget:
  // covered ≈ Σ(area_i · scale²) = density · targetArea  ⇒  scale = √(density·targetArea / Σarea)
  let globalScale = Math.sqrt((settings.density * fullInsideArea) / Math.max(1, sumArea));

  const perSourceAttempts = Math.min(
    400,
    Math.max(60, Math.floor(settings.maxAttempts / sources.length)),
  );
  const MAX_SHRINK = 6;

  let best: { placements: Placement[]; placed: number; covered: number } = {
    placements: [],
    placed: -1,
    covered: 0,
  };
  let totalAttempts = 0;

  for (let retry = 0; retry <= MAX_SHRINK; retry++) {
    occupancy.data.fill(0);
    const placements: Placement[] = [];
    let placed = 0;
    let covered = 0;

    for (let oi = 0; oi < order.length; oi++) {
      const sourceIndex = order[oi];
      const src = sources[sourceIndex];
      let didPlace = false;

      for (let attempt = 0; attempt < perSourceAttempts; attempt++) {
        totalAttempts++;
        let scale = globalScale * (1 + rng.range(-settings.sizeVariation, settings.sizeVariation));
        // Guard: never exceed the user's maximum size.
        const f = (scale * src.longSide) / targetLong;
        if (f > settings.maxSize) scale = (settings.maxSize * targetLong) / src.longSide;
        if (!(scale > 0)) continue;
        const angle = sampleAngle(rng, settings.angleVariation);
        const t = rasterizeTransformed(src.mask, scale, angle);
        if (t.count === 0) continue;
        const c = rng.int(0, insideCount - 1);
        const ox = Math.round(inside.xs[c] - t.width / 2);
        const oy = Math.round(inside.ys[c] - t.height / 2);
        if (canPlace(t, ox, oy, target, occupancy)) {
          stampOccupancy(occupancy, t, ox, oy, disk);
          placements.push({
            sourceIndex,
            cx: ox + t.width / 2,
            cy: oy + t.height / 2,
            scale,
            angle,
          });
          covered += t.count;
          didPlace = true;
          break;
        }
      }
      if (didPlace) placed++;

      if ((oi & 7) === 0) {
        const retryProgress = retry / (MAX_SHRINK + 1);
        const sourceProgress = (oi + 1) / order.length / (MAX_SHRINK + 1);
        onProgress?.(Math.min(0.99, retryProgress + sourceProgress));
        if (signal?.aborted) break;
        await yieldToEventLoop();
      }
    }

    if (placed > best.placed) best = { placements, placed, covered };
    if (placed === sources.length || signal?.aborted) break;
    globalScale *= 0.88; // shrink and try again
  }

  onProgress?.(1);
  const coverage = best.covered / fullInsideArea;
  const allPlaced = best.placed === sources.length;
  const report: PlacementReport = {
    level: allPlaced ? 'success' : 'warning',
    headline: `Placed ${best.placed} of ${sources.length} source images`,
    detail: allPlaced
      ? `Every source placed once — about ${Math.round(coverage * 100)}% of the target is filled.`
      : 'Not all sources fit. Try reducing spacing, reducing size, lowering density, or allowing more rotation.',
    placed: best.placed,
    total: sources.length,
    attempts: totalAttempts,
    coverage,
  };
  return { placements: best.placements, report };
}
