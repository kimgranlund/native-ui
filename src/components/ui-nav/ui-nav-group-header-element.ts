import { UIElement } from '../../core/ui-element.ts';
import { uid } from '../../core/uid.ts';

/** Non-interactive heading label for a navigation group. */
export class UINavGroupHeader extends UIElement {
  constructor() {
    super();
    const internals = this.attachInternals();
    internals.role = 'presentation';
  }

  setup(): void {
    super.setup();
    if (!this.id) this.id = uid('ngh');
    const group = this.closest('ui-nav-group');
    if (group) {
      group.setAttribute('aria-labelledby', this.id);
    }
    // Wrap first <ui-icon> child in a .icon-well span for fixed-size alignment
    const icon = this.querySelector(':scope > ui-icon');
    if (icon) {
      const well = document.createElement('span');
      well.className = 'icon-well';
      this.insertBefore(well, icon);
      well.appendChild(icon);
    }
  }
}
