export interface HoverOptions {
  delay?: number;
  leaveDelay?: number;
  disabled?: boolean;
}

/**
 * Tracks pointer enter/leave with configurable delays, dispatching
 * `native:hover-start` and `native:hover-end`.
 *
 * For combined press+hover on a single element, use PressController
 * with the `hover` option instead.
 */
export class HoverController {
  readonly host: HTMLElement;
  delay: number;
  leaveDelay: number;
  disabled: boolean;

  #enterTimer: ReturnType<typeof setTimeout> | undefined;
  #leaveTimer: ReturnType<typeof setTimeout> | undefined;
  #attached = false;

  constructor(host: HTMLElement, options: HoverOptions = {}) {
    this.host = host;
    this.delay = options.delay ?? 0;
    this.leaveDelay = options.leaveDelay ?? 0;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerenter', this.#onEnter);
    this.host.addEventListener('pointerleave', this.#onLeave);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerenter', this.#onEnter);
    this.host.removeEventListener('pointerleave', this.#onLeave);
    clearTimeout(this.#enterTimer);
    clearTimeout(this.#leaveTimer);
    this.host.removeAttribute('hovered');
  }

  destroy(): void {
    this.detach();
  }

  #onEnter = (e: PointerEvent): void => {
    if (this.disabled) return;
    clearTimeout(this.#leaveTimer);
    if (this.delay > 0) {
      this.#enterTimer = setTimeout(() => {
        this.host.toggleAttribute('hovered', true);
        this.host.dispatchEvent(new CustomEvent('native:hover-start', {
          bubbles: true, composed: true,
          detail: { pointerType: e.pointerType },
        }));
      }, this.delay);
    } else {
      this.host.toggleAttribute('hovered', true);
      this.host.dispatchEvent(new CustomEvent('native:hover-start', {
        bubbles: true, composed: true,
        detail: { pointerType: e.pointerType },
      }));
    }
  };

  #onLeave = (e: PointerEvent): void => {
    if (this.disabled) return;
    clearTimeout(this.#enterTimer);
    if (this.leaveDelay > 0) {
      this.#leaveTimer = setTimeout(() => {
        this.host.removeAttribute('hovered');
        this.host.dispatchEvent(new CustomEvent('native:hover-end', {
          bubbles: true, composed: true,
          detail: { pointerType: e.pointerType },
        }));
      }, this.leaveDelay);
    } else {
      this.host.removeAttribute('hovered');
      this.host.dispatchEvent(new CustomEvent('native:hover-end', {
        bubbles: true, composed: true,
        detail: { pointerType: e.pointerType },
      }));
    }
  };
}
