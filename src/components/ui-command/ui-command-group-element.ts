import { UIElement } from '../../core/ui-element.ts';
import { uid } from '../../core/uid.ts';

/** Structural group wrapper for related items within a command palette. */
export class UICommandGroup extends UIElement {
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
