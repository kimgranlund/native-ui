import { NativeElement, signal } from '@nonoun/native-ui';

// ── Types ──

export type AutoFocusPolicy = 'open-request' | 'ready' | 'never';

export interface ChatPanelOpenOptions {
  focusComposer?: boolean;
  reason?: string;
}

export interface FocusComposerOptions {
  cursor?: 'start' | 'end' | 'preserve';
}

/**
 * Stamped panel for the chat interface.
 *
 * Creates `<n-header>` (icon, title), `<n-body>` containing
 * `<n-chat-content>`, and `<n-footer>` with `<n-chat-input>` directly
 * as children. The host element itself is the panel surface.
 *
 * ## Extension Points
 *
 * **Header trailing slot** — move consumer-provided controls into the header:
 * ```html
 * <native-chat-panel>
 *   <div slot="header-trailing"><n-button variant="ghost">Custom</n-button></div>
 * </native-chat-panel>
 * ```
 *
 * **Footer leading slot** — insert content before the chat input:
 * ```html
 * <native-chat-panel>
 *   <div slot="footer-leading">Powered by AI</div>
 * </native-chat-panel>
 * ```
 *
 * **Stop / Restart buttons** — toggle via attributes:
 * ```html
 * <native-chat-panel show-stop></native-chat-panel>
 * ```
 * @attr {boolean} show-stop - Show a stop button in the header; fires `native:chat-stop`
 * @attr {boolean} show-restart - Show a restart button in the header; fires `native:chat-restart`
 * @attr {string} auto-focus-policy - When to auto-focus the composer: 'open-request' (default), 'ready', 'never'
 * @fires native:chat-stop - Fired when the stop button is pressed
 * @fires native:chat-restart - Fired when the restart button is pressed
 * @fires native:send - Fired on submit with `{ value }` detail
 * @fires native:chat-opened - Fired when the panel opens
 * @fires native:chat-closed - Fired when the panel closes
 * @fires native:composer-focused - Fired when the composer receives focus via API/policy
 * @fires native:composer-focus-failed - Fired when focusComposer() fails after retries
 */
export class NChatPanel extends NativeElement {
  static observedAttributes = ['show-stop', 'show-restart', 'auto-focus-policy', 'open'];

  #showStop = signal(false);
  #showRestart = signal(false);
  #autoFocusPolicy = signal<AutoFocusPolicy>('open-request');
  #open = signal(false);

  // Stamped DOM references (set once in setup, cleared in teardown)
  #footer: HTMLElement | null = null;
  #stopBtn: HTMLElement | null = null;
  #restartBtn: HTMLElement | null = null;
  #headerTrailingContainer: HTMLElement | null = null;

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'show-stop':
        this.#showStop.value = val !== null;
        break;
      case 'show-restart':
        this.#showRestart.value = val !== null;
        break;
      case 'auto-focus-policy':
        this.#autoFocusPolicy.value = (val as AutoFocusPolicy) ?? 'open-request';
        break;
      case 'open': {
        const wasOpen = this.#open.value;
        this.#open.value = val !== null;
        if (!wasOpen && val !== null) {
          this.#emitOpened(undefined, false);
        } else if (wasOpen && val === null) {
          this.#emitClosed(undefined);
        }
        break;
      }
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Public API ──

