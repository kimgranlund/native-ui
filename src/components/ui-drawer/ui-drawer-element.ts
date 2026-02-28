import { UIElement } from '../../core/ui-element.ts';
import { DialogController } from '../../traits/dialog-controller.ts';

/**
 * Slide-in drawer panel using a native dialog element.
 * @attr {string} side - Slide-in direction: "left" | "right" | "top" | "bottom"
 * @attr {boolean} no-close-on-escape - Prevents closing on Escape key
 * @attr {boolean} no-close-on-backdrop - Prevents closing on backdrop click
 * @fires close - Fired when the drawer is closed
 */
export class UIDrawer extends UIElement {

  #dialog!: DialogController;

  get open(): boolean {
    return this.#dialog.open;
  }

  showModal(): void {
    this.#dialog.showModal();
  }

  close(): void {
    this.#dialog.close();
  }

  setup(): void {
    super.setup();
    this.#dialog = new DialogController(this, {
      contentTarget: () => document.createElement('ui-drawer-panel'),
    });
  }

  teardown(): void {
    this.#dialog.destroy();
    super.teardown();
  }
}
