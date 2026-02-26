import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';

/**
 * Collapsible disclosure item using a native details/summary element.
 * @attr {boolean} open - Whether the item content is expanded
 * @attr {boolean} disabled - Disables toggling
 */
export class UIAccordionItem extends UIElement {
  static observedAttributes = ['open', 'disabled'];

  #open = signal(false);
  #disabled = signal(false);
  #details: HTMLDetailsElement | null = null;

  get open(): boolean {
    return this.#open.value;
  }

  set open(val: boolean) {
    this.#open.value = val;
    this.toggleAttribute('open', val);
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
      case 'open':
        this.#open.value = val !== null;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    // WHY: Stamp a native <details> + <summary> to get free disclosure behavior
    const details = document.createElement('details');
    const summary = document.createElement('summary');

    // Move [slot="heading"] content into summary
    const heading = this.querySelector(':scope > [slot="heading"]');
    if (heading) {
      heading.removeAttribute('slot');
      summary.appendChild(heading);
    }

    // Move remaining children into a content wrapper
    const content = document.createElement('div');
    content.setAttribute('part', 'content');
    while (this.firstChild) content.appendChild(this.firstChild);

    details.appendChild(summary);
    details.appendChild(content);
    this.appendChild(details);
    this.#details = details;

    // Sync open state
    this.addEffect(() => {
      const open = this.#open.value;
      if (this.#details) this.#details.open = open;
    });

    this.addEffect(createDisabledEffect(this, this.#disabled));

    // WHY: Listen for native toggle event to keep signal in sync
    details.addEventListener('toggle', this.#onToggle);
  }

  teardown(): void {
    this.#details?.removeEventListener('toggle', this.#onToggle);
    this.#details = null;
    super.teardown();
  }

  #onToggle = (): void => {
    if (!this.#details) return;
    const isOpen = this.#details.open;
    this.#open.value = isOpen;
    this.toggleAttribute('open', isOpen);
  };
}