  get showStop(): boolean { return this.#showStop.value; }
  set showStop(val: boolean) {
    this.#showStop.value = val;
    this.toggleAttribute('show-stop', val);
  }

  get showRestart(): boolean { return this.#showRestart.value; }
  set showRestart(val: boolean) {
    this.#showRestart.value = val;
    this.toggleAttribute('show-restart', val);
  }

  get autoFocusPolicy(): AutoFocusPolicy { return this.#autoFocusPolicy.value; }
  set autoFocusPolicy(val: AutoFocusPolicy) {
    this.#autoFocusPolicy.value = val;
    this.setAttribute('auto-focus-policy', val);
  }

  /** Open the panel. Optionally focus the composer. */
  open(options?: ChatPanelOpenOptions): void {
    const wasOpen = this.#open.value;
    this.#open.value = true;
    this.toggleAttribute('open', true);

    const policy = this.#autoFocusPolicy.value;
    const shouldFocus = options?.focusComposer ?? false;
    const wantsFocus = policy !== 'never' && (policy === 'open-request' ? shouldFocus : false);

    if (!wasOpen) {
      this.#emitOpened(options?.reason, wantsFocus);
    }

    if (wantsFocus) {
      this.focusComposer({ cursor: 'end' }, 'api');
    }
  }

  /** Close the panel. */
  close(reason?: string): void {
    const wasOpen = this.#open.value;
    this.#open.value = false;
    this.removeAttribute('open');

    if (wasOpen) {
      this.#emitClosed(reason);
    }
  }

  /** Focus the composer input. */
  focusComposer(options?: FocusComposerOptions, by: 'api' | 'user' | 'policy' = 'api'): void {
    this.#attemptFocus(options ?? {}, by, 0);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Sync initial open attribute
    if (this.hasAttribute('open')) {
      this.#open.value = true;
    }

    // ── Header ──
    const header = document.createElement('n-header');
    header.setAttribute('dividers', '');

    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'chat-dots');
    icon.setAttribute('slot', 'leading');
    header.appendChild(icon);

    const label = document.createElement('span');
    label.setAttribute('slot', 'label');
    label.textContent = 'Assistant';
    header.appendChild(label);

    // Header trailing container — hosts stop/restart buttons + consumer slot
    const headerTrailing = document.createElement('span');
    headerTrailing.setAttribute('slot', 'trailing');
    headerTrailing.style.display = 'inline-flex';
    headerTrailing.style.alignItems = 'center';
    headerTrailing.style.gap = 'calc(var(--n-space) * 2)';
    header.appendChild(headerTrailing);
    this.#headerTrailingContainer = headerTrailing;

    // ── Body ──
    const body = document.createElement('n-body');
    const chatContent = document.createElement('n-chat-content');
    body.appendChild(chatContent);

    // ── Footer ──
    const footer = document.createElement('n-footer');
    footer.setAttribute('dividers', '');
    this.#footer = footer;

    const chatInput = document.createElement('n-chat-input');
    chatInput.setAttribute('variant', 'plain');

    const textarea = document.createElement('n-textarea');
    textarea.setAttribute('placeholder', 'Ask anything');
    textarea.setAttribute('autogrow', '');
    textarea.setAttribute('rows', '3');
    chatInput.appendChild(textarea);

    const actions = document.createElement('n-chat-input-actions');

    const plusBtn = document.createElement('n-button');
    plusBtn.setAttribute('variant', 'ghost');
    plusBtn.setAttribute('inline', '');
    plusBtn.innerHTML = '<n-icon name="plus"></n-icon>';
    actions.appendChild(plusBtn);

    const micBtn = document.createElement('n-button');
    micBtn.setAttribute('variant', 'ghost');
    micBtn.setAttribute('inline', '');
    micBtn.innerHTML = '<n-icon name="microphone"></n-icon>';
    actions.appendChild(micBtn);

    const submitBtn = document.createElement('n-button');
    submitBtn.setAttribute('variant', 'primary');
    submitBtn.setAttribute('intent', 'accent');
    submitBtn.setAttribute('radius', 'round');
    submitBtn.setAttribute('inline', '');
    submitBtn.setAttribute('disabled', '');
    submitBtn.classList.add('submit-btn');
    submitBtn.innerHTML = '<n-icon name="arrow-up"></n-icon>';
    actions.appendChild(submitBtn);

    chatInput.appendChild(actions);

    footer.appendChild(chatInput);

    // ── Assemble ──
    this.append(header, body, footer);

    // ── Effects (no child dependency — registered outside deferChildren) ──

    // Stop button: stamp/remove reactively
    this.addEffect(() => {
      const show = this.#showStop.value;
      if (show && !this.#stopBtn) {
        const btn = document.createElement('n-button');
        btn.setAttribute('variant', 'ghost');
        btn.setAttribute('inline', '');
        btn.setAttribute('aria-label', 'Stop');
        btn.innerHTML = '<n-icon name="stop"></n-icon>';
        btn.addEventListener('native:press', this.#onStop);
        this.#stopBtn = btn;
        this.#headerTrailingContainer?.prepend(btn);
      } else if (!show && this.#stopBtn) {
        this.#stopBtn.removeEventListener('native:press', this.#onStop);
        this.#stopBtn.remove();
        this.#stopBtn = null;
      }
    });

    // Restart button: stamp/remove reactively
    this.addEffect(() => {
      const show = this.#showRestart.value;
      if (show && !this.#restartBtn) {
        const btn = document.createElement('n-button');
        btn.setAttribute('variant', 'ghost');
        btn.setAttribute('inline', '');
        btn.setAttribute('aria-label', 'Restart');
        btn.innerHTML = '<n-icon name="arrow-counter-clockwise"></n-icon>';
        btn.addEventListener('native:press', this.#onRestart);
        this.#restartBtn = btn;
        // Insert after stop (if present), before consumer content
        const insertBefore = this.#stopBtn?.nextSibling ?? this.#headerTrailingContainer?.firstChild ?? null;
        this.#headerTrailingContainer?.insertBefore(btn, insertBefore);
      } else if (!show && this.#restartBtn) {
        this.#restartBtn.removeEventListener('native:press', this.#onRestart);
        this.#restartBtn.remove();
        this.#restartBtn = null;
      }
    });

    // ── Slot relocation (needs children present) ──
    this.deferChildren(() => {
      this.#relocateSlots();
    });

    // ── Auto-focus policy: 'ready' ──
    if (this.#autoFocusPolicy.value === 'ready') {
      queueMicrotask(() => {
        if (this.isConnected) {
          this.focusComposer({ cursor: 'end' }, 'policy');
        }
      });
    }
  }

  teardown(): void {
    if (this.#stopBtn) {
      this.#stopBtn.removeEventListener('native:press', this.#onStop);
    }
    if (this.#restartBtn) {
      this.#restartBtn.removeEventListener('native:press', this.#onRestart);
    }
    this.#footer = null;
    this.#stopBtn = null;
    this.#restartBtn = null;
    this.#headerTrailingContainer = null;
    this.innerHTML = '';
    super.teardown();
  }

  // ── Slot relocation ──

  #relocateSlots(): void {
    // Header trailing: move consumer's [slot="header-trailing"] into the header trailing container
    const headerTrailingSlot = this.querySelector(':scope > [slot="header-trailing"]');
    if (headerTrailingSlot && this.#headerTrailingContainer) {
      this.#headerTrailingContainer.appendChild(headerTrailingSlot);
    }

    // Footer leading: move consumer's [slot="footer-leading"] before the chat input
    const footerLeadingSlot = this.querySelector(':scope > [slot="footer-leading"]');
    if (footerLeadingSlot && this.#footer) {
      const chatInput = this.#footer.querySelector(':scope > n-chat-input');
      this.#footer.insertBefore(footerLeadingSlot, chatInput);
    }
  }

  // ── Focus with retry (T0065) ──

  #attemptFocus(options: FocusComposerOptions, by: 'api' | 'user' | 'policy', attempt: number): void {
    const MAX_ATTEMPTS = 3;
    const composer = this.#findComposer();

    if (!composer) {
      if (attempt < MAX_ATTEMPTS - 1) {
        queueMicrotask(() => this.#attemptFocus(options, by, attempt + 1));
        return;
      }
      this.#emitFocusFailed('composer-unavailable', MAX_ATTEMPTS);
      return;
    }

    if ((composer as any).disabled) {
      if (attempt < MAX_ATTEMPTS - 1) {
        queueMicrotask(() => this.#attemptFocus(options, by, attempt + 1));
        return;
      }
      this.#emitFocusFailed('disabled', MAX_ATTEMPTS);
      return;
    }

    // Find the actual focusable element (n-textarea inside n-chat-input)
    const textarea = composer.querySelector('n-textarea') as HTMLElement | null;
    const target = textarea ?? composer;

    try {
      target.focus();
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        queueMicrotask(() => this.#attemptFocus(options, by, attempt + 1));
        return;
      }
      this.#emitFocusFailed('blocked', MAX_ATTEMPTS);
      return;
    }

    // Cursor placement on contenteditable
    if (options.cursor && options.cursor !== 'preserve' && textarea) {
      this.#placeCursor(textarea, options.cursor);
    }

    this.dispatchEvent(
      new CustomEvent('native:composer-focused', {
        bubbles: true,
        composed: true,
        detail: { by },
      }),
    );
  }

  #findComposer(): HTMLElement | null {
    return this.querySelector('n-chat-input');
  }

  #placeCursor(textarea: HTMLElement, position: 'start' | 'end'): void {
    const sel = textarea.ownerDocument.getSelection?.();
    if (!sel) return;

    // n-textarea uses contenteditable — get first text node or the element itself
    const node = textarea.firstChild ?? textarea;
    const offset = position === 'end'
      ? (node.textContent?.length ?? 0)
      : 0;

    try {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // Range operations can fail if the node isn't in the document
    }
  }

  // ── Event dispatchers ──

  #emitOpened(source: string | undefined, focusComposer: boolean): void {
    this.dispatchEvent(
      new CustomEvent('native:chat-opened', {
        bubbles: true,
        composed: true,
        detail: { source, focusComposer },
      }),
    );
  }

  #emitClosed(reason: string | undefined): void {
    this.dispatchEvent(
      new CustomEvent('native:chat-closed', {
        bubbles: true,
        composed: true,
        detail: { reason },
      }),
    );
  }

  #emitFocusFailed(reason: 'composer-unavailable' | 'disabled' | 'blocked', attempts: number): void {
    this.dispatchEvent(
      new CustomEvent('native:composer-focus-failed', {
        bubbles: true,
        composed: true,
        detail: { reason, attempts },
      }),
    );
  }

  // ── Event handlers ──

  #onStop = (): void => {
    this.dispatchEvent(
      new CustomEvent('native:chat-stop', { bubbles: true, composed: true }),
    );
  };

  #onRestart = (): void => {
    this.dispatchEvent(
      new CustomEvent('native:chat-restart', { bubbles: true, composed: true }),
    );
  };
}
