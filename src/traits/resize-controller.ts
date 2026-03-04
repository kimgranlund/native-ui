export type HandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ResizeOptions {
  handleSelector: string;
  axis?: 'horizontal' | 'vertical' | 'both';
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Reverse drag direction (e.g. left-edge handle that grows width on leftward drag). */
  reverse?: boolean;
  /** Handle mode: 'edge' for single-axis edge handles (default), 'corner' for two-axis corner handles. */
  handleMode?: 'edge' | 'corner';
  /** Which corner handles to use (corner mode only). Defaults to all four. */
  handles?: HandlePosition[];
  /** Minimum width constraint (corner mode). Falls back to `min` if not set. */
  minWidth?: number;
  /** Maximum width constraint (corner mode). Falls back to `max` if not set. */
  maxWidth?: number;
  /** Minimum height constraint (corner mode). Falls back to `min` if not set. */
  minHeight?: number;
  /** Maximum height constraint (corner mode). Falls back to `max` if not set. */
  maxHeight?: number;
}

/** Sign multipliers for each corner handle — maps dx/dy to width/height changes. */
const CORNER_SIGNS: Record<HandlePosition, { sx: number; sy: number }> = {
  'bottom-right': { sx: 1, sy: 1 },
  'bottom-left': { sx: -1, sy: 1 },
  'top-right': { sx: 1, sy: -1 },
  'top-left': { sx: -1, sy: -1 },
};

/** Handles pointer-driven element resizing via a drag handle, dispatching `native:resize-start`, `native:resize-move`, and `native:resize-end`. */
export class ResizeController {
  readonly host: HTMLElement;
  handleSelector: string;
  axis: 'horizontal' | 'vertical' | 'both';
  min: number;
  max: number;
  disabled: boolean;
  reverse: boolean;
  handleMode: 'edge' | 'corner';
  handles: HandlePosition[];
  minWidth: number | undefined;
  maxWidth: number | undefined;
  minHeight: number | undefined;
  maxHeight: number | undefined;

  #startX = 0;
  #startY = 0;
  #startWidth = 0;
  #startHeight = 0;
  #isResizing = false;
  #attached = false;
  #activeHandle: HandlePosition | null = null;

  constructor(host: HTMLElement, options: ResizeOptions) {
    this.host = host;
    this.handleSelector = options.handleSelector;
    this.axis = options.axis ?? 'horizontal';
    this.min = options.min ?? 0;
    this.max = options.max ?? Infinity;
    this.disabled = options.disabled ?? false;
    this.reverse = options.reverse ?? false;
    this.handleMode = options.handleMode ?? 'edge';
    this.handles = options.handles ?? ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    this.minWidth = options.minWidth;
    this.maxWidth = options.maxWidth;
    this.minHeight = options.minHeight;
    this.maxHeight = options.maxHeight;
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

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (this.disabled) return;
    if (!this.handleSelector) return;

    const handle = (e.target as HTMLElement).closest?.(this.handleSelector) as HTMLElement | null;
    if (!handle || !this.host.contains(handle)) return;

    // In corner mode, read data-handle to identify which corner was clicked
    if (this.handleMode === 'corner') {
      const handlePos = handle.getAttribute('data-handle') as HandlePosition | null;
      if (!handlePos || !this.handles.includes(handlePos)) return;
      this.#activeHandle = handlePos;
    } else {
      this.#activeHandle = null;
    }

    e.preventDefault();
    this.#isResizing = true;
    this.#startX = e.clientX;
    this.#startY = e.clientY;

    const rect = this.host.getBoundingClientRect();
    this.#startWidth = rect.width;
    this.#startHeight = rect.height;

    this.host.setAttribute('resizing', '');

    this.host.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
    document.addEventListener('pointercancel', this.#onPointerCancel);
    document.addEventListener('keydown', this.#onKeyDown);

    this.host.dispatchEvent(new CustomEvent('native:resize-start', {
      bubbles: true,
      composed: true,
      detail: { width: this.#startWidth, height: this.#startHeight, handle: this.#activeHandle },
    }));
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#isResizing) return;

    const dx = e.clientX - this.#startX;
    const dy = e.clientY - this.#startY;

    if (this.handleMode === 'corner' && this.#activeHandle) {
      const signs = CORNER_SIGNS[this.#activeHandle];
      const effectiveMinW = this.minWidth ?? this.min;
      const effectiveMaxW = this.maxWidth ?? this.max;
      const effectiveMinH = this.minHeight ?? this.min;
      const effectiveMaxH = this.maxHeight ?? this.max;

      const w = Math.min(effectiveMaxW, Math.max(effectiveMinW, this.#startWidth + dx * signs.sx));
      const h = Math.min(effectiveMaxH, Math.max(effectiveMinH, this.#startHeight + dy * signs.sy));

      this.host.style.width = `${w}px`;
      this.host.style.height = `${h}px`;
    } else {
      // Edge mode — original behavior
      const sign = this.reverse ? -1 : 1;
      const edgeDx = dx * sign;
      const edgeDy = dy * sign;

      if (this.axis === 'horizontal' || this.axis === 'both') {
        const w = Math.min(this.max, Math.max(this.min, this.#startWidth + edgeDx));
        this.host.style.width = `${w}px`;
      }

      if (this.axis === 'vertical' || this.axis === 'both') {
        const h = Math.min(this.max, Math.max(this.min, this.#startHeight + edgeDy));
        this.host.style.height = `${h}px`;
      }
    }

    const rect = this.host.getBoundingClientRect();
    this.host.dispatchEvent(new CustomEvent('native:resize-move', {
      bubbles: true,
      composed: true,
      detail: { width: rect.width, height: rect.height, handle: this.#activeHandle },
    }));
  };

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#isResizing) return;

    const rect = this.host.getBoundingClientRect();
    this.host.dispatchEvent(new CustomEvent('native:resize-end', {
      bubbles: true,
      composed: true,
      detail: { width: rect.width, height: rect.height, handle: this.#activeHandle },
    }));

    this.#cleanup();
  };

  #onPointerCancel = (): void => {
    if (!this.#isResizing) return;
    // WHY: Revert on cancel — revert both axes in corner mode, only active axis in edge mode
    if (this.handleMode === 'corner') {
      this.host.style.width = `${this.#startWidth}px`;
      this.host.style.height = `${this.#startHeight}px`;
    } else {
      if (this.axis === 'horizontal' || this.axis === 'both') {
        this.host.style.width = `${this.#startWidth}px`;
      }
      if (this.axis === 'vertical' || this.axis === 'both') {
        this.host.style.height = `${this.#startHeight}px`;
      }
    }
    this.#cleanup();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#isResizing) {
      e.preventDefault();
      // WHY: Revert on cancel — revert both axes in corner mode, only active axis in edge mode
      if (this.handleMode === 'corner') {
        this.host.style.width = `${this.#startWidth}px`;
        this.host.style.height = `${this.#startHeight}px`;
      } else {
        if (this.axis === 'horizontal' || this.axis === 'both') {
          this.host.style.width = `${this.#startWidth}px`;
        }
        if (this.axis === 'vertical' || this.axis === 'both') {
          this.host.style.height = `${this.#startHeight}px`;
        }
      }
      this.#cleanup();
    }
  };

  #cleanup(): void {
    this.#isResizing = false;
    this.#activeHandle = null;
    this.host.removeAttribute('resizing');
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('pointercancel', this.#onPointerCancel);
    document.removeEventListener('keydown', this.#onKeyDown);
  }
}
