import { NativeElement } from '../../core/native-element.ts';

/** Structural table cell within a table row. */
export class NTableCell extends NativeElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'cell';
  }
}
