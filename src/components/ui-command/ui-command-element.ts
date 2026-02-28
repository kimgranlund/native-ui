import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { uid } from '../../core/uid.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { DataListController } from '../../core/data-list.ts';
import type { DataItem } from '../../core/data-list.ts';
import type { UICommandItem } from './ui-command-item-element.ts';

/**
 * Command palette with filterable item list and keyboard navigation.
 * @attr {boolean} disabled - Disables interaction
 * @fires ui-change - Fired when an item is selected with `{ value, label }` detail
 * @fires ui-dismiss - Fired on Escape key press
 */
export class UICommand extends UIElement {
  static observedAttributes = ['disabled'];

  #internals: ElementInternals;
  // WHY: initialActiveIndex: 0 — command palette always highlights first item (unlike combobox/listbox which start at -1)
  #store = new DataListController<DataItem>({ initialActiveIndex: 0 });
  #disabled = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'search';
  }

  get store(): DataListController<DataItem> {
    return this.#store;
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'disabled') this.#disabled.value = val !== null;
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    this.addEventListener('ui-input', this.#onInput as EventListener);
    this.addEventListener('ui-select', this.#onSelect as EventListener);
    this.addEventListener('keydown', this.#onKeyDown);

    this.deferChildren(() => {
      if (__DEV__) {
        if (!this.querySelector('ui-command-item')) console.warn('[ui-command] No <ui-command-item> children found.');
      }

      // WHY: Filter items when query changes
      this.addEffect(() => {
        const q = this.#store.query.value.toLowerCase().trim();
        const items = this.querySelectorAll<UICommandItem & HTMLElement>('ui-command-item');

        for (const item of items) {
          const matches = !q || item.searchText.includes(q);
          item.toggleAttribute('hidden', !matches);
        }
      });

      // WHY: Sync [active] attribute to the item at activeIndex.
      // Must track query — when activeIndex is already 0 and setQuery resets
      // it to 0, the signal won't notify. Reading query ensures re-run after filtering.
      this.addEffect(() => {
        this.#store.query.value;
        const idx = this.#store.activeIndex.value;
        const items = this.#getVisibleItems();
        const list = this.querySelector('ui-command-list');

        for (let i = 0; i < items.length; i++) {
          items[i].toggleAttribute('active', i === idx);
        }

        // WHY: aria-activedescendant on the listbox so AT follows keyboard navigation
        const activeItem = items[idx];
        if (activeItem && list) {
          if (!activeItem.id) activeItem.id = uid('cmd');
          list.setAttribute('aria-activedescendant', activeItem.id);
          activeItem.scrollIntoView({ block: 'nearest' });
        } else {
          list?.removeAttribute('aria-activedescendant');
        }
      });

      // WHY: Show/hide empty state based on visible items
      this.addEffect(() => {
        this.#store.query.value; // track query changes
        const items = this.#getVisibleItems();
        const empty = this.querySelector('ui-command-empty');
        if (empty) {
          empty.toggleAttribute('hidden', items.length > 0);
        }
      });
    });
  }

  teardown(): void {
    this.removeEventListener('ui-input', this.#onInput as EventListener);
    this.removeEventListener('ui-select', this.#onSelect as EventListener);
    this.removeEventListener('keydown', this.#onKeyDown);
    super.teardown();
  }

  #getVisibleItems(): (UICommandItem & HTMLElement)[] {
    return [...this.querySelectorAll<UICommandItem & HTMLElement>(
      'ui-command-item:not([hidden]):not([disabled])',
    )];
  }

  #onInput = (e: Event): void => {
    if (this.#disabled.value) return;
    const detail = (e as CustomEvent).detail as { value: string };
    // WHY: Command palette resets to index 0 (first match highlighted), not -1.
    this.#store.setQuery(detail.value, 0);
  };

  #onSelect = (e: Event): void => {
    if (this.#disabled.value) return;
    const detail = (e as CustomEvent).detail as { value: string; label: string };
    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail,
    }));
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;
    const items = this.#getVisibleItems();
    if (items.length === 0 && e.key !== 'Escape') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.#store.moveActive(1, items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.#store.moveActive(-1, items.length);
        break;
      case 'Home':
        e.preventDefault();
        this.#store.activeIndex.value = 0;
        break;
      case 'End':
        e.preventDefault();
        this.#store.activeIndex.value = Math.max(0, items.length - 1);
        break;
      case 'Enter': {
        e.preventDefault();
        const active = items[this.#store.activeIndex.value];
        if (active) {
          active.click();
        }
        break;
      }
      case 'Escape':
        this.dispatchEvent(new CustomEvent('ui-dismiss', {
          bubbles: true,
          composed: true,
        }));
        break;
    }
  };
}
