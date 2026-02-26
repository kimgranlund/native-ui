import { UIElement } from '../../core/ui-element.ts';
import { TableStore } from './table-store.ts';
import { ColumnResizeController } from './column-resize-controller.ts';
import { TableDragController } from './table-drag-controller.ts';
import type { UITableHeader } from './ui-table-header-element.ts';
import type { UITableRow } from './ui-table-row-element.ts';

/**
 * Data table with sortable columns, row selection, column resizing, and row reordering.
 * @attr {boolean} selectable - Enables row selection on click
 * @attr {boolean} resizable - Enables column resize handles
 * @attr {boolean} reorderable - Enables drag-to-reorder rows
 * @fires ui-table-sort - Fired when sort changes with `{ column, direction }` detail
 * @fires ui-table-select - Fired when row selection changes with `{ value, selected, allSelected }` detail
 */
export class UITable extends UIElement {
  static observedAttributes = ['selectable', 'resizable', 'reorderable'];

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

  setup(): void {
    super.setup();

    this.addEventListener('ui-sort', this.#onSort as EventListener);
    this.addEventListener('ui-row-select', this.#onRowSelect as EventListener);

    this.deferChildren(() => {
      if (__DEV__) {
        if (!this.querySelector(':scope > ui-table-head')) console.warn('[ui-table] No <ui-table-head> child found. Expected structure: <ui-table-head> + <ui-table-body>.');
        if (!this.querySelector(':scope > ui-table-body')) console.warn('[ui-table] No <ui-table-body> child found. Expected structure: <ui-table-head> + <ui-table-body>.');
      }

      // WHY: Sync store sort state → header sort attributes
      this.addEffect(() => {
        const col = this.#store.sortColumn.value;
        const dir = this.#store.sortDirection.value;
        const headers = this.querySelectorAll<UITableHeader & HTMLElement>('ui-table-header[sortable]');

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
        const rows = this.querySelectorAll<UITableRow & HTMLElement>('ui-table-body ui-table-row');

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
        const rows = this.querySelectorAll<HTMLElement>('ui-table-body ui-table-row[colspan]');
        for (const row of rows) row.toggleAttribute('hidden', col !== null);
      });

      // WHY: Initialize column resizing when [resizable] is present.
      // Must be inside deferChildren because we need header cells in DOM.
      if (this.hasAttribute('resizable')) {
        this.#initResize();
      }

      // WHY: Measure header row height for sticky colspan positioning.
      // Sets --_header-height CSS variable so sticky colspan rows park below the header.
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
    this.removeEventListener('ui-sort', this.#onSort as EventListener);
    this.removeEventListener('ui-row-select', this.#onRowSelect as EventListener);
    super.teardown();
  }

  #initResize(): void {
    const headers = this.querySelectorAll('ui-table-header');
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
    const headerRow = this.querySelector(':scope > ui-table-head > ui-table-row') as HTMLElement | null;
    if (!headerRow) return;

    this.#headerObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // WHY: borderBoxSize gives the full rendered height including padding and border.
        // blockSize is the vertical dimension regardless of writing-mode.
        const height = entry.borderBoxSize?.[0]?.blockSize
          ?? entry.target.getBoundingClientRect().height;
        this.style.setProperty('--_header-height', `${height}px`);
      }
    });
    this.#headerObserver.observe(headerRow);
  }

  #initReorder(): void {
    const body = this.querySelector(':scope > ui-table-body') as HTMLElement | null;
    if (!body) return;
    this.#dragController = new TableDragController(body, this);
  }

  #onSort = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { column: string };
    this.#store.toggleSort(detail.column);

    this.dispatchEvent(new CustomEvent('ui-table-sort', {
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

    this.dispatchEvent(new CustomEvent('ui-table-select', {
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
