import { signal } from '@nonoun/native-core';
import { untrack } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';

/**
 * Pagination control rendering page buttons with ellipsis and prev/next navigation.
 * @attr {number} total - Total number of pages
 * @attr {number} value - Current page number (1-based)
 * @attr {number} siblings - Number of sibling pages shown around current
 * @attr {number} boundaries - Number of boundary pages shown at start/end
 * @attr {boolean} disabled - Disables all pagination buttons
 * @fires native:change - Fired when page changes with `{ value }` detail
 */
export class NPagination extends NativeElement {
  static observedAttributes = ['total', 'value', 'siblings', 'boundaries', 'disabled'];

  #internals: ElementInternals;
  #total = signal(1);
  #value = signal(1);
  #siblings = signal(1);
  #boundaries = signal(1);
  #disabled = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'navigation';
  }

  // ── Properties ──

  get total(): number { return this.#total.value; }
  set total(val: number) { this.#total.value = Math.max(1, val); }

  get value(): number { return this.#value.value; }
  set value(val: number) { this.#value.value = Math.min(Math.max(1, val), this.#total.value); }

  get siblings(): number { return this.#siblings.value; }
  set siblings(val: number) { this.#siblings.value = Math.max(0, val); }

  get boundaries(): number { return this.#boundaries.value; }
  set boundaries(val: number) { this.#boundaries.value = Math.max(0, val); }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  // ── Attributes ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    const num = parseInt(val ?? '', 10);
    switch (name) {
      case 'total': this.#total.value = Math.max(1, isNaN(num) ? 1 : num); break;
      case 'value': this.#value.value = Math.min(Math.max(1, isNaN(num) ? 1 : num), this.#total.value); break;
      case 'siblings': this.#siblings.value = Math.max(0, isNaN(num) ? 1 : num); break;
      case 'boundaries': this.#boundaries.value = Math.max(0, isNaN(num) ? 1 : num); break;
      case 'disabled': this.#disabled.value = val !== null; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    const label = this.getAttribute('aria-label') ?? 'Pagination';
    this.#internals.ariaLabel = label;
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', label);
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
    this.addEffect(() => { this.#render(); });
    // WHY: Separate effect toggles disabled on existing buttons without rebuilding DOM
    this.addEffect(() => {
      const disabled = this.#disabled.value;
      const current = untrack(() => this.#value.value);
      const total = untrack(() => this.#total.value);
      for (const btn of this.querySelectorAll<HTMLElement>('n-button')) {
        const label = btn.getAttribute('aria-label') ?? '';
        if (label === 'Previous page') {
          btn.toggleAttribute('disabled', disabled || current <= 1);
        } else if (label === 'Next page') {
          btn.toggleAttribute('disabled', disabled || current >= total);
        } else {
          btn.toggleAttribute('disabled', disabled);
        }
      }
    });
  }

  teardown(): void {
    // WHY: Clear rendered children to release event listeners on dynamic buttons
    this.textContent = '';
    super.teardown();
  }

  // ── Page range calculation ──

  #getPages(): (number | 'ellipsis')[] {
    const total = this.#total.value;
    const current = this.#value.value;
    const siblings = this.#siblings.value;
    const boundaries = this.#boundaries.value;

    if (total <= (boundaries * 2) + (siblings * 2) + 3) {
      // Show all pages
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];

    // Left boundary
    for (let i = 1; i <= boundaries; i++) pages.push(i);

    // Left ellipsis
    const leftSibStart = Math.max(boundaries + 1, current - siblings);
    if (leftSibStart > boundaries + 1) {
      pages.push('ellipsis');
    }

    // Siblings + current
    const rightSibEnd = Math.min(total - boundaries, current + siblings);
    for (let i = leftSibStart; i <= rightSibEnd; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    // Right ellipsis
    if (rightSibEnd < total - boundaries) {
      pages.push('ellipsis');
    }

    // Right boundary
    for (let i = total - boundaries + 1; i <= total; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    return pages;
  }

  // ── Helpers ──

  #createButton(label: string, ariaLabel: string, disabled: boolean, onClick: () => void): HTMLElement {
    const btn = document.createElement('n-button');
    btn.setAttribute('variant', 'ghost');
    btn.setAttribute('aria-label', ariaLabel);
    if (disabled) btn.setAttribute('disabled', '');
    btn.textContent = label;
    btn.addEventListener('native:press', onClick);
    return btn;
  }

  #createIconButton(iconName: string, ariaLabel: string, disabled: boolean, onClick: () => void): HTMLElement {
    const btn = document.createElement('n-button');
    btn.setAttribute('variant', 'ghost');
    btn.setAttribute('aria-label', ariaLabel);
    if (disabled) btn.setAttribute('disabled', '');
    const icon = document.createElement('n-icon');
    icon.setAttribute('name', iconName);
    btn.appendChild(icon);
    btn.addEventListener('native:press', onClick);
    return btn;
  }

  // ── Render ──

  #render(): void {
    const total = this.#total.value;
    const current = this.#value.value;
    // WHY: untrack disabled — separate effect handles disabled toggle without full rebuild
    const disabled = untrack(() => this.#disabled.value);
    const pages = this.#getPages();

    // Clear
    this.textContent = '';

    // Prev button
    this.appendChild(
      this.#createIconButton('caret-left', 'Previous page', disabled || current <= 1, () => this.#goTo(current - 1))
    );

    // Page buttons
    for (const page of pages) {
      if (page === 'ellipsis') {
        const el = document.createElement('span');
        el.classList.add('n-pagination-ellipsis');
        el.textContent = '\u2026'; // …
        this.appendChild(el);
      } else {
        const btn = this.#createButton(String(page), `Page ${page}`, disabled, () => this.#goTo(page));
        if (page === current) btn.setAttribute('aria-current', 'page');
        this.appendChild(btn);
      }
    }

    // Next button
    this.appendChild(
      this.#createIconButton('caret-right', 'Next page', disabled || current >= total, () => this.#goTo(current + 1))
    );
  }

  #goTo(page: number): void {
    if (this.#disabled.value) return;
    const clamped = Math.min(Math.max(1, page), this.#total.value);
    if (clamped === this.#value.value) return;
    this.#value.value = clamped;
    this.setAttribute('value', String(clamped));
    this.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      composed: true,
      detail: { value: clamped },
    }));
  }
}
