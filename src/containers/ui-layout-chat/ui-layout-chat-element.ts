import { UIElement } from '../../core/ui-element.ts';
import { ResizeController } from '../../traits/resize-controller.ts';

/**
 * Right-side chat panel within the layout, hidden by default and resizable.
 * @attr {boolean} open - Whether the chat panel is visible
 */
export class UILayoutChat extends UIElement {
  #resize: ResizeController | null = null;

  get open(): boolean { return this.hasAttribute('open'); }
  set open(val: boolean) { this.toggleAttribute('open', val); }

  toggle(): void { this.open = !this.open; }

  setup(): void {
    super.setup();
    if (this.querySelector('.layout-resize-handle')) {
      this.#resize = new ResizeController(this, {
        handleSelector: '.layout-resize-handle',
        axis: 'horizontal',
        min: 280,
        max: 480,
        reverse: true,
      });
    }
  }

  teardown(): void {
    this.#resize?.destroy();
    this.#resize = null;
    super.teardown();
  }
}
