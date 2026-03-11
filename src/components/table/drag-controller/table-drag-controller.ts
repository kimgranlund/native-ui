import { DragController } from '@nonoun/native-traits';

/**
 * Table-specific drag controller that wraps DragController with:
 * - Subgrid column layout fix for ghost elements
 * - Click suppression after drag (prevents row selection)
 * - Auto DOM reorder via native:table-reorder event
 */
export class TableDragController {
  #drag: DragController;
  #table: HTMLElement;
  #body: HTMLElement;
  #wasDragging = false;

  constructor(tableBody: HTMLElement, table: HTMLElement) {
    this.#table = table;
    this.#body = tableBody;
    this.#drag = new DragController(tableBody, {
      selector: 'n-table-row:not([colspan])',
      axis: 'vertical',
      mode: 'slot',
    });

    tableBody.addEventListener('native:drag-start', this.#onDragStart as EventListener);
    tableBody.addEventListener('native:drop', this.#onDrop as EventListener);

    // WHY: Suppress row selection click after a drag completes. DragController
    // removes [dragging] in #cleanup before pointerup, so by the time the
    // click event fires the attribute is gone. Use a flag instead.
    tableBody.addEventListener('click', this.#onClickAfterDrag, { capture: true });
  }

  #onDragStart = (_e: Event): void => {
    this.#wasDragging = true;

    // WHY: The ghost is a clone of n-table-row which uses subgrid.
    // Outside the parent grid (in the top-layer popover), subgrid resolves
    // to nothing — cells collapse. Copy the resolved column widths so the
    // ghost preserves column layout.
    // Ghost is appended to body BEFORE native:drag-start fires, so it's in DOM.
    const ghost = this.#body.querySelector(':scope > [popover][aria-hidden="true"]') as HTMLElement | null;
    if (ghost) {
      ghost.style.gridTemplateColumns = getComputedStyle(this.#table).gridTemplateColumns;
      ghost.style.display = 'grid';
      ghost.style.alignItems = 'center';
    }
  };

  #onDrop = (e: Event): void => {
    const detail = (e as CustomEvent).detail as {
      item: HTMLElement;
      fromIndex: number;
      toIndex: number;
      insertBefore: HTMLElement | null;
    };

    // WHY: Dispatch cancelable event so consumers can prevent auto-reorder
    // (e.g. to update a data store first, then re-render).
    const event = new CustomEvent('native:table-reorder', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        row: detail.item,
        fromIndex: detail.fromIndex,
        toIndex: detail.toIndex,
      },
    });

    if (this.#table.dispatchEvent(event)) {
      // Auto-reorder DOM unless consumer called preventDefault()
      if (detail.insertBefore) {
        this.#body.insertBefore(detail.item, detail.insertBefore);
      } else {
        this.#body.appendChild(detail.item);
      }
    }
  };

  #onClickAfterDrag = (e: Event): void => {
    if (this.#wasDragging) {
      e.stopPropagation();
      this.#wasDragging = false;
    }
  };

  destroy(): void {
    this.#body.removeEventListener('native:drag-start', this.#onDragStart as EventListener);
    this.#body.removeEventListener('native:drop', this.#onDrop as EventListener);
    this.#body.removeEventListener('click', this.#onClickAfterDrag, { capture: true } as EventListenerOptions);
    this.#drag.destroy();
  }
}
