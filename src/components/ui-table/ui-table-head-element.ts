import { UIElement } from '../../core/ui-element.ts';

/** Structural row group for table header rows. */
export class UITableHead extends UIElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'rowgroup';
  }
}
