import type { ChartSeries, LegendPosition } from '../types.ts';

// ---------------------------------------------------------------------------
// Legend Renderer (HTML, not SVG — placed outside the SVG element)
// ---------------------------------------------------------------------------

export function renderLegend(
  container: HTMLElement,
  series: ChartSeries[],
  colorMap: Map<string, string>,
  hiddenSeries: Set<string>,
  position: LegendPosition,
  onToggle: (name: string) => void,
): void {
  if (position === 'none') {
    const existing = container.querySelector('.chart-legend');
    existing?.remove();
    return;
  }

  let legend = container.querySelector('.chart-legend') as HTMLElement | null;
  if (!legend) {
    legend = document.createElement('div');
    legend.className = 'chart-legend';
    if (position === 'top') {
      container.prepend(legend);
    } else {
      container.appendChild(legend);
    }
  }

  // Clear existing items
  legend.innerHTML = '';

  for (const s of series) {
    const item = document.createElement('span');
    item.className = 'chart-legend-item';
    if (hiddenSeries.has(s.name)) {
      item.setAttribute('data-hidden', '');
    }

    const dot = document.createElement('span');
    dot.className = 'chart-legend-dot';
    dot.style.backgroundColor = colorMap.get(s.name) ?? 'currentColor';
    item.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = s.name;
    item.appendChild(label);

    item.addEventListener('click', () => onToggle(s.name));
    legend.appendChild(item);
  }
}
