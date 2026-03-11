import { NativeElement } from '@nonoun/native-core';
import { signal } from '@nonoun/native-core';
import { VirtualScrollController } from '@nonoun/native-traits';

const SCROLL_THRESHOLD = 40;

/**
 * Generic scrollable feed container with auto-scroll and virtual scroll.
 *
 * ```html
 * <n-feed align="end" scroll>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </n-feed>
 * ```
 *
 * @attr {'start'|'end'} align - Content alignment (default: start). `end` pushes content to bottom.
 * @attr {boolean} scroll - Enable scroll container (overflow-y: auto). CSS-only.
 * @attr {boolean} auto-scroll - Auto-scroll to bottom on new content (default: off)
 * @attr {boolean} virtual - Enable virtual scroll windowing
 * @attr {string} virtual-item-height - Estimated item height in px (default: 80)
 * @attr {string} virtual-overscan - Extra items to render outside viewport (default: 5)
 * @fires native:feed-scroll - Scroll pin state changed. Detail: `{ isPinned, scrollTop }`
 * @fires native:range-change - Virtual scroll range changed. Detail: `{ start, end, total }`
 */
export class NFeed extends NativeElement {
  static observedAttributes = ['auto-scroll', 'virtual', 'virtual-item-height', 'virtual-overscan'];

  #autoScroll = signal(false);
  #isPinned = signal(true);
  #observer: MutationObserver | null = null;

  // ── Virtualization ──
  #virtualCtrl: VirtualScrollController | null = null;
  #container: HTMLElement | null = null;
  #items = signal<unknown[]>([]);
  #itemRenderer: ((item: unknown, index: number) => HTMLElement) | null = null;

  // ── Public API ──

  get isPinned(): boolean { return this.#isPinned.value; }

  /** Scroll to the bottom of the feed. */
  scrollToBottom(smooth = true): void {
    this.scrollTo({
      top: this.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
    this.#isPinned.value = true;
  }

  /** Data items for virtual rendering. */
  get items(): unknown[] { return this.#items.value; }
  set items(val: unknown[]) {
    this.#items.value = val;
    if (this.#virtualCtrl) {
      this.#virtualCtrl.updateCount(val.length);
    }
  }

  /** Callback that creates an HTMLElement from a data item. */
  get itemRenderer(): ((item: unknown, index: number) => HTMLElement) | null { return this.#itemRenderer; }
  set itemRenderer(fn: ((item: unknown, index: number) => HTMLElement) | null) {
    this.#itemRenderer = fn;
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'auto-scroll':
        this.#autoScroll.value = val !== null;
        break;
      case 'virtual':
        if (val !== null) this.#enableVirtual();
        else this.#disableVirtual();
        break;
      case 'virtual-item-height':
        if (this.#virtualCtrl && val) {
          this.#virtualCtrl.itemHeight = Number(val) || 80;
        }
        break;
      case 'virtual-overscan':
        if (this.#virtualCtrl && val) {
          this.#virtualCtrl.overscan = Number(val) || 5;
        }
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.addEventListener('scroll', this.#onScroll, { passive: true });

    // Watch for new children → auto-scroll
    this.#observer = new MutationObserver(this.#onChildrenChanged);
    this.#observer.observe(this, { childList: true, subtree: true });

    // Initialize virtualization if attribute is present
    if (this.hasAttribute('virtual')) {
      this.#enableVirtual();
    }
  }

  teardown(): void {
    this.removeEventListener('scroll', this.#onScroll);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#disableVirtual();
    super.teardown();
  }

  // ── Virtualization ──

  #enableVirtual(): void {
    if (this.#virtualCtrl) return;

    const itemHeight = Number(this.getAttribute('virtual-item-height')) || 80;
    const overscan = Number(this.getAttribute('virtual-overscan')) || 5;

    this.#virtualCtrl = new VirtualScrollController(this, { itemHeight, overscan });

    this.#container = document.createElement('div');
    this.#container.className = 'n-feed-virtual-container';

    while (this.firstChild) {
      this.#container.appendChild(this.firstChild);
    }
    this.appendChild(this.#container);

    this.#virtualCtrl.enable(this, this.#container, this.#items.value.length);
    this.addEventListener('native:virtual-change', this.#onVirtualChange);
  }

  #disableVirtual(): void {
    if (!this.#virtualCtrl) return;

    this.removeEventListener('native:virtual-change', this.#onVirtualChange);
    this.#virtualCtrl.destroy();
    this.#virtualCtrl = null;

    if (this.#container) {
      while (this.#container.firstChild) {
        this.insertBefore(this.#container.firstChild, this.#container);
      }
      this.#container.remove();
      this.#container = null;
    }
  }

  #onVirtualChange = (e: Event): void => {
    const { start, end, totalCount } = (e as CustomEvent).detail;

    this.dispatchEvent(new CustomEvent('native:range-change', {
      bubbles: true,
      composed: true,
      detail: { start, end, total: totalCount },
    }));

    if (this.#itemRenderer && this.#container) {
      this.#renderRange(start, end);
    }
  };

  #renderRange(start: number, end: number): void {
    if (!this.#container || !this.#itemRenderer) return;

    const items = this.#items.value;

    const children = Array.from(this.#container.children);
    for (const child of children) {
      if (!child.classList.contains('n-virtual-spacer-top') &&
          !child.classList.contains('n-virtual-spacer-bottom')) {
        child.remove();
      }
    }

    const spacerBottom = this.#container.querySelector('.n-virtual-spacer-bottom');
    for (let i = start; i < end && i < items.length; i++) {
      const el = this.#itemRenderer(items[i], i);
      if (spacerBottom) {
        this.#container.insertBefore(el, spacerBottom);
      } else {
        this.#container.appendChild(el);
      }
    }
  }

  // ── Scroll management ──

  #onScroll = (): void => {
    const wasPinned = this.#isPinned.value;
    const pinned = this.scrollTop + this.clientHeight >= this.scrollHeight - SCROLL_THRESHOLD;
    this.#isPinned.value = pinned;

    if (pinned !== wasPinned) {
      this.dispatchEvent(new CustomEvent('native:feed-scroll', {
        bubbles: true,
        composed: true,
        detail: { isPinned: pinned, scrollTop: this.scrollTop },
      }));
    }
  };

  #onChildrenChanged = (): void => {
    if (this.#autoScroll.value && this.#isPinned.value) {
      requestAnimationFrame(() => {
        this.scrollTo({ top: this.scrollHeight, behavior: 'smooth' });
      });
    }
  };
}
