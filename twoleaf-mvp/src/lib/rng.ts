/**
 * Seeded random number generator (mulberry32) and small helpers.
 * The seed data uses `createRng(20261023)` so every load produces the same data.
 */

/** Returns a function producing floats in [0, 1). Same seed, same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max) rounded to one decimal. */
  float1(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Random element. Throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** New array, Fisher–Yates shuffled. */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    float1(min, max) {
      return Math.round((min + next() * (max - min)) * 10) / 10;
    },
    chance(p) {
      return next() < p;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick() on empty list');
      return items[Math.floor(next() * items.length)] as T;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
  };
}
