import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import type { UIAccordionItem } from './ui-accordion-item-element.ts';

/**
 * Accordion container that manages disclosure of its accordion-item children.
 * @attr {boolean} multiple - Allows multiple items to be open simultaneously
 * @attr {boolean} disabled - Disables all accordion items
 */
export class UIAccordion extends UIElement {
  static observedAttributes = ['multiple', 'disabled'];

  #disabled = signal(false);

  get multiple(): boolean {
    return this.hasAttribute('multiple');
  }

  set multiple(val: boolean) {
    this.toggleAttribute('multiple', val);
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'disabled') {
      this.#disabled.value = val !== null;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled));

    // WHY: In single mode, close other items when one opens
    this.addEventListener('toggle', this.#onItemToggle, true);
  }

  teardown(): void {
    this.removeEventListener('toggle', this.#onItemToggle, true);
    super.teardown();
  }

  #onItemToggle = (e: Event): void => {
    if (this.multiple) return;

    // WHY: The toggle event comes from <details> inside ui-accordion-item
    const details = e.target as HTMLDetailsElement;
    if (!details.open) return;

    const item = details.closest('ui-accordion-item') as UIAccordionItem | null;
    if (!item) return;

    // Close all other items
    const items = this.querySelectorAll<UIAccordionItem & HTMLElement>(':scope > ui-accordion-item[open]');
    for (const other of items) {
      if (other !== item) {
        other.open = false;
      }
    }
  };
}
