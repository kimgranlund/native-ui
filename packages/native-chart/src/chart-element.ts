import { signal } from '@nonoun/native-ui';
import { NativeElement } from '@nonoun/native-ui';
import { ChartStore } from './chart-store.ts';
import { renderLine } from './renderers/line-renderer.ts';
import { renderBar } from './renderers/bar-renderer.ts';
import { renderScatter } from './renderers/scatter-renderer.ts';
import { renderSparkline } from './renderers/sparkline-renderer.ts';
import { renderXAxis, renderYAxis } from './renderers/axis-renderer.ts';
import { renderGrid } from './renderers/grid-renderer.ts';
import { renderReferenceLines } from './renderers/reference-renderer.ts';
import { renderLegend } from './renderers/legend-renderer.ts';
import { svgEl } from './renderers/svg-utils.ts';
import { Crosshair } from './interactions/crosshair.ts';
import { ChartTooltip } from './interactions/chart-tooltip.ts';
import { bisect, bisectAll } from './interactions/bisect.ts';
import type { ChartData, ChartType, ChartPalette, LegendPosition, GridMode, RenderOptions, ReferenceLine } from './types.ts';

// ---------------------------------------------------------------------------
// NChart Element
// ---------------------------------------------------------------------------

export class NChart extends NativeElement {
  static observedAttributes = [
    'type', 'src', 'palette', 'stacked', 'smooth', 'area', 'horizontal',
    'legend', 'grid', 'animate', 'aspect', 'x-label', 'y-label', 'disabled', 'average',
  ];

  #store = new ChartStore();
  #svg: SVGSVGElement | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #crosshair: Crosshair | null = null;
  #tooltip: ChartTooltip | null = null;
  #src = signal<string | null>(null);
  #xLabel = signal<string | null>(null);
  #yLabel = signal<string | null>(null);
  #abortController: AbortController | null = null;
  #disabled = signal(false);

