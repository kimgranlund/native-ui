import { UIElement } from '../core/ui-element.ts';

export interface DSThemeEntry {
  name: string;
  value: string;
}

// All --color-env-* tokens that themes and sliders may set inline
const ENV_TOKENS = [
  'color-env-lightness-min', 'color-env-lightness-max', 'color-env-lightness-delta',
  'color-env-chroma', 'color-env-chroma-k-muted', 'color-env-chroma-k-vivid', 'color-env-chroma-k-edge',
  'color-env-alpha', 'color-env-alpha-delta',
  'color-env-hue-neutral', 'color-env-chroma-neutral', 'color-env-lightness-neutral',
  'color-env-hue-accent', 'color-env-chroma-accent', 'color-env-lightness-accent',
  'color-env-hue-info', 'color-env-chroma-info', 'color-env-lightness-info',
  'color-env-hue-success', 'color-env-chroma-success', 'color-env-lightness-success',
  'color-env-hue-warning', 'color-env-chroma-warning', 'color-env-lightness-warning',
  'color-env-hue-danger', 'color-env-chroma-danger', 'color-env-lightness-danger',
];

export class DSThemes extends UIElement {
  static observedAttributes = ['data'];

  #data: DSThemeEntry[] = [];

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
  }

  teardown(): void {
    this.innerHTML = '';
    super.teardown();
  }

  #render(): void {
    this.innerHTML = '';

    const current = document.documentElement.getAttribute('theme') ?? '';

    const combo = document.createElement('ui-select');
    combo.setAttribute('size', 'xs');
    combo.setAttribute('placeholder', 'Theme...');
    combo.setAttribute('options', JSON.stringify(
      this.#data.map(e => ({ value: e.value, label: e.name })),
    ));
    combo.setAttribute('value', current);

    combo.addEventListener('ui-change', ((e: CustomEvent) => {
      this.#select(e.detail.value as string);
    }) as EventListener);

    this.appendChild(combo);
  }

  #select(value: string): void {
    const root = document.documentElement;

    // Clear all inline --color-env-* overrides so theme values take effect
    for (const token of ENV_TOKENS) {
      root.style.removeProperty('--' + token);
    }

    // Apply or remove theme attribute
    if (value) {
      root.setAttribute('theme', value);
    } else {
      root.removeAttribute('theme');
    }

    // Dispatch so sibling ds-variable elements can sync their sliders
    this.dispatchEvent(new CustomEvent('ds-theme-change', {
      bubbles: true,
      detail: { theme: value },
    }));
  }
}
