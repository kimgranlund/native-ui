// ---------------------------------------------------------------------------
// BandScale — categorical labels → pixel bands
// ---------------------------------------------------------------------------

export class BandScale {
  domain: string[];
  range: [number, number];
  /** Padding between bands as a fraction of bandwidth (0–1). */
  paddingInner: number;
  /** Padding on the outer edges as a fraction of bandwidth (0–1). */
  paddingOuter: number;

  constructor(
    domain: string[] = [],
    range: [number, number] = [0, 1],
    paddingInner = 0.2,
    paddingOuter = 0.1,
  ) {
    this.domain = domain;
    this.range = range;
    this.paddingInner = paddingInner;
    this.paddingOuter = paddingOuter;
  }

  /** Computed bandwidth for each category. */
  get bandwidth(): number {
    const n = this.domain.length;
    if (n === 0) return 0;
    const [r0, r1] = this.range;
    const totalRange = r1 - r0;
    // totalRange = n * bandwidth + (n-1) * inner + 2 * outer
    // where inner = paddingInner * bandwidth, outer = paddingOuter * bandwidth
    const denom = n + (n - 1) * this.paddingInner + 2 * this.paddingOuter;
    return totalRange / denom;
  }

  /** Map a category label to the start of its band. */
  scale(label: string): number {
    const idx = this.domain.indexOf(label);
    if (idx === -1) return this.range[0];
    const bw = this.bandwidth;
    const step = bw * (1 + this.paddingInner);
    return this.range[0] + this.paddingOuter * bw + idx * step;
  }

  /** Map a pixel position to the nearest category label. */
  bandAt(pixel: number): string | null {
    const n = this.domain.length;
    if (n === 0) return null;
    const bw = this.bandwidth;
    const step = bw * (1 + this.paddingInner);
    const offset = pixel - this.range[0] - this.paddingOuter * bw;
    const idx = Math.floor(offset / step);
    if (idx < 0 || idx >= n) return null;
    return this.domain[idx];
  }

  /** Returns all domain values (categories are their own ticks). */
  ticks(): string[] {
    return this.domain;
  }

  /** Returns the label as-is. */
  format(value: string): string {
    return value;
  }
}
