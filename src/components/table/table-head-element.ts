import { NativeElement } from '@nonoun/native-core';

/** Structural row group for table header rows. */
export class NTableHead extends NativeElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'rowgroup';
  }
}
