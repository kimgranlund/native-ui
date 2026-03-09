export interface VirtualScrollOptions {
  itemHeight?: number;
  overscan?: number;
}

/** Virtualizes a scrollable list by rendering only visible items, dispatching `native:virtual-change`. */
export class VirtualScrollController {
  readonly host: HTMLElement;
  itemHeight: number;
  overscan: number;

  #totalCount = 0;
  #startIndex = 0;
  #endIndex = 0;
  #scrollEl: HTMLElement | null = null;
  #spacerTop: HTMLElement | null = null;
  #spacerBottom: HTMLElement | null = null;
  #rafId = 0;

  constructor(host: HTMLElement, options: VirtualScrollOptions = {}) {
    this.host = host;
    this.itemHeight = options.itemHeight ?? 40;
    this.overscan = options.overscan ?? 5;
  }

  get start(): number {
    return this.#startIndex;
  }

  get end(): number {
    return this.#endIndex;
  }

  enable(scrollEl: HTMLElement, container: HTMLElement, totalCount: number): void {
    this.#scrollEl = scrollEl;
    this.#totalCount = totalCount;

    this.#spacerTop = document.createElement('div');
    this.#spacerTop.className = 'n-virtual-spacer-top';
    this.#spacerTop.setAttribute('aria-hidden', 'true');

    this.#spacerBottom = document.createElement('div');
    this.#spacerBottom.className = 'n-virtual-spacer-bottom';
    this.#spacerBottom.setAttribute('aria-hidden', 'true');

    container.prepend(this.#spacerTop);
    container.appendChild(this.#spacerBottom);

    scrollEl.addEventListener('scroll', this.#onScroll, { passive: true });

    this.#compute();
  }

  disable(): void {
    if (this.#scrollEl) {
      this.#scrollEl.removeEventListener('scroll', this.#onScroll);
    }
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
    }
    this.#spacerTop?.remove();
    this.#spacerBottom?.remove();
    this.#scrollEl = null;
    this.#spacerTop = null;
    this.#spacerBottom = null;
  }

  updateCount(count: number): void {
    this.#totalCount = count;
    this.#compute();
  }

  destroy(): void {
    this.disable();
  }

  #onScroll = (): void => {
    if (this.#rafId) return;
    // WHY: Throttle to rAF for smooth scrolling
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = 0;
      this.#compute();
    });
  };

  #compute(): void {
    if (!this.#scrollEl || !this.#spacerTop || !this.#spacerBottom) return;

    const scrollTop = this.#scrollEl.scrollTop;
    const viewportHeight = this.#scrollEl.clientHeight;

    const rawStart = Math.floor(scrollTop / this.itemHeight);
    const rawEnd = Math.ceil((scrollTop + viewportHeight) / this.itemHeight);

    const start = Math.max(0, rawStart - this.overscan);
    const end = Math.min(this.#totalCount, rawEnd + this.overscan);

    // WHY: Only dispatch if range actually changed
    if (start === this.#startIndex && end === this.#endIndex) return;

    this.#startIndex = start;
    this.#endIndex = end;

    this.#spacerTop.style.height = `${start * this.itemHeight}px`;
    this.#spacerBottom.style.height = `${Math.max(0, (this.#totalCount - end) * this.itemHeight)}px`;

    this.host.dispatchEvent(new CustomEvent('native:virtual-change', {
      bubbles: true,
      composed: true,
      detail: { start, end, totalCount: this.#totalCount },
    }));
  }
}
