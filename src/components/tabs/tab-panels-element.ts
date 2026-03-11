import { NativeElement } from '@nonoun/native-core';

/** Structural wrapper for tab panels within a tabs component. */
export class NTabPanels extends NativeElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'presentation';
  }
}
