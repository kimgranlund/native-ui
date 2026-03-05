import type { ChartSeries, Rect, RenderOptions } from '../types.ts';
import { BandScale } from '../scales/band-scale.ts';
import type { Scale } from '../scales/types.ts';
import { reconcile, pruneKeys } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Bar Renderer
// ---------------------------------------------------------------------------

const BAR_RADIUS = 3;

/** Build a rect path with selective corner rounding. */
function roundedRectPath(
  x: number, y: number, w: number, h: number, r: number,
  roundTop: boolean, roundBottom: boolean,
): string {
  if (w <= 0 || h <= 0) return '';
  const cr = Math.min(r, w / 2, h / 2);
  const rt = roundTop ? cr : 0;
  const rb = roundBottom ? cr : 0;
  return [
    `M${x + rt},${y}`,
    `H${x + w - rt}`,
    rt ? `A${rt},${rt},0,0,1,${x + w},${y + rt}` : '',
    `V${y + h - rb}`,
    rb ? `A${rb},${rb},0,0,1,${x + w - rb},${y + h}` : '',
    `H${x + rb}`,
    rb ? `A${rb},${rb},0,0,1,${x},${y + h - rb}` : '',
    `V${y + rt}`,
    rt ? `A${rt},${rt},0,0,1,${x + rt},${y}` : '',
    'Z',
  ].join('');
}

export function renderBar(
  parent: SVGElement,
  _plotArea: Rect,
  series: ChartSeries[],
  xScale: Scale<any> | BandScale,
  yScale: Scale<number>,
  options: RenderOptions,
): void {
  let group = parent.querySelector('[data-key="bars"]') as SVGElement | null;
  if (!group) {
    group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-key', 'bars');
    parent.appendChild(group);
  }

  const validKeys = new Set<string>();
  const bandScale = xScale instanceof BandScale ? xScale : null;
  const bandwidth = bandScale?.bandwidth ?? 20;
  const seriesCount = series.length;
  const barWidth = options.stacked ? bandwidth : bandwidth / seriesCount;
  const baseline = yScale.scale(0);

  // For stacked bars, track cumulative values per x-position
  const cumulative = new Map<string, number>();

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const color = options.colorMap.get(s.name) ?? 'currentColor';
    const isFirst = si === 0;
    const isLast = si === series.length - 1;

    for (let pi = 0; pi < s.data.length; pi++) {
      const p = s.data[pi];
      const key = `bar-${s.name}-${pi}`;
      validKeys.add(key);

      const xLabel = String(p.x);
      const xPos = bandScale ? bandScale.scale(xLabel) : (xScale as Scale<number>).scale(p.x as number);

      let x: number;
      let y: number;
      let w: number;
      let h: number;

      if (options.horizontal) {
        const yPos = bandScale ? bandScale.scale(xLabel) : yScale.scale(p.x as number);
        const valEnd = (xScale as Scale<number>).scale(p.y);
        const valStart = (xScale as Scale<number>).scale(0);

        x = Math.min(valStart, valEnd);
        y = options.stacked ? yPos : yPos + si * barWidth;
        w = Math.abs(valEnd - valStart);
        h = barWidth;
      } else if (options.stacked) {
        const prevY = cumulative.get(xLabel) ?? 0;
        const newY = prevY + p.y;
        cumulative.set(xLabel, newY);

        const top = yScale.scale(newY);
        const bottom = yScale.scale(prevY);

        x = xPos;
        y = top;
        w = barWidth;
        h = Math.abs(bottom - top);
      } else {
        const top = yScale.scale(p.y);

        x = xPos + si * barWidth;
        y = Math.min(top, baseline);
        w = barWidth;
        h = Math.abs(baseline - top);
      }

      const animateDelay = options.animate ? `${pi * 30}ms` : '0ms';

      if (options.stacked) {
        // Stacked: only top segment gets top rounding, only bottom gets bottom rounding
        const roundTop = isLast;
        const roundBottom = isFirst;
        const d = roundedRectPath(x, y, Math.max(0, w), Math.max(0, h), BAR_RADIUS, roundTop, roundBottom);

        reconcile(group, key, 'path', {
          d,
          fill: color,
          class: 'chart-bar',
          style: options.animate ? `animation-delay: ${animateDelay}` : '',
        });
      } else {
        reconcile(group, key, 'rect', {
          x: String(x),
          y: String(y),
          width: String(Math.max(0, w)),
          height: String(Math.max(0, h)),
          fill: color,
          rx: String(BAR_RADIUS),
          class: 'chart-bar',
          style: options.animate ? `animation-delay: ${animateDelay}` : '',
        });
      }
    }
  }

  pruneKeys(group, validKeys);
}
