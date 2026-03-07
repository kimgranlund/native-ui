import { NativeElement } from '@nonoun/native-ui';
import type { NDesignColorSwatch } from './design-color-swatch-element.ts';

export interface NDesignColorEntry {
  name: string;
  token: string;
}

export class NDesignColors extends NativeElement {
  static observedAttributes = ['data'];

  #data: NDesignColorEntry[] = [];

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
    this.addEventListener('native-design-change', this.#onUpdate);
    this.addEventListener('native-design-theme-change', this.#onUpdate);
  }

  teardown(): void {
    this.removeEventListener('native-design-change', this.#onUpdate);
    this.removeEventListener('native-design-theme-change', this.#onUpdate);
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
    strip.className = 'native-design-colors-strip';

    for (const entry of this.#data) {
      const swatch = document.createElement('native-design-color-swatch') as NDesignColorSwatch;
      swatch.setAttribute('token', entry.token);
      swatch.setAttribute('name', entry.name);
      strip.appendChild(swatch);
    }

    this.appendChild(strip);
  }

  #refreshSwatches(): void {
    this.querySelectorAll<NDesignColorSwatch>('native-design-color-swatch').forEach(s => s.refresh());
  }
}
