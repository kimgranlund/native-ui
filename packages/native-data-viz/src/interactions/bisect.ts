import type { ChartSeries, ChartPoint } from '../types.ts';
import type { Scale } from '../scales/types.ts';

// ---------------------------------------------------------------------------
// Bisect — find nearest data point to a pixel position
// ---------------------------------------------------------------------------

export interface BisectResult {
  seriesIndex: number;
  pointIndex: number;
  point: ChartPoint;
  seriesName: string;
  distance: number;
}

/**
 * Find the nearest data point across all series for a given pixel position.
 * Uses binary search on sorted x-values for O(log n) per series.
 */
export function bisect(
  series: ChartSeries[],
  xPixel: number,
  yPixel: number,
  xScale: Scale<any>,
  yScale: Scale<number>,
): BisectResult | null {
  let best: BisectResult | null = null;
  let bestDist = Infinity;

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const data = s.data;
    if (data.length === 0) continue;

    // Binary search for nearest x
    let lo = 0;
    let hi = data.length - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const midX = xScale.scale(data[mid].x as any);
      if (midX < xPixel) lo = mid + 1;
      else hi = mid;
    }

    // Check lo and lo-1 for nearest
    const candidates = [lo];
    if (lo > 0) candidates.push(lo - 1);

    for (const idx of candidates) {
      const p = data[idx];
      const px = xScale.scale(p.x as any);
      const py = yScale.scale(p.y);
      const dx = px - xPixel;
      const dy = py - yPixel;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bestDist) {
        bestDist = dist;
        best = {
          seriesIndex: si,
          pointIndex: idx,
          point: p,
          seriesName: s.name,
          distance: dist,
        };
      }
    }
  }

  return best;
}

/**
 * Find all data points at the nearest x-position (for multi-series tooltip).
 */
export function bisectAll(
  series: ChartSeries[],
  xPixel: number,
  xScale: Scale<any>,
): BisectResult[] {
  const results: BisectResult[] = [];

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const data = s.data;
    if (data.length === 0) continue;

    let lo = 0;
    let hi = data.length - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const midX = xScale.scale(data[mid].x as any);
      if (midX < xPixel) lo = mid + 1;
      else hi = mid;
    }

    // Pick the nearest between lo and lo-1
    let idx = lo;
    if (lo > 0) {
      const dLo = Math.abs(xScale.scale(data[lo].x as any) - xPixel);
      const dPrev = Math.abs(xScale.scale(data[lo - 1].x as any) - xPixel);
      if (dPrev < dLo) idx = lo - 1;
    }

    results.push({
      seriesIndex: si,
      pointIndex: idx,
      point: data[idx],
      seriesName: s.name,
      distance: Math.abs(xScale.scale(data[idx].x as any) - xPixel),
    });
  }

  return results;
}
