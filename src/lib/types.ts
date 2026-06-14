/**
 * Shared types and tuneable defaults for the placement engine.
 *
 * The canonical mental model is raster masks: the target and every source
 * are binary pixel masks (see AGENTS.md → Core data model).
 */

/** A binary raster mask. `data[y * width + x]` is 1 (inside/visible) or 0. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Normalised rectangle (each component in [0, 1]) relative to an image. */
export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A loaded source silhouette ready for placement and rendering. */
export interface SourceItem {
  id: string;
  name: string;
  /** Object URL for the thumbnail / preview. */
  url: string;
  /** Full-resolution original image, composited at render time. */
  image: HTMLImageElement;
  /** Trimmed alpha mask at capped resolution — used for placement geometry. */
  mask: Mask;
  /** Count of visible pixels in the trimmed mask. */
  area: number;
  /** Longest side of the trimmed mask, in capped pixels. */
  longSide: number;
  /** Visible bounds within the source image, normalised — used to crop the original. */
  trim: NormRect;
}

/** How target-mask "inside" is detected from the uploaded image. */
export type MaskMode = 'auto' | 'alpha' | 'dark' | 'light';

/** Allowed rotation variation when placing sources. */
export type AngleVariation = 'none' | 'pm10' | 'pm30' | 'pm90' | 'random360';

/** Everything the user can tune. Generation is deterministic given these + sources. */
export interface Settings {
  /** Target inside-region detection. */
  maskMode: MaskMode;
  /** Invert the detected inside region. */
  invertMask: boolean;
  /** Desired fill density, 0..1 (fraction of target area to cover). */
  density: number;
  /** Min/max silhouette size as a fraction of the target's longest side, 0..1. */
  minSize: number;
  maxSize: number;
  /** Spacing between silhouettes, in target pixels. */
  spacing: number;
  /** Padding from the target edge, in target pixels. */
  edgePadding: number;
  /** Rotation variation preset. */
  angleVariation: AngleVariation;
  /** Size jitter around the base size, 0..1 (used in use-each-once mode). */
  sizeVariation: number;
  /** Deterministic seed. */
  seed: number;
  /** Maximum placement attempts (reuse mode) / per-source attempts budget. */
  maxAttempts: number;
  /** If true, sources may be reused freely. If false, each source is placed at most once. */
  allowReuse: boolean;
}

/** One committed silhouette. Coordinates are in placement-mask space. */
export interface Placement {
  sourceIndex: number;
  /** Centre of the source's trimmed bbox, in placement-mask pixels. */
  cx: number;
  cy: number;
  /** Linear scale from the (capped, trimmed) source mask to placement space. */
  scale: number;
  /** Rotation in radians. */
  angle: number;
}

export type ReportLevel = 'success' | 'warning' | 'error';

/** Outcome summary shown to the user after generation. */
export interface PlacementReport {
  level: ReportLevel;
  headline: string;
  detail: string;
  placed: number;
  /** Total candidates considered "to place" (sources, in use-each-once mode). */
  total: number;
  attempts: number;
  /** Approximate fraction of the target area covered, 0..1. */
  coverage: number;
}

export interface GenerateResult {
  placements: Placement[];
  report: PlacementReport;
}

/** Largest internal placement-mask dimension (px). Keeps the search fast. */
export const PLACEMENT_MAX_DIM = 700;

/** Largest source-mask dimension (px) for placement geometry. Render uses the original. */
export const SOURCE_MAX_DIM = 360;

/** Default export canvas longest side (px) when the target is small. */
export const MIN_EXPORT_DIM = 1200;

export const DEFAULT_SETTINGS: Settings = {
  maskMode: 'auto',
  invertMask: false,
  density: 0.6,
  minSize: 0.08,
  maxSize: 0.22,
  spacing: 4,
  edgePadding: 6,
  angleVariation: 'pm30',
  sizeVariation: 0.25,
  seed: 1,
  maxAttempts: 6000,
  allowReuse: true,
};
