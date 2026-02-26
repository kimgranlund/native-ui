import { UIElement } from '../../core/ui-element.ts';
import { DialogController } from '../../traits/dialog-controller.ts';

/**
 * Modal dialog wrapper using a native dialog element promoted to the top layer.
 * @attr {boolean} no-close-on-escape - Prevents closing on Escape key
 * @attr {boolean} no-close-on-backdrop - Prevents closing on backdrop click
 * @fires close - Fired when the dialog is closed
 */
export class UIDialog extends UIElement {
  static observedAttributes = ['no-close-on-escape', 'no-close-on-backdrop'];

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
    this.#dialog = new DialogController(this);
  }

  teardown(): void {
    this.#dialog.destroy();
    super.teardown();
  }
}
