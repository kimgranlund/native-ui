import { NativeElement } from '@nonoun/native-core';

/**
 * Message group — cluster of messages from the same sender.
 *
 * Provides a 2×2 grid layout:
 *   - Col 1, row 1–2: avatar (bottom-aligned)
 *   - Col 2, row 1: context area (metadata, reasoning, timestamps)
 *   - Col 2, row 2: messages area (chat bubbles, flex column)
 *
 * On setup, non-avatar children are sorted into two wrapper divs:
 *   - `.n-chat-context` — non-message children (row 1)
 *   - `.n-chat-bubbles` — `n-agent-dialogue-item` children (row 2)
 *
 * A MutationObserver routes dynamically added children into the
 * correct wrapper automatically.
 *
 * ```html
 * <n-agent-dialogue role="assistant" sender="AI">
 *   <n-chat-avatar>AI</n-chat-avatar>
 *   <span class="reasoning">Thinking...</span>
 *   <n-agent-dialogue-item role="assistant">
 *     <n-chat-message-text>Hello!</n-chat-message-text>
 *   </n-agent-dialogue-item>
 * </n-agent-dialogue>
 * ```
 *
 * @attr {string} role - `user` | `assistant` | `system`
 * @attr {string} sender - Display name of the sender
 * @attr {string} avatar-align - `"top"` | `"center"` | `"bottom"` (default) — avatar vertical alignment
 */
export class NAgentDialogue extends NativeElement {
  static observedAttributes = ['data-role', 'sender', 'avatar-align'];

  #internals: ElementInternals;
  #contextEl: HTMLDivElement | null = null;
  #bubblesEl: HTMLDivElement | null = null;
  #observer: MutationObserver | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    super.attributeChangedCallback(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#internals.role = 'group';
    const sender = this.getAttribute('sender');
    if (sender) {
      this.setAttribute('aria-label', `Messages from ${sender}`);
    }

    this.#wrapChildren();

    // Route dynamically added children into the correct wrapper
    this.#observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          // Skip avatar and our own wrappers
          if (node.localName === 'n-chat-avatar') continue;
          if (node === this.#contextEl || node === this.#bubblesEl) continue;
          // Route to correct wrapper
          if (node.localName === 'n-agent-dialogue-item') {
            this.#bubblesEl?.appendChild(node);
          } else {
            this.#contextEl?.appendChild(node);
          }
        }
      }
    });
    this.#observer.observe(this, { childList: true });
  }

  teardown(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    // Unwrap children back to flat DOM
    if (this.#bubblesEl) {
      while (this.#bubblesEl.firstChild) {
        this.appendChild(this.#bubblesEl.firstChild);
      }
      this.#bubblesEl.remove();
      this.#bubblesEl = null;
    }
    if (this.#contextEl) {
      while (this.#contextEl.firstChild) {
        this.appendChild(this.#contextEl.firstChild);
      }
      this.#contextEl.remove();
      this.#contextEl = null;
    }
    super.teardown();
  }

  #wrapChildren(): void {
    const context = document.createElement('div');
    context.className = 'n-chat-context';

    const bubbles = document.createElement('div');
    bubbles.className = 'n-chat-bubbles';

    // Sort children into context vs bubbles (skip avatar)
    const children = Array.from(this.childNodes);
    for (const child of children) {
      if (child instanceof Element && child.localName === 'n-chat-avatar') continue;
      if (child instanceof Element && child.localName === 'n-agent-dialogue-item') {
        bubbles.appendChild(child);
      } else {
        context.appendChild(child);
      }
    }

    this.appendChild(context);
    this.appendChild(bubbles);
    this.#contextEl = context;
    this.#bubblesEl = bubbles;
  }
}
