import { describe, it, expect } from 'vitest';
import { createMask, diskOffsets } from '../mask';
import { canPlace, rasterizeTransformed, stampOccupancy } from '../transform';
import type { Mask } from '../types';

function solid(w: number, h: number): Mask {
  const m = createMask(w, h);
  m.data.fill(1);
  return m;
}

describe('rasterizeTransformed', () => {
  it('is the identity at scale 1, angle 0', () => {
    const t = rasterizeTransformed(solid(2, 2), 1, 0);
    expect(t.width).toBe(2);
    expect(t.height).toBe(2);
    expect(t.count).toBe(4);
  });

  it('scales up the visible-pixel count', () => {
    const t = rasterizeTransformed(solid(2, 2), 2, 0);
    expect(t.width).toBe(4);
    expect(t.height).toBe(4);
    expect(t.count).toBe(16);
  });

  it('swaps dimensions when rotated 90°', () => {
    const bar = createMask(1, 3);
    bar.data.fill(1);
    const t = rasterizeTransformed(bar, 1, Math.PI / 2);
    expect(t.width).toBe(3);
    expect(t.height).toBe(1);
    expect(t.count).toBe(3);
  });
});

describe('canPlace', () => {
  const target = solid(10, 10);

  it('accepts a fully contained placement', () => {
    const occ = createMask(10, 10);
    const t = rasterizeTransformed(solid(2, 2), 1, 0);
    expect(canPlace(t, 0, 0, target, occ)).toBe(true);
    expect(canPlace(t, 4, 4, target, occ)).toBe(true);
  });

  it('rejects a placement clipped by the bounds', () => {
    const occ = createMask(10, 10);
    const t = rasterizeTransformed(solid(2, 2), 1, 0);
    expect(canPlace(t, -1, 0, target, occ)).toBe(false);
    expect(canPlace(t, 9, 9, target, occ)).toBe(false);
  });

  it('rejects a placement outside the target region', () => {
    const occ = createMask(10, 10);
    const holed = solid(10, 10);
    holed.data[0] = 0; // (0,0) is outside the target
    const t = rasterizeTransformed(solid(2, 2), 1, 0);
    expect(canPlace(t, 0, 0, holed, occ)).toBe(false);
  });

  it('rejects a placement that collides with occupancy', () => {
    const occ = createMask(10, 10);
    const t = rasterizeTransformed(solid(2, 2), 1, 0);
    stampOccupancy(occ, t, 0, 0, diskOffsets(0));
    expect(canPlace(t, 0, 0, target, occ)).toBe(false); // overlaps
    expect(canPlace(t, 5, 5, target, occ)).toBe(true); // clear
  });

  it('honours spacing via dilated occupancy', () => {
    const occ = createMask(10, 10);
    const t = rasterizeTransformed(solid(2, 2), 1, 0);
    stampOccupancy(occ, t, 0, 0, diskOffsets(2)); // spacing 2
    // A neighbour immediately adjacent should now collide with the dilation.
    expect(canPlace(t, 2, 0, target, occ)).toBe(false);
  });
});
