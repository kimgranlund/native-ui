import { NativeElement, signal } from '@nonoun/native-ui';

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
 * @fires native:chat-stop - Fired when the stop button is pressed
 * @fires native:chat-restart - Fired when the restart button is pressed
 * @fires native:send - Fired on submit with `{ value }` detail
 */
export class NChatPanel extends NativeElement {
  static observedAttributes = ['show-stop', 'show-restart'];

  #showStop = signal(false);
  #showRestart = signal(false);

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

  // ── Lifecycle ──

  setup(): void {
    super.setup();

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
    footer.setAttribute('padding', 'none');
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
