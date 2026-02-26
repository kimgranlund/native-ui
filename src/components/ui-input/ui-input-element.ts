import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Single-line text input using contenteditable with form association.
 * @attr {string} value - Current text value
 * @attr {string} placeholder - Placeholder text shown when empty
 * @attr {boolean} disabled - Disables interaction
 * @attr {boolean} readonly - Prevents editing while remaining focusable
 * @attr {boolean} required - Marks as required for form validation
 * @attr {string} name - Form field name
 * @fires ui-input - Fired on each keystroke with `{ value }` detail
 * @fires ui-change - Fired on blur with `{ value }` detail
 */
export class UIInput extends FormAssociable(UIElement) {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'readonly', 'required', 'name'];

  #internals: ElementInternals;
  #disabled = signal(false);
  // WHY: contenteditable deletes all children on select-all + delete/cut —
  // we save slot refs so #onInput can restore them
  #slots: Element[] = [];

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'textbox';
  }

  // ── Value ──

  get value(): string {
    return this.#getTextContent();
  }

  set value(val: string) {
    this.#setTextContent(val);
    this.#internals.setFormValue(val);
    this.#updateEmptyState();
  }

  #getTextContent(): string {
    let text = '';
    for (const node of this.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    }
    return text;
  }

  #setTextContent(val: string): void {
    for (const node of [...this.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }
    if (val) this.append(val);
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
        this.#setTextContent(val ?? '');
        this.#internals.setFormValue(val ?? '');
        this.#updateEmptyState();
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
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    if (!this.hasAttribute('contenteditable')) {
      this.setAttribute('contenteditable', 'plaintext-only');
    }
    this.#slots = [...this.querySelectorAll(':scope > [slot]')];
    for (const el of this.#slots) {
      el.setAttribute('contenteditable', 'false');
    }
    this.#updateEmptyState();
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));
    this.addEventListener('input', this.#onInput);
    this.addEventListener('blur', this.#onBlur);
  }

  teardown(): void {
    this.removeEventListener('input', this.#onInput);
    this.removeEventListener('blur', this.#onBlur);
    super.teardown();
  }

  // ── Focus delegation ──

  select(): void {
    const range = document.createRange();
    range.selectNodeContents(this);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  // ── Form callbacks ──

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
    this.setAttribute('contenteditable', (disabled || this.hasAttribute('readonly')) ? 'false' : 'plaintext-only');
  }

  override onFormReset(): void {
    this.#setTextContent('');
    this.#internals.setFormValue('');
    this.#updateEmptyState();
    this.#disabled.value = this.hasAttribute('disabled');
  }

  // ── Empty state (for CSS placeholder) ──

  #updateEmptyState(): void {
    const empty = this.#getTextContent().trim() === '';
    if (empty) this.#internals.states.add('empty');
    else this.#internals.states.delete('empty');
  }

  // ── Events ──

  #onInput = (): void => {
    // WHY: contenteditable deletes slot children on select-all + delete/cut — restore them
    for (const el of this.#slots) {
      if (!el.parentNode) this.appendChild(el);
    }
    const val = this.#getTextContent();
    this.#internals.setFormValue(val);
    this.#updateEmptyState();
    this.dispatchEvent(new CustomEvent('ui-input', {
      bubbles: true,
      composed: true,
      detail: { value: val },
    }));
  };

  #onBlur = (): void => {
    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.#getTextContent() },
    }));
  };
}
