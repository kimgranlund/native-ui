export type SortDirection = 'asc' | 'desc' | 'none';

export interface SortOptions {
  selector?: string;
  disabled?: boolean;
}

/** Manages column sort state and dispatches `ui-sort` events. */
export class SortController {
  readonly host: HTMLElement;
  selector: string;
  disabled: boolean;

  #sortColumn: string | null = null;
  #sortDirection: SortDirection = 'none';
  #attached = false;

  constructor(host: HTMLElement, options: SortOptions = {}) {
    this.host = host;
    this.selector = options.selector ?? '';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  get sortColumn(): string | null { return this.#sortColumn; }
  get sortDirection(): SortDirection { return this.#sortDirection; }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    // WHY: Delegate to host instead of per-element listeners — handles dynamic header additions
    this.host.addEventListener('click', this.#onHostClick);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('click', this.#onHostClick);
  }

  destroy(): void {
    this.detach();
  }

  #onHostClick = (e: Event): void => {
    if (this.disabled || !this.selector) return;
    const header = (e.target as HTMLElement).closest(this.selector) as HTMLElement | null;
    if (!header || !this.host.contains(header)) return;
    const column = header.dataset.column ?? header.textContent?.trim() ?? '';

    if (column === this.#sortColumn) {
      // Cycle: asc → desc → none
      if (this.#sortDirection === 'asc') this.#sortDirection = 'desc';
      else if (this.#sortDirection === 'desc') this.#sortDirection = 'none';
      else this.#sortDirection = 'asc';
    } else {
      this.#sortColumn = column;
      this.#sortDirection = 'asc';
    }

    // Sync ARIA on all headers
    for (const h of this.host.querySelectorAll(this.selector)) {
      const col = (h as HTMLElement).dataset.column ?? h.textContent?.trim() ?? '';
      if (col === this.#sortColumn && this.#sortDirection !== 'none') {
        h.setAttribute('aria-sort', this.#sortDirection === 'asc' ? 'ascending' : 'descending');
      } else {
        h.removeAttribute('aria-sort');
      }
    }

    this.host.dispatchEvent(new CustomEvent('ui-sort', {
      bubbles: true,
      composed: true,
      detail: { column: this.#sortColumn, direction: this.#sortDirection },
    }));
  };
}
