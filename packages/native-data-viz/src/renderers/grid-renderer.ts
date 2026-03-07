import type { Rect, GridMode } from '../types.ts';
import type { Scale } from '../scales/types.ts';
import { BandScale } from '../scales/band-scale.ts';
import { svgEl, reconcile, pruneKeys } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Grid Renderer
// ---------------------------------------------------------------------------

export function renderGrid(
  parent: SVGElement,
  plotArea: Rect,
  xScale: Scale<any> | BandScale,
  yScale: Scale<number>,
  mode: GridMode,
): void {
  if (mode === 'none') {
    const existing = parent.querySelector('[data-key="grid"]');
    existing?.remove();
    return;
  }

  let group = parent.querySelector('[data-key="grid"]') as SVGElement | null;
  if (!group) {
    group = svgEl('g', { 'data-key': 'grid', class: 'chart-grid' });
    // Insert before data elements so grid is behind
    const firstChild = parent.firstChild;
    if (firstChild) parent.insertBefore(group, firstChild);
    else parent.appendChild(group);
  }

  const validKeys = new Set<string>();

  // Horizontal grid lines (from Y ticks)
  if (mode === 'horizontal' || mode === 'both') {
    const yTicks = yScale.ticks(5);
    for (let i = 0; i < yTicks.length; i++) {
      const y = yScale.scale(yTicks[i]);
      const key = `grid-h-${i}`;
      validKeys.add(key);
      reconcile(group, key, 'line', {
        x1: String(plotArea.x),
        y1: String(y),
        x2: String(plotArea.x + plotArea.width),
        y2: String(y),
      });
    }
  }

  // Vertical grid lines (from X ticks)
  if (mode === 'vertical' || mode === 'both') {
    const xTicks = xScale instanceof BandScale ? xScale.ticks() : xScale.ticks(6);
    const bandwidth = xScale instanceof BandScale ? xScale.bandwidth : 0;
    for (let i = 0; i < xTicks.length; i++) {
      const x = xScale.scale(xTicks[i]) + bandwidth / 2;
      const key = `grid-v-${i}`;
      validKeys.add(key);
      reconcile(group, key, 'line', {
        x1: String(x),
        y1: String(plotArea.y),
        x2: String(x),
        y2: String(plotArea.y + plotArea.height),
      });
    }
  }

  pruneKeys(group, validKeys);
}
