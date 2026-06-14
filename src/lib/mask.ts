/**
 * Binary mask construction and morphology.
 *
 * A Mask is a flat Uint8Array where 1 means inside/visible and 0 means
 * outside/transparent. All containment, collision, and trimming work on the
 * real visible silhouette — never the rectangular image box (see AGENTS.md).
 */
import type { Mask, MaskMode, NormRect } from './types';

/** Allocate a zeroed mask. */
export function createMask(width: number, height: number): Mask {
  return { width, height, data: new Uint8Array(width * height) };
}

/** Count inside/visible pixels. */
export function countVisible(mask: Mask): number {
  let n = 0;
  const { data } = mask;
  for (let i = 0; i < data.length; i++) n += data[i];
  return n;
}

/** Perceived luminance (0..255) of an sRGB pixel. */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Does this image carry meaningful transparency? */
function hasMeaningfulAlpha(img: ImageData): boolean {
  const { data } = img;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
}

/**
 * Build the target "inside" mask from an uploaded image.
 *
 * Detection: in `auto` mode, alpha drives it if the image has transparency,
 * otherwise dark pixels are treated as inside. `invert` flips the result.
 */
export function buildTargetMask(
  img: ImageData,
  mode: MaskMode,
  invert: boolean,
): Mask {
  const { width, height, data } = img;
  const mask = createMask(width, height);
  const out = mask.data;

  let effective: Exclude<MaskMode, 'auto'>;
  if (mode === 'auto') {
    effective = hasMeaningfulAlpha(img) ? 'alpha' : 'dark';
  } else {
    effective = mode;
  }

  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3];
    let inside: boolean;
    if (effective === 'alpha') {
      inside = a > 128;
    } else {
      // Treat fully transparent pixels as outside regardless of colour.
      if (a < 16) {
        inside = false;
      } else {
        const lum = luminance(data[i], data[i + 1], data[i + 2]);
        inside = effective === 'dark' ? lum < 128 : lum >= 128;
      }
    }
    out[p] = (inside ? 1 : 0) ^ (invert ? 1 : 0) ? 1 : 0;
  }
  return mask;
}

/**
 * Build a source silhouette mask. Transparent pixels are ignored; if the
 * image is fully opaque, near-white pixels are treated as background.
 */
export function buildSourceMask(img: ImageData): Mask {
  const { width, height, data } = img;
  const mask = createMask(width, height);
  const out = mask.data;
  const alpha = hasMeaningfulAlpha(img);

  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    if (alpha) {
      out[p] = data[i + 3] > 16 ? 1 : 0;
    } else {
      const lum = luminance(data[i], data[i + 1], data[i + 2]);
      out[p] = lum < 240 ? 1 : 0;
    }
  }
  return mask;
}

/** Visible bounding box of a mask, or null if empty. */
export function visibleBounds(
  mask: Mask,
): { x: number; y: number; w: number; h: number } | null {
  const { width, height, data } = mask;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Trim a mask to its visible bounds. Returns the cropped mask plus the
 * visible bounds normalised against the original — used to crop the
 * full-resolution source image at render time.
 */
export function trimMask(mask: Mask): { mask: Mask; trim: NormRect } {
  const bounds = visibleBounds(mask);
  if (!bounds) {
    return { mask: createMask(1, 1), trim: { x: 0, y: 0, w: 1, h: 1 } };
  }
  const { x, y, w, h } = bounds;
  const cropped = createMask(w, h);
  for (let row = 0; row < h; row++) {
    const srcStart = (y + row) * mask.width + x;
    cropped.data.set(mask.data.subarray(srcStart, srcStart + w), row * w);
  }
  return {
    mask: cropped,
    trim: {
      x: x / mask.width,
      y: y / mask.height,
      w: w / mask.width,
      h: h / mask.height,
    },
  };
}

/**
 * Chamfer distance transform: for every inside pixel, the approximate
 * distance to the nearest outside pixel (the image border counts as outside).
 */
function insideDistanceTransform(mask: Mask): Float32Array {
  const { width, height, data } = mask;
  const dist = new Float32Array(width * height);
  const BIG = 1e9;
  const D1 = 1;
  const D2 = Math.SQRT2;

  for (let i = 0; i < data.length; i++) dist[i] = data[i] ? BIG : 0;

  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : dist[y * width + x];

  // Forward pass.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (dist[i] === 0) continue;
      let d = dist[i];
      d = Math.min(d, at(x - 1, y) + D1, at(x, y - 1) + D1);
      d = Math.min(d, at(x - 1, y - 1) + D2, at(x + 1, y - 1) + D2);
      dist[i] = d;
    }
  }
  // Backward pass.
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (dist[i] === 0) continue;
      let d = dist[i];
      d = Math.min(d, at(x + 1, y) + D1, at(x, y + 1) + D1);
      d = Math.min(d, at(x + 1, y + 1) + D2, at(x - 1, y + 1) + D2);
      dist[i] = d;
    }
  }
  return dist;
}

/**
 * Erode the inside region inward by `radius` pixels (used for edge padding).
 * Pixels within `radius` of the boundary become outside.
 */
export function erodeMask(mask: Mask, radius: number): Mask {
  if (radius <= 0) {
    return { width: mask.width, height: mask.height, data: mask.data.slice() };
  }
  const dist = insideDistanceTransform(mask);
  const out = createMask(mask.width, mask.height);
  for (let i = 0; i < dist.length; i++) out.data[i] = dist[i] > radius ? 1 : 0;
  return out;
}

/**
 * Precompute the integer offsets of a filled disk of the given radius. Used
 * to stamp committed silhouettes into the occupancy mask so that later
 * placements keep at least `spacing` clear of existing ones.
 */
export function diskOffsets(radius: number): Int32Array {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return Int32Array.of(0, 0);
  const pairs: number[] = [];
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r2) pairs.push(dx, dy);
    }
  }
  return Int32Array.from(pairs);
}
