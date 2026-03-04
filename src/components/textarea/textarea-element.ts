import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/** Formatting marker definitions: format name → wrapper string */
const FORMAT_MARKERS: Record<string, string> = {
  code: '`',
  bold: '**',
  italic: '_',
};

/** Keyboard shortcut → format name mapping */
const FORMAT_SHORTCUTS: Record<string, string> = {
  e: 'code',
  b: 'bold',
  i: 'italic',
};

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
  }

  teardown(): void {
    cancelAnimationFrame(this.#autoGrowRaf);
    this.removeEventListener('input', this.#onInput);
    this.removeEventListener('blur', this.#onBlur);
    this.removeEventListener('keydown', this.#onFormattingKeydown);
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

  /** Check whether a format type is enabled in the formatting attribute. */
  #isFormatEnabled(type: string): boolean {
    const attr = this.getAttribute('formatting');
    if (!attr) return false;
    return attr.split(/\s+/).includes(type);
  }

  /**
   * Apply or toggle a format on the current selection.
   * Wraps selected text with the format marker, or unwraps if already wrapped.
   * No-op when the format is not enabled or no text is selected.
   */
  applyFormat(type: string): void {
    const marker = FORMAT_MARKERS[type];
    if (!marker || !this.#isFormatEnabled(type)) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // Ensure the selection is within this element
    if (!this.contains(range.startContainer) || !this.contains(range.endContainer)) return;

    const text = this.value;
    const offsets = this.#getSelectionOffsets(range);
    if (offsets === null) return;

    const { start, end } = offsets;

    // No-op when nothing is selected (collapsed cursor)
    if (start === end) return;

    const selectedText = text.slice(start, end);
    const markerLen = marker.length;
    const result = this.#toggleMarker(text, selectedText, start, end, marker, markerLen);

    this.value = result.text;

    this.dispatchEvent(new CustomEvent('native:format', {
      bubbles: true,
      composed: true,
      detail: { type, value: result.text },
    }));

    // Restore selection after value setter replaces textContent
    requestAnimationFrame(() => {
      this.#restoreSelection(result.selStart, result.selEnd);
    });
  }

  /**
   * Calculate flat text offsets from a Range within this contenteditable host.
   * Walks the text nodes to compute character positions.
   */
  #getSelectionOffsets(range: Range): { start: number; end: number } | null {
    const walker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT);
    let charIndex = 0;
    let start = -1;
    let end = -1;

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const nodeLen = textNode.length;

      if (textNode === range.startContainer) {
        start = charIndex + range.startOffset;
      }
      if (textNode === range.endContainer) {
        end = charIndex + range.endOffset;
        break;
      }
      charIndex += nodeLen;
    }

    if (start === -1 || end === -1) return null;
    return { start, end };
  }

  /**
   * Toggle wrapping markers around selected text.
   * If the selected text (or the surrounding text) already has the marker, unwrap. Otherwise wrap.
   */
  #toggleMarker(
    text: string,
    selectedText: string,
    start: number,
    end: number,
    marker: string,
    markerLen: number,
  ): { text: string; selStart: number; selEnd: number } {
    // Check if selection is already wrapped: marker before start and after end
    const before = text.slice(Math.max(0, start - markerLen), start);
    const after = text.slice(end, end + markerLen);

    if (before === marker && after === marker) {
      // Unwrap: remove surrounding markers
      const newText = text.slice(0, start - markerLen) + selectedText + text.slice(end + markerLen);
      return {
        text: newText,
        selStart: start - markerLen,
        selEnd: start - markerLen + selectedText.length,
      };
    }

    // Check if the selected text itself starts and ends with the marker (user selected markers too)
    if (
      selectedText.length >= markerLen * 2 &&
      selectedText.startsWith(marker) &&
      selectedText.endsWith(marker)
    ) {
      const inner = selectedText.slice(markerLen, -markerLen);
      const newText = text.slice(0, start) + inner + text.slice(end);
      return {
        text: newText,
        selStart: start,
        selEnd: start + inner.length,
      };
    }

    // Wrap: add markers around selection
    const newText = text.slice(0, start) + marker + selectedText + marker + text.slice(end);
    return {
      text: newText,
      selStart: start + markerLen,
      selEnd: start + markerLen + selectedText.length,
    };
  }

  /** Restore a text selection by flat character offsets within this element. */
  #restoreSelection(start: number, end: number): void {
    const sel = window.getSelection();
    if (!sel) return;

    const walker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT);
    let charIndex = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const nodeLen = textNode.length;

      if (!startNode && charIndex + nodeLen >= start) {
        startNode = textNode;
        startOffset = start - charIndex;
      }
      if (charIndex + nodeLen >= end) {
        endNode = textNode;
        endOffset = end - charIndex;
        break;
      }
      charIndex += nodeLen;
    }

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /** Keyboard shortcut handler for formatting (Cmd/Ctrl+B/I/E). */
  #onFormattingKeydown = (e: KeyboardEvent): void => {
    if (!(e.metaKey || e.ctrlKey)) return;

    const format = FORMAT_SHORTCUTS[e.key];
    if (!format) return;

    if (!this.#isFormatEnabled(format)) return;

    e.preventDefault();
    this.applyFormat(format);
  };
}
