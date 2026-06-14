/**
 * Seedable pseudo-random number generator.
 *
 * Uses mulberry32 — a tiny, fast, well-distributed 32-bit PRNG. Generation
 * must be deterministic for a given seed + settings (see AGENTS.md), so all
 * randomness in the placement algorithm flows through one of these.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Force into an unsigned 32-bit integer; avoid a zero state.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Pick a random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

/** Produce a fresh random 32-bit seed (for the "Randomise seed" action). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
