import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';

/**
 * Collapsible group of navigation items using native details/summary.
 * @attr {boolean} open - Whether the group is expanded (defaults to true)
 */
export class UINavGroup extends UIElement {
  static observedAttributes = ['open'];

  #open = signal(true);
  #details: HTMLDetailsElement | null = null;
  #internals: ElementInternals;
  #observer: MutationObserver | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'group';
  }

  get open(): boolean {
    return this.#open.value;
  }

  set open(val: boolean) {
    this.#open.value = val;
    this.toggleAttribute('open', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'open') {
      this.#open.value = val !== null;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    // WHY: Stamp native <details>/<summary> for free disclosure behavior.
    // Same pattern as ui-accordion-item.
    const details = document.createElement('details');
    const summary = document.createElement('summary');

    // Move <ui-nav-group-header> content into <summary>
    const header = this.querySelector(':scope > ui-nav-group-header');
    if (header) {
      summary.appendChild(header);
    }

    // Move remaining children into details (after summary)
    while (this.firstChild) details.appendChild(this.firstChild);

    details.insertBefore(summary, details.firstChild);
    this.appendChild(details);
    this.#details = details;

    // WHY: Nav groups default open. Only close if author explicitly omits [open].
    // Since signal defaults to true and most nav groups start open, just sync from signal.
    this.addEffect(() => {
      const open = this.#open.value;
      if (this.#details) this.#details.open = open;
    });

    // WHY: Listen for native toggle event to keep signal in sync
    details.addEventListener('toggle', this.#onToggle);

    // WHY: Watch for aria-current changes on child nav-items to drive
    // the sliding indicator (same pattern as vertical tabs).
    this.#observer = new MutationObserver(() => this.#syncIndicator());
    this.#observer.observe(details, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current'],
    });

    // Sync initial state in case a child is already selected
    this.#syncIndicator();
  }

  teardown(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#details?.removeEventListener('toggle', this.#onToggle);
    this.#details = null;
    super.teardown();
  }

  #syncIndicator(): void {
    if (!this.#details) return;
    const items = this.#details.querySelectorAll<HTMLElement>(':scope > ui-nav-item');
    let selectedIndex = -1;

    for (let i = 0; i < items.length; i++) {
      if (items[i].hasAttribute('aria-current')) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex < 0) {
      this.#internals.states.delete('has-selection');
      return;
    }

    this.style.setProperty('--_indicator-index', `${selectedIndex}`);
    this.#internals.states.add('has-selection');
  }

  #onToggle = (): void => {
    if (!this.#details) return;
    const isOpen = this.#details.open;
    this.#open.value = isOpen;
    this.toggleAttribute('open', isOpen);
  };
}
