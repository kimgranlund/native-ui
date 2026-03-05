import type { Rect } from '../types.ts';
import type { Scale } from '../scales/types.ts';
import { BandScale } from '../scales/band-scale.ts';
import { reconcile, pruneKeys, svgEl } from './svg-utils.ts';

// ---------------------------------------------------------------------------
// Axis Renderers
// ---------------------------------------------------------------------------

export function renderXAxis(
  parent: SVGElement,
  plotArea: Rect,
  scale: Scale<any> | BandScale,
  label?: string,
): void {
  let group = parent.querySelector('[data-key="x-axis"]') as SVGElement | null;
  if (!group) {
    group = svgEl('g', { 'data-key': 'x-axis', class: 'chart-axis' });
    parent.appendChild(group);
  }

  const y = plotArea.y + plotArea.height;
  const validKeys = new Set<string>();

  // Baseline
  const baseKey = 'x-baseline';
  validKeys.add(baseKey);
  reconcile(group, baseKey, 'line', {
    x1: String(plotArea.x),
    y1: String(y),
    x2: String(plotArea.x + plotArea.width),
    y2: String(y),
  });

  // Ticks
  const ticks = scale instanceof BandScale ? scale.ticks() : scale.ticks(6);
  const bandwidth = scale instanceof BandScale ? scale.bandwidth : 0;

  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i];
    const x = scale.scale(tick) + bandwidth / 2;
    const formatted = scale instanceof BandScale ? scale.format(tick) : scale.format(tick);

    const tickKey = `x-tick-${i}`;
    validKeys.add(tickKey);
    reconcile(group, tickKey, 'line', {
      x1: String(x),
      y1: String(y),
      x2: String(x),
      y2: String(y + 5),
    });

    const labelKey = `x-label-${i}`;
    validKeys.add(labelKey);
    const textEl = reconcile(group, labelKey, 'text', {
      x: String(x),
      y: String(y + 18),
      'text-anchor': 'middle',
      'dominant-baseline': 'auto',
    });
    textEl.textContent = formatted;
  }

  // Axis label
  if (label) {
    const axisLabelKey = 'x-axis-label';
    validKeys.add(axisLabelKey);
    const labelEl = reconcile(group, axisLabelKey, 'text', {
      x: String(plotArea.x + plotArea.width / 2),
      y: String(y + 34),
      'text-anchor': 'middle',
      'font-weight': '500',
    });
    labelEl.textContent = label;
  }

  pruneKeys(group, validKeys);
}

export function renderYAxis(
  parent: SVGElement,
  plotArea: Rect,
  scale: Scale<number>,
  label?: string,
): void {
  let group = parent.querySelector('[data-key="y-axis"]') as SVGElement | null;
  if (!group) {
    group = svgEl('g', { 'data-key': 'y-axis', class: 'chart-axis' });
    parent.appendChild(group);
  }

  const x = plotArea.x;
  const validKeys = new Set<string>();

  // Ticks
  const ticks = scale.ticks(5);
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i];
    const y = scale.scale(tick);
    const formatted = scale.format(tick);

    const tickKey = `y-tick-${i}`;
    validKeys.add(tickKey);
    reconcile(group, tickKey, 'line', {
      x1: String(x - 5),
      y1: String(y),
      x2: String(x),
      y2: String(y),
    });

    const labelKey = `y-label-${i}`;
    validKeys.add(labelKey);
    const textEl = reconcile(group, labelKey, 'text', {
      x: String(x - 8),
      y: String(y),
      'text-anchor': 'end',
      'dominant-baseline': 'middle',
    });
    textEl.textContent = formatted;
  }

  // Axis label (rotated)
  if (label) {
    const axisLabelKey = 'y-axis-label';
    validKeys.add(axisLabelKey);
    const ly = plotArea.y + plotArea.height / 2;
    const labelEl = reconcile(group, axisLabelKey, 'text', {
      x: String(12),
      y: String(ly),
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-weight': '500',
      transform: `rotate(-90, 12, ${ly})`,
    });
    labelEl.textContent = label;
  }

  pruneKeys(group, validKeys);
}
