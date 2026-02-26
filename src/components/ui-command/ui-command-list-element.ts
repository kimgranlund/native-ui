import { UIElement } from '../../core/ui-element.ts';

/** Structural listbox container for command palette items. */
export class UICommandList extends UIElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'listbox';
  }
}
