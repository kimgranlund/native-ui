import { NativeElement } from '@nonoun/native-ui';

export interface NTokensThemeEntry {
  name: string;
  value: string;
}

// All --n-env-* tokens that themes and sliders may set inline
const ENV_TOKENS = [
  'n-env-lightness-min', 'n-env-lightness-max', 'n-env-lightness-delta',
  'n-env-chroma', 'n-env-chroma-k-muted', 'n-env-chroma-k-vivid', 'n-env-chroma-k-edge',
  'n-env-alpha', 'n-env-alpha-delta',
  'n-env-hue-neutral', 'n-env-chroma-neutral', 'n-env-lightness-neutral',
  'n-env-hue-accent', 'n-env-chroma-accent', 'n-env-lightness-accent',
  'n-env-hue-info', 'n-env-chroma-info', 'n-env-lightness-info',
  'n-env-hue-success', 'n-env-chroma-success', 'n-env-lightness-success',
  'n-env-hue-warning', 'n-env-chroma-warning', 'n-env-lightness-warning',
  'n-env-hue-danger', 'n-env-chroma-danger', 'n-env-lightness-danger',
];

export class NTokensThemes extends NativeElement {
  static observedAttributes = ['data'];

  #data: NTokensThemeEntry[] = [];

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

    const combo = document.createElement('n-select');
    combo.setAttribute('size', 'xs');
    combo.setAttribute('placeholder', 'Theme...');
    combo.setAttribute('options', JSON.stringify(
      this.#data.map(e => ({ value: e.value, label: e.name })),
    ));
    combo.setAttribute('value', current);

    combo.addEventListener('native:change', ((e: CustomEvent) => {
      this.#select(e.detail.value as string);
    }) as EventListener);

    this.appendChild(combo);
  }

  #select(value: string): void {
    const root = document.documentElement;

    // Clear all inline --n-env-* overrides so theme values take effect
    for (const token of ENV_TOKENS) {
      root.style.removeProperty('--' + token);
    }

    // Apply or remove theme attribute
    if (value) {
      root.setAttribute('theme', value);
    } else {
      root.removeAttribute('theme');
    }

    // Dispatch so sibling native-tokens-variable elements can sync their sliders
    this.dispatchEvent(new CustomEvent('native-tokens-theme-change', {
      bubbles: true,
      detail: { theme: value },
    }));
  }
}
