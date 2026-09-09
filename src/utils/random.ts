/**
 * Deterministic Mulberry32 Seeded Pseudo-Random Number Generator.
 * Guarantees 100% reproducible scenarios and benchmarks across reloads.
 */
export class SeededRandom {
  private s: number;

  constructor(seed: number) {
    this.s = Math.floor(seed) >>> 0;
  }

  /**
   * Generates a pseudo-random float in [0, 1).
   */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudo-random float in [min, max).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a pseudo-random integer in [min, max].
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Generates standard normal random variable using Box-Muller transform.
   */
  gaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Pick random item from array.
   */
  choice<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}
