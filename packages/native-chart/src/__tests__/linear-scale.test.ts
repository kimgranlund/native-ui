// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { LinearScale } from '../scales/linear-scale.ts';

describe('LinearScale', () => {
  it('maps domain to range linearly', () => {
    const scale = new LinearScale([0, 100], [0, 500]);
    expect(scale.scale(0)).toBe(0);
    expect(scale.scale(50)).toBe(250);
    expect(scale.scale(100)).toBe(500);
  });

  it('inverts pixel to domain value', () => {
    const scale = new LinearScale([0, 100], [0, 500]);
    expect(scale.invert(0)).toBe(0);
    expect(scale.invert(250)).toBe(50);
    expect(scale.invert(500)).toBe(100);
  });

  it('handles zero-extent domain', () => {
    const scale = new LinearScale([50, 50], [0, 100]);
    expect(scale.scale(50)).toBe(50); // midpoint of range
  });

  it('generates nice ticks', () => {
    const scale = new LinearScale([0, 100], [0, 500]);
    const ticks = scale.ticks(5);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBe(0);
    // All ticks should be within domain
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(100);
    }
  });

  it('formats numbers with SI suffixes', () => {
    const scale = new LinearScale();
    expect(scale.format(1500)).toBe('1.5K');
    expect(scale.format(2500000)).toBe('2.5M');
    expect(scale.format(3000000000)).toBe('3.0B');
    expect(scale.format(42)).toBe('42');
    expect(scale.format(3.14)).toBe('3.14');
  });

  it('computes domain from values', () => {
    const domain = LinearScale.domainFromValues([10, 20, 30, 40, 50]);
    expect(domain[0]).toBe(0); // non-negative → extends to 0
    expect(domain[1]).toBeGreaterThan(50);
  });

  it('computes domain from values with negative', () => {
    const domain = LinearScale.domainFromValues([-10, 20, 30]);
    expect(domain[0]).toBeLessThan(-10); // padded below
    expect(domain[1]).toBeGreaterThan(30);
  });

  it('handles empty values', () => {
    const domain = LinearScale.domainFromValues([]);
    expect(domain).toEqual([0, 1]);
  });

  it('handles single value', () => {
    const domain = LinearScale.domainFromValues([5]);
    expect(domain[0]).toBeLessThan(5);
    expect(domain[1]).toBeGreaterThan(5);
  });
});
