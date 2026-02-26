import { UIElement } from '../../core/ui-element.ts';

/** Structural group wrapper for related options within a listbox. */
export class UIOptionGroup extends UIElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'group';
  }
}
