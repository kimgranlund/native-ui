import { NativeElement, signal } from '@nonoun/native-ui';

const SCROLL_THRESHOLD = 40;

/**
 * Chat feed coordinator — scrollable thread of message groups.
 *
 * Wraps `n-chat-messages` groups and manages auto-scroll behavior.
 * When pinned to bottom, new content automatically scrolls into view.
 *
 * ```html
 * <n-chat-feed auto-scroll>
 *   <n-chat-messages role="assistant">...</n-chat-messages>
 *   <n-chat-messages role="user">...</n-chat-messages>
 * </n-chat-feed>
 * ```
 *
 * @attr {boolean} auto-scroll - Enable auto-scroll to bottom on new content (default: true)
 * @fires native:feed-scroll - Fired when scroll pinned state changes
 */
export class NChatFeed extends NativeElement {
  static observedAttributes = ['auto-scroll', 'scrollable'];

  #internals: ElementInternals;
  #autoScroll = signal(true);
  #isPinned = signal(true);
  #observer: MutationObserver | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

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

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'auto-scroll') {
      this.#autoScroll.value = val !== null;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.#internals.role = 'log';
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-label', 'Conversation');

    // Default scrollable unless explicitly removed — the feed owns scroll
    // by default. Remove [scrollable] to delegate to a parent container.
    if (!this.hasAttribute('scrollable')) {
      this.setAttribute('scrollable', '');
    }

    // Default auto-scroll unless explicitly removed
    if (!this.hasAttribute('auto-scroll')) {
      this.#autoScroll.value = true;
    }

    this.addEventListener('scroll', this.#onScroll, { passive: true });

    // Watch for new children (messages added) → auto-scroll
    this.#observer = new MutationObserver(this.#onChildrenChanged);
    this.#observer.observe(this, { childList: true, subtree: true });

    // Catch internal message-action events and re-dispatch with feed context
    this.addEventListener('native:message-action', this.#onMessageAction);
  }

  teardown(): void {
    this.removeEventListener('scroll', this.#onScroll);
    this.removeEventListener('native:message-action', this.#onMessageAction);
    this.#observer?.disconnect();
    this.#observer = null;
    super.teardown();
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
      // Use rAF to let layout settle before scrolling
      requestAnimationFrame(() => {
        this.scrollTo({ top: this.scrollHeight, behavior: 'smooth' });
      });
    }
  };

  // ── Event coordination ──

  #onMessageAction = (_e: Event): void => {
    // Let the event bubble — feed doesn't intercept, just enriches if needed.
    // Consumers listen on the feed for all message actions.
  };
}
