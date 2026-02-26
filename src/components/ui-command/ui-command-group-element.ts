import { UIElement } from '../../core/ui-element.ts';

/** Structural group wrapper for related items within a command palette. */
export class UICommandGroup extends UIElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'group';
  }
}
