export interface ColumnResizeOptions {
  minWidth?: number;
  maxWidth?: number;
}

export class ColumnResizeController {
  readonly table: HTMLElement;
  #columnWidths: number[] = [];
  #resizingIndex = -1;
  #startX = 0;
  #startWidth = 0;
  #isResizing = false;
  #minWidth: number;
  #maxWidth: number;

  constructor(table: HTMLElement, options: ColumnResizeOptions = {}) {
    this.table = table;
    this.#minWidth = options.minWidth ?? 48;
    this.#maxWidth = options.maxWidth ?? Infinity;
  }

  /** Call after table is in DOM and has computed layout. */
  init(): void {
    this.table.addEventListener('pointerdown', this.#onPointerDown);
  }

  destroy(): void {
    this.table.removeEventListener('pointerdown', this.#onPointerDown);
    // WHY: Always clean up document listeners — handles case where element is
    // removed mid-resize (isResizing may be true when destroy is called)
    this.#cleanup();
  }

  #readColumnWidths(): void {
    const computed = getComputedStyle(this.table).gridTemplateColumns;
    // WHY: computed returns resolved pixel values like "200px 150px 100px"
    this.#columnWidths = computed.split(/\s+/).map(v => parseFloat(v));
  }

  #applyColumnWidths(): void {
    this.table.style.gridTemplateColumns =
      this.#columnWidths.map(w => `${w}px`).join(' ');
  }

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    const handle = (e.target as HTMLElement).closest?.('.table-resize-handle') as HTMLElement | null;
    if (!handle || !this.table.contains(handle)) return;

    const header = handle.closest('ui-table-header');
    if (!header) return;

    const row = header.closest('ui-table-row');
    if (!row) return;
    const headers = [...row.querySelectorAll('ui-table-header')];

    // WHY: Read resolved column widths at drag-start (not init) so we always
    // have fresh layout values and don't prematurely overwrite fractional units.
    this.#readColumnWidths();

    const index = headers.indexOf(header);
    if (index === -1 || index >= this.#columnWidths.length) return;

    e.preventDefault();
    e.stopPropagation(); // WHY: Prevent sort click handler from firing

    // WHY: Pin table width before converting grid-template-columns from
    // fractional units (e.g. 2fr 1fr) to absolute px. Without this the
    // grid's intrinsic width collapses to the sum of px values.
    if (!this.table.style.width) {
      this.table.style.width = `${this.table.offsetWidth}px`;
    }
    this.#isResizing = true;
    this.#resizingIndex = index;
    this.#startX = e.clientX;
    this.#startWidth = this.#columnWidths[index];

    handle.setPointerCapture(e.pointerId);
    this.table.setAttribute('resizing', '');

    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
    document.addEventListener('pointercancel', this.#onPointerCancel);
    document.addEventListener('keydown', this.#onKeyDown);

    this.table.dispatchEvent(new CustomEvent('ui-table-resize-start', {
      bubbles: true,
      composed: true,
      detail: { column: index, width: this.#startWidth },
    }));
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#isResizing) return;
    const dx = e.clientX - this.#startX;
    const newWidth = Math.min(this.#maxWidth,
      Math.max(this.#minWidth, this.#startWidth + dx));
    this.#columnWidths[this.#resizingIndex] = newWidth;
    this.#applyColumnWidths();

    this.table.dispatchEvent(new CustomEvent('ui-table-resize', {
      bubbles: true,
      composed: true,
      detail: { column: this.#resizingIndex, width: newWidth },
    }));
  };

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#isResizing) return;

    this.table.dispatchEvent(new CustomEvent('ui-table-resize-end', {
      bubbles: true,
      composed: true,
      detail: {
        column: this.#resizingIndex,
        width: this.#columnWidths[this.#resizingIndex],
        allWidths: [...this.#columnWidths],
      },
    }));

    this.#cleanup();
  };

  #onPointerCancel = (): void => {
    if (!this.#isResizing) return;
    // WHY: Revert on cancel
    this.#columnWidths[this.#resizingIndex] = this.#startWidth;
    this.#applyColumnWidths();
    this.#cleanup();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#isResizing) {
      e.preventDefault();
      this.#columnWidths[this.#resizingIndex] = this.#startWidth;
      this.#applyColumnWidths();
      this.#cleanup();
    }
  };

  #cleanup(): void {
    this.#isResizing = false;
    this.#resizingIndex = -1;
    this.table.removeAttribute('resizing');
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('pointercancel', this.#onPointerCancel);
    document.removeEventListener('keydown', this.#onKeyDown);
  }
}
