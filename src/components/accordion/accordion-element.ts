import { signal } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';
import type { NAccordionItem } from './accordion-item-element.ts';

/**
 * Accordion container that manages disclosure of its accordion-item children.
 * @attr {boolean} multiple - Allows multiple items to be open simultaneously
 * @attr {boolean} disabled - Disables all accordion items
 */
export class NAccordion extends NativeElement {
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
    switch (name) {
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'multiple':
        // WHY: When switching from multiple to single, close all but the first open item
        if (val === null && this.isConnected) {
          const openItems = [...this.querySelectorAll<HTMLElement & { open: boolean }>(':scope > n-accordion-item[open]')];
          for (let i = 1; i < openItems.length; i++) {
            openItems[i].open = false;
          }
        }
        break;
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

    // WHY: The toggle event comes from <details> inside n-accordion-item
    const details = e.target as HTMLDetailsElement;
    if (!details.open) return;

    const item = details.closest('n-accordion-item') as NAccordionItem | null;
    if (!item) return;

    // Close all other items
    const items = this.querySelectorAll<NAccordionItem & HTMLElement>(':scope > n-accordion-item[open]');
    for (const other of items) {
      if (other !== item) {
        other.open = false;
      }
    }
  };
}
