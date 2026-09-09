import { describe, it, expect } from 'vitest';
import { euclideanDistance, clamp, normalizeAngle, kmhToMs, msToKmh } from '../utils/math';
import { checkOrientedBoxCollision, pointToSegmentDistance, cubicHermite } from '../utils/geometry';
import { SeededRandom } from '../utils/random';

describe('Math Utilities', () => {
  it('correctly calculates Euclidean distance', () => {
    expect(euclideanDistance(0, 0, 3, 4)).toBeCloseTo(5.0);
    expect(euclideanDistance(1, 1, 1, 1)).toBe(0);
  });

  it('correctly clamps values', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(7, 0, 10)).toBe(7);
  });

  it('normalizes angles to [-PI, PI]', () => {
    expect(normalizeAngle(Math.PI * 2.5)).toBeCloseTo(Math.PI * 0.5);
    expect(Math.abs(normalizeAngle(Math.PI * 3))).toBeCloseTo(Math.PI);
    expect(normalizeAngle(0)).toBe(0);
  });

  it('converts between km/h and m/s accurately', () => {
    expect(kmhToMs(36)).toBeCloseTo(10);
    expect(msToKmh(10)).toBeCloseTo(36);
  });
});

describe('Geometry Utilities', () => {
  it('detects collision between overlapping boxes using SAT', () => {
    const boxA = { x: 0, y: 0, length: 4, width: 2, heading: 0 };
    const boxB = { x: 1, y: 1, length: 4, width: 2, heading: 0 };
    expect(checkOrientedBoxCollision(boxA, boxB)).toBe(true);
  });

  it('detects no collision between separated boxes', () => {
    const boxA = { x: 0, y: 0, length: 4, width: 2, heading: 0 };
    const boxB = { x: 10, y: 10, length: 4, width: 2, heading: 0 };
    expect(checkOrientedBoxCollision(boxA, boxB)).toBe(false);
  });

  it('calculates point to segment distance', () => {
    const p = { x: 0, y: 5 };
    const a = { x: -10, y: 0 };
    const b = { x: 10, y: 0 };
    expect(pointToSegmentDistance(p, a, b)).toBeCloseTo(5);
  });

  it('evaluates cubic Hermite spline smoothly', () => {
    const p0 = { x: 0, y: 0 };
    const m0 = { x: 0, y: 10 };
    const p1 = { x: 2, y: 20 };
    const m1 = { x: 0, y: 10 };

    const start = cubicHermite(p0, m0, p1, m1, 0);
    const mid = cubicHermite(p0, m0, p1, m1, 0.5);
    const end = cubicHermite(p0, m0, p1, m1, 1);

    expect(start.point.x).toBeCloseTo(0);
    expect(start.point.y).toBeCloseTo(0);
    expect(end.point.x).toBeCloseTo(2);
    expect(end.point.y).toBeCloseTo(20);
    expect(mid.point.y).toBeGreaterThan(0);
    expect(mid.point.y).toBeLessThan(20);
  });
});

describe('Seeded Random', () => {
  it('reproduces identical sequences for the same seed', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('generates values within bounds', () => {
    const rng = new SeededRandom(12345);
    for (let i = 0; i < 50; i++) {
      const val = rng.range(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(15);
    }
  });
});
