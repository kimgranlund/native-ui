import { signal, computed, batch } from '@nonoun/native-ui';
import type { Signal, ReadonlySignal } from '@nonoun/native-ui';
import { LinearScale } from './scales/linear-scale.ts';
import { TimeScale } from './scales/time-scale.ts';
import { BandScale } from './scales/band-scale.ts';
import type { Scale } from './scales/types.ts';
import { computeLayout, measureText } from './layout/chart-layout.ts';
import type { ChartData, ChartSeries, ChartType, ChartPalette, ChartLayout, LegendPosition, GridMode, ReferenceLine } from './types.ts';

// ---------------------------------------------------------------------------
// Series Color Palettes — 10 data-viz optimized palettes, 6 colors each
// ---------------------------------------------------------------------------

export const PALETTES: Record<ChartPalette, string[]> = {
  // Design-system tokens — adapts to light/dark mode
  default: [
    'var(--n-color-accent-500)',
    'var(--n-color-success-500)',
    'var(--n-color-warning-500)',
    'var(--n-color-danger-500)',
    'var(--n-color-info-500)',
    'var(--n-color-neutral-500)',
  ],
  // High chroma, saturated — maximum visual pop
  vivid: [
    'oklch(0.55 0.25 264)',   // electric blue
    'oklch(0.60 0.22 150)',   // emerald
    'oklch(0.70 0.20 55)',    // amber
    'oklch(0.55 0.24 25)',    // crimson
    'oklch(0.65 0.20 310)',   // violet
    'oklch(0.60 0.18 190)',   // teal
  ],
  // Soft, lower chroma — elegant and easy on the eyes
  pastel: [
    'oklch(0.78 0.10 250)',   // soft blue
    'oklch(0.80 0.10 155)',   // mint
    'oklch(0.82 0.10 80)',    // peach
    'oklch(0.75 0.10 340)',   // rose
    'oklch(0.80 0.08 200)',   // sky
    'oklch(0.78 0.08 290)',   // lavender
  ],
  // Natural, warm tones — organic feel
  earth: [
    'oklch(0.55 0.12 60)',    // burnt sienna
    'oklch(0.65 0.14 140)',   // olive
    'oklch(0.50 0.08 50)',    // brown
    'oklch(0.70 0.10 85)',    // sand
    'oklch(0.45 0.10 30)',    // terracotta
    'oklch(0.60 0.06 200)',   // slate
  ],
  // Cool blues and teals — aquatic theme
  ocean: [
    'oklch(0.50 0.18 250)',   // deep blue
    'oklch(0.60 0.16 210)',   // cerulean
    'oklch(0.68 0.14 195)',   // teal
    'oklch(0.55 0.12 270)',   // indigo
    'oklch(0.75 0.10 200)',   // sky
    'oklch(0.45 0.14 230)',   // navy
  ],
  // Warm oranges through purples — golden hour
  sunset: [
    'oklch(0.65 0.22 40)',    // orange
    'oklch(0.55 0.20 20)',    // vermillion
    'oklch(0.50 0.22 350)',   // magenta
    'oklch(0.72 0.18 70)',    // gold
    'oklch(0.48 0.18 310)',   // plum
    'oklch(0.60 0.16 5)',     // coral
  ],
  // Greens and natural tones — lush vegetation
  forest: [
    'oklch(0.50 0.16 150)',   // dark green
    'oklch(0.65 0.14 130)',   // fern
    'oklch(0.55 0.10 100)',   // moss
    'oklch(0.70 0.12 160)',   // lime
    'oklch(0.45 0.08 50)',    // bark
    'oklch(0.60 0.12 180)',   // sage
  ],
  // Ultra-bright, high energy
  neon: [
    'oklch(0.70 0.28 145)',   // neon green
    'oklch(0.65 0.28 330)',   // hot pink
    'oklch(0.75 0.22 85)',    // electric yellow
    'oklch(0.60 0.26 270)',   // neon purple
    'oklch(0.72 0.24 200)',   // cyan
    'oklch(0.68 0.26 30)',    // neon orange
  ],
  // Single-hue (blue) with varying lightness — great for ordered data
  mono: [
    'oklch(0.40 0.16 260)',   // darkest
    'oklch(0.50 0.14 260)',
    'oklch(0.60 0.12 260)',
    'oklch(0.70 0.10 260)',
    'oklch(0.78 0.08 260)',
    'oklch(0.85 0.06 260)',   // lightest
  ],
  // Blue-orange diverging — safe for all color vision types
  accessible: [
    'oklch(0.50 0.18 255)',   // blue
    'oklch(0.70 0.18 60)',    // orange
    'oklch(0.40 0.10 260)',   // dark blue
    'oklch(0.80 0.12 85)',    // yellow
    'oklch(0.55 0.00 0)',     // dark gray
    'oklch(0.75 0.14 200)',   // sky blue
  ],
};

