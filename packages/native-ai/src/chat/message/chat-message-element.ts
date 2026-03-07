import { NativeElement, signal, uid } from '@nonoun/native-ui';

// ── Action registry ──

export interface ChatMessageActionDef {
  label: string;
  icon: string;
}

export const ACTION_REGISTRY: Record<string, ChatMessageActionDef> = {
  'copy':          { label: 'Copy',        icon: 'copy' },
  'retry':         { label: 'Retry',       icon: 'arrow-clockwise' },
  'edit':          { label: 'Edit',        icon: 'pencil-simple' },
  'feedback-up':   { label: 'Helpful',     icon: 'thumbs-up' },
  'feedback-down': { label: 'Not helpful', icon: 'thumbs-down' },
  'continue':      { label: 'Continue',    icon: 'arrow-right' },
};

export const ROLE_DEFAULTS: Record<string, string[]> = {
  assistant: ['copy', 'retry', 'feedback-up', 'feedback-down'],
  user: ['edit', 'retry'],
};

/**
 * Individual chat message bubble.
 *
 * Accepts slotted content: `n-chat-message-text`, `n-chat-message-genui`,
 * `n-chat-message-seed`, or any custom content.
 *
 * @attr {string} role - `user` | `assistant` | `system`
 * @attr {string} message-id - Unique message identifier
 * @attr {string} timestamp - Epoch milliseconds
 * @attr {string} status - `sending` | `sent` | `error` | `streaming` | `partial`
 * @attr {string} actions - Comma-separated action list, or `"none"` to suppress
 * @attr {string} actions-style - `"icon"` (default) | `"label"` | `"icon-label"`
 * @attr {string} actions-position - `"below"` (default) | `"inside"` — toolbar placement
 * @fires native:message-action - Fired when an action button is clicked
 * @fires native:continue-request - Fired when continue is requested for a partial message
 */
export class NChatMessage extends NativeElement {
  static observedAttributes = ['data-role', 'message-id', 'timestamp', 'status', 'actions', 'actions-style', 'actions-position'];

  #internals: ElementInternals;
  #role = signal<string>('assistant');
  #status = signal<string>('sent');
  #actions = signal<string | null>(null);
  #actionsStyle = signal<string>('icon');
  #actionsPosition = signal<string>('below');
  #actionsEl: HTMLElement | null = null;
  #isPopoverToolbar = false;
  #showTimer = 0;
  #hideTimer = 0;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get role(): string { return this.#role.value; }
  set role(val: string) {
    this.#role.value = val;
    this.setAttribute('data-role', val);
  }

  get messageId(): string { return this.getAttribute('message-id') ?? ''; }

  get timestamp(): number { return Number(this.getAttribute('timestamp')) || 0; }

