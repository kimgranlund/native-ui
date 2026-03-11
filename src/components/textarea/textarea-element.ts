import { signal } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';
import { FormAssociable } from '@nonoun/native-core';
import { FORMAT_MARKERS, FORMAT_SHORTCUTS, isFormatEnabled, getSelectionOffsets, toggleMarker, restoreSelection } from '@nonoun/native-core';

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
 * @attr {string} formatting - Space-separated list of enabled formats (e.g. "code bold italic")
 * @fires native:input - Fired on each keystroke with `{ value }` detail
 * @fires native:change - Fired on blur with `{ value }` detail
 * @fires native:format - Fired after formatting with `{ type, value }` detail
 */
export class NTextarea extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'readonly', 'required', 'rows', 'maxlength', 'autogrow', 'pattern', 'formatting'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #required = signal(false);
  #maxlength = signal(NaN);
  #formValue = signal('');
  #initialValue = '';
  #autoGrowRaf = 0;
  #pattern: string | null = null;

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
    this.#formValue.value = val;
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
    return this.#required.value;
  }

  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        this.textContent = val ?? '';
        this.#formValue.value = val ?? '';
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
      case 'required':
        this.#required.value = val !== null;
        break;
      case 'maxlength':
        this.#maxlength.value = val !== null ? parseInt(val, 10) : NaN;
        break;
      case 'autogrow':
        this.#autoGrow();
        break;
      case 'pattern':
        this.#pattern = val;
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    // WHY: Moved from constructor — spec forbids setAttribute in constructor
    this.setAttribute('aria-multiline', 'true');
    if (!this.hasAttribute('contenteditable')) {
      this.setAttribute('contenteditable', 'plaintext-only');
    }
    // WHY: Sync signals from initial attributes (attributeChangedCallback fires before setup)
    this.#required.value = this.hasAttribute('required');
    const maxlengthAttrInit = this.getAttribute('maxlength');
    this.#maxlength.value = maxlengthAttrInit !== null ? parseInt(maxlengthAttrInit, 10) : NaN;
    this.#pattern = this.getAttribute('pattern');
    this.#initialValue = this.getAttribute('value') ?? this.textContent ?? '';
    this.#formValue.value = this.textContent ?? '';
    this.#updateEmptyState();
    this.#autoGrow();
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));

    // Constraint validation: report valueMissing, tooLong, and patternMismatch
    this.addEffect(() => {
      const val = this.#formValue.value;
      const maxlength = this.#maxlength.value;
      if (this.#required.value && val === '') {
        this.#internals.setValidity(
          { valueMissing: true },
          'Please fill out this field.',
          this,
        );
      } else if (!isNaN(maxlength) && val.length > maxlength) {
        this.#internals.setValidity(
          { tooLong: true },
          `Please shorten this text to ${maxlength} characters or less.`,
          this,
        );
      } else if (this.#pattern !== null && val !== '' && !new RegExp(`^(?:${this.#pattern})$`).test(val)) {
        this.#internals.setValidity(
          { patternMismatch: true },
          'Please match the requested format.',
          this,
        );
      } else {
        this.#internals.setValidity({});
      }
    });

    this.addEventListener('input', this.#onInput);
    this.addEventListener('blur', this.#onBlur);
    this.addEventListener('keydown', this.#onFormattingKeydown);
    this.addEventListener('focus', this.#onFocus);
    this.addEventListener('mouseup', this.#onMouseUp);
  }

  teardown(): void {
    cancelAnimationFrame(this.#autoGrowRaf);
    this.removeEventListener('input', this.#onInput);
    this.removeEventListener('blur', this.#onBlur);
    this.removeEventListener('keydown', this.#onFormattingKeydown);
    this.removeEventListener('focus', this.#onFocus);
    this.removeEventListener('mouseup', this.#onMouseUp);
    super.teardown();
  }

  // ── Form callbacks ──

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
    this.setAttribute('contenteditable', (disabled || this.hasAttribute('readonly')) ? 'false' : 'plaintext-only');
  }

  override onFormReset(): void {
    this.textContent = this.#initialValue;
    this.#formValue.value = this.#initialValue;
    this.#internals.setFormValue(this.#initialValue);
    this.#updateEmptyState();
    this.#autoGrow();
    this.#disabled.value = this.hasAttribute('disabled');
    // WHY: Re-sync contenteditable to match the reset disabled state.
    // The disabled signal reset above triggers createDisabledEffect, but
    // that effect does not manage contenteditable — we sync it explicitly here.
    this.setAttribute('contenteditable', (this.#disabled.value || this.hasAttribute('readonly')) ? 'false' : 'plaintext-only');
  }

  override onFormStateRestore(state: string | FormData | null): void {
    this.value = typeof state === 'string' ? state : '';
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
    this.style.setProperty('--n-autogrow-height', 'auto');
    // WHY: Cancel previous rAF to avoid stale measurements and prevent leak on teardown
    cancelAnimationFrame(this.#autoGrowRaf);
    // Use rAF to measure after layout
    this.#autoGrowRaf = requestAnimationFrame(() => {
      this.style.setProperty('--n-autogrow-height', `${this.scrollHeight}px`);
    });
  }

  // ── Events ──

  // WHY: When an empty field gains focus, the browser may place the caret
  // after the ::before placeholder pseudo-element. Force caret to position 0.
  // The mouseup handler catches click-to-focus (browser repositions caret after
  // focus but before mouseup), while the focus handler catches programmatic focus.
  #resetCaretIfEmpty(): void {
    if ((this.textContent ?? '').trim() !== '') return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.setStart(this, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  #onFocus = (): void => {
    this.#resetCaretIfEmpty();
  };

  #onMouseUp = (): void => {
    this.#resetCaretIfEmpty();
  };

  #onInput = (): void => {
    const val = this.textContent ?? '';
    this.#formValue.value = val;
    this.#internals.setFormValue(val);
    this.#updateEmptyState();
    this.#autoGrow();
    this.dispatchEvent(new CustomEvent('native:input', {
      bubbles: true,
      composed: true,
      detail: { value: val },
    }));
  };

  #onBlur = (): void => {
    this.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      composed: true,
      detail: { value: this.textContent ?? '' },
    }));
  };

  // ── Formatting ──

  /**
   * Apply or toggle a format on the current selection.
   * Wraps selected text with the format marker, or unwraps if already wrapped.
   * No-op when the format is not enabled or no text is selected.
   */
  applyFormat(type: string): void {
    const marker = FORMAT_MARKERS[type];
    if (!marker || !isFormatEnabled(this, type)) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // Ensure the selection is within this element
    if (!this.contains(range.startContainer) || !this.contains(range.endContainer)) return;

    const text = this.value;
    const offsets = getSelectionOffsets(this, range);
    if (offsets === null) return;

    const { start, end } = offsets;

    // No-op when nothing is selected (collapsed cursor)
    if (start === end) return;

    const selectedText = text.slice(start, end);
    const markerLen = marker.length;
    const result = toggleMarker(text, selectedText, start, end, marker, markerLen);

    this.value = result.text;

    this.dispatchEvent(new CustomEvent('native:format', {
      bubbles: true,
      composed: true,
      detail: { type, value: result.text },
    }));

    // Restore selection after value setter replaces textContent
    requestAnimationFrame(() => {
      restoreSelection(this, result.selStart, result.selEnd);
    });
  }

  /** Keyboard shortcut handler for formatting (Cmd/Ctrl+B/I/E). */
  #onFormattingKeydown = (e: KeyboardEvent): void => {
    if (!(e.metaKey || e.ctrlKey)) return;

    const format = FORMAT_SHORTCUTS[e.key];
    if (!format) return;

    if (!isFormatEnabled(this, format)) return;

    e.preventDefault();
    this.applyFormat(format);
  };
}
