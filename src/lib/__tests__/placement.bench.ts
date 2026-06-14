/**
 * Benchmarks for the placement algorithm (`generate`).
 *
 * Run with `npm run bench`. Inputs are synthetic and seeded so runs are
 * reproducible; treat the numbers as RELATIVE (before/after on the same
 * machine), since `generate` yields to the event loop between batches and that
 * macrotask latency is included in the timing.
 */
import { bench, describe } from 'vitest';
import { createMask, countVisible } from '../mask';
import { generate } from '../placement';
import { DEFAULT_SETTINGS } from '../types';
import type { Mask, Settings, SourceItem } from '../types';

let counter = 0;

function solidMask(w: number, h: number): Mask {
  const m = createMask(w, h);
  m.data.fill(1);
  return m;
}

function makeSource(w: number, h: number): SourceItem {
  const mask = solidMask(w, h);
  return {
    id: `b-${counter++}`,
    name: 'bench-source',
    url: '',
    image: null as unknown as HTMLImageElement,
    mask,
    area: countVisible(mask),
    longSide: Math.max(w, h),
    trim: { x: 0, y: 0, w: 1, h: 1 },
  };
}

const target = solidMask(320, 320);

// A handful of varied sources for reuse mode.
const reuseSources: SourceItem[] = [];
for (let i = 0; i < 8; i++) {
  reuseSources.push(makeSource(30 + i * 6, 28 + (i % 4) * 8));
}

// Many small sources for use-each-once mode.
const onceSources: SourceItem[] = [];
for (let i = 0; i < 40; i++) {
  onceSources.push(makeSource(22 + (i % 6) * 4, 20 + (i % 5) * 4));
}

const reuseSettings: Settings = {
  ...DEFAULT_SETTINGS,
  seed: 1,
  density: 0.55,
  minSize: 0.08,
  maxSize: 0.2,
  spacing: 4,
  edgePadding: 6,
  angleVariation: 'pm30',
  maxAttempts: 4000,
  allowReuse: true,
};

const onceSettings: Settings = {
  ...reuseSettings,
  allowReuse: false,
  sizeVariation: 0.25,
};

const opts = { time: 1500, warmupTime: 300 };

describe('generate', () => {
  bench(
    'reuse mode — 320px target, 8 sources, density 0.55, 4000 attempts',
    async () => {
      await generate({ target, placementScale: 1, sources: reuseSources, settings: reuseSettings });
    },
    opts,
  );

  bench(
    'use-each-once mode — 320px target, 40 sources',
    async () => {
      await generate({ target, placementScale: 1, sources: onceSources, settings: onceSettings });
    },
    opts,
  );
});
