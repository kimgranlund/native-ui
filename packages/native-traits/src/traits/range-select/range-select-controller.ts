export interface RangeSelectOptions {
  selector: string;
  mode?: 'drag' | 'click';
  disabled?: boolean;
}

/** Enables contiguous range selection via drag or click, dispatching `native:range-change` and `native:range-select`. */
export class RangeSelectController {
  readonly host: HTMLElement;
  selector: string;
  mode: 'drag' | 'click';
  disabled: boolean;

  #startIndex = -1;
  #endIndex = -1;
  #isSelecting = false;
  #attached = false;

  // WHY: Click mode uses a 3-phase state machine:
  // idle → selecting (start picked, hover previews) → adjusting (drag fine-tune) → idle
  #phase: 'idle' | 'selecting' | 'adjusting' = 'idle';

  constructor(host: HTMLElement, options: RangeSelectOptions) {
    this.host = host;
    this.selector = options.selector;
    this.mode = options.mode ?? 'drag';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerdown', this.#onPointerDown);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    this.#cleanup();
  }

  destroy(): void {
    this.detach();
  }

  clearRange(): void {
    this.#cleanup();
  }

  // ── Queries ──

  #getItems(): HTMLElement[] {
    if (!this.selector) return [];
    return [...this.host.querySelectorAll<HTMLElement>(this.selector)];
  }

  #indexOfPointer(e: PointerEvent | MouseEvent): number {
    const items = this.#getItems();
    const el = document.elementFromPoint(e.clientX, e.clientY) ?? e.target;
    if (!el) return -1;
    const item = (el as HTMLElement).closest?.(this.selector) as HTMLElement | null;
    if (!item || !this.host.contains(item)) return -1;
    return items.indexOf(item);
  }

  #indexOfTarget(e: PointerEvent | MouseEvent): number {
    const items = this.#getItems();
    const item = (e.target as HTMLElement).closest?.(this.selector) as HTMLElement | null;
    if (!item || !this.host.contains(item)) return -1;
    return items.indexOf(item);
  }

  // ── Entry point ──

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (this.disabled) return;
    if (!this.selector) return;

    if (this.mode === 'click') {
      this.#onPointerDownClick(e);
    } else {
      this.#onPointerDownDrag(e);
    }
  };

  // ── Drag Mode ──

  #onPointerDownDrag(e: PointerEvent): void {
    const index = this.#indexOfPointer(e);
    if (index === -1) return;

    e.preventDefault();
    this.#isSelecting = true;
    this.#startIndex = index;
    this.#endIndex = index;

    this.#updateRange();

    this.host.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', this.#onDragMove);
    document.addEventListener('pointerup', this.#onDragUp);
    document.addEventListener('pointercancel', this.#onDragCancel);
  }

  #onDragMove = (e: PointerEvent): void => {
    if (!this.#isSelecting) return;

    const index = this.#indexOfPointer(e);
    if (index === -1) return;
    if (index === this.#endIndex) return;

    this.#endIndex = index;
    this.#updateRange();
    this.#dispatchChange();
  };

  #onDragUp = (_e: PointerEvent): void => {
    if (!this.#isSelecting) return;
    this.#commitRange();
    this.#cleanupDragListeners();
    this.#isSelecting = false;
  };

  #onDragCancel = (): void => {
    this.#cleanup();
  };

  #cleanupDragListeners(): void {
    document.removeEventListener('pointermove', this.#onDragMove);
    document.removeEventListener('pointerup', this.#onDragUp);
    document.removeEventListener('pointercancel', this.#onDragCancel);
  }

  // ── Click Mode ──

  #onPointerDownClick(e: PointerEvent): void {
    const index = this.#indexOfTarget(e);
    if (index === -1) return;

    e.preventDefault();

    if (this.#phase === 'idle') {
      this.#startIndex = index;
      this.#endIndex = index;
      this.#updateRange();
      this.#phase = 'selecting';

      this.host.addEventListener('pointermove', this.#onClickHover);
    } else if (this.#phase === 'selecting') {
      this.#endIndex = index;
      this.#updateRange();
      this.#phase = 'adjusting';

      this.host.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', this.#onClickAdjustMove);
      document.addEventListener('pointerup', this.#onClickAdjustUp);
      document.addEventListener('pointercancel', this.#onClickAdjustCancel);
    }
  }

  #onClickHover = (e: PointerEvent): void => {
    if (this.#phase !== 'selecting') return;

    const index = this.#indexOfTarget(e);
    if (index === -1) return;
    if (index === this.#endIndex) return;

    this.#endIndex = index;
    this.#updateRange();
    this.#dispatchChange();
  };

  #onClickAdjustMove = (e: PointerEvent): void => {
    if (this.#phase !== 'adjusting') return;

    const index = this.#indexOfPointer(e);
    if (index === -1) return;
    if (index === this.#endIndex) return;

    this.#endIndex = index;
    this.#updateRange();
    this.#dispatchChange();
  };

  #onClickAdjustUp = (_e: PointerEvent): void => {
    if (this.#phase !== 'adjusting') return;
    this.#commitRange();
    this.#cleanupClickListeners();
    this.#phase = 'idle';
  };

  #onClickAdjustCancel = (): void => {
    this.#cleanup();
  };

  #cleanupClickListeners(): void {
    this.host.removeEventListener('pointermove', this.#onClickHover);
    document.removeEventListener('pointermove', this.#onClickAdjustMove);
    document.removeEventListener('pointerup', this.#onClickAdjustUp);
    document.removeEventListener('pointercancel', this.#onClickAdjustCancel);
  }

  // ── Shared ──

  #bounds(): [number, number] {
    return [
      Math.min(this.#startIndex, this.#endIndex),
      Math.max(this.#startIndex, this.#endIndex),
    ];
  }

  #dispatchChange(): void {
    const items = this.#getItems();
    const [lo, hi] = this.#bounds();
    this.host.dispatchEvent(new CustomEvent('native:range-change', {
      bubbles: true,
      composed: true,
      detail: {
        startIndex: lo,
        endIndex: hi,
        items: items.slice(lo, hi + 1),
      },
    }));
  }

  #commitRange(): void {
    const items = this.#getItems();
    const [lo, hi] = this.#bounds();
    this.host.dispatchEvent(new CustomEvent('native:range-select', {
      bubbles: true,
      composed: true,
      detail: {
        startIndex: lo,
        endIndex: hi,
        items: items.slice(lo, hi + 1),
      },
    }));
  }

  #updateRange(): void {
    const items = this.#getItems();
    const [lo, hi] = this.#bounds();

    for (let i = 0; i < items.length; i++) {
      const inRange = i >= lo && i <= hi;
      items[i].toggleAttribute('range-selected', inRange);

      if (i === lo) {
        items[i].setAttribute('range-start', '');
      } else {
        items[i].removeAttribute('range-start');
      }

      if (i === hi) {
        items[i].setAttribute('range-end', '');
      } else {
        items[i].removeAttribute('range-end');
      }
    }
  }

  #clearAttributes(): void {
    const items = this.#getItems();
    for (const item of items) {
      item.removeAttribute('range-selected');
      item.removeAttribute('range-start');
      item.removeAttribute('range-end');
    }
  }

  #cleanup(): void {
    this.#clearAttributes();
    this.#cleanupDragListeners();
    this.#cleanupClickListeners();
    this.#isSelecting = false;
    this.#phase = 'idle';
    this.#startIndex = -1;
    this.#endIndex = -1;
  }
}
