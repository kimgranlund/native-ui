import { NativeElement } from '../../core/native-element.ts';

/** Structural group wrapper for related options within a listbox. */
export class NOptionGroup extends NativeElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'group';
  }
}
