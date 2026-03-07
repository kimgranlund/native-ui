import type { Scale } from './types.ts';

// ---------------------------------------------------------------------------
// Time Intervals
// ---------------------------------------------------------------------------

interface TimeInterval {
  ms: number;
  label: string;
  format: (d: Date) => string;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INTERVALS: TimeInterval[] = [
  { ms: SECOND, label: '1s', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` },
  { ms: 5 * SECOND, label: '5s', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` },
  { ms: 15 * SECOND, label: '15s', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` },
  { ms: MINUTE, label: '1m', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}` },
  { ms: 5 * MINUTE, label: '5m', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}` },
  { ms: 15 * MINUTE, label: '15m', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}` },
  { ms: HOUR, label: '1h', format: (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}` },
  { ms: 6 * HOUR, label: '6h', format: (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} ${pad2(d.getHours())}:00` },
  { ms: DAY, label: '1d', format: (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` },
  { ms: WEEK, label: '1w', format: (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` },
  { ms: MONTH, label: '1M', format: (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` },
  { ms: 3 * MONTH, label: '3M', format: (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` },
  { ms: YEAR, label: '1Y', format: (d) => String(d.getFullYear()) },
];

// ---------------------------------------------------------------------------
// TimeScale
// ---------------------------------------------------------------------------

export class TimeScale implements Scale<Date> {
  domain: [Date, Date];
  range: [number, number];
  #interval: TimeInterval | null = null;

  constructor(domain: [Date, Date] = [new Date(0), new Date()], range: [number, number] = [0, 1]) {
    this.domain = domain;
    this.range = range;
  }

  scale(value: Date): number {
    const t = value.getTime();
    const [d0, d1] = [this.domain[0].getTime(), this.domain[1].getTime()];
    const [r0, r1] = this.range;
    const extent = d1 - d0;
    if (extent === 0) return (r0 + r1) / 2;
    return r0 + ((t - d0) / extent) * (r1 - r0);
  }

  invert(pixel: number): Date {
    const [d0, d1] = [this.domain[0].getTime(), this.domain[1].getTime()];
    const [r0, r1] = this.range;
    const extent = r1 - r0;
    if (extent === 0) return new Date((d0 + d1) / 2);
    const t = d0 + ((pixel - r0) / extent) * (d1 - d0);
    return new Date(t);
  }

  ticks(count = 5): Date[] {
    const t0 = this.domain[0].getTime();
    const t1 = this.domain[1].getTime();
    const span = t1 - t0;
    if (span <= 0) return [new Date(t0)];

    // Pick the best interval
    const ideal = span / count;
    let best = INTERVALS[INTERVALS.length - 1];
    for (const iv of INTERVALS) {
      if (iv.ms >= ideal * 0.7) {
        best = iv;
        break;
      }
    }
    this.#interval = best;

    const step = best.ms;
    const start = Math.ceil(t0 / step) * step;
    const result: Date[] = [];
    for (let t = start; t <= t1; t += step) {
      result.push(new Date(t));
    }
    return result;
  }

  format(value: Date): string {
    if (this.#interval) return this.#interval.format(value);
    // Fallback: context-sensitive
    const span = this.domain[1].getTime() - this.domain[0].getTime();
    if (span < DAY) return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
    if (span < YEAR) return `${MONTHS_SHORT[value.getMonth()]} ${value.getDate()}`;
    return `${MONTHS_SHORT[value.getMonth()]} ${value.getFullYear()}`;
  }

  static domainFromValues(values: Date[]): [Date, Date] {
    if (values.length === 0) return [new Date(), new Date()];
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      const t = v.getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return [new Date(min), new Date(max)];
  }
}
