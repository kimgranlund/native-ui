export interface CollapsibleOptions {
  duration?: number;
}

/** Animates expand/collapse transitions on the host, dispatching `ui-expand` and `ui-collapse`. */
export class CollapsibleController {
  readonly host: HTMLElement;
  duration: number;

  #animating = false;
  #fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  #rafId = 0;

  constructor(host: HTMLElement, options: CollapsibleOptions = {}) {
    this.host = host;
    this.duration = options.duration ?? 200;
  }

  get collapsed(): boolean {
    return this.host.hasAttribute('collapsed');
  }

  set collapsed(val: boolean) {
    if (val) this.collapse();
    else this.expand();
  }

  expand(): void {
    if (!this.host.hasAttribute('collapsed')) return;
    if (this.#animating) return;

    this.#animating = true;
    this.host.removeAttribute('collapsed');

    // WHY: Measure natural height by temporarily removing overflow clip
    this.host.style.overflow = 'clip';
    this.host.style.height = '0px';

    this.#rafId = requestAnimationFrame(() => {
      const targetHeight = this.host.scrollHeight;
      this.host.style.transition = `height ${this.duration}ms var(--ui-easing, ease)`;
      this.host.style.height = `${targetHeight}px`;

      const onEnd = () => {
        this.host.removeEventListener('transitionend', onEnd);
        this.host.style.removeProperty('height');
        this.host.style.removeProperty('overflow');
        this.host.style.removeProperty('transition');
        this.#animating = false;
        this.host.dispatchEvent(new CustomEvent('ui-expand', { bubbles: true, composed: true }));
      };
      this.host.addEventListener('transitionend', onEnd, { once: true });

      // WHY: Fallback timeout in case transitionend doesn't fire
      this.#fallbackTimer = setTimeout(() => {
        if (this.#animating) onEnd();
      }, this.duration + 50);
    });
  }

  collapse(): void {
    if (this.host.hasAttribute('collapsed')) return;
    if (this.#animating) return;

    this.#animating = true;
    const currentHeight = this.host.scrollHeight;

    this.host.style.overflow = 'clip';
    this.host.style.height = `${currentHeight}px`;

    this.#rafId = requestAnimationFrame(() => {
      this.host.style.transition = `height ${this.duration}ms var(--ui-easing, ease)`;
      this.host.style.height = '0px';

      const onEnd = () => {
        this.host.removeEventListener('transitionend', onEnd);
        this.host.style.removeProperty('height');
        this.host.style.removeProperty('overflow');
        this.host.style.removeProperty('transition');
        this.#animating = false;
        this.host.setAttribute('collapsed', '');
        this.host.dispatchEvent(new CustomEvent('ui-collapse', { bubbles: true, composed: true }));
      };
      this.host.addEventListener('transitionend', onEnd, { once: true });

      this.#fallbackTimer = setTimeout(() => {
        if (this.#animating) onEnd();
      }, this.duration + 50);
    });
  }

  toggle(): void {
    if (this.host.hasAttribute('collapsed')) this.expand();
    else this.collapse();
  }

  destroy(): void {
    cancelAnimationFrame(this.#rafId);
    if (this.#fallbackTimer !== null) {
      clearTimeout(this.#fallbackTimer);
      this.#fallbackTimer = null;
    }
    if (this.#animating) {
      // WHY: Clean up inline styles left by interrupted animation
      this.host.style.removeProperty('height');
      this.host.style.removeProperty('overflow');
      this.host.style.removeProperty('transition');
    }
    this.#animating = false;
  }
}
