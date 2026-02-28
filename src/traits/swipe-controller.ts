export interface SwipeOptions {
  threshold?: number;
  velocityThreshold?: number;
  axis?: 'horizontal' | 'vertical' | 'both';
  disabled?: boolean;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** Detects touch/pointer swipe gestures and dispatches `ui-swipe` with direction and velocity. */
export class SwipeController {
  readonly host: HTMLElement;
  threshold: number;
  velocityThreshold: number;
  axis: 'horizontal' | 'vertical' | 'both';
  disabled: boolean;

  #startX = 0;
  #startY = 0;
  #startTime = 0;
  #attached = false;
  #tracking = false;
  #direction: SwipeDirection | null = null;
  #distance = 0;
  #attrTimer: ReturnType<typeof setTimeout> | null = null;
  #velocity = 0;

  constructor(host: HTMLElement, options: SwipeOptions = {}) {
    this.host = host;
    this.threshold = options.threshold ?? 50;
    this.velocityThreshold = options.velocityThreshold ?? 0.3;
    this.axis = options.axis ?? 'horizontal';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  get direction(): SwipeDirection | null { return this.#direction; }
  get distance(): number { return this.#distance; }
  get velocity(): number { return this.#velocity; }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerdown', this.#onPointerDown);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    if (this.#tracking) {
      this.host.removeEventListener('pointerup', this.#onPointerUp);
      this.host.removeEventListener('pointercancel', this.#onPointerCancel);
      this.#tracking = false;
    }
  }

  destroy(): void {
    if (this.#attrTimer !== null) {
      clearTimeout(this.#attrTimer);
      this.#attrTimer = null;
    }
    this.detach();
  }

  #onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || e.button !== 0) return;
    // Reject multi-touch
    if (e.pointerType === 'touch' && !e.isPrimary) return;

    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#startTime = Date.now();
    this.#direction = null;
    this.#distance = 0;
    this.#velocity = 0;

    this.host.setPointerCapture(e.pointerId);
    this.host.toggleAttribute('swiping', true);

    this.#tracking = true;
    this.host.addEventListener('pointerup', this.#onPointerUp);
    this.host.addEventListener('pointercancel', this.#onPointerCancel);
  };

  #onPointerUp = (e: PointerEvent): void => {
    this.#tracking = false;
    this.host.removeAttribute('swiping');
    this.host.removeEventListener('pointerup', this.#onPointerUp);
    this.host.removeEventListener('pointercancel', this.#onPointerCancel);

    const dx = e.clientX - this.#startX;
    const dy = e.clientY - this.#startY;
    const elapsed = Date.now() - this.#startTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Determine primary axis
    let dir: SwipeDirection | null = null;
    let dist = 0;

    if (this.axis === 'horizontal' || (this.axis === 'both' && absDx >= absDy)) {
      dist = absDx;
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dist = absDy;
      dir = dy > 0 ? 'down' : 'up';
    }

    const vel = elapsed > 0 ? dist / elapsed : 0;

    if (dist >= this.threshold && vel >= this.velocityThreshold) {
      this.#direction = dir;
      this.#distance = dist;
      this.#velocity = vel;

      // WHY: Clear any pending timer and remove stale swipe-* attribute from a previous swipe
      // before setting the new one — prevents orphaned attributes on rapid double-swipes.
      if (this.#attrTimer !== null) {
        clearTimeout(this.#attrTimer);
        this.#attrTimer = null;
        for (const attr of ['swipe-left', 'swipe-right', 'swipe-up', 'swipe-down']) {
          this.host.removeAttribute(attr);
        }
      }

      // Set direction attribute briefly
      this.host.setAttribute(`swipe-${dir}`, '');
      this.#attrTimer = setTimeout(() => {
        this.host.removeAttribute(`swipe-${dir}`);
        this.#attrTimer = null;
      }, 300);

      this.host.dispatchEvent(new CustomEvent('ui-swipe', {
        bubbles: true,
        composed: true,
        detail: { direction: dir, distance: dist, velocity: vel },
      }));
    }
  };

  #onPointerCancel = (): void => {
    this.#tracking = false;
    this.host.removeAttribute('swiping');
    this.host.removeEventListener('pointerup', this.#onPointerUp);
    this.host.removeEventListener('pointercancel', this.#onPointerCancel);
  };
}
