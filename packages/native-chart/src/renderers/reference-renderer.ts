import type { Rect, ReferenceLine } from '../types.ts';
import type { Scale } from '../scales/types.ts';
import { BandScale } from '../scales/band-scale.ts';
import { reconcile, pruneKeys, svgEl } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Reference Line Renderer
// ---------------------------------------------------------------------------

const DASH_PATTERNS: Record<string, string> = {
  solid: 'none',
  dashed: '6 4',
  dotted: '2 3',
};

export function renderReferenceLines(
  parent: SVGElement,
  plotArea: Rect,
  xScale: Scale<any> | BandScale,
  yScale: Scale<number>,
  lines: ReferenceLine[],
): void {
  if (lines.length === 0) {
    parent.querySelector('[data-key="ref-lines"]')?.remove();
    return;
  }

  let group = parent.querySelector('[data-key="ref-lines"]') as SVGElement | null;
  if (!group) {
    group = svgEl('g', { 'data-key': 'ref-lines', class: 'chart-ref-lines' });
    parent.appendChild(group);
  }

  const validKeys = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `ref-${i}`;
    const labelKey = `ref-label-${i}`;
    validKeys.add(key);

    const color = line.color ?? 'var(--n-ink-muted, #999)';
    const dash = DASH_PATTERNS[line.style ?? 'dashed'] ?? DASH_PATTERNS.dashed;

    if (line.axis === 'y') {
      const y = yScale.scale(line.value as number);

      // Clamp to plot area
      if (y < plotArea.y || y > plotArea.y + plotArea.height) continue;

      reconcile(group, key, 'line', {
        x1: String(plotArea.x),
        y1: String(y),
        x2: String(plotArea.x + plotArea.width),
        y2: String(y),
        stroke: color,
        'stroke-width': '1.5',
        'stroke-dasharray': dash,
        class: 'chart-ref-line',
      });

      if (line.label) {
        validKeys.add(labelKey);
        reconcile(group, labelKey, 'text', {
          x: String(plotArea.x + plotArea.width + 4),
          y: String(y + 3),
          fill: color,
          'font-size': '10',
          'font-family': 'inherit',
          class: 'chart-ref-label',
        }).textContent = line.label;
      }
    } else {
      // x-axis reference line
      const bandwidth = xScale instanceof BandScale ? xScale.bandwidth : 0;
      const x = xScale.scale(line.value as any) + bandwidth / 2;

      if (x < plotArea.x || x > plotArea.x + plotArea.width) continue;

      reconcile(group, key, 'line', {
        x1: String(x),
        y1: String(plotArea.y),
        x2: String(x),
        y2: String(plotArea.y + plotArea.height),
        stroke: color,
        'stroke-width': '1.5',
        'stroke-dasharray': dash,
        class: 'chart-ref-line',
      });

      if (line.label) {
        validKeys.add(labelKey);
        reconcile(group, labelKey, 'text', {
          x: String(x),
          y: String(plotArea.y - 6),
          fill: color,
          'font-size': '10',
          'font-family': 'inherit',
          'text-anchor': 'middle',
          class: 'chart-ref-label',
        }).textContent = line.label;
      }
    }
  }

  pruneKeys(group, validKeys);
}
