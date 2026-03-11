import { NativeElement } from '@nonoun/native-core';

/** Structural row group for table body rows. */
export class NTableBody extends NativeElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'rowgroup';
  }
}
