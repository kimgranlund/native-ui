import { UIElement } from '../core/ui-element.ts';
import { getIcon, onIconRegistered } from './registry.ts';

/**
 * Icon component rendering SVG from the global icon registry.
 * @attr {string} name - Icon name from the Phosphor icon set
 * @attr {string} size - Icon size override
 * @attr {string} aria-label - Accessible label (sets role="img" when present)
 */
export class UIIcon extends UIElement {
  static observedAttributes = ['name', 'size', 'aria-label'];

  #unsubscribe: (() => void) | null = null;

  setup(): void {
    super.setup();
    this.#syncAria();
    this.#render();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === 'name') this.#render();
    if (name === 'aria-label') this.#syncAria();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  #syncAria(): void {
    if (this.hasAttribute('aria-label')) {
      this.setAttribute('role', 'img');
      this.removeAttribute('aria-hidden');
    } else {
      this.setAttribute('aria-hidden', 'true');
      this.removeAttribute('role');
    }
  }

  #render(): void {
    const name = this.getAttribute('name');
    if (!name) {
      this.innerHTML = '';
      this.#unsubscribe?.();
      this.#unsubscribe = null;
      return;
    }

    const svg = getIcon(name);
    if (svg) {
      this.innerHTML = svg;
      this.#unsubscribe?.();
      this.#unsubscribe = null;
    } else {
      this.innerHTML = '';
      if (!this.#unsubscribe) {
        this.#unsubscribe = onIconRegistered((registered) => {
          if (registered === this.getAttribute('name')) this.#render();
        });
      }
    }
  }
}
