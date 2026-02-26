import { UIElement } from '../../core/ui-element.ts';

/**
 * Content panel associated with a tab, shown when its tab is selected.
 * @attr {string} value - Value matching the corresponding tab
 */
export class UITabPanel extends UIElement {
  static observedAttributes = ['value'];

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'tabpanel';
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(val: string) {
    this.setAttribute('value', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    super.attributeChangedCallback?.(name, old, val);
  }
}
