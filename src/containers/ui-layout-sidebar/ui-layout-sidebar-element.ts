import { UIElement } from '../../core/ui-element.ts';
import { ResizeController } from '../../traits/resize-controller.ts';

/** Full-page layout with a resizable sidebar aside and content column. */
export class UILayoutSidebar extends UIElement {
  #sidebarResize: ResizeController | null = null;

  setup(): void {
    super.setup();

    // Sidebar resize
    const aside = this.querySelector(':scope > [slot="sidebar"]') as HTMLElement | null;
    if (aside?.querySelector('.layout-resize-handle')) {
      this.#sidebarResize = new ResizeController(aside, {
        handleSelector: '.layout-resize-handle',
        axis: 'horizontal',
        min: 160,
        max: 400,
      });
    }

    this.dataset.ready = '';
  }

  teardown(): void {
    this.#sidebarResize?.destroy();
    this.#sidebarResize = null;
    super.teardown();
  }
}
