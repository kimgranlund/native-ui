// ---------------------------------------------------------------------------
// Chart Data Types
// ---------------------------------------------------------------------------

export type ChartType = 'line' | 'bar' | 'scatter' | 'sparkline';
export type ChartPalette = 'default' | 'vivid' | 'pastel' | 'earth' | 'ocean' | 'sunset' | 'forest' | 'neon' | 'mono' | 'accessible';
export type LegendPosition = 'top' | 'bottom' | 'none';
export type GridMode = 'horizontal' | 'vertical' | 'both' | 'none';

export interface ChartData {
  /** X-axis labels for categorical data. */
  labels?: string[];
  /** One or more data series. */
  series: ChartSeries[];
}

export interface ChartSeries {
  /** Legend label. */
  name: string;
  /** Override the auto-assigned series color. */
  color?: string;
  /** Data points in this series. */
  data: ChartPoint[];
}

export interface ChartPoint {
  /** Domain value (numeric, categorical, or temporal). */
  x: number | string | Date;
  /** Range value. */
  y: number;
  /** Radius — scatter/bubble only. */
  r?: number;
  /** Tooltip label override. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartLayout {
  width: number;
  height: number;
  plotArea: Rect;
  margin: ChartMargin;
}

// ---------------------------------------------------------------------------
// Reference Lines
// ---------------------------------------------------------------------------

export type ReferenceLineAxis = 'x' | 'y';

export interface ReferenceLine {
  /** Axis this line crosses. */
  axis: ReferenceLineAxis;
  /** Value on the axis (numeric for y, numeric/string for x). */
  value: number | string;
  /** Label shown at the end of the line. */
  label?: string;
  /** Line color (defaults to --n-ink-muted). */
  color?: string;
  /** Dash pattern: 'solid' | 'dashed' (default) | 'dotted'. */
  style?: 'solid' | 'dashed' | 'dotted';
}

// ---------------------------------------------------------------------------
// Render Options
// ---------------------------------------------------------------------------

export interface RenderOptions {
  smooth?: boolean;
  area?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  animate?: boolean;
  colorMap: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Event Details
// ---------------------------------------------------------------------------

export interface ChartHoverDetail {
  point: ChartPoint;
  series: string;
  x: number;
  y: number;
}

export interface ChartSelectDetail {
  point: ChartPoint;
  series: string;
}

export interface ChartLegendToggleDetail {
  series: string;
  visible: boolean;
}
