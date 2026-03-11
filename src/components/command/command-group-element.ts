import { NativeElement } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';

/** Structural group wrapper for related items within a command palette. */
export class NCommandGroup extends NativeElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'group';
  }

  setup(): void {
    super.setup();
    // WHY: Wire aria-labelledby to heading slot so AT announces group label
    const heading = this.querySelector('[slot="heading"]') as HTMLElement | null;
    if (heading) {
      if (!heading.id) heading.id = uid('cg');
      this.setAttribute('aria-labelledby', heading.id);
    }
  }
}