  get status(): string { return this.#status.value; }
  set status(val: string) {
    this.#status.value = val;
    this.setAttribute('status', val);
  }

  get actions(): string | null { return this.#actions.value; }
  set actions(val: string | null) {
    this.#actions.value = val;
    if (val !== null) {
      this.setAttribute('actions', val);
    } else {
      this.removeAttribute('actions');
    }
  }

  get actionsStyle(): string { return this.#actionsStyle.value; }
  set actionsStyle(val: string) {
    this.#actionsStyle.value = val;
    this.setAttribute('actions-style', val);
  }

  get actionsPosition(): string { return this.#actionsPosition.value; }
  set actionsPosition(val: string) {
    this.#actionsPosition.value = val;
    this.setAttribute('actions-position', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'data-role': this.#role.value = val ?? 'assistant'; break;
      case 'status': this.#status.value = val ?? 'sent'; break;
      case 'actions': this.#actions.value = val; break;
      case 'actions-style': this.#actionsStyle.value = val ?? 'icon'; break;
      case 'actions-position': this.#actionsPosition.value = val ?? 'below'; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Hover listeners for popover toolbar (persistent — handlers check #isPopoverToolbar)
    this.addEventListener('pointerenter', this.#showToolbar);
    this.addEventListener('pointerleave', this.#hideToolbarDelayed);

    // Stamp actions toolbar — reactive to role, actions, actionsStyle, actionsPosition, and status
    this.addEffect(() => {
      const role = this.#role.value;
      const actionsAttr = this.#actions.value;
      const style = this.#actionsStyle.value;
      const position = this.#actionsPosition.value;
      const status = this.#status.value;
      this.#stampActions(role, actionsAttr, style, position, status);
    });

    // Sync ARIA
    this.#internals.role = 'article';
  }

  teardown(): void {
    this.removeEventListener('pointerenter', this.#showToolbar);
    this.removeEventListener('pointerleave', this.#hideToolbarDelayed);
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
    if (this.#actionsEl) {
      this.#cleanupToolbar();
      this.#actionsEl = null;
    }
    super.teardown();
  }

  // ── Popover hover handlers ──

  #showToolbar = (): void => {
    clearTimeout(this.#hideTimer);
    if (!this.#actionsEl || !this.#isPopoverToolbar || this.#status.value === 'partial') return;
    clearTimeout(this.#showTimer);
    this.#showTimer = window.setTimeout(() => {
      try { this.#actionsEl?.showPopover(); } catch { /* already open */ }
    }, 300);
  };

  #hideToolbarDelayed = (): void => {
    if (!this.#isPopoverToolbar || this.#status.value === 'partial') return;
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
    this.#hideTimer = window.setTimeout(() => {
      try { this.#actionsEl?.hidePopover(); } catch { /* already hidden */ }
    }, 150);
  };

  // ── Actions ──

  #cleanupToolbar(): void {
    if (!this.#actionsEl) return;
    if (this.#isPopoverToolbar) {
      this.#actionsEl.removeEventListener('pointerenter', this.#showToolbar);
      this.#actionsEl.removeEventListener('pointerleave', this.#hideToolbarDelayed);
      this.#actionsEl.removeEventListener('focusin', this.#showToolbar);
      this.#actionsEl.removeEventListener('focusout', this.#hideToolbarDelayed);
      try { this.#actionsEl.hidePopover(); } catch { /* ok */ }
      this.style.removeProperty('anchor-name');
      this.#isPopoverToolbar = false;
    }
    this.#actionsEl.removeEventListener('native:press', this.#onActionPress);
    this.#actionsEl.remove();
  }

  #stampActions(role: string, actionsAttr: string | null, style: string, position: string, status: string): void {
    if (this.#actionsEl) {
      this.#cleanupToolbar();
      this.#actionsEl = null;
    }
    clearTimeout(this.#hideTimer);

    // Skip if actions="none"
    if (actionsAttr === 'none') return;

    // Skip if consumer provides a [slot="actions"] child
    if (this.querySelector('[slot="actions"]')) return;

    // Resolve action list
    let actionList: string[];
    if (actionsAttr) {
      actionList = actionsAttr.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      actionList = ROLE_DEFAULTS[role] ?? [];
    }

    // If partial status, append continue action
    if (status === 'partial' && !actionList.includes('continue')) {
      actionList = [...actionList, 'continue'];
    }

    if (actionList.length === 0) return;

    const toolbar = document.createElement('n-toolbar');
    toolbar.dataset.role = 'actions';
    toolbar.setAttribute('padding', 'tight');
    toolbar.setAttribute('aria-label', 'Message actions');
    if (style !== 'label') {
      toolbar.setAttribute('data-style', style);
    }

    for (const id of actionList) {
      const def = ACTION_REGISTRY[id];
      if (!def) continue;
      toolbar.appendChild(actionButton(id, def, style));
    }

    if (toolbar.children.length === 0) return;

    toolbar.addEventListener('native:press', this.#onActionPress);

    if (position === 'below') {
      // Popover toolbar anchored below the message via CSS anchor positioning
      toolbar.setAttribute('popover', 'manual');
      const anchorId = uid('msg');
      this.style.setProperty('anchor-name', `--${anchorId}`);
      toolbar.style.setProperty('position-anchor', `--${anchorId}`);

      this.appendChild(toolbar);
      this.#isPopoverToolbar = true;

      // Keep toolbar open when hovering/focusing it
      toolbar.addEventListener('pointerenter', this.#showToolbar);
      toolbar.addEventListener('pointerleave', this.#hideToolbarDelayed);
      toolbar.addEventListener('focusin', this.#showToolbar);
      toolbar.addEventListener('focusout', this.#hideToolbarDelayed);

      // Partial status: always visible
      if (status === 'partial') {
        toolbar.showPopover();
      }
    } else {
      // Inside: append inside the bubble
      this.appendChild(toolbar);
    }
    this.#actionsEl = toolbar;
  }

  #onActionPress = (e: Event): void => {
    const target = (e as CustomEvent).target as HTMLElement;
    const action = target?.getAttribute('data-action');
    if (!action) return;

    e.stopPropagation();

    // Continue action fires a separate event
    if (action === 'continue') {
      this.dispatchEvent(new CustomEvent('native:continue-request', {
        bubbles: true,
        composed: true,
        detail: { messageId: this.messageId },
      }));
      return;
    }

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

function actionButton(action: string, def: ChatMessageActionDef, style: string): HTMLElement {
  const btn = document.createElement('n-button');
  btn.setAttribute('variant', 'ghost');
  btn.setAttribute('size', 'sm');
  btn.setAttribute('inline', '');
  btn.setAttribute('data-action', action);
  btn.setAttribute('aria-label', def.label);

  if (style === 'icon' || style === 'icon-label') {
    const icon = document.createElement('n-icon');
    icon.setAttribute('name', def.icon);
    icon.setAttribute('slot', 'leading');
    btn.appendChild(icon);
  }

  if (style === 'label' || style === 'icon-label') {
    btn.appendChild(document.createTextNode(def.label));
  }

  return btn;
}
