import type { ChartLayout, ChartMargin, Rect } from '../types.ts';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MARGIN: ChartMargin = {
  top: 12,
  right: 16,
  bottom: 32,
  left: 48,
};

const SPARKLINE_MARGIN: ChartMargin = {
  top: 2,
  right: 2,
  bottom: 2,
  left: 2,
};

// ---------------------------------------------------------------------------
// Text Measurement (Canvas 2D — no DOM)
// ---------------------------------------------------------------------------

let measureCtx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof OffscreenCanvas !== 'undefined') {
    measureCtx = new OffscreenCanvas(1, 1).getContext('2d') as CanvasRenderingContext2D | null;
  }
  return measureCtx;
}

/** Measure text width using an offscreen canvas. Returns a default if unavailable. */
export function measureText(text: string, font = '12px sans-serif'): number {
  const ctx = getContext();
  if (!ctx) return text.length * 7; // fallback estimate
  ctx.font = font;
  return ctx.measureText(text).width;
}

// ---------------------------------------------------------------------------
// Layout Computation
// ---------------------------------------------------------------------------

export interface LayoutOptions {
  width: number;
  height: number;
  sparkline?: boolean;
  /** Widest Y-axis label — used to auto-size left margin. */
  yLabelWidth?: number;
  /** Whether X-axis label is present (adds bottom margin). */
  hasXLabel?: boolean;
}

export function computeLayout(options: LayoutOptions): ChartLayout {
  const { width, height, sparkline = false } = options;

  if (sparkline) {
    const m = SPARKLINE_MARGIN;
    return {
      width,
      height,
      margin: m,
      plotArea: marginToRect(width, height, m),
    };
  }

  const margin = { ...DEFAULT_MARGIN };

  // Auto-size left margin from Y-axis label width
  if (options.yLabelWidth && options.yLabelWidth > 0) {
    margin.left = Math.max(margin.left, options.yLabelWidth + 12);
  }

  // Extra bottom margin for axis label (legend is outside SVG, handled by flex)
  if (options.hasXLabel) margin.bottom += 18;

  return {
    width,
    height,
    margin,
    plotArea: marginToRect(width, height, margin),
  };
}

function marginToRect(w: number, h: number, m: ChartMargin): Rect {
  return {
    x: m.left,
    y: m.top,
    width: Math.max(0, w - m.left - m.right),
    height: Math.max(0, h - m.top - m.bottom),
  };
}
