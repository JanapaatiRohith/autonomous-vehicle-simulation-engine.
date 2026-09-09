import { describe, it, expect } from 'vitest';
import { calculateTTC, classifyTTC } from '../risk/ttc';

describe('Time To Collision (TTC) Engine', () => {
  it('calculates exact TTC for approaching objects', () => {
    // 30 meters at 10 m/s closing speed -> 3.0 seconds
    const ttc = calculateTTC(30, 10);
    expect(ttc).toBeCloseTo(3.0);
  });

  it('returns Infinity if closing speed is zero or negative (diverging)', () => {
    expect(calculateTTC(20, 0)).toBe(Infinity);
    expect(calculateTTC(20, -5)).toBe(Infinity);
    expect(calculateTTC(20, 0.02)).toBe(Infinity); // below 0.05 threshold
  });

  it('correctly classifies TTC into standardized risk levels', () => {
    expect(classifyTTC(1.2)).toBe('CRITICAL'); // <= 1.5s
    expect(classifyTTC(2.2)).toBe('HIGH'); // <= 2.8s
    expect(classifyTTC(3.8)).toBe('MEDIUM'); // <= 4.5s
    expect(classifyTTC(6.5)).toBe('LOW'); // > 4.5s
  });
});
