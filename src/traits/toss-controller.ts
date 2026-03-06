export interface TossOptions {
  /** Deceleration factor per frame — 0.95 = slows 5% each frame (default 0.95) */
  friction?: number;
  /** Bounce off viewport edges (default true) */
  bounce?: boolean;
  /** Velocity multiplier on bounce (default 0.6) */
  bounceDamping?: number;
  /** Gravity — px/frame² added to vertical velocity each frame. 0 = no gravity (default 0) */
  gravity?: number;
  /** Track angular velocity from pointer movement and spin during momentum (default false) */
  spin?: boolean;
  /** Animate back to origin after momentum ends (default false) */
  returnOnEnd?: boolean;
  /** Disable the controller */
  disabled?: boolean;
}

interface PointerSample {
  x: number;
  y: number;
  t: number;
}

/** Pick up an element, fling it with momentum — physics-based deceleration, gravity, spin, and optional edge bounce. */
export class TossController {
  readonly host: HTMLElement;
  friction: number;
  bounce: boolean;
  bounceDamping: number;
  gravity: number;
  spin: boolean;
  returnOnEnd: boolean;
  disabled: boolean;

  #attached = false;
  #tracking = false;
  #animating = false;
  #rafId = 0;

  // Pointer tracking
  #offsetX = 0;
  #offsetY = 0;
  #translateX = 0;
  #translateY = 0;
  #originX = 0;
  #originY = 0;

  // Spin tracking
  #rotation = 0;
  #angularVelocity = 0;
  #lastPointerX = 0;

  // Velocity sampling — ring buffer of last 4 positions
  #samples: PointerSample[] = [];
  #bounceCount = 0;

