import { UIElement, PopoverController } from '@nonoun/native-ui';

/** Generic sidebar row wrapper. Passive by default — provides inline padding for
 *  arbitrary content (buttons, links, custom elements). When a child
 *  `ui-listbox[popover]` is present, wires PopoverController for click-to-toggle. */
export class NuiSidebarItem extends UIElement {
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
