import { UIElement } from '../../core/ui-element.ts';

/** Structural table cell within a table row. */
export class UITableCell extends UIElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'cell';
  }
}
