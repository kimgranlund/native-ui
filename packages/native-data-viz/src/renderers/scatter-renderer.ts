import type { ChartSeries, Rect, RenderOptions } from '../types.ts';
import type { Scale } from '../scales/types.ts';
import { reconcile, pruneKeys } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Scatter / Bubble Renderer
// ---------------------------------------------------------------------------

const DEFAULT_RADIUS = 4;
const MIN_RADIUS = 2;
const MAX_RADIUS = 24;

export function renderScatter(
  parent: SVGElement,
  _plotArea: Rect,
  series: ChartSeries[],
  xScale: Scale<any>,
  yScale: Scale<number>,
  options: RenderOptions,
): void {
  let group = parent.querySelector('[data-key="scatter"]') as SVGElement | null;
  if (!group) {
    group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-key', 'scatter');
    parent.appendChild(group);
  }

  const validKeys = new Set<string>();

  // Find r range for bubble sizing
  let rMin = Infinity;
  let rMax = -Infinity;
  for (const s of series) {
    for (const p of s.data) {
      if (p.r != null) {
        if (p.r < rMin) rMin = p.r;
        if (p.r > rMax) rMax = p.r;
      }
    }
  }
  const hasR = rMin !== Infinity;

  for (const s of series) {
    const color = options.colorMap.get(s.name) ?? 'currentColor';

    for (let i = 0; i < s.data.length; i++) {
      const p = s.data[i];
      const key = `pt-${s.name}-${i}`;
      validKeys.add(key);

      const cx = xScale.scale(p.x as any);
      const cy = yScale.scale(p.y);

      let r = DEFAULT_RADIUS;
      if (hasR && p.r != null && rMax > rMin) {
        // Scale radius linearly
        const t = (p.r - rMin) / (rMax - rMin);
        r = MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
      }

      reconcile(group, key, 'circle', {
        cx: String(cx),
        cy: String(cy),
        r: String(r),
        fill: color,
        opacity: '0.7',
        class: 'chart-point',
      });
    }
  }

  pruneKeys(group, validKeys);
}
