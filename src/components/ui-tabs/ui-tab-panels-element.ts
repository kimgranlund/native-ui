import { UIElement } from '../../core/ui-element.ts';

/** Structural wrapper for tab panels within a tabs component. */
export class UITabPanels extends UIElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'presentation';
  }
}
