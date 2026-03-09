export interface PressOptions {
  disabled?: boolean | (() => boolean);
}

/** Handles pointer and keyboard press interactions, dispatching `native:press` events. */
export class PressController {
  readonly host: HTMLElement;
  disabled: boolean | (() => boolean);

  #hasCapture = false;
  #lastPointerType = 'mouse';
  #attached = false;

  constructor(host: HTMLElement, options: PressOptions = {}) {
    this.host = host;
    this.disabled = options.disabled ?? false;
    this.attach();
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
  }

  destroy(): void {
    this.detach();
  }

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
}
