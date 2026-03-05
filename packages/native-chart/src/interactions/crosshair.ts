import type { Rect } from '../types.ts';
import { reconcile } from '../renderers/svg-utils.ts';

// ---------------------------------------------------------------------------
// Crosshair — vertical line following pointer
// ---------------------------------------------------------------------------

export class Crosshair {
  #svg: SVGElement;
  #plotArea: Rect;

  constructor(svg: SVGElement, plotArea: Rect) {
    this.#svg = svg;
    this.#plotArea = plotArea;
  }

  updatePlotArea(plotArea: Rect): void {
    this.#plotArea = plotArea;
  }

  show(x: number): void {
    const pa = this.#plotArea;
    // Clamp to plot area
    const cx = Math.max(pa.x, Math.min(pa.x + pa.width, x));

    reconcile(this.#svg, 'crosshair', 'line', {
      x1: String(cx),
      y1: String(pa.y),
      x2: String(cx),
      y2: String(pa.y + pa.height),
      class: 'chart-crosshair',
    });
  }

  hide(): void {
    const el = this.#svg.querySelector('[data-key="crosshair"]');
    el?.remove();
  }

  /** Show a hover marker circle at the given position. */
  showMarker(x: number, y: number, color: string): void {
    reconcile(this.#svg, 'hover-marker', 'circle', {
      cx: String(x),
      cy: String(y),
      r: '5',
      fill: 'white',
      stroke: color,
      'stroke-width': '2',
      class: 'chart-hover-marker',
    });
  }

  hideMarker(): void {
    const el = this.#svg.querySelector('[data-key="hover-marker"]');
    el?.remove();
  }
}
