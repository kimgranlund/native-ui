export interface ResizeOptions {
  handleSelector: string;
  axis?: 'horizontal' | 'vertical' | 'both';
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Reverse drag direction (e.g. left-edge handle that grows width on leftward drag). */
  reverse?: boolean;
}

/** Handles pointer-driven element resizing via a drag handle, dispatching `native:resize-start`, `native:resize-move`, and `native:resize-end`. */
export class ResizeController {
  readonly host: HTMLElement;
  handleSelector: string;
  axis: 'horizontal' | 'vertical' | 'both';
  min: number;
  max: number;
  disabled: boolean;
  reverse: boolean;

  #startX = 0;
  #startY = 0;
  #startWidth = 0;
  #startHeight = 0;
  #isResizing = false;
  #attached = false;

  constructor(host: HTMLElement, options: ResizeOptions) {
    this.host = host;
    this.handleSelector = options.handleSelector;
    this.axis = options.axis ?? 'horizontal';
    this.min = options.min ?? 0;
    this.max = options.max ?? Infinity;
    this.disabled = options.disabled ?? false;
    this.reverse = options.reverse ?? false;
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
      detail: { width: this.#startWidth, height: this.#startHeight },
    }));
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#isResizing) return;

    const sign = this.reverse ? -1 : 1;
    const dx = (e.clientX - this.#startX) * sign;
    const dy = (e.clientY - this.#startY) * sign;

    if (this.axis === 'horizontal' || this.axis === 'both') {
      const w = Math.min(this.max, Math.max(this.min, this.#startWidth + dx));
      this.host.style.width = `${w}px`;
    }

    if (this.axis === 'vertical' || this.axis === 'both') {
      const h = Math.min(this.max, Math.max(this.min, this.#startHeight + dy));
      this.host.style.height = `${h}px`;
    }

    const rect = this.host.getBoundingClientRect();
    this.host.dispatchEvent(new CustomEvent('native:resize-move', {
      bubbles: true,
      composed: true,
      detail: { width: rect.width, height: rect.height },
    }));
  };

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#isResizing) return;

    const rect = this.host.getBoundingClientRect();
    this.host.dispatchEvent(new CustomEvent('native:resize-end', {
      bubbles: true,
      composed: true,
      detail: { width: rect.width, height: rect.height },
    }));

    this.#cleanup();
  };

  #onPointerCancel = (): void => {
    if (!this.#isResizing) return;
    // WHY: Revert on cancel — only revert the axis that was being resized
    if (this.axis === 'horizontal' || this.axis === 'both') {
      this.host.style.width = `${this.#startWidth}px`;
    }
    if (this.axis === 'vertical' || this.axis === 'both') {
      this.host.style.height = `${this.#startHeight}px`;
    }
    this.#cleanup();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#isResizing) {
      e.preventDefault();
      // WHY: Revert on cancel — only revert the axis that was being resized
      if (this.axis === 'horizontal' || this.axis === 'both') {
        this.host.style.width = `${this.#startWidth}px`;
      }
      if (this.axis === 'vertical' || this.axis === 'both') {
        this.host.style.height = `${this.#startHeight}px`;
      }
      this.#cleanup();
    }
  };

  #cleanup(): void {
    this.#isResizing = false;
    this.host.removeAttribute('resizing');
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('pointercancel', this.#onPointerCancel);
    document.removeEventListener('keydown', this.#onKeyDown);
  }
}
