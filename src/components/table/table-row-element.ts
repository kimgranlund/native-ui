import { NativeElement } from '../../core/native-element.ts';

/**
 * Table row that supports selection when the parent table is selectable.
 * @attr {string} value - Row identifier used for selection tracking
 * @attr {boolean} selected - Whether this row is selected
 */
export class NTableRow extends NativeElement {
  static observedAttributes = ['value', 'selected'];

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'row';
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(val: string) {
    this.setAttribute('value', val);
  }

  get selected(): boolean {
    return this.hasAttribute('selected');
  }

  set selected(val: boolean) {
    this.toggleAttribute('selected', val);
  }

  setup(): void {
    super.setup();
    this.addEventListener('click', this.#onClick);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    super.teardown();
  }

  #onClick = (): void => {
    // WHY: Colspan rows are structural (category headers) — not selectable
    if (this.hasAttribute('colspan')) return;
    // WHY: Only dispatch select if the parent table is selectable
    const table = this.closest('n-table');
    if (!table?.hasAttribute('selectable')) return;

    this.dispatchEvent(new CustomEvent('native:row-select', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  };
}
