import { NativeElement, signal } from '@nonoun/native-ui';

/**
 * Individual chat message bubble.
 *
 * Accepts slotted content: `n-chat-message-text`, `n-chat-message-genui`,
 * `n-chat-message-seed`, or any custom content.
 *
 * @attr {string} role - `user` | `assistant` | `system`
 * @attr {string} message-id - Unique message identifier
 * @attr {string} timestamp - Epoch milliseconds
 * @attr {string} status - `sending` | `sent` | `error` | `streaming`
 * @fires native:message-action - Fired when an action button is clicked
 */
export class NChatMessage extends NativeElement {
  static observedAttributes = ['role', 'message-id', 'timestamp', 'status'];

  #internals: ElementInternals;
  #role = signal<string>('assistant');
  #status = signal<string>('sent');
  #actionsEl: HTMLElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get role(): string { return this.#role.value; }
  set role(val: string) {
    this.#role.value = val;
    this.setAttribute('role', val);
  }

  get messageId(): string { return this.getAttribute('message-id') ?? ''; }

  get timestamp(): number { return Number(this.getAttribute('timestamp')) || 0; }

  get status(): string { return this.#status.value; }
  set status(val: string) {
    this.#status.value = val;
    this.setAttribute('status', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'role': this.#role.value = val ?? 'assistant'; break;
      case 'status': this.#status.value = val ?? 'sent'; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Stamp actions toolbar
    this.addEffect(() => {
      const role = this.#role.value;
      this.#stampActions(role);
    });

    // Sync ARIA
    this.#internals.role = 'article';

    this.addEventListener('native:press', this.#onActionPress);
  }

  teardown(): void {
    this.removeEventListener('native:press', this.#onActionPress);
    this.#actionsEl = null;
    super.teardown();
  }

  // ── Actions ──

  #stampActions(role: string): void {
    if (this.#actionsEl) {
      this.#actionsEl.remove();
      this.#actionsEl = null;
    }

    const toolbar = document.createElement('n-toolbar');
    toolbar.className = 'n-chat-message-actions';
    toolbar.setAttribute('padding', 'none');
    toolbar.setAttribute('aria-label', 'Message actions');

    if (role === 'assistant') {
      toolbar.appendChild(actionButton('copy', 'Copy'));
      toolbar.appendChild(actionButton('retry', 'Retry'));
      toolbar.appendChild(actionButton('feedback-up', 'Helpful'));
      toolbar.appendChild(actionButton('feedback-down', 'Not helpful'));
    } else if (role === 'user') {
      toolbar.appendChild(actionButton('edit', 'Edit'));
      toolbar.appendChild(actionButton('retry', 'Resend'));
    }

    if (toolbar.children.length > 0) {
      this.appendChild(toolbar);
      this.#actionsEl = toolbar;
    }
  }

  #onActionPress = (e: Event): void => {
    const target = (e as CustomEvent).target as HTMLElement;
    const action = target?.getAttribute('data-action');
    if (!action) return;

    // Only handle our own action buttons
    if (!this.#actionsEl?.contains(target)) return;

    e.stopPropagation();

    this.dispatchEvent(new CustomEvent('native:message-action', {
      bubbles: true,
      composed: true,
      detail: {
        action,
        messageId: this.messageId,
      },
    }));
  };
}

function actionButton(action: string, label: string): HTMLElement {
  const btn = document.createElement('n-button');
  btn.setAttribute('variant', 'ghost');
  btn.setAttribute('size', 'sm');
  btn.setAttribute('inline', '');
  btn.setAttribute('data-action', action);
  btn.setAttribute('aria-label', label);
  btn.textContent = label;
  return btn;
}
