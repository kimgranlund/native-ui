import { UIElement } from '../../core/ui-element.ts';

/** Structural row group for table body rows. */
export class UITableBody extends UIElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'rowgroup';
  }
}
