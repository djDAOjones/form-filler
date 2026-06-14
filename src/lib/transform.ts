/**
 * Transforming a source mask and testing it against the target / occupancy.
 *
 * A placement is valid only if EVERY visible source pixel lands on an
 * inside-target pixel (full containment, no clipping) and NONE collide with
 * the occupancy mask (no overlap). These tests are the product — never relax
 * them to fit more pieces (see AGENTS.md).
 */
import type { Mask } from './types';

/**
 * A source mask after scale + rotation, reduced to the coordinates of its
 * visible pixels relative to the transformed bounding box's top-left.
 *
 * `xs`/`ys` are shared scratch buffers (see `rasterizeTransformed`): they may
 * be LONGER than `count` and are only valid until the next call. Always
 * iterate exactly `count` entries, never `xs.length`.
 */
export interface TransformedMask {
  width: number;
  height: number;
  /** Visible-pixel X offsets. Read indices [0, count); may be oversized. */
  xs: Int32Array;
  /** Visible-pixel Y offsets. Read indices [0, count); may be oversized. */
  ys: Int32Array;
  count: number;
}

/**
 * Module-level scratch buffers for the visible-pixel coordinates produced by
 * `rasterizeTransformed`. Reused across calls so the placement hot loop stays
 * allocation-free; grown on demand to the largest bounding box seen.
 */
let scratchX = new Int32Array(0);
let scratchY = new Int32Array(0);

function ensureScratch(capacity: number): void {
  if (scratchX.length < capacity) {
    scratchX = new Int32Array(capacity);
    scratchY = new Int32Array(capacity);
  }
}

/**
 * Rasterise a source mask scaled by `scale` and rotated by `angle` (radians).
 * Samples by inverse-mapping each output pixel back into the source mask
 * (nearest-neighbour), so the result follows the true silhouette.
 *
 * PERFORMANCE CONTRACT: the returned `xs`/`ys` are shared module scratch
 * buffers — valid only until the next `rasterizeTransformed` call, and possibly
 * longer than `count`. Fully consume the result (e.g. via `canPlace` /
 * `stampOccupancy`, which read exactly `count`) before calling again. This is
 * what keeps the per-attempt placement loop free of allocation.
 */
export function rasterizeTransformed(
  mask: Mask,
  scale: number,
  angle: number,
): TransformedMask {
  const sw = mask.width;
  const sh = mask.height;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const scaledW = sw * scale;
  const scaledH = sh * scale;
  // Subtract a tiny epsilon before ceil so floating-point noise (e.g. a 90°
  // rotation yielding 1.0000000000000002) does not inflate the bbox by a pixel.
  const EPS = 1e-9;
  const width = Math.max(1, Math.ceil(Math.abs(scaledW * cos) + Math.abs(scaledH * sin) - EPS));
  const height = Math.max(1, Math.ceil(Math.abs(scaledW * sin) + Math.abs(scaledH * cos) - EPS));

  const halfW = width / 2;
  const halfH = height / 2;
  const halfSw = sw / 2;
  const halfSh = sh / 2;
  const invScale = 1 / scale;

  // Fill shared scratch in a single pass (no per-call allocation). Capacity is
  // bounded by the bounding-box area: at most every output pixel is visible.
  ensureScratch(width * height);
  const xs = scratchX;
  const ys = scratchY;
  let count = 0;

  for (let oy = 0; oy < height; oy++) {
    const ry = oy + 0.5 - halfH;
    for (let ox = 0; ox < width; ox++) {
      const rx = ox + 0.5 - halfW;
      // Inverse rotation (by -angle), then inverse scale, back to source space.
      const ix = rx * cos + ry * sin;
      const iy = -rx * sin + ry * cos;
      const u = ix * invScale + halfSw;
      const v = iy * invScale + halfSh;
      const su = Math.floor(u);
      const sv = Math.floor(v);
      if (su >= 0 && sv >= 0 && su < sw && sv < sh && mask.data[sv * sw + su]) {
        xs[count] = ox;
        ys[count] = oy;
        count++;
      }
    }
  }

  return { width, height, xs, ys, count };
}

/**
 * Can the transformed mask be placed with its bounding-box top-left at
 * (ox, oy) in placement space? True only if fully contained in `target` and
 * not colliding with `occupancy`. Single pass, fails fast.
 */
export function canPlace(
  t: TransformedMask,
  ox: number,
  oy: number,
  target: Mask,
  occupancy: Mask,
): boolean {
  const tw = target.width;
  const th = target.height;
  const tData = target.data;
  const oData = occupancy.data;
  const { xs, ys, count } = t;

  for (let k = 0; k < count; k++) {
    const tx = ox + xs[k];
    const ty = oy + ys[k];
    if (tx < 0 || ty < 0 || tx >= tw || ty >= th) return false; // clipped
    const idx = ty * tw + tx;
    if (tData[idx] === 0) return false; // outside target
    if (oData[idx] === 1) return false; // overlaps an existing silhouette
  }
  return true;
}

/**
 * Stamp a committed placement into the occupancy mask, dilated by the disk
 * offsets so subsequent placements keep the configured spacing clear.
 */
export function stampOccupancy(
  occupancy: Mask,
  t: TransformedMask,
  ox: number,
  oy: number,
  disk: Int32Array,
): void {
  const w = occupancy.width;
  const h = occupancy.height;
  const data = occupancy.data;
  const { xs, ys, count } = t;

  for (let k = 0; k < count; k++) {
    const px = ox + xs[k];
    const py = oy + ys[k];
    for (let d = 0; d < disk.length; d += 2) {
      const x = px + disk[d];
      const y = py + disk[d + 1];
      if (x >= 0 && y >= 0 && x < w && y < h) data[y * w + x] = 1;
    }
  }
}
