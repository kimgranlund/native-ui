import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Multi-line text input using contenteditable with optional autogrow.
 * @attr {string} value - Current text value
 * @attr {string} placeholder - Placeholder text shown when empty
 * @attr {boolean} disabled - Disables interaction
 * @attr {boolean} readonly - Prevents editing while remaining focusable
 * @attr {boolean} required - Marks as required for form validation
 * @attr {string} name - Form field name
 * @attr {number} rows - Minimum visible rows (sets min-height)
 * @attr {number} maxlength - Maximum character count
 * @attr {boolean} autogrow - Automatically grows height to fit content
 * @fires ui-input - Fired on each keystroke with `{ value }` detail
 * @fires ui-change - Fired on blur with `{ value }` detail
 */
export class UITextarea extends FormAssociable(UIElement) {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'readonly', 'required', 'name', 'rows', 'maxlength', 'autogrow'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #autoGrowRaf = 0;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'textbox';
    this.#internals.ariaMultiLine = 'true';
  }

  // ── Value ──

  get value(): string {
    return this.textContent ?? '';
  }

  set value(val: string) {
    this.textContent = val;
    this.#internals.setFormValue(val);
    this.#updateEmptyState();
    this.#autoGrow();
  }

  // ── Placeholder ──

  get placeholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  set placeholder(val: string) {
    this.setAttribute('placeholder', val);
  }

  // ── Name ──

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  // ── Disabled ──

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  // ── Readonly ──

  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(val: boolean) {
    this.toggleAttribute('readonly', val);
    this.setAttribute('contenteditable', val ? 'false' : 'plaintext-only');
  }

  // ── Required ──

  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(val: boolean) {
    this.toggleAttribute('required', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        this.textContent = val ?? '';
        this.#internals.setFormValue(val ?? '');
        this.#updateEmptyState();
        this.#autoGrow();
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        // WHY: Must check both disabled AND readonly — removing one while the other
        // is still set must not restore contenteditable
        this.setAttribute('contenteditable', (val !== null || this.hasAttribute('readonly')) ? 'false' : 'plaintext-only');
        break;
      case 'readonly':
        this.setAttribute('contenteditable', (val !== null || this.#disabled.value) ? 'false' : 'plaintext-only');
        break;
      case 'autogrow':
        this.#autoGrow();
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    if (!this.hasAttribute('contenteditable')) {
      this.setAttribute('contenteditable', 'plaintext-only');
    }
    this.#updateEmptyState();
    this.#autoGrow();
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));
    this.addEventListener('input', this.#onInput);
    this.addEventListener('blur', this.#onBlur);
  }

  teardown(): void {
    cancelAnimationFrame(this.#autoGrowRaf);
    this.removeEventListener('input', this.#onInput);
    this.removeEventListener('blur', this.#onBlur);
    super.teardown();
  }

  // ── Form callbacks ──

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
    this.setAttribute('contenteditable', (disabled || this.hasAttribute('readonly')) ? 'false' : 'plaintext-only');
  }

  override onFormReset(): void {
    this.textContent = '';
    this.#internals.setFormValue('');
    this.#updateEmptyState();
    this.#disabled.value = this.hasAttribute('disabled');
  }

  // ── Empty state (for CSS placeholder) ──

  #updateEmptyState(): void {
    const empty = (this.textContent ?? '').trim() === '';
    if (empty) this.#internals.states.add('empty');
    else this.#internals.states.delete('empty');
  }

  // ── Autogrow ──

  #autoGrow(): void {
    if (!this.hasAttribute('autogrow') || !this.isConnected) return;
    // Reset height to auto so scrollHeight reflects content
    this.style.setProperty('--_autogrow-height', 'auto');
    // WHY: Cancel previous rAF to avoid stale measurements and prevent leak on teardown
    cancelAnimationFrame(this.#autoGrowRaf);
    // Use rAF to measure after layout
    this.#autoGrowRaf = requestAnimationFrame(() => {
      this.style.setProperty('--_autogrow-height', `${this.scrollHeight}px`);
    });
  }

  // ── Events ──

  #onInput = (): void => {
    const val = this.textContent ?? '';

    // Enforce maxlength
    const maxlength = this.getAttribute('maxlength');
    if (maxlength !== null) {
      const max = parseInt(maxlength, 10);
      if (!isNaN(max) && val.length > max) {
        this.textContent = val.slice(0, max);
        // Move cursor to end after truncation
        const sel = window.getSelection();
        if (sel) {
          sel.selectAllChildren(this);
          sel.collapseToEnd();
        }
      }
    }

    const finalVal = this.textContent ?? '';
    this.#internals.setFormValue(finalVal);
    this.#updateEmptyState();
    this.#autoGrow();
    this.dispatchEvent(new CustomEvent('ui-input', {
      bubbles: true,
      composed: true,
      detail: { value: finalVal },
    }));
  };

  #onBlur = (): void => {
    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.textContent ?? '' },
    }));
  };
}