export const PALETTE_NAMES = Object.keys(PALETTES) as ChartPalette[];

// ---------------------------------------------------------------------------
// ChartStore
// ---------------------------------------------------------------------------

export class ChartStore {
  // ── Inputs ──
  readonly data: Signal<ChartData | null> = signal(null);
  readonly type: Signal<ChartType> = signal('line');
  readonly width: Signal<number> = signal(400);
  readonly height: Signal<number> = signal(300);
  readonly stacked: Signal<boolean> = signal(false);
  readonly smooth: Signal<boolean> = signal(false);
  readonly area: Signal<boolean> = signal(false);
  readonly horizontal: Signal<boolean> = signal(false);
  readonly legend: Signal<LegendPosition> = signal('bottom');
  readonly grid: Signal<GridMode> = signal('horizontal');
  readonly animate: Signal<boolean> = signal(true);
  readonly hiddenSeries: Signal<Set<string>> = signal(new Set());
  readonly palette: Signal<ChartPalette> = signal('default');
  readonly referenceLines: Signal<ReferenceLine[]> = signal([]);
  readonly showAverage: Signal<boolean> = signal(false);

  // ── Derived ──

  readonly visibleSeries: ReadonlySignal<ChartSeries[]> = computed(() => {
    const d = this.data.value;
    if (!d) return [];
    const hidden = this.hiddenSeries.value;
    return d.series.filter((s) => !hidden.has(s.name));
  });

  readonly colorMap: ReadonlySignal<Map<string, string>> = computed(() => {
    const d = this.data.value;
    const map = new Map<string, string>();
    if (!d) return map;
    const colors = PALETTES[this.palette.value] ?? PALETTES.default;
    d.series.forEach((s, i) => {
      map.set(s.name, s.color ?? colors[i % colors.length]);
    });
    return map;
  });

  readonly xScaleType: ReadonlySignal<'linear' | 'time' | 'band'> = computed(() => {
    const d = this.data.value;
    if (!d || d.series.length === 0) return 'linear';
    const first = d.series[0].data[0];
    if (!first) return 'linear';
    if (first.x instanceof Date) return 'time';
    if (typeof first.x === 'string') return 'band';
    return 'linear';
  });

  readonly xDomain: ReadonlySignal<[any, any] | string[]> = computed(() => {
    const series = this.visibleSeries.value;
    const scaleType = this.xScaleType.value;

    if (series.length === 0) {
      if (scaleType === 'band') return [] as string[];
      return [0, 1];
    }

    if (scaleType === 'band') {
      // Collect unique labels in order
      const labels: string[] = [];
      const seen = new Set<string>();
      for (const s of series) {
        for (const p of s.data) {
          const label = String(p.x);
          if (!seen.has(label)) {
            seen.add(label);
            labels.push(label);
          }
        }
      }
      return labels;
    }

    if (scaleType === 'time') {
      const dates: Date[] = [];
      for (const s of series) {
        for (const p of s.data) dates.push(p.x as Date);
      }
      return TimeScale.domainFromValues(dates);
    }

    const values: number[] = [];
    for (const s of series) {
      for (const p of s.data) values.push(p.x as number);
    }
    return LinearScale.domainFromValues(values, 0);
  });

