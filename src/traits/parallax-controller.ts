export interface ParallaxOptions {
  /** Maximum tilt angle in degrees (default 15) */
  maxTilt?: number;
  /** Perspective in px (default 1000) */
  perspective?: number;
  /** Transition speed when entering/leaving in ms (default 300) */
  speed?: number;
  /** Scale factor on hover (default 1.05) */
  scale?: number;
  /** Enable glare/shine effect via CSS gradient (default false) */
  glare?: boolean;
  /** Max glare opacity 0-1 (default 0.35) */
  glareOpacity?: number;
  /** Enable gyroscope on mobile (default false) */
  gyroscope?: boolean;
  /** Disable the controller */
  disabled?: boolean;
}

/** Mouse-position tilt effect — subtle rotateX/rotateY transform relative to element center. Optional glare overlay and gyroscope support. */
export class ParallaxController {
  readonly host: HTMLElement;
  maxTilt: number;
  perspective: number;
  speed: number;
  scale: number;
  glare: boolean;
  glareOpacity: number;
  gyroscope: boolean;
  disabled: boolean;

  #attached = false;
  #active = false;
  #glareEl: HTMLDivElement | null = null;
  #gyroListening = false;

  constructor(host: HTMLElement, options: ParallaxOptions = {}) {
    this.host = host;
    this.maxTilt = options.maxTilt ?? 15;
    this.perspective = options.perspective ?? 1000;
    this.speed = options.speed ?? 300;
    this.scale = options.scale ?? 1.05;
    this.glare = options.glare ?? false;
    this.glareOpacity = options.glareOpacity ?? 0.35;
    this.gyroscope = options.gyroscope ?? false;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerenter', this.#onPointerEnter);
    this.host.addEventListener('pointermove', this.#onPointerMove);
    this.host.addEventListener('pointerleave', this.#onPointerLeave);
    if (this.glare) this.#createGlareEl();
    if (this.gyroscope) this.#startGyroscope();
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerenter', this.#onPointerEnter);
    this.host.removeEventListener('pointermove', this.#onPointerMove);
    this.host.removeEventListener('pointerleave', this.#onPointerLeave);
    this.#stopGyroscope();
    this.#removeGlareEl();
    if (this.#active) {
      this.#active = false;
      this.host.removeAttribute('parallax-active');
    }
  }

  destroy(): void {
    this.reset();
    this.detach();
  }

  /** Programmatically return to flat (no tilt, no scale). */
  reset(): void {
    this.#active = false;
    this.host.removeAttribute('parallax-active');
    this.host.style.transform = '';
    this.host.style.transition = `transform ${this.speed}ms cubic-bezier(0.2, 0, 0, 1)`;
    this.host.style.willChange = '';
    this.#setCSSProperties(0, 0, 0, 0);
    if (this.#glareEl) this.#updateGlare(50, 50);

    // Clear transition after it completes
    const onEnd = (): void => {
      this.host.style.transition = '';
      this.host.removeEventListener('transitionend', onEnd);
    };
    this.host.addEventListener('transitionend', onEnd, { once: true });
    setTimeout(onEnd, this.speed + 100);
  }

  // ── Pointer handlers (arrow functions for auto-bind) ──

  #onPointerEnter = (_e: PointerEvent): void => {
    if (this.disabled) return;
    this.#active = true;
    this.host.toggleAttribute('parallax-active', true);
    this.host.style.willChange = 'transform';
    this.host.style.transition = `transform ${this.speed}ms cubic-bezier(0.2, 0, 0, 1)`;
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (this.disabled || !this.#active) return;

    const rect = this.host.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // -1 to 1 range
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const percentX = halfW === 0 ? 0 : (e.clientX - centerX) / halfW;
    const percentY = halfH === 0 ? 0 : (e.clientY - centerY) / halfH;

    // Clamp to -1..1
    const clampedX = Math.max(-1, Math.min(1, percentX));
    const clampedY = Math.max(-1, Math.min(1, percentY));

    const tiltX = -clampedY * this.maxTilt; // inverted for natural feel
    const tiltY = clampedX * this.maxTilt;

    this.#applyTilt(tiltX, tiltY, clampedX, clampedY);

    // Remove the enter transition so movement is instant
    this.host.style.transition = '';

    // Update glare position (0-100% range)
    if (this.#glareEl) {
      this.#updateGlare((clampedX + 1) * 50, (clampedY + 1) * 50);
    }

    this.host.dispatchEvent(new CustomEvent('native:parallax-move', {
      bubbles: true,
      composed: true,
      detail: { tiltX, tiltY, percentX: clampedX, percentY: clampedY },
    }));
  };

  #onPointerLeave = (_e: PointerEvent): void => {
    if (!this.#active) return;
    this.#active = false;
    this.host.removeAttribute('parallax-active');

    // Smooth transition back to flat
    this.host.style.transition = `transform ${this.speed}ms cubic-bezier(0.2, 0, 0, 1)`;
    this.host.style.transform = `perspective(${this.perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;
    this.#setCSSProperties(0, 0, 0, 0);
    if (this.#glareEl) this.#updateGlare(50, 50);

    const onEnd = (): void => {
      this.host.style.transition = '';
      this.host.style.willChange = '';
      this.host.style.transform = '';
      this.host.removeEventListener('transitionend', onEnd);
    };
    this.host.addEventListener('transitionend', onEnd, { once: true });
    setTimeout(onEnd, this.speed + 100);
  };

  // ── Gyroscope ──

  #onDeviceOrientation = (e: DeviceOrientationEvent): void => {
    if (this.disabled) return;
    const beta = e.beta ?? 0;  // -180 to 180 (front-back tilt)
    const gamma = e.gamma ?? 0; // -90 to 90 (left-right tilt)

    // Map to -1..1 range
    const percentY = Math.max(-1, Math.min(1, beta / 45));
    const percentX = Math.max(-1, Math.min(1, gamma / 45));

    const tiltX = -percentY * this.maxTilt;
    const tiltY = percentX * this.maxTilt;

    if (!this.#active) {
      this.#active = true;
      this.host.toggleAttribute('parallax-active', true);
      this.host.style.willChange = 'transform';
    }

    this.#applyTilt(tiltX, tiltY, percentX, percentY);

    if (this.#glareEl) {
      this.#updateGlare((percentX + 1) * 50, (percentY + 1) * 50);
    }

    this.host.dispatchEvent(new CustomEvent('native:parallax-move', {
      bubbles: true,
      composed: true,
      detail: { tiltX, tiltY, percentX, percentY },
    }));
  };

  #startGyroscope(): void {
    if (this.#gyroListening) return;
    if (typeof DeviceOrientationEvent === 'undefined') return;
    this.#gyroListening = true;
    window.addEventListener('deviceorientation', this.#onDeviceOrientation);
  }

  #stopGyroscope(): void {
    if (!this.#gyroListening) return;
    this.#gyroListening = false;
    window.removeEventListener('deviceorientation', this.#onDeviceOrientation);
  }

  // ── Glare overlay ──

  #createGlareEl(): void {
    if (this.#glareEl) return;
    const el = document.createElement('div');
    el.className = 'parallax-glare';
    el.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(circle at 50% 50%, rgba(255,255,255,${this.glareOpacity}), transparent);
      opacity: 0;
      transition: opacity ${this.speed}ms ease;
    `;
    // Ensure host has position context
    const pos = getComputedStyle(this.host).position;
    if (pos === 'static') this.host.style.position = 'relative';
    this.host.appendChild(el);
    this.#glareEl = el;
  }

  #removeGlareEl(): void {
    if (this.#glareEl) {
      this.#glareEl.remove();
      this.#glareEl = null;
    }
  }

  #updateGlare(xPercent: number, yPercent: number): void {
    if (!this.#glareEl) return;
    this.#glareEl.style.background = `radial-gradient(circle at ${xPercent}% ${yPercent}%, rgba(255,255,255,${this.glareOpacity}), transparent)`;
    this.#glareEl.style.opacity = this.#active ? '1' : '0';
  }

  // ── Internals ──

  #applyTilt(tiltX: number, tiltY: number, percentX: number, percentY: number): void {
    this.host.style.transform = `perspective(${this.perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${this.scale})`;
    this.#setCSSProperties(tiltX, tiltY, percentX, percentY);
  }

  #setCSSProperties(tiltX: number, tiltY: number, percentX: number, percentY: number): void {
    this.host.style.setProperty('--parallax-tilt-x', String(tiltX));
    this.host.style.setProperty('--parallax-tilt-y', String(tiltY));
    this.host.style.setProperty('--parallax-percent-x', String(percentX));
    this.host.style.setProperty('--parallax-percent-y', String(percentY));
  }
}
