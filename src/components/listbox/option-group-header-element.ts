import { NativeElement } from '../../core/native-element.ts';
import { uid } from '../../core/uid.ts';

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
