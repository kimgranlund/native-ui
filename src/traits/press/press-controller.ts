export interface PressOptions {
  disabled?: boolean | (() => boolean);
  /** Enable hover tracking. Pass `true` for instant hover, or an object for delays. */
  hover?: boolean | { delay?: number; leaveDelay?: number };
}

/** Handles pointer/keyboard press and optional hover interactions. */
export class PressController {
  readonly host: HTMLElement;
  disabled: boolean | (() => boolean);

  /** Hover enter delay in ms (0 = instant). Only used when hover is enabled. */
  hoverDelay: number;
  /** Hover leave delay in ms (0 = instant). Only used when hover is enabled. */
  hoverLeaveDelay: number;

  #hasCapture = false;
  #lastPointerType = 'mouse';
  #attached = false;
  #hoverEnabled: boolean;
  #enterTimer: ReturnType<typeof setTimeout> | undefined;
  #leaveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(host: HTMLElement, options: PressOptions = {}) {
    this.host = host;
    this.disabled = options.disabled ?? false;

    const hover = options.hover;
    this.#hoverEnabled = !!hover;
    if (hover && typeof hover === 'object') {
      this.hoverDelay = hover.delay ?? 0;
      this.hoverLeaveDelay = hover.leaveDelay ?? 0;
    } else {
      this.hoverDelay = 0;
      this.hoverLeaveDelay = 0;
    }

    this.attach();
  }

  /** Whether hover tracking is active. */
  get hover(): boolean { return this.#hoverEnabled; }
  set hover(value: boolean) {
    if (value === this.#hoverEnabled) return;
    this.#hoverEnabled = value;
    if (this.#attached) {
      if (value) {
        this.host.addEventListener('pointerenter', this.#onEnter);
        this.host.addEventListener('pointerleave', this.#onLeave);
      } else {
        this.host.removeEventListener('pointerenter', this.#onEnter);
        this.host.removeEventListener('pointerleave', this.#onLeave);
        clearTimeout(this.#enterTimer);
        clearTimeout(this.#leaveTimer);
        this.host.removeAttribute('hovered');
      }
    }
  }

  #isDisabled(): boolean {
    if (typeof this.disabled === 'function') return this.disabled();
    if (this.disabled) return true;
    return (this.host as unknown as { disabled?: boolean }).disabled === true;
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerdown', this.#onPointerDown);
    this.host.addEventListener('pointerup', this.#onPointerUp);
    this.host.addEventListener('pointercancel', this.#onPointerCancel);
    this.host.addEventListener('lostpointercapture', this.#onLostCapture);
    this.host.addEventListener('keydown', this.#onKeyDown);
    this.host.addEventListener('keyup', this.#onKeyUp);
    if (this.#hoverEnabled) {
      this.host.addEventListener('pointerenter', this.#onEnter);
      this.host.addEventListener('pointerleave', this.#onLeave);
    }
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    this.host.removeEventListener('pointerup', this.#onPointerUp);
    this.host.removeEventListener('pointercancel', this.#onPointerCancel);
    this.host.removeEventListener('lostpointercapture', this.#onLostCapture);
    this.host.removeEventListener('keydown', this.#onKeyDown);
    this.host.removeEventListener('keyup', this.#onKeyUp);
    this.host.removeAttribute('pressed');
    if (this.#hoverEnabled) {
      this.host.removeEventListener('pointerenter', this.#onEnter);
      this.host.removeEventListener('pointerleave', this.#onLeave);
      clearTimeout(this.#enterTimer);
      clearTimeout(this.#leaveTimer);
      this.host.removeAttribute('hovered');
    }
  }

  destroy(): void {
    this.detach();
  }

  // ── Press handlers ──

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (this.#isDisabled()) return;
    this.#lastPointerType = e.pointerType;
    this.host.setPointerCapture(e.pointerId);
    this.#hasCapture = true;
    this.host.toggleAttribute('pressed', true);
  };

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#hasCapture) return;
    this.#hasCapture = false;
    this.host.removeAttribute('pressed');
    this.host.dispatchEvent(new CustomEvent('native:press', {
      bubbles: true,
      composed: true,
      detail: { pointerType: this.#lastPointerType },
    }));
  };

  #onPointerCancel = (): void => {
    this.#hasCapture = false;
    this.host.removeAttribute('pressed');
  };

  #onLostCapture = (): void => {
    this.#hasCapture = false;
    this.host.removeAttribute('pressed');
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (this.#isDisabled()) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // WHY: Prevent Space from scrolling the page
    if (e.key === ' ') e.preventDefault();
    this.host.toggleAttribute('pressed', true);
  };

  #onKeyUp = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    this.host.removeAttribute('pressed');
    // WHY: Check disabled on keyup — element may have become disabled during keypress
    if (this.#isDisabled()) return;
    this.host.dispatchEvent(new CustomEvent('native:press', {
      bubbles: true,
      composed: true,
      detail: { pointerType: 'keyboard' },
    }));
  };

  // ── Hover handlers ──

  #onEnter = (e: PointerEvent): void => {
    if (this.#isDisabled()) return;
    clearTimeout(this.#leaveTimer);
    if (this.hoverDelay > 0) {
      this.#enterTimer = setTimeout(() => {
        this.host.toggleAttribute('hovered', true);
        this.host.dispatchEvent(new CustomEvent('native:hover-start', {
          bubbles: true, composed: true,
          detail: { pointerType: e.pointerType },
        }));
      }, this.hoverDelay);
    } else {
      this.host.toggleAttribute('hovered', true);
      this.host.dispatchEvent(new CustomEvent('native:hover-start', {
        bubbles: true, composed: true,
        detail: { pointerType: e.pointerType },
      }));
    }
  };

  #onLeave = (e: PointerEvent): void => {
    if (this.#isDisabled()) return;
    clearTimeout(this.#enterTimer);
    if (this.hoverLeaveDelay > 0) {
      this.#leaveTimer = setTimeout(() => {
        this.host.removeAttribute('hovered');
        this.host.dispatchEvent(new CustomEvent('native:hover-end', {
          bubbles: true, composed: true,
          detail: { pointerType: e.pointerType },
        }));
      }, this.hoverLeaveDelay);
    } else {
      this.host.removeAttribute('hovered');
      this.host.dispatchEvent(new CustomEvent('native:hover-end', {
        bubbles: true, composed: true,
        detail: { pointerType: e.pointerType },
      }));
    }
  };
}
