import type { ChartSeries } from '../types.ts';
import { LinearScale } from '../scales/linear-scale.ts';
import { reconcile, pathD } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Sparkline Renderer
// ---------------------------------------------------------------------------

export function renderSparkline(
  parent: SVGElement,
  width: number,
  height: number,
  series: ChartSeries[],
  color: string,
): void {
  // Use only the first series for sparklines
  const s = series[0];
  if (!s || s.data.length === 0) return;

  const xValues = s.data.map((_, i) => i);
  const yValues = s.data.map((p) => p.y);

  const xScale = new LinearScale([0, Math.max(1, xValues.length - 1)], [1, width - 1]);
  const yDomain = LinearScale.domainFromValues(yValues, 0.1);
  const yScale = new LinearScale(yDomain, [height - 1, 1]);

  const points: [number, number][] = s.data.map((p, i) => [
    xScale.scale(i),
    yScale.scale(p.y),
  ]);

  const d = pathD(points, false);

  reconcile(parent, 'sparkline', 'path', {
    d,
    fill: 'none',
    stroke: color,
    'stroke-width': '1.5',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
    class: 'chart-sparkline',
  });
}
