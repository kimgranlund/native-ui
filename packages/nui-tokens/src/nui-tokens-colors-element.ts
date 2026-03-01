import { UIElement } from '@nonoun/native-ui';
import type { NuiTokensColorSwatch } from './nui-tokens-color-swatch-element.ts';

export interface NuiTokensColorEntry {
  name: string;
  token: string;
}

export class NuiTokensColors extends UIElement {
  static observedAttributes = ['data'];

  #data: NuiTokensColorEntry[] = [];

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
    this.addEventListener('nui-tokens-change', this.#onUpdate);
    this.addEventListener('nui-tokens-theme-change', this.#onUpdate);
  }

  teardown(): void {
    this.removeEventListener('nui-tokens-change', this.#onUpdate);
    this.removeEventListener('nui-tokens-theme-change', this.#onUpdate);
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
    strip.className = 'nui-tokens-colors-strip';

    for (const entry of this.#data) {
      const swatch = document.createElement('nui-tokens-color-swatch') as NuiTokensColorSwatch;
      swatch.setAttribute('token', entry.token);
      swatch.setAttribute('name', entry.name);
      strip.appendChild(swatch);
    }

    this.appendChild(strip);
  }

  #refreshSwatches(): void {
    this.querySelectorAll<NuiTokensColorSwatch>('nui-tokens-color-swatch').forEach(s => s.refresh());
  }
}
