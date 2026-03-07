import './register.ts';

// ── Element ──
export { NChart } from './chart-element.ts';

// ── Store ──
export { ChartStore, PALETTES, PALETTE_NAMES } from './chart-store.ts';

// ── Scales ──
export { LinearScale, TimeScale, BandScale } from './scales/index.ts';
export type { Scale } from './scales/index.ts';

// ── Layout ──
export { computeLayout, measureText } from './layout/index.ts';
export type { LayoutOptions } from './layout/index.ts';

// ── Renderers ──
export {
  renderLine, renderBar, renderScatter, renderSparkline,
  renderXAxis, renderYAxis, renderGrid, renderReferenceLines, renderLegend,
  svgEl, setAttrs, reconcile, pruneKeys, pathD, pathLength,
} from './renderers/index.ts';

// ── Interactions ──
export { bisect, bisectAll, Crosshair, ChartTooltip } from './interactions/index.ts';
export type { BisectResult } from './interactions/index.ts';

// ── Types ──
export type {
  ChartData, ChartSeries, ChartPoint, ChartType, ChartPalette,
  LegendPosition, GridMode, ReferenceLine, ReferenceLineAxis,
  Rect, ChartMargin, ChartLayout,
  RenderOptions, ChartHoverDetail, ChartSelectDetail, ChartLegendToggleDetail,
} from './types.ts';
