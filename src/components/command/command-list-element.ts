import { NativeElement } from '@nonoun/native-core';

/** Structural listbox container for command palette items. */
export class NCommandList extends NativeElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'listbox';
  }
}
