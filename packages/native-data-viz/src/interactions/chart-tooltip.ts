import type { BisectResult } from './bisect.ts';
import type { Scale } from '../scales/types.ts';
import { BandScale } from '../scales/band-scale.ts';

// ---------------------------------------------------------------------------
// Chart Tooltip — popover-based, pointer-following
// ---------------------------------------------------------------------------

export class ChartTooltip {
  #el: HTMLDivElement;
  #host: HTMLElement;
  #showTimer: ReturnType<typeof setTimeout> | null = null;
  #visible = false;

  constructor(host: HTMLElement) {
    this.#host = host;
    this.#el = document.createElement('div');
    this.#el.setAttribute('popover', 'manual');
    this.#el.className = 'chart-tooltip';
    host.appendChild(this.#el);
  }

  show(
    results: BisectResult[],
    xScale: Scale<any> | BandScale,
    yScale: Scale<number>,
    colorMap: Map<string, string>,
    pointerX: number,
    pointerY: number,
  ): void {
    if (this.#showTimer) clearTimeout(this.#showTimer);

    this.#showTimer = setTimeout(() => {
      this.#render(results, xScale, yScale, colorMap);
      this.#position(pointerX, pointerY);

      if (!this.#visible) {
        try { this.#el.showPopover(); } catch { /* already open */ }
        this.#visible = true;
      }
    }, this.#visible ? 0 : 100); // 100ms delay on initial show
  }

  hide(): void {
    if (this.#showTimer) {
      clearTimeout(this.#showTimer);
      this.#showTimer = null;
    }
    if (this.#visible) {
      try { this.#el.hidePopover(); } catch { /* already hidden */ }
      this.#visible = false;
    }
  }

  destroy(): void {
    this.hide();
    this.#el.remove();
  }

  #render(
    results: BisectResult[],
    xScale: Scale<any> | BandScale,
    yScale: Scale<number>,
    colorMap: Map<string, string>,
  ): void {
    if (results.length === 0) {
      this.#el.innerHTML = '';
      return;
    }

    // X value (same for all results)
    const xValue = results[0].point.x;
    const xFormatted = xScale instanceof BandScale
      ? xScale.format(String(xValue))
      : xScale.format(xValue as any);

    let html = `<div style="font-weight:500;margin-bottom:4px">${escapeHtml(xFormatted)}</div>`;

    for (const r of results) {
      const color = colorMap.get(r.seriesName) ?? 'currentColor';
      const yFormatted = r.point.label ?? yScale.format(r.point.y);
      html += `<div style="display:flex;align-items:center;gap:6px">`;
      html += `<span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>`;
      html += `<span>${escapeHtml(r.seriesName)}</span>`;
      html += `<span style="margin-left:auto;font-weight:500">${escapeHtml(yFormatted)}</span>`;
      html += `</div>`;
    }

    this.#el.innerHTML = html;
  }

  #position(pointerX: number, pointerY: number): void {
    const hostRect = this.#host.getBoundingClientRect();
    const tipWidth = this.#el.offsetWidth || 150;
    const tipHeight = this.#el.offsetHeight || 60;
    const offset = 12;

    // Position relative to viewport (fixed positioning)
    let left = pointerX + hostRect.left + offset;
    let top = pointerY + hostRect.top - tipHeight / 2;

    // Flip horizontally if tooltip would exceed container right edge
    if (left + tipWidth > hostRect.right) {
      left = pointerX + hostRect.left - tipWidth - offset;
    }

    // Clamp left edge to container
    left = Math.max(hostRect.left, left);

    // Clamp vertically to container bounds
    top = Math.max(hostRect.top, Math.min(hostRect.bottom - tipHeight, top));

    this.#el.style.left = `${left}px`;
    this.#el.style.top = `${top}px`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