  get store(): ChartStore { return this.#store; }
  get loading(): boolean { return false; } // TODO: wire to fetch state
  get error(): string | null { return null; }

  get data(): ChartData | null { return this.#store.data.value; }
  set data(value: ChartData | null) { this.#store.data.value = value; }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get referenceLines(): ReferenceLine[] { return this.#store.referenceLines.value; }
  set referenceLines(val: ReferenceLine[]) { this.#store.referenceLines.value = val; }

  get palette(): ChartPalette { return this.#store.palette.value; }
  set palette(val: ChartPalette) {
    this.#store.palette.value = val;
    this.setAttribute('palette', val);
  }

  get average(): boolean { return this.#store.showAverage.value; }
  set average(val: boolean) {
    this.#store.showAverage.value = val;
    this.toggleAttribute('average', val);
  }

  // ── Lifecycle ──

  override setup(): void {
    super.setup();

    // Create SVG — no width/height attrs, CSS handles sizing via flex
    this.#svg = svgEl('svg', {
      role: 'img',
      'aria-label': 'Chart',
    }) as SVGSVGElement;
    this.prepend(this.#svg);

    // Tooltip
    this.#tooltip = new ChartTooltip(this);

    // Crosshair
    this.#crosshair = new Crosshair(this.#svg, this.#store.layout.value.plotArea);

    // Seed dimensions from host element so first render uses actual size
    // instead of 400×300 defaults (ResizeObserver fires asynchronously).
    const rect = this.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.#store.width.value = rect.width;
      this.#store.height.value = rect.height;
    }

    // ResizeObserver
    this.#resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.#store.width.value = width;
          this.#store.height.value = height;
        }
      }
    });
    this.#resizeObserver.observe(this.#svg);

    // Sync attributes to store
    this.#syncAttributes();

    // Data-loading effect: watch src signal
    this.addEffect(() => {
      const url = this.#src.value;
      if (!url) return;
      this.#fetchData(url);
    });

    // Main render effect
    this.addEffect(() => {
      const data = this.#store.data.value;
      if (!data) return;

      const type = this.#store.type.value;
      const layout = this.#store.layout.value;
      const visibleSeries = this.#store.visibleSeries.value;
      const xScale = this.#store.xScale.value;
      const yScale = this.#store.yScale.value;
      const colorMap = this.#store.colorMap.value;
      const gridMode = this.#store.grid.value;
      const legendPos = this.#store.legend.value;

      if (!this.#svg) return;

      // Update SVG viewBox — dimensions come from ResizeObserver on the SVG itself
      this.#svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);

      // Update aria-label
      const seriesNames = data.series.map((s) => s.name).join(', ');
      this.#svg.setAttribute('aria-label', `${type} chart: ${seriesNames}`);

      const renderOpts: RenderOptions = {
        smooth: this.#store.smooth.value,
        area: this.#store.area.value,
        stacked: this.#store.stacked.value,
        horizontal: this.#store.horizontal.value,
        animate: this.#store.animate.value,
        colorMap,
      };

      // Render based on type
      if (type === 'sparkline') {
        renderSparkline(
          this.#svg,
          layout.width,
          layout.height,
          visibleSeries,
          colorMap.values().next().value ?? 'currentColor',
        );
        return; // No axes, grid, legend for sparklines
      }

      // Grid (rendered first, behind data)
      renderGrid(this.#svg, layout.plotArea, xScale, yScale, gridMode);

      // Data
      switch (type) {
        case 'line':
          renderLine(this.#svg, layout.plotArea, visibleSeries, xScale, yScale, renderOpts);
          break;
        case 'bar':
          renderBar(this.#svg, layout.plotArea, visibleSeries, xScale, yScale, renderOpts);
          break;
        case 'scatter':
          renderScatter(this.#svg, layout.plotArea, visibleSeries, xScale, yScale, renderOpts);
          break;
      }

      // Axes
      renderXAxis(this.#svg, layout.plotArea, xScale, this.#xLabel.value ?? undefined);
      renderYAxis(this.#svg, layout.plotArea, yScale, this.#yLabel.value ?? undefined);

      // Reference lines (after data, above grid)
      const refLines = this.#store.allReferenceLines.value;
      renderReferenceLines(this.#svg, layout.plotArea, xScale, yScale, refLines);

      // Update crosshair plot area
      this.#crosshair?.updatePlotArea(layout.plotArea);

      // Legend (HTML, outside SVG)
      const hiddenSeries = this.#store.hiddenSeries.value;
      renderLegend(
        this,
        data.series,
        colorMap,
        hiddenSeries,
        legendPos,
        (name) => {
          this.#store.toggleSeries(name);
          this.dispatchEvent(new CustomEvent('native:chart-legend-toggle', {
            bubbles: true,
            composed: true,
            detail: { series: name, visible: !hiddenSeries.has(name) },
          }));
        },
      );
    });

    // Pointer interaction
    this.#svg.addEventListener('pointermove', this.#onPointerMove);
    this.#svg.addEventListener('pointerleave', this.#onPointerLeave);
    this.#svg.addEventListener('click', this.#onClick);
  }

  override teardown(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#tooltip?.destroy();
    this.#tooltip = null;
    this.#crosshair = null;
    this.#abortController?.abort();
    this.#abortController = null;
    this.#svg?.removeEventListener('pointermove', this.#onPointerMove);
    this.#svg?.removeEventListener('pointerleave', this.#onPointerLeave);
    this.#svg?.removeEventListener('click', this.#onClick);
    this.#svg?.remove();
    this.#svg = null;
    // Remove legend
    this.querySelector('.chart-legend')?.remove();
    super.teardown();
  }

  override attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    switch (name) {
      case 'type': this.#store.type.value = (val ?? 'line') as ChartType; break;
      case 'src': this.#src.value = val; break;
      case 'palette': this.#store.palette.value = (val ?? 'default') as ChartPalette; break;
      case 'stacked': this.#store.stacked.value = val !== null; break;
      case 'smooth': this.#store.smooth.value = val !== null; break;
      case 'area': this.#store.area.value = val !== null; break;
      case 'horizontal': this.#store.horizontal.value = val !== null; break;
      case 'legend': this.#store.legend.value = (val ?? 'bottom') as LegendPosition; break;
      case 'grid': this.#store.grid.value = (val ?? 'horizontal') as GridMode; break;
      case 'animate': this.#store.animate.value = val !== null; break;
      case 'x-label': this.#xLabel.value = val; break;
      case 'y-label': this.#yLabel.value = val; break;
      case 'disabled': this.#disabled.value = val !== null; break;
      case 'average': this.#store.showAverage.value = val !== null; break;
      case 'aspect': this.#applyAspect(val); break;
    }
  }

  // ── Private ──

  #syncAttributes(): void {
    const type = this.getAttribute('type');
    if (type) this.#store.type.value = type as ChartType;

    const palette = this.getAttribute('palette');
    if (palette) this.#store.palette.value = palette as ChartPalette;

    this.#store.stacked.value = this.hasAttribute('stacked');
    this.#store.smooth.value = this.hasAttribute('smooth');
    this.#store.area.value = this.hasAttribute('area');
    this.#store.horizontal.value = this.hasAttribute('horizontal');
    this.#disabled.value = this.hasAttribute('disabled');
    this.#store.showAverage.value = this.hasAttribute('average');

    const legend = this.getAttribute('legend');
    if (legend) this.#store.legend.value = legend as LegendPosition;

    const grid = this.getAttribute('grid');
    if (grid) this.#store.grid.value = grid as GridMode;

    if (!this.hasAttribute('animate')) this.#store.animate.value = true;

    this.#src.value = this.getAttribute('src');
    this.#xLabel.value = this.getAttribute('x-label');
    this.#yLabel.value = this.getAttribute('y-label');
    this.#applyAspect(this.getAttribute('aspect'));
  }

  #applyAspect(val: string | null): void {
    if (!val) return;
    const parts = val.split(':').map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      this.style.aspectRatio = `${parts[0]} / ${parts[1]}`;
    }
  }

  async #fetchData(url: string): Promise<void> {
    this.#abortController?.abort();
    const controller = new AbortController();
    this.#abortController = controller;

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!res.ok) return;
      const json = await res.json();
      if (controller.signal.aborted) return;
      this.#store.data.value = json as ChartData;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Silently fail — consumer can check error property
    }
  }

  #onPointerMove = (e: PointerEvent): void => {
    if (this.#disabled.value) return;
    if (this.#store.type.value === 'sparkline') return;

    const svg = this.#svg;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const plotArea = this.#store.layout.value.plotArea;

    // Only show crosshair within plot area
    if (x < plotArea.x || x > plotArea.x + plotArea.width ||
        y < plotArea.y || y > plotArea.y + plotArea.height) {
      this.#crosshair?.hide();
      this.#crosshair?.hideMarker();
      this.#tooltip?.hide();
      return;
    }

    const visibleSeries = this.#store.visibleSeries.value;
    const xScale = this.#store.xScale.value;
    const yScale = this.#store.yScale.value;
    const colorMap = this.#store.colorMap.value;

    // Crosshair
    this.#crosshair?.show(x);

    // Bisect
    const nearest = bisect(visibleSeries, x, y, xScale, yScale);
    if (nearest && nearest.distance < 50) {
      const px = xScale.scale(nearest.point.x as any);
      const py = yScale.scale(nearest.point.y);
      const color = colorMap.get(nearest.seriesName) ?? 'currentColor';
      this.#crosshair?.showMarker(px, py, color);

      // Tooltip with all series at this x
      const allResults = bisectAll(visibleSeries, x, xScale);
      this.#tooltip?.show(allResults, xScale, yScale, colorMap, x, y);

      // Event
      this.dispatchEvent(new CustomEvent('native:chart-hover', {
        bubbles: true,
        composed: true,
        detail: {
          point: nearest.point,
          series: nearest.seriesName,
          x: px,
          y: py,
        },
      }));
    } else {
      this.#crosshair?.hideMarker();
      this.#tooltip?.hide();
    }
  };

  #onPointerLeave = (): void => {
    this.#crosshair?.hide();
    this.#crosshair?.hideMarker();
    this.#tooltip?.hide();
  };

  #onClick = (e: MouseEvent): void => {
    if (this.#disabled.value) return;
    if (this.#store.type.value === 'sparkline') return;

    const svg = this.#svg;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const visibleSeries = this.#store.visibleSeries.value;
    const xScale = this.#store.xScale.value;
    const yScale = this.#store.yScale.value;

    const nearest = bisect(visibleSeries, x, y, xScale, yScale);
    if (nearest && nearest.distance < 30) {
      this.dispatchEvent(new CustomEvent('native:chart-select', {
        bubbles: true,
        composed: true,
        detail: {
          point: nearest.point,
          series: nearest.seriesName,
        },
      }));
    }
  };
}
