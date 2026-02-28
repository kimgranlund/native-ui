import { UIElement } from '../core/ui-element.ts';
import type { DSColorSwatch } from './ds-color-swatch-element.ts';

export interface DSColorEntry {
  name: string;
  token: string;
}

export class DSColors extends UIElement {
  static observedAttributes = ['data'];

  #data: DSColorEntry[] = [];

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'data' && val) {
      try { this.#data = JSON.parse(val); } catch { /* ignore */ }
      if (this.isConnected) this.#render();
    }
  }

  setup(): void {
    super.setup();
    const raw = this.getAttribute('data');
    if (raw) {
      try { this.#data = JSON.parse(raw); } catch { /* ignore */ }
    }
    this.#render();

    // Re-render when tokens change (theme switch or variable drag)
    this.addEventListener('ds-change', this.#onUpdate);
    this.addEventListener('ds-theme-change', this.#onUpdate);
  }

  teardown(): void {
    this.removeEventListener('ds-change', this.#onUpdate);
    this.removeEventListener('ds-theme-change', this.#onUpdate);
    this.innerHTML = '';
    super.teardown();
  }

  #onUpdate = (): void => {
    requestAnimationFrame(() => this.#refreshSwatches());
  };

  refresh(): void {
    this.#refreshSwatches();
  }

  #render(): void {
    this.innerHTML = '';

    const strip = document.createElement('div');
    strip.className = 'ds-colors-strip';

    for (const entry of this.#data) {
      const swatch = document.createElement('ds-color-swatch') as DSColorSwatch;
      swatch.setAttribute('token', entry.token);
      swatch.setAttribute('name', entry.name);
      strip.appendChild(swatch);
    }

    this.appendChild(strip);
  }

  #refreshSwatches(): void {
    this.querySelectorAll<DSColorSwatch>('ds-color-swatch').forEach(s => s.refresh());
  }
}
