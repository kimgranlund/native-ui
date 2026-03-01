import { UIElement } from '@nonoun/native-ui';

export interface NuiTokensVariableData {
  name: string;
  type: 'number';
  token: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
}

export class NuiTokensVariable extends UIElement {
  static observedAttributes = ['data'];

  #data: NuiTokensVariableData | null = null;
  #range: HTMLElement | null = null;
  #valueDisplay: HTMLSpanElement | null = null;

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'data' && val) {
      try { this.#data = JSON.parse(val); } catch { /* ignore */ }
      if (this.#range) this.#render();
    }
  }

  setup(): void {
    super.setup();
    const raw = this.getAttribute('data');
    if (raw) {
      try { this.#data = JSON.parse(raw); } catch { /* ignore */ }
    }
    this.#render();

    this.addEventListener('nui-tokens-theme-change', this.#onThemeChange);
  }

  teardown(): void {
    this.removeEventListener('nui-tokens-theme-change', this.#onThemeChange);
    this.innerHTML = '';
    this.#range = null;
    this.#valueDisplay = null;
    super.teardown();
  }

  #onThemeChange = (): void => {
    requestAnimationFrame(() => this.#syncFromComputed());
  };

  sync(): void {
    this.#syncFromComputed();
  }

  #syncFromComputed(): void {
    if (!this.#data || !this.#range || !this.#valueDisplay) return;
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(this.#data.token).trim();
    if (computed) {
      (this.#range as unknown as { value: number }).value = parseFloat(computed);
      const step = this.#data.step ?? 0.01;
      this.#valueDisplay.textContent = parseFloat(computed).toFixed(step < 0.01 ? 3 : 2);
    }
  }

  #render(): void {
    if (!this.#data) return;
    const d = this.#data;

    this.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'nui-tokens-variable-row';

    const label = document.createElement('label');
    label.className = 'nui-tokens-variable-label';
    label.textContent = d.name;

    // Dogfood <ui-range>
    const range = document.createElement('ui-range');
    range.setAttribute('min', String(d.min ?? 0));
    range.setAttribute('max', String(d.max ?? 1));
    range.setAttribute('step', String(d.step ?? 0.01));
    range.setAttribute('size', 'xs');

    // Read current computed value, fall back to data.value
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(d.token).trim();
    const initial = computed ? parseFloat(computed) : d.value;
    range.setAttribute('value', String(initial));

    const step = d.step ?? 0.01;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'nui-tokens-variable-value';
    valueSpan.textContent = initial.toFixed(step < 0.01 ? 3 : 2);

    range.addEventListener('ui-input', ((e: CustomEvent) => {
      const val = e.detail.value as number;
      document.documentElement.style.setProperty(d.token, String(val));
      valueSpan.textContent = val.toFixed(step < 0.01 ? 3 : 2);
      this.dispatchEvent(new CustomEvent('nui-tokens-change', {
        bubbles: true,
        detail: { token: d.token, value: val },
      }));
    }) as EventListener);

    this.#range = range;
    this.#valueDisplay = valueSpan;

    row.append(label, range, valueSpan);
    this.appendChild(row);
  }
}
