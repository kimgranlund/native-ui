import { NativeElement } from '../../core/native-element.ts';

/** Structural listbox container for command palette items. */
export class NCommandList extends NativeElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'listbox';
  }
}