  constructor(host: HTMLElement, options: TossOptions = {}) {
    this.host = host;
    this.friction = options.friction ?? 0.95;
    this.bounce = options.bounce ?? true;
    this.bounceDamping = options.bounceDamping ?? 0.6;
    this.gravity = options.gravity ?? 0;
    this.spin = options.spin ?? false;
    this.returnOnEnd = options.returnOnEnd ?? false;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  get animating(): boolean { return this.#animating; }
  get x(): number { return this.#translateX; }
  get y(): number { return this.#translateY; }
  get rotation(): number { return this.#rotation; }

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
      this.host.removeEventListener('pointermove', this.#onPointerMove);
      this.host.removeEventListener('pointerup', this.#onPointerUp);
      this.host.removeEventListener('pointercancel', this.#onPointerCancel);
      this.#tracking = false;
    }
  }

  destroy(): void {
    this.#stopMomentum();
    this.detach();
  }

  // ── Pointer handlers (arrow functions for auto-bind) ──

  #onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || e.button !== 0) return;
    if (e.pointerType === 'touch' && !e.isPrimary) return;

    // Stop any running momentum animation
    this.#stopMomentum();

    this.host.setPointerCapture(e.pointerId);
    this.host.toggleAttribute('tossing', true);
    this.host.style.willChange = 'transform';

    // Record grab offset from current translate position
    this.#offsetX = e.clientX - this.#translateX;
    this.#offsetY = e.clientY - this.#translateY;

    // Save origin for returnOnEnd
    if (this.#originX === 0 && this.#originY === 0) {
      this.#originX = this.#translateX;
      this.#originY = this.#translateY;
    }

    // Reset velocity samples and spin
    this.#samples = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    this.#bounceCount = 0;
    this.#lastPointerX = e.clientX;
    this.#angularVelocity = 0;

    this.#tracking = true;
    this.host.addEventListener('pointermove', this.#onPointerMove);
    this.host.addEventListener('pointerup', this.#onPointerUp);
    this.host.addEventListener('pointercancel', this.#onPointerCancel);
  };

  #onPointerMove = (e: PointerEvent): void => {
    this.#translateX = e.clientX - this.#offsetX;
    this.#translateY = e.clientY - this.#offsetY;

    // Track angular velocity from horizontal pointer movement
    if (this.spin) {
      const dx = e.clientX - this.#lastPointerX;
      this.#angularVelocity = dx * 0.3; // degrees per frame scaling
      this.#lastPointerX = e.clientX;
    }

    this.#applyTransform();

    // Ring buffer of last 4 samples
    const now = Date.now();
    this.#samples.push({ x: e.clientX, y: e.clientY, t: now });
    if (this.#samples.length > 4) this.#samples.shift();
  };

  #onPointerUp = (e: PointerEvent): void => {
    this.#cleanupTracking(e);

    // Calculate exit velocity from samples
    const { vx, vy } = this.#calcVelocity(e.clientX, e.clientY);

    // Need minimum velocity to trigger toss
    if (Math.abs(vx) + Math.abs(vy) < 0.5) {
      this.#finishToss(vx, vy);
      return;
    }

    // Start momentum animation
    this.#animating = true;
    this.#animateMomentum(vx, vy);
  };

  #onPointerCancel = (_e: PointerEvent): void => {
    this.#cleanupTracking(_e);
    this.host.removeAttribute('tossing');
    this.host.style.willChange = '';
  };

  // ── Internals ──

  #applyTransform(): void {
    this.host.style.translate = `${this.#translateX}px ${this.#translateY}px`;
    if (this.spin) this.host.style.rotate = `${this.#rotation}deg`;
  }

  #cleanupTracking(e: PointerEvent): void {
    this.#tracking = false;
    this.host.removeEventListener('pointermove', this.#onPointerMove);
    this.host.removeEventListener('pointerup', this.#onPointerUp);
    this.host.removeEventListener('pointercancel', this.#onPointerCancel);
    // Remove lostpointercapture before releasing to prevent re-entry
    try { this.host.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  }

  #calcVelocity(currentX: number, currentY: number): { vx: number; vy: number } {
    if (this.#samples.length < 2) return { vx: 0, vy: 0 };

    const first = this.#samples[0];
    const elapsed = Date.now() - first.t;
    if (elapsed === 0) return { vx: 0, vy: 0 };

    // px per ms → px per frame (assume 16ms)
    const vx = ((currentX - first.x) / elapsed) * 16;
    const vy = ((currentY - first.y) / elapsed) * 16;
    return { vx, vy };
  }

  #animateMomentum(vx: number, vy: number): void {
    let av = this.spin ? this.#angularVelocity : 0;

    const step = (): void => {
      vx *= this.friction;
      vy *= this.friction;
      vy += this.gravity;

      // Spin friction
      if (this.spin) {
        av *= this.friction;
        this.#rotation += av;
      }

      this.#translateX += vx;
      this.#translateY += vy;

      // Bounce off viewport edges
      if (this.bounce) {
        const rect = this.host.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (rect.left < 0) {
          this.#translateX -= rect.left;
          vx = Math.abs(vx) * this.bounceDamping;
          if (this.spin) av = -av * this.bounceDamping;
          this.#dispatchBounce('left', vx, vy);
          this.#bounceCount++;
        } else if (rect.right > vw) {
          this.#translateX -= (rect.right - vw);
          vx = -Math.abs(vx) * this.bounceDamping;
          if (this.spin) av = -av * this.bounceDamping;
          this.#dispatchBounce('right', vx, vy);
          this.#bounceCount++;
        }

        if (rect.top < 0) {
          this.#translateY -= rect.top;
          vy = Math.abs(vy) * this.bounceDamping;
          this.#dispatchBounce('top', vx, vy);
          this.#bounceCount++;
        } else if (rect.bottom > vh) {
          this.#translateY -= (rect.bottom - vh);
          vy = -Math.abs(vy) * this.bounceDamping;
          this.#dispatchBounce('bottom', vx, vy);
          this.#bounceCount++;
        }
      }

      this.#applyTransform();

      // Stop when velocity is sub-pixel
      const moving = Math.abs(vx) + Math.abs(vy);
      if (moving < 0.5 && this.gravity === 0) {
        this.#finishToss(vx, vy);
        return;
      }
      // With gravity: stop if settled at bottom edge
      if (this.gravity > 0 && moving < 0.5) {
        const rect = this.host.getBoundingClientRect();
        if (rect.bottom >= window.innerHeight - 1) {
          this.#finishToss(vx, vy);
          return;
        }
      }

      this.#rafId = requestAnimationFrame(step);
    };

    this.#rafId = requestAnimationFrame(step);
  }

  #dispatchBounce(edge: 'left' | 'right' | 'top' | 'bottom', vx: number, vy: number): void {
    this.host.dispatchEvent(new CustomEvent('native:bounce', {
      bubbles: true,
      composed: true,
      detail: { edge, x: this.#translateX, y: this.#translateY, velocityX: vx, velocityY: vy },
    }));
  }

  #finishToss(vx: number, vy: number): void {
    this.#animating = false;

    if (this.returnOnEnd) {
      // Animate back to origin with CSS transition
      const props = 'translate 400ms cubic-bezier(0.2, 0, 0, 1)';
      this.host.style.transition = this.spin ? `${props}, rotate 400ms cubic-bezier(0.2, 0, 0, 1)` : props;
      this.#translateX = this.#originX;
      this.#translateY = this.#originY;
      this.#rotation = 0;
      this.host.style.translate = `${this.#originX}px ${this.#originY}px`;
      if (this.spin) this.host.style.rotate = '0deg';

      const onEnd = (): void => {
        this.host.style.transition = '';
        this.host.style.willChange = '';
        this.host.removeAttribute('tossing');
        this.host.removeEventListener('transitionend', onEnd);
      };
      this.host.addEventListener('transitionend', onEnd, { once: true });
      // Fallback in case transitionend doesn't fire
      setTimeout(onEnd, 500);
    } else {
      this.host.style.willChange = '';
      this.host.removeAttribute('tossing');
    }

    this.host.dispatchEvent(new CustomEvent('native:toss', {
      bubbles: true,
      composed: true,
      detail: {
        x: this.#translateX,
        y: this.#translateY,
        velocityX: vx,
        velocityY: vy,
        bounces: this.#bounceCount,
        rotation: this.#rotation,
      },
    }));
  }

  #stopMomentum(): void {
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
    }
    this.#animating = false;
  }
}
