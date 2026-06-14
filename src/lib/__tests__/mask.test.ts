import { describe, it, expect } from 'vitest';
import {
  buildSourceMask,
  buildTargetMask,
  countVisible,
  createMask,
  erodeMask,
  trimMask,
  visibleBounds,
} from '../mask';
import type { Mask } from '../types';

/** Build a fake ImageData-like object (our mask code only reads data/w/h). */
function fakeImage(width: number, height: number, rgba: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgba(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { data, width, height } as unknown as ImageData;
}

/** Solid mask with a centred filled rectangle. */
function rectMask(w: number, h: number, rx: number, ry: number, rw: number, rh: number): Mask {
  const m = createMask(w, h);
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) m.data[y * w + x] = 1;
  }
  return m;
}

describe('trimMask', () => {
  it('crops to the visible bounds and reports normalised trim', () => {
    const mask = rectMask(4, 4, 1, 1, 2, 2);
    const { mask: trimmed, trim } = trimMask(mask);
    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);
    expect(countVisible(trimmed)).toBe(4);
    expect(trim).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  });

  it('handles an empty mask', () => {
    const { mask } = trimMask(createMask(3, 3));
    expect(countVisible(mask)).toBe(0);
  });
});

describe('visibleBounds', () => {
  it('returns null for an empty mask', () => {
    expect(visibleBounds(createMask(2, 2))).toBeNull();
  });
});

describe('buildSourceMask', () => {
  it('treats transparent pixels as background (alpha-aware)', () => {
    const img = fakeImage(2, 2, (x) => (x === 0 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    const mask = buildSourceMask(img);
    expect(mask.data[0]).toBe(1); // opaque
    expect(mask.data[1]).toBe(0); // transparent
  });

  it('falls back to non-white for fully opaque images', () => {
    const img = fakeImage(2, 1, (x) => (x === 0 ? [10, 10, 10, 255] : [255, 255, 255, 255]));
    const mask = buildSourceMask(img);
    expect(mask.data[0]).toBe(1); // dark
    expect(mask.data[1]).toBe(0); // white background
  });
});

describe('buildTargetMask', () => {
  it('auto-detects alpha as inside when transparency exists', () => {
    const img = fakeImage(2, 1, (x) => (x === 0 ? [200, 200, 200, 255] : [0, 0, 0, 0]));
    const mask = buildTargetMask(img, 'auto', false);
    expect(mask.data[0]).toBe(1);
    expect(mask.data[1]).toBe(0);
  });

  it('inverts when requested', () => {
    const img = fakeImage(2, 1, (x) => (x === 0 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    const normal = buildTargetMask(img, 'auto', false);
    const inverted = buildTargetMask(img, 'auto', true);
    expect(inverted.data[0]).toBe(normal.data[0] ^ 1);
    expect(inverted.data[1]).toBe(normal.data[1] ^ 1);
  });
});

describe('erodeMask', () => {
  it('removes a one-pixel border for radius 1', () => {
    const solid = rectMask(5, 5, 0, 0, 5, 5);
    const eroded = erodeMask(solid, 1);
    // The inner 3x3 should survive.
    expect(countVisible(eroded)).toBe(9);
    expect(eroded.data[0]).toBe(0); // corner removed
    expect(eroded.data[2 * 5 + 2]).toBe(1); // centre kept
  });

  it('returns a copy for radius 0', () => {
    const solid = rectMask(3, 3, 0, 0, 3, 3);
    const eroded = erodeMask(solid, 0);
    expect(countVisible(eroded)).toBe(9);
    expect(eroded).not.toBe(solid);
  });
});
