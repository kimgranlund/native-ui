import { UIElement, ResizeController } from '@nonoun/native-ui';

/**
 * Layout panel — main content surface or collapsible aside.
 *
 * **Default (main):** `flex: 1`, always visible, scrollable.
 * **`[aside]`:** Fixed width, hidden by default, `[open]` toggles visibility,
 * left-edge resize handle (280–480 px).
 *
 * @attr {boolean} aside  - Switches to collapsible side-panel mode
 * @attr {boolean} open   - Whether the aside panel is visible (aside mode only)
 */
export class NuiAppPanel extends UIElement {
  #resize: ResizeController | null = null;

  get open(): boolean { return this.hasAttribute('open'); }
  set open(val: boolean) { this.toggleAttribute('open', val); }

  toggle(): void { this.open = !this.open; }

  setup(): void {
    super.setup();
    // Only wire resize for aside panels with a resize handle
    if (this.hasAttribute('aside') && this.querySelector('.layout-resize-handle')) {
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
