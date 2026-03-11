import { NativeElement, signal, createDisabledEffect } from '@nonoun/native-ui';
import type { NTextarea } from '@nonoun/native-ui';

/**
 * Chat message input with textarea, submit button, and Enter-to-send behavior.
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} value - Initial textarea value
 * @attr {boolean} busy - Disables submit but keeps textarea enabled
 * @attr {boolean} no-enter-submit - Disables Enter key submission
 * @attr {boolean} no-auto-clear - Prevents clearing the textarea after send
 * @fires native:send - Fired on submit with `{ value }` detail
 * @fires native:composer-submit-blocked - Fired when submit is attempted while busy
 * @fires native:composer-focus - Fired when the composer textarea gains focus
 * @fires native:composer-blur - Fired when the composer textarea loses focus
 */
export class NChatInput extends NativeElement {
  static observedAttributes = ['disabled', 'busy', 'value'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #busy = signal(false);
  #textarea: NTextarea | null = null;
  #submitBtn: HTMLElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get value(): string {
    return this.#textarea?.value ?? '';
  }

  set value(val: string) {
    if (this.#textarea) this.#textarea.value = val;
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get busy(): boolean {
    return this.#busy.value;
  }

  set busy(val: boolean) {
    this.#busy.value = val;
    this.toggleAttribute('busy', val);
  }

  /** Focus the composer textarea. */
  focusComposer(): void {
    const textarea = this.querySelector('n-textarea') as HTMLElement | null;
    textarea?.focus();
  }

  /** Blur the composer textarea. */
  blurComposer(): void {
    const textarea = this.querySelector('n-textarea') as HTMLElement | null;
    textarea?.blur();
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'busy':
        this.#busy.value = val !== null;
        break;
      case 'value':
        if (this.#textarea) this.#textarea.value = val ?? '';
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    this.deferChildren(() => {
      this.#discoverChildren();

      // WHY: Sync initial value from attribute to textarea (attribute may arrive before children)
      const initialValue = this.getAttribute('value');
      if (initialValue && this.#textarea) this.#textarea.value = initialValue;

      // WHY: Cascade disabled to children reactively instead of imperative sync
      this.addEffect(() => {
        const disabled = this.#disabled.value;
        if (this.#textarea) {
          this.#textarea.toggleAttribute('disabled', disabled);
        }
        if (this.#submitBtn) {
          if (disabled) {
            this.#submitBtn.setAttribute('disabled', '');
          } else {
            this.#syncSubmitEnabled();
          }
        }
      });

      // WHY: busy disables submit button but keeps textarea enabled
      this.addEffect(() => {
        const busy = this.#busy.value;
        if (!this.#submitBtn) return;
        if (this.#disabled.value) return; // disabled effect owns the button when disabled
        if (busy) {
          this.#submitBtn.setAttribute('disabled', '');
        } else {
          this.#syncSubmitEnabled();
        }
      });
    });

    this.addEventListener('native:input', this.#onTextareaInput);
    this.addEventListener('native:press', this.#onPress);
    this.addEventListener('keydown', this.#onKeydown);
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('focusout', this.#onFocusOut);
  }

  teardown(): void {
    this.removeEventListener('native:input', this.#onTextareaInput);
    this.removeEventListener('native:press', this.#onPress);
    this.removeEventListener('keydown', this.#onKeydown);
    this.removeEventListener('focusin', this.#onFocusIn);
    this.removeEventListener('focusout', this.#onFocusOut);
    this.#textarea = null;
    this.#submitBtn = null;
    super.teardown();
  }

  // ── Child discovery ──

  #discoverChildren(): void {
    this.#textarea =
      this.querySelector<NTextarea>(':scope > n-textarea') ??
      this.querySelector<NTextarea>(':scope > n-chat-input-prompt > n-textarea');
    this.#submitBtn =
      this.querySelector<HTMLElement>('[data-submit]') ??
      this.#findLastPrimaryButton();
  }

  #findLastPrimaryButton(): HTMLElement | null {
    const actions =
      this.querySelector(':scope > n-chat-input-actions, :scope > n-toolbar') ??
      this.querySelector(':scope > n-chat-input-prompt > n-chat-input-actions, :scope > n-chat-input-prompt > n-toolbar');
    if (!actions) return null;
    const primaries = actions.querySelectorAll<HTMLElement>(
      'n-button[variant="primary"]',
    );
    return primaries.length ? primaries[primaries.length - 1] : null;
  }

  // ── Submit button enable/disable based on content ──

  #syncSubmitEnabled(): void {
    if (!this.#submitBtn || this.#disabled.value) return;
    const empty = !this.value.trim();
    if (empty || this.#busy.value) this.#submitBtn.setAttribute('disabled', '');
    else this.#submitBtn.removeAttribute('disabled');
  }

  // ── Event handlers ──

  #onTextareaInput = (_e: Event): void => {
    if (this.#disabled.value) return;
    this.#syncSubmitEnabled();
  };

  #onPress = (e: Event): void => {
    if (this.#disabled.value) return;
    if (e.target !== this.#submitBtn) return;
    this.#send();
  };

  #onFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    if (!this.#textarea?.contains(target) && target !== this.#textarea) return;
    this.dispatchEvent(
      new CustomEvent('native:composer-focus', { bubbles: true, composed: true }),
    );
  };

  #onFocusOut = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    if (!this.#textarea?.contains(target) && target !== this.#textarea) return;
    this.dispatchEvent(
      new CustomEvent('native:composer-blur', { bubbles: true, composed: true }),
    );
  };

  #onKeydown = (e: Event): void => {
    if (this.#disabled.value) return;
    if (this.hasAttribute('no-enter-submit')) return;

    const ke = e as KeyboardEvent;
    if (ke.isComposing) return;

    const target = ke.target as HTMLElement;
    if (!this.#textarea?.contains(target) && target !== this.#textarea) return;

    if (ke.key === 'Enter' && (ke.metaKey || ke.ctrlKey) && !ke.shiftKey) {
      ke.preventDefault();
      if (this.value.trim()) this.#send();
    }
  };

  // ── Send ──

  #send(): void {
    const val = this.value.trim();
    if (!val) return;

    if (this.#busy.value) {
      this.dispatchEvent(
        new CustomEvent('native:composer-submit-blocked', {
          bubbles: true,
          composed: true,
          detail: { value: val },
        }),
      );
      return;
    }

    const dispatched = this.dispatchEvent(
      new CustomEvent('native:send', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { value: val },
      }),
    );

    if (dispatched && !this.hasAttribute('no-auto-clear')) {
      this.value = '';
      this.#submitBtn?.setAttribute('disabled', '');
    }
  }
}

/** Advanced multi-zone variant — same behavior, distinct tag for CSS targeting. */
export class NAgentInput extends NChatInput {}
