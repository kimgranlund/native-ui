import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import type { UITextarea } from '../ui-textarea/ui-textarea-element.ts';

/**
 * Chat message input with textarea, submit button, and Enter-to-send behavior.
 * @attr {boolean} disabled - Disables interaction
 * @attr {boolean} no-enter-submit - Disables Enter key submission
 * @attr {boolean} no-auto-clear - Prevents clearing the textarea after send
 * @fires ui-send - Fired on submit with `{ value }` detail
 */
export class UIChatInput extends UIElement {
  static observedAttributes = ['disabled'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #textarea: UITextarea | null = null;
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

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'disabled':
        this.#disabled.value = val !== null;
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
    });

    this.addEventListener('ui-input', this.#onTextareaInput);
    this.addEventListener('ui-press', this.#onPress);
    this.addEventListener('keydown', this.#onKeydown);
  }

  teardown(): void {
    this.removeEventListener('ui-input', this.#onTextareaInput);
    this.removeEventListener('ui-press', this.#onPress);
    this.removeEventListener('keydown', this.#onKeydown);
    this.#textarea = null;
    this.#submitBtn = null;
    super.teardown();
  }

  // ── Child discovery ──

  #discoverChildren(): void {
    this.#textarea = this.querySelector<UITextarea>(':scope > ui-textarea');
    this.#submitBtn =
      this.querySelector<HTMLElement>('[data-submit]') ??
      this.#findLastPrimaryButton();
  }

  #findLastPrimaryButton(): HTMLElement | null {
    const actions = this.querySelector(':scope > ui-chat-input-actions');
    if (!actions) return null;
    const primaries = actions.querySelectorAll<HTMLElement>(
      'ui-button[variant="primary"]',
    );
    return primaries.length ? primaries[primaries.length - 1] : null;
  }

  // ── Submit button enable/disable based on content ──

  #syncSubmitEnabled(): void {
    if (!this.#submitBtn || this.#disabled.value) return;
    const empty = !this.value.trim();
    if (empty) this.#submitBtn.setAttribute('disabled', '');
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

  #onKeydown = (e: Event): void => {
    if (this.#disabled.value) return;
    if (this.hasAttribute('no-enter-submit')) return;

    const ke = e as KeyboardEvent;
    if (ke.isComposing) return;

    const target = ke.target as HTMLElement;
    if (!this.#textarea?.contains(target) && target !== this.#textarea) return;

    if (ke.key === 'Enter' && !ke.shiftKey && !ke.ctrlKey && !ke.metaKey) {
      ke.preventDefault();
      if (this.value.trim()) this.#send();
    }
  };

  // ── Send ──

  #send(): void {
    const val = this.value.trim();
    if (!val) return;

    const dispatched = this.dispatchEvent(
      new CustomEvent('ui-send', {
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
