import { NativeElement } from '@nonoun/native-ui';
import type { NTokensColorSwatch } from './tokens-color-swatch-element.ts';

export interface NTokensColorEntry {
  name: string;
  token: string;
}

export class NTokensColors extends NativeElement {
  static observedAttributes = ['data'];

  #data: NTokensColorEntry[] = [];

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
    this.addEventListener('native-tokens-change', this.#onUpdate);
    this.addEventListener('native-tokens-theme-change', this.#onUpdate);
  }

  teardown(): void {
    this.removeEventListener('native-tokens-change', this.#onUpdate);
    this.removeEventListener('native-tokens-theme-change', this.#onUpdate);
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
    strip.className = 'native-tokens-colors-strip';

    for (const entry of this.#data) {
      const swatch = document.createElement('native-tokens-color-swatch') as NTokensColorSwatch;
      swatch.setAttribute('token', entry.token);
      swatch.setAttribute('name', entry.name);
      strip.appendChild(swatch);
    }

    this.appendChild(strip);
  }

  #refreshSwatches(): void {
    this.querySelectorAll<NTokensColorSwatch>('native-tokens-color-swatch').forEach(s => s.refresh());
  }
}
