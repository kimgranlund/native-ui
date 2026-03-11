import { NativeElement } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';

/** Non-interactive heading label for an option group. */
export class NOptionGroupHeader extends NativeElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'presentation';
  }

  setup(): void {
    super.setup();
    if (!this.id) this.id = uid('ogh');
    const group = this.closest('n-option-group');
    if (group) {
      group.setAttribute('aria-labelledby', this.id);
    }
  }
}
