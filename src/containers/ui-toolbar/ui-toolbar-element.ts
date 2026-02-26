import { UIElement } from '../../core/ui-element.ts';
import { RovingFocusController } from '../../traits/roving-focus-controller.ts';

/** Horizontal action bar with toolbar role and roving focus across button children. */
export class UIToolbar extends UIElement {
  #internals: ElementInternals;
  #roving!: RovingFocusController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'toolbar';
  }

  setup(): void {
    super.setup();
    this.#roving = new RovingFocusController(this, {
      selector: ':scope > ui-button:not([disabled]), :scope > button:not([disabled])',
      orientation: 'horizontal',
    });
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Toolbar');
    }
  }

  teardown(): void {
    this.#roving.destroy();
    super.teardown();
  }
}
