import type { Scale } from './types.ts';

// ---------------------------------------------------------------------------
// Nice Tick Generation
// ---------------------------------------------------------------------------

/** Returns a "nice" step size for the given range and tick count. */
function niceStep(extent: number, count: number): number {
  const rough = extent / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  let nice: number;
  if (frac <= 1.5) nice = 1;
  else if (frac <= 3) nice = 2;
  else if (frac <= 7) nice = 5;
  else nice = 10;
  return nice * pow;
}

// ---------------------------------------------------------------------------
// LinearScale
// ---------------------------------------------------------------------------

export class LinearScale implements Scale<number> {
  domain: [number, number];
  range: [number, number];

  constructor(domain: [number, number] = [0, 1], range: [number, number] = [0, 1]) {
    this.domain = domain;
    this.range = range;
  }

  scale(value: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    const extent = d1 - d0;
    if (extent === 0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / extent) * (r1 - r0);
  }

  invert(pixel: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    const extent = r1 - r0;
    if (extent === 0) return (d0 + d1) / 2;
    return d0 + ((pixel - r0) / extent) * (d1 - d0);
  }

  ticks(count = 5): number[] {
    const [d0, d1] = this.domain;
    if (d0 === d1) return [d0];
    const step = niceStep(d1 - d0, count);
    const start = Math.ceil(d0 / step) * step;
    const result: number[] = [];
    for (let v = start; v <= d1 + step * 0.001; v += step) {
      result.push(Math.round(v * 1e12) / 1e12); // avoid float drift
    }
    return result;
  }

  format(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }

  /**
   * Auto-compute domain from data values with optional padding.
   * Extends min to 0 if all values are non-negative.
   */
  static domainFromValues(values: number[], padding = 0.05): [number, number] {
    if (values.length === 0) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === max) {
      return min === 0 ? [0, 1] : [min * 0.9, max * 1.1];
    }
    const pad = (max - min) * padding;
    const lo = min >= 0 ? 0 : min - pad;
    const hi = max + pad;
    return [lo, hi];
  }
}
