// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { TimeScale } from '../scales/time-scale.ts';

describe('TimeScale', () => {
  const d0 = new Date('2024-01-01T00:00:00Z');
  const d1 = new Date('2024-12-31T00:00:00Z');

  it('maps dates to pixels', () => {
    const scale = new TimeScale([d0, d1], [0, 1000]);
    expect(scale.scale(d0)).toBe(0);
    expect(scale.scale(d1)).toBe(1000);
  });

  it('inverts pixels to dates', () => {
    const scale = new TimeScale([d0, d1], [0, 1000]);
    const midDate = scale.invert(500);
    expect(midDate.getTime()).toBeCloseTo((d0.getTime() + d1.getTime()) / 2, -3);
  });

  it('generates ticks', () => {
    const scale = new TimeScale([d0, d1], [0, 1000]);
    const ticks = scale.ticks(6);
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) {
      expect(t.getTime()).toBeGreaterThanOrEqual(d0.getTime());
      expect(t.getTime()).toBeLessThanOrEqual(d1.getTime());
    }
  });

  it('formats dates contextually', () => {
    const scale = new TimeScale([d0, d1], [0, 1000]);
    scale.ticks(6); // Populates interval
    const formatted = scale.format(d0);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('computes domain from values', () => {
    const dates = [
      new Date('2024-03-01'),
      new Date('2024-06-15'),
      new Date('2024-01-10'),
    ];
    const [min, max] = TimeScale.domainFromValues(dates);
    expect(min.getTime()).toBe(new Date('2024-01-10').getTime());
    expect(max.getTime()).toBe(new Date('2024-06-15').getTime());
  });

  it('handles empty values', () => {
    const [min, max] = TimeScale.domainFromValues([]);
    expect(min).toBeInstanceOf(Date);
    expect(max).toBeInstanceOf(Date);
  });
});
