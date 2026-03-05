import type { ChartSeries, Rect, RenderOptions } from '../types.ts';
import type { Scale } from '../scales/types.ts';
import { svgEl, reconcile, pruneKeys, pathD, pathLength } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Line Renderer
// ---------------------------------------------------------------------------

export function renderLine(
  parent: SVGElement,
  _plotArea: Rect,
  series: ChartSeries[],
  xScale: Scale<any>,
  yScale: Scale<number>,
  options: RenderOptions,
): void {
  let group = parent.querySelector('[data-key="lines"]') as SVGElement | null;
  if (!group) {
    group = svgEl('g', { 'data-key': 'lines' });
    parent.appendChild(group);
  }

  const validKeys = new Set<string>();

  if (options.stacked) {
    renderStacked(group, series, xScale, yScale, options, validKeys);
  } else {
    renderUnstacked(group, series, xScale, yScale, options, validKeys);
  }

  pruneKeys(group, validKeys);
}

// ---------------------------------------------------------------------------
// Unstacked (default)
// ---------------------------------------------------------------------------

function renderUnstacked(
  group: SVGElement,
  series: ChartSeries[],
  xScale: Scale<any>,
  yScale: Scale<number>,
  options: RenderOptions,
  validKeys: Set<string>,
): void {
  for (const s of series) {
    const color = options.colorMap.get(s.name) ?? 'currentColor';
    const points: [number, number][] = s.data.map((p) => [
      xScale.scale(p.x as any),
      yScale.scale(p.y),
    ]);

    if (points.length === 0) continue;

    const key = `line-${s.name}`;
    validKeys.add(key);

    const d = pathD(points, options.smooth);
    const attrs: Record<string, string> = {
      d,
      fill: 'none',
      stroke: color,
      'stroke-width': '2',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      class: 'chart-line',
    };

    if (options.animate) {
      const len = Math.ceil(pathLength(points));
      attrs['stroke-dasharray'] = String(len);
      attrs['style'] = `--n-chart-path-length: ${len}`;
    }

    reconcile(group, key, 'path', attrs);

    // Area fill — reuse the same curve path so fill edge matches line exactly
    if (options.area) {
      const areaKey = `area-${s.name}`;
      validKeys.add(areaKey);

      const baseline = yScale.scale(0);
      const lastPt = points[points.length - 1];
      const firstPt = points[0];
      const areaD = `${d}L${lastPt[0]},${baseline}L${firstPt[0]},${baseline}Z`;

      reconcile(group, areaKey, 'path', {
        d: areaD,
        fill: color,
        opacity: '0.15',
        stroke: 'none',
        class: 'chart-area',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Stacked — cumulative y-offsets, area fills between adjacent series
// ---------------------------------------------------------------------------

function renderStacked(
  group: SVGElement,
  series: ChartSeries[],
  xScale: Scale<any>,
  yScale: Scale<number>,
  options: RenderOptions,
  validKeys: Set<string>,
): void {
  // Track cumulative y value per x-position (keyed by stringified x)
  const cumulative = new Map<string, number>();

  // Store previous series' pixel-space points for area fill bottom edge
  let prevPoints: [number, number][] | null = null;

  for (const s of series) {
    const color = options.colorMap.get(s.name) ?? 'currentColor';

    // Compute stacked y values: own y + sum of all previous series at same x
    const points: [number, number][] = s.data.map((p) => {
      const xKey = String(p.x);
      const prev = cumulative.get(xKey) ?? 0;
      const stackedY = prev + p.y;
      cumulative.set(xKey, stackedY);
      return [xScale.scale(p.x as any), yScale.scale(stackedY)] as [number, number];
    });

    if (points.length === 0) continue;

    // Line path
    const key = `line-${s.name}`;
    validKeys.add(key);

    const d = pathD(points, options.smooth);
    const attrs: Record<string, string> = {
      d,
      fill: 'none',
      stroke: color,
      'stroke-width': '2',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      class: 'chart-line',
    };

    if (options.animate) {
      const len = Math.ceil(pathLength(points));
      attrs['stroke-dasharray'] = String(len);
      attrs['style'] = `--n-chart-path-length: ${len}`;
    }

    reconcile(group, key, 'path', attrs);

    // Area fill between this series and the previous one (or baseline)
    if (options.area) {
      const areaKey = `area-${s.name}`;
      validKeys.add(areaKey);

      let areaD: string;

      if (prevPoints && prevPoints.length > 0) {
        // Fill between current line and previous series line
        const reversed = [...prevPoints].reverse();
        const bottomD = pathD(reversed, options.smooth);
        // bottomD starts with M — replace with L to continue the path
        areaD = `${d}L${bottomD.slice(1)}Z`;
      } else {
        // First series: fill down to baseline
        const baseline = yScale.scale(0);
        const lastPt = points[points.length - 1];
        const firstPt = points[0];
        areaD = `${d}L${lastPt[0]},${baseline}L${firstPt[0]},${baseline}Z`;
      }

      reconcile(group, areaKey, 'path', {
        d: areaD,
        fill: color,
        opacity: '0.4',
        stroke: 'none',
        class: 'chart-area',
      });
    }

    prevPoints = points;
  }
}
