// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { bisect, bisectAll } from '../interactions/bisect.ts';
import { LinearScale } from '../scales/linear-scale.ts';
import type { ChartSeries } from '../types.ts';

describe('bisect', () => {
  const xScale = new LinearScale([0, 10], [0, 500]);
  const yScale = new LinearScale([0, 100], [300, 0]); // inverted

  const series: ChartSeries[] = [
    {
      name: 'A',
      data: [
        { x: 0, y: 10 },
        { x: 2, y: 30 },
        { x: 5, y: 50 },
        { x: 8, y: 70 },
        { x: 10, y: 90 },
      ],
    },
    {
      name: 'B',
      data: [
        { x: 1, y: 20 },
        { x: 4, y: 40 },
        { x: 7, y: 60 },
        { x: 9, y: 80 },
      ],
    },
  ];

  it('finds the nearest point', () => {
    // Point close to x=5, y=50 → pixel x=250, pixel y=150
    const result = bisect(series, 250, 150, xScale, yScale);
    expect(result).not.toBeNull();
    expect(result!.seriesName).toBe('A');
    expect(result!.point.x).toBe(5);
    expect(result!.point.y).toBe(50);
  });

  it('returns null for empty series', () => {
    const result = bisect([], 100, 100, xScale, yScale);
    expect(result).toBeNull();
  });

  it('finds nearest across series', () => {
    // Point at x=350 (which maps to domain x=7) should find B's x=7 point
    const px = xScale.scale(7);
    const py = yScale.scale(60);
    const result = bisect(series, px, py, xScale, yScale);
    expect(result).not.toBeNull();
    expect(result!.seriesName).toBe('B');
    expect(result!.point.y).toBe(60);
  });
});

describe('bisectAll', () => {
  const xScale = new LinearScale([0, 10], [0, 500]);

  const series: ChartSeries[] = [
    {
      name: 'A',
      data: [
        { x: 0, y: 10 },
        { x: 5, y: 50 },
        { x: 10, y: 90 },
      ],
    },
    {
      name: 'B',
      data: [
        { x: 0, y: 20 },
        { x: 5, y: 40 },
        { x: 10, y: 80 },
      ],
    },
  ];

  it('returns one result per series', () => {
    const results = bisectAll(series, 250, xScale); // near x=5
    expect(results.length).toBe(2);
    expect(results[0].seriesName).toBe('A');
    expect(results[1].seriesName).toBe('B');
  });

  it('picks nearest x per series', () => {
    const results = bisectAll(series, 250, xScale);
    expect(results[0].point.x).toBe(5);
    expect(results[1].point.x).toBe(5);
  });
});
