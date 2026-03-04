import { NativeElement } from '../../core/native-element.ts';
import { TableStore } from './table-store.ts';
import { ColumnResizeController } from './column-resize-controller.ts';
import { TableDragController } from './table-drag-controller.ts';
import type { NTableHeader } from './table-header-element.ts';
import type { NTableRow } from './table-row-element.ts';

/**
 * Data table with sortable columns, row selection, column resizing, and row reordering.
 * @attr {boolean} selectable - Enables row selection on click
 * @attr {boolean} resizable - Enables column resize handles
 * @attr {boolean} reorderable - Enables drag-to-reorder rows
 * @attr {string} cols - Sets grid-template-columns (e.g., "auto auto 1fr")
 * @attr {boolean} sticky-header - Enables sticky header row with measured height
 * @fires native:table-sort - Fired when sort changes with `{ column, direction }` detail
 * @fires native:table-select - Fired when row selection changes with `{ value, selected, allSelected }` detail
 */
export class NTable extends NativeElement {
  static observedAttributes = ['selectable', 'resizable', 'reorderable', 'cols', 'sticky-header'];

  #internals: ElementInternals;
  #store = new TableStore();
  #resizeController: ColumnResizeController | null = null;
  #headerObserver: ResizeObserver | null = null;
  #dragController: TableDragController | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'table';
  }

  get store(): TableStore {
    return this.#store;
  }

  set store(val: TableStore) {
    this.#store = val;
  }

  get selectable(): boolean {
    return this.hasAttribute('selectable');
  }

  set selectable(val: boolean) {
    this.toggleAttribute('selectable', val);
  }

  get cols(): string | null {
    return this.getAttribute('cols');
  }

  set cols(val: string | null) {
    if (val) {
      this.setAttribute('cols', val);
    } else {
      this.removeAttribute('cols');
    }
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'resizable':
        // WHY: Init/destroy column resize when attribute is toggled after setup
        if (val !== null && !this.#resizeController) {
          this.#initResize();
        } else if (val === null && this.#resizeController) {
          this.#resizeController.destroy();
          this.#resizeController = null;
        }
        break;
      case 'reorderable':
        if (val !== null && !this.#dragController) {
          this.#initReorder();
        } else if (val === null && this.#dragController) {
          this.#dragController.destroy();
          this.#dragController = null;
        }
        break;
      case 'cols':
        if (val) {
          this.style.gridTemplateColumns = val;
        } else {
          this.style.removeProperty('grid-template-columns');
        }
        break;
      case 'sticky-header':
        if (val !== null && !this.#headerObserver) {
          this.#initHeaderMeasure();
        } else if (val === null && this.#headerObserver) {
          this.#headerObserver.disconnect();
          this.#headerObserver = null;
          this.style.removeProperty('--n-header-height');
        }
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEventListener('native:sort', this.#onSort as EventListener);
    this.addEventListener('native:row-select', this.#onRowSelect as EventListener);

    this.deferChildren(() => {
      if (__DEV__) {
        if (!this.querySelector(':scope > n-table-head')) console.warn('[n-table] No <n-table-head> child found. Expected structure: <n-table-head> + <n-table-body>.');
        if (!this.querySelector(':scope > n-table-body')) console.warn('[n-table] No <n-table-body> child found. Expected structure: <n-table-head> + <n-table-body>.');
      }

      // WHY: Sync store sort state → header sort attributes
      this.addEffect(() => {
        const col = this.#store.sortColumn.value;
        const dir = this.#store.sortDirection.value;
        const headers = this.querySelectorAll<NTableHeader & HTMLElement>('n-table-header[sortable]');

        for (const header of headers) {
          if (header.column === col) {
            header.setAttribute('sort', dir);
            header.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none');
          } else {
            header.setAttribute('sort', 'none');
            header.removeAttribute('aria-sort');
          }
        }
      });

      // WHY: Sync store selection state → row selected attributes
      this.addEffect(() => {
        const selected = this.#store.selected.value;
        const rows = this.querySelectorAll<NTableRow & HTMLElement>('n-table-body n-table-row');

        for (const row of rows) {
          const isSelected = selected.has(row.value);
          row.toggleAttribute('selected', isSelected);
          row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        }
      });

      // WHY: Colspan rows (category headers) are meaningless when sorted.
      // Hide them when any sort is active, show when sort clears.
      this.addEffect(() => {
        const col = this.#store.sortColumn.value;
        const rows = this.querySelectorAll<HTMLElement>('n-table-body n-table-row[colspan]');
        for (const row of rows) row.toggleAttribute('hidden', col !== null);
      });

      // WHY: Initialize column resizing when [resizable] is present.
      // Must be inside deferChildren because we need header cells in DOM.
      if (this.hasAttribute('resizable')) {
        this.#initResize();
      }

      // WHY: Measure header row height for sticky colspan positioning.
      // Sets --n-header-height CSS variable so sticky colspan rows park below the header.
      if (this.hasAttribute('sticky-header')) {
        this.#initHeaderMeasure();
      }

      // WHY: Initialize drag-to-reorder when [reorderable] is present.
      if (this.hasAttribute('reorderable')) {
        this.#initReorder();
      }
    });
  }

  teardown(): void {
    this.#resizeController?.destroy();
    this.#resizeController = null;
    this.#headerObserver?.disconnect();
    this.#headerObserver = null;
    this.#dragController?.destroy();
    this.#dragController = null;
    this.removeEventListener('native:sort', this.#onSort as EventListener);
    this.removeEventListener('native:row-select', this.#onRowSelect as EventListener);
    super.teardown();
  }

  #initResize(): void {
    const headers = this.querySelectorAll('n-table-header');
    for (const header of headers) {
      const handle = document.createElement('div');
      handle.className = 'table-resize-handle';
      handle.setAttribute('aria-hidden', 'true');
      // WHY: Stop click from bubbling to the header's sort handler.
      // pointerdown preventDefault doesn't suppress the subsequent click event.
      handle.addEventListener('click', (e) => e.stopPropagation());
      header.appendChild(handle);
    }
    this.#resizeController = new ColumnResizeController(this);
    this.#resizeController.init();
  }

  #initHeaderMeasure(): void {
    const headerRow = this.querySelector(':scope > n-table-head > n-table-row') as HTMLElement | null;
    if (!headerRow) return;

    this.#headerObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // WHY: borderBoxSize gives the full rendered height including padding and border.
        // blockSize is the vertical dimension regardless of writing-mode.
        const height = entry.borderBoxSize?.[0]?.blockSize
          ?? entry.target.getBoundingClientRect().height;
        this.style.setProperty('--n-header-height', `${height}px`);
      }
    });
    this.#headerObserver.observe(headerRow);
  }

  #initReorder(): void {
    const body = this.querySelector(':scope > n-table-body') as HTMLElement | null;
    if (!body) return;
    this.#dragController = new TableDragController(body, this);
  }

  #onSort = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { column: string };
    this.#store.toggleSort(detail.column);

    this.dispatchEvent(new CustomEvent('native:table-sort', {
      bubbles: true,
      composed: true,
      detail: {
        column: this.#store.sortColumn.value,
        direction: this.#store.sortDirection.value,
      },
    }));
  };

  #onRowSelect = (e: Event): void => {
    if (!this.selectable) return;
    const detail = (e as CustomEvent).detail as { value: string };
    this.#store.toggle(detail.value);

    this.dispatchEvent(new CustomEvent('native:table-select', {
      bubbles: true,
      composed: true,
      detail: {
        value: detail.value,
        selected: this.#store.isSelected(detail.value),
        allSelected: [...this.#store.selected.value],
      },
    }));
  };
}
