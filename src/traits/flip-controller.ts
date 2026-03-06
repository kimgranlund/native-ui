export interface FlipOptions {
  /** Flip axis: 'x' or 'y' (default 'y') */
  axis?: 'x' | 'y';
  /** Flip duration in ms (default 600) */
  duration?: number;
  /** Perspective in px (default 1000) */
  perspective?: number;
  /** Trigger: 'click' | 'hover' | 'manual' (default 'click') */
  trigger?: 'click' | 'hover' | 'manual';
  /** Disable the controller */
  disabled?: boolean;
}

/** 3D card flip on click/press with front/back content. CSS transform: rotateY(180deg) with perspective. */
export class FlipController {
  readonly host: HTMLElement;
  axis: 'x' | 'y';
  duration: number;
  perspective: number;
  trigger: 'click' | 'hover' | 'manual';
  disabled: boolean;

  #attached = false;
  #flipped = false;

  constructor(host: HTMLElement, options: FlipOptions = {}) {
    this.host = host;
    this.axis = options.axis ?? 'y';
    this.duration = options.duration ?? 600;
    this.perspective = options.perspective ?? 1000;
    this.trigger = options.trigger ?? 'click';
    this.disabled = options.disabled ?? false;
    this.#applyHostStyles();
    this.#applyChildStyles();
    this.attach();
  }

  get flipped(): boolean { return this.#flipped; }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    if (this.trigger === 'click') {
      this.host.addEventListener('click', this.#onClick);
    } else if (this.trigger === 'hover') {
      this.host.addEventListener('pointerenter', this.#onPointerEnter);
      this.host.addEventListener('pointerleave', this.#onPointerLeave);
    }
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('click', this.#onClick);
    this.host.removeEventListener('pointerenter', this.#onPointerEnter);
    this.host.removeEventListener('pointerleave', this.#onPointerLeave);
  }

  destroy(): void {
    this.detach();
    this.#clearHostStyles();
  }

  /** Flip to the back face (no-op if already flipped). */
  flip(): void {
    if (this.disabled || this.#flipped) return;
    this.#setFlipped(true);
  }

  /** Unflip to the front face (no-op if already unflipped). */
  unflip(): void {
    if (this.disabled || !this.#flipped) return;
    this.#setFlipped(false);
  }

  /** Toggle between front and back. */
  toggle(): void {
    if (this.disabled) return;
    this.#setFlipped(!this.#flipped);
  }

  // ── Event handlers (arrow functions for auto-bind) ──

  #onClick = (): void => {
    if (this.disabled) return;
    this.toggle();
  };

  #onPointerEnter = (): void => {
    if (this.disabled) return;
    this.#setFlipped(true);
  };

  #onPointerLeave = (): void => {
    if (this.disabled) return;
    this.#setFlipped(false);
  };

  // ── Internals ──

  #setFlipped(value: boolean): void {
    this.#flipped = value;
    this.host.toggleAttribute('flipped', value);
    this.host.style.willChange = 'transform';

    const rotation = value
      ? this.axis === 'y' ? 'rotateY(180deg)' : 'rotateX(180deg)'
      : this.axis === 'y' ? 'rotateY(0deg)' : 'rotateX(0deg)';
    this.host.style.transform = rotation;

    // Clear will-change after transition settles
    const cleanup = (): void => {
      this.host.style.willChange = '';
      this.host.removeEventListener('transitionend', cleanup);
    };
    this.host.addEventListener('transitionend', cleanup, { once: true });
    // Fallback in case transitionend doesn't fire
    setTimeout(cleanup, this.duration + 100);

    this.host.dispatchEvent(new CustomEvent('native:flip', {
      bubbles: true,
      composed: true,
      detail: { flipped: value, axis: this.axis },
    }));
  }

  #applyHostStyles(): void {
    this.host.style.perspective = `${this.perspective}px`;
    this.host.style.transformStyle = 'preserve-3d';
    this.host.style.transition = `transform ${this.duration}ms ease-in-out`;
  }

  #applyChildStyles(): void {
    const children = Array.from(this.host.children) as HTMLElement[];
    for (const child of children) {
      if (!child.style) continue;
      const isBack = child.getAttribute('slot') === 'back' || child.hasAttribute('data-flip-back');
      child.style.backfaceVisibility = 'hidden';
      if (isBack) {
        child.style.transform = this.axis === 'y' ? 'rotateY(180deg)' : 'rotateX(180deg)';
      }
    }
  }

  #clearHostStyles(): void {
    this.host.style.perspective = '';
    this.host.style.transformStyle = '';
    this.host.style.transition = '';
    this.host.style.transform = '';
    this.host.style.willChange = '';
    this.host.removeAttribute('flipped');
  }
}
