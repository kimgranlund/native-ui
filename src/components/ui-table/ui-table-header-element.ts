import { UIElement } from '../../core/ui-element.ts';

/**
 * Column header cell with optional sort toggle.
 * @attr {string} sort - Current sort state: "none" | "asc" | "desc"
 * @attr {boolean} sortable - Enables click-to-sort behavior
 * @fires ui-sort - Fired on sort toggle with `{ column }` detail
 */
export class UITableHeader extends UIElement {
  static observedAttributes = ['sort', 'sortable'];

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'columnheader';
  }

  get column(): string {
    return this.getAttribute('column') ?? '';
  }

  get sortable(): boolean {
    return this.hasAttribute('sortable');
  }

  get sort(): string {
    return this.getAttribute('sort') ?? 'none';
  }

  set sort(val: string) {
    this.setAttribute('sort', val);
  }

  setup(): void {
    super.setup();
    if (this.sortable) {
      this.setAttribute('tabindex', '0');
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKeyDown);
    }
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeyDown);
    super.teardown();
  }

  #onClick = (): void => {
    if (!this.sortable) return;
    this.dispatchEvent(new CustomEvent('ui-sort', {
      bubbles: true,
      composed: true,
      detail: { column: this.column },
    }));
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#onClick();
    }
  };
}
