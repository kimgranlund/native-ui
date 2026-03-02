export interface IntersectOptions {
  threshold?: number;
  root?: string | null;
  margin?: string;
  once?: boolean;
  disabled?: boolean;
}

/** Observes intersection visibility changes on the host, dispatching `native:intersect`. */
export class IntersectController {
  readonly host: HTMLElement;
  threshold: number;
  root: string | null;
  margin: string;
  once: boolean;
  disabled: boolean;

  #observer: IntersectionObserver | null = null;
  #attached = false;

  constructor(host: HTMLElement, options: IntersectOptions = {}) {
    this.host = host;
    this.threshold = options.threshold ?? 0;
    this.root = options.root ?? null;
    this.margin = options.margin ?? '0px';
    this.once = options.once ?? false;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached || this.disabled) return;
    this.#attached = true;

    const rootEl = this.root ? document.querySelector(this.root) : null;

    this.#observer = new IntersectionObserver(
      this.#onIntersect,
      {
        root: rootEl,
        rootMargin: this.margin,
        threshold: this.threshold,
      },
    );
    this.#observer.observe(this.host);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.#observer?.disconnect();
    this.#observer = null;
    this.host.removeAttribute('intersecting');
  }

  destroy(): void {
    this.detach();
  }

  #onIntersect = (entries: IntersectionObserverEntry[]): void => {
    for (const entry of entries) {
      const intersecting = entry.isIntersecting;
      this.host.toggleAttribute('intersecting', intersecting);
      this.host.dispatchEvent(new CustomEvent('native:intersect', {
        bubbles: true,
        composed: true,
        detail: { isIntersecting: intersecting, ratio: entry.intersectionRatio },
      }));

      if (intersecting && this.once) {
        this.#observer?.disconnect();
        this.#observer = null;
        // WHY: Reset #attached so attach() can be called again if needed
        this.#attached = false;
      }
    }
  };
}
