// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { BandScale } from '../scales/band-scale.ts';

describe('BandScale', () => {
  it('distributes bands evenly across range', () => {
    const scale = new BandScale(['A', 'B', 'C'], [0, 300], 0, 0);
    expect(scale.bandwidth).toBe(100);
    expect(scale.scale('A')).toBe(0);
    expect(scale.scale('B')).toBe(100);
    expect(scale.scale('C')).toBe(200);
  });

  it('applies inner padding', () => {
    const scale = new BandScale(['A', 'B'], [0, 220], 0.1, 0);
    // 2 bands + 1 inner gap (0.1 * bw)
    // 220 = 2*bw + 0.1*bw = 2.1*bw → bw ≈ 104.76
    const bw = scale.bandwidth;
    expect(bw).toBeCloseTo(220 / 2.1, 1);
  });

  it('returns null for unknown labels', () => {
    const scale = new BandScale(['A', 'B'], [0, 100]);
    expect(scale.scale('Z')).toBe(0); // returns range start
  });

  it('bandAt finds nearest label', () => {
    const scale = new BandScale(['A', 'B', 'C'], [0, 300], 0, 0);
    expect(scale.bandAt(50)).toBe('A');
    expect(scale.bandAt(150)).toBe('B');
    expect(scale.bandAt(250)).toBe('C');
  });

  it('bandAt returns null for out-of-range', () => {
    const scale = new BandScale(['A', 'B'], [0, 100]);
    expect(scale.bandAt(-50)).toBeNull();
    expect(scale.bandAt(500)).toBeNull();
  });

  it('ticks returns all domain values', () => {
    const scale = new BandScale(['X', 'Y', 'Z'], [0, 100]);
    expect(scale.ticks()).toEqual(['X', 'Y', 'Z']);
  });

  it('format returns label as-is', () => {
    const scale = new BandScale();
    expect(scale.format('hello')).toBe('hello');
  });

  it('handles empty domain', () => {
    const scale = new BandScale([], [0, 100]);
    expect(scale.bandwidth).toBe(0);
    expect(scale.bandAt(50)).toBeNull();
  });
});