  readonly yDomain: ReadonlySignal<[number, number]> = computed(() => {
    const series = this.visibleSeries.value;
    if (series.length === 0) return [0, 1] as [number, number];

    if (this.stacked.value) {
      // For stacked, compute cumulative max per x-position
      const sums = new Map<string, number>();
      for (const s of series) {
        for (const p of s.data) {
          const key = String(p.x);
          sums.set(key, (sums.get(key) ?? 0) + p.y);
        }
      }
      const maxSum = Math.max(...sums.values(), 0);
      return [0, maxSum * 1.05] as [number, number];
    }

    const values: number[] = [];
    for (const s of series) {
      for (const p of s.data) values.push(p.y);
    }
    return LinearScale.domainFromValues(values);
  });

  readonly xScale: ReadonlySignal<Scale<any>> = computed(() => {
    const type = this.xScaleType.value;
    const domain = this.xDomain.value;
    const layout = this.layout.value;
    const plot = layout.plotArea;
    const range: [number, number] = this.horizontal.value
      ? [plot.y + plot.height, plot.y]
      : [plot.x, plot.x + plot.width];

    if (type === 'band') {
      // BandScale lacks invert() but renderers only call scale/ticks/format
      return new BandScale(domain as string[], range) as unknown as Scale<any>;
    }
    if (type === 'time') {
      return new TimeScale(domain as [Date, Date], range);
    }
    return new LinearScale(domain as [number, number], range);
  });

  readonly yScale: ReadonlySignal<LinearScale> = computed(() => {
    const domain = this.yDomain.value;
    const layout = this.layout.value;
    const plot = layout.plotArea;
    const range: [number, number] = this.horizontal.value
      ? [plot.x, plot.x + plot.width]
      : [plot.y + plot.height, plot.y]; // SVG y is inverted
    return new LinearScale(domain, range);
  });

  readonly allReferenceLines: ReadonlySignal<ReferenceLine[]> = computed(() => {
    const manual = this.referenceLines.value;
    if (!this.showAverage.value) return manual;

    // Auto-compute per-series averages
    const series = this.visibleSeries.value;
    const colorMap = this.colorMap.value;
    const averages: ReferenceLine[] = series.map((s) => {
      const sum = s.data.reduce((acc, p) => acc + p.y, 0);
      const avg = s.data.length > 0 ? sum / s.data.length : 0;
      return {
        axis: 'y' as const,
        value: Math.round(avg * 10) / 10,
        label: `${s.name} avg`,
        color: colorMap.get(s.name) ?? 'var(--n-ink-muted)',
        style: 'dashed' as const,
      };
    });

    return [...manual, ...averages];
  });

  readonly layout: ReadonlySignal<ChartLayout> = computed(() => {
    const w = this.width.value;
    const h = this.height.value;
    const isSparkline = this.type.value === 'sparkline';
    const yDom = this.yDomain.value;

    // Estimate widest Y label
    const yTicks = new LinearScale(yDom).ticks(5);
    const widest = yTicks.reduce((max, t) => {
      const label = new LinearScale(yDom).format(t);
      return Math.max(max, measureText(label));
    }, 0);

    return computeLayout({
      width: w,
      height: h,
      sparkline: isSparkline,
      yLabelWidth: widest,
    });
  });

  // ── Methods ──

  toggleSeries(name: string): void {
    const current = this.hiddenSeries.value;
    const next = new Set(current);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.hiddenSeries.value = next;
  }

  resetView(): void {
    batch(() => {
      this.hiddenSeries.value = new Set();
    });
  }
}
