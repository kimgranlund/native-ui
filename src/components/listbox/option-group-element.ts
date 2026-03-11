import { NativeElement } from '@nonoun/native-core';

/** Structural group wrapper for related options within a listbox. */
export class NOptionGroup extends NativeElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'group';
  }
}
