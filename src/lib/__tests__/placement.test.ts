/**
 * Determinism + correctness safety net for the placement algorithm.
 *
 * Written before the performance pass's allocation fix so it pins the
 * invariants the optimisation must preserve:
 *  - within-session determinism: a seed + settings reproduces a layout;
 *  - the product's core invariant: every placement is fully inside the target
 *    and never overlaps another (alpha-aware);
 *  - output preservation: the exact layout is unchanged across the refactor
 *    (the snapshot).
 */
import { describe, it, expect } from 'vitest';
import { createMask, countVisible, diskOffsets } from '../mask';
import { canPlace, rasterizeTransformed, stampOccupancy } from '../transform';
import { generate } from '../placement';
import { DEFAULT_SETTINGS } from '../types';
import type { Mask, Placement, Settings, SourceItem } from '../types';

let sourceCounter = 0;

/** A solid rectangular mask (every pixel inside/visible). */
function solidMask(w: number, h: number): Mask {
  const m = createMask(w, h);
  m.data.fill(1);
  return m;
}

/**
 * Build a SourceItem from a mask for tests. Placement only reads `mask`,
 * `area`, and `longSide`; the render-only fields (`image`, `url`, `trim`) are
 * stubbed so these tests run in a DOM-free (node) environment.
 */
function makeSource(mask: Mask): SourceItem {
  return {
    id: `src-${sourceCounter++}`,
    name: 'test-source',
    url: '',
    image: null as unknown as HTMLImageElement,
    mask,
    area: countVisible(mask),
    longSide: Math.max(mask.width, mask.height),
    trim: { x: 0, y: 0, w: 1, h: 1 },
  };
}

const target = solidMask(60, 60);
const sources = [makeSource(solidMask(12, 12)), makeSource(solidMask(14, 10))];

const reuseSettings: Settings = {
  ...DEFAULT_SETTINGS,
  seed: 7,
  density: 0.3,
  minSize: 0.15,
  maxSize: 0.25,
  spacing: 2,
  edgePadding: 2,
  angleVariation: 'pm30',
  maxAttempts: 600,
  allowReuse: true,
};

const onceSettings: Settings = { ...reuseSettings, allowReuse: false };

function run(settings: Settings) {
  return generate({ target, placementScale: 1, sources, settings });
}

/** Serialise placements to a stable string list for snapshotting. */
function serialise(placements: Placement[]): string[] {
  return placements.map(
    (p) =>
      `${p.sourceIndex} @ ${p.cx.toFixed(2)},${p.cy.toFixed(2)} ` +
      `scale=${p.scale.toFixed(4)} angle=${p.angle.toFixed(4)}`,
  );
}

describe('generate — determinism', () => {
  it('reuse mode reproduces an identical layout for a fixed seed', async () => {
    const a = await run(reuseSettings);
    const b = await run(reuseSettings);
    expect(a.placements).toEqual(b.placements);
    expect(a.placements.length).toBeGreaterThan(0);
  });

  it('use-each-once mode reproduces an identical layout for a fixed seed', async () => {
    const a = await run(onceSettings);
    const b = await run(onceSettings);
    expect(a.placements).toEqual(b.placements);
  });
});

describe('generate — placement correctness invariant', () => {
  it('every placement is fully inside the target and never overlaps another', async () => {
    const { placements } = await run(reuseSettings);
    expect(placements.length).toBeGreaterThan(0);

    // Re-accumulate the layout with a raw (un-dilated) occupancy: each piece
    // must land inside the target and clear of every already-validated piece.
    const occ = createMask(target.width, target.height);
    for (const p of placements) {
      const t = rasterizeTransformed(sources[p.sourceIndex].mask, p.scale, p.angle);
      const ox = Math.round(p.cx - t.width / 2);
      const oy = Math.round(p.cy - t.height / 2);
      expect(canPlace(t, ox, oy, target, occ)).toBe(true);
      stampOccupancy(occ, t, ox, oy, diskOffsets(0));
    }
  });
});

describe('generate — output preserved across the perf refactor', () => {
  it('reuse-mode layout matches the recorded snapshot', async () => {
    const { placements } = await run(reuseSettings);
    expect(serialise(placements)).toMatchSnapshot();
  });
});
