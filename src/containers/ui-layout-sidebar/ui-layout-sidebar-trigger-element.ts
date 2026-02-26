import { UIElement } from '../../core/ui-element.ts';
import { PopoverController } from '../../traits/popover-controller.ts';

/** Sidebar trigger button that toggles a popover listbox for navigation in collapsed state. */
export class UILayoutSidebarTrigger extends UIElement {
  #popover: PopoverController | null = null;
  #open = false;

  setup(): void {
    super.setup();
    const listbox = this.querySelector(':scope > ui-listbox[popover]') as HTMLElement | null;
    if (!listbox) return;

    this.#popover = new PopoverController(this);
    this.#popover.wirePopover(this, listbox);

    this.addEventListener('click', this.#onClick);
    this.addEventListener('ui-dismiss', this.#onDismiss);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('ui-dismiss', this.#onDismiss);
    this.#popover?.destroy();
    this.#popover = null;
    this.#open = false;
    super.teardown();
  }

  #onClick = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('ui-listbox')) return;
    this.#open = !this.#open;
    this.#popover?.syncPopover(this.#open);
  };

  #onDismiss = (): void => {
    this.#open = false;
    this.#popover?.syncPopover(false);
  };
}
