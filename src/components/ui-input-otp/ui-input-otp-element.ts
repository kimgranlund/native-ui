import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * One-time password input with individual character cells and paste support.
 * @attr {string} value - Current OTP value
 * @attr {number} length - Number of cells (default 6, max 12)
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {string} pattern - Regex pattern for allowed characters (default "[0-9]")
 * @attr {string} mask - Mask character for display
 * @fires ui-input - Fired on each cell change with `{ value }` detail
 * @fires ui-change - Fired when all cells are filled with `{ value }` detail
 */
export class UIInputOtp extends FormAssociable(UIElement) {
  static observedAttributes = ['value', 'length', 'disabled', 'name', 'pattern', 'mask'];

  #internals: ElementInternals;
  #disabled: ReactiveProp<boolean>;
  #cells: HTMLDivElement[] = [];
  #value: string[] = [];
  #length = 6;
  #pattern = /[0-9]/;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'group';
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
  }

  // ── Value ──

  get value(): string { return this.#value.join(''); }
  set value(val: string) {
    const chars = val.split('').slice(0, this.#length);
    this.#value = chars;
    this.#renderCells();
    this.#syncFormValue();
  }

  // ── Name ──

  get name(): string { return this.getAttribute('name') ?? ''; }
  set name(val: string) { this.setAttribute('name', val); }

  // ── Disabled ──

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (syncProp({ disabled: this.#disabled }, name, val)) {
      super.attributeChangedCallback(name, old, val);
      return;
    }
    switch (name) {
      case 'value':
        this.value = val ?? '';
        break;
      case 'length': {
        const len = parseInt(val ?? '6', 10);
        if (!isNaN(len) && len >= 1 && len <= 12) {
          this.#length = len;
          if (this.isConnected) this.#stampCells();
        }
        break;
      }
      case 'pattern':
        try { this.#pattern = new RegExp(val ?? '[0-9]'); } catch { /* keep old */ }
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Read attributes
    const lenAttr = this.getAttribute('length');
    if (lenAttr) {
      const len = parseInt(lenAttr, 10);
      if (!isNaN(len) && len >= 1 && len <= 12) this.#length = len;
    }
    const patAttr = this.getAttribute('pattern');
    if (patAttr) {
      try { this.#pattern = new RegExp(patAttr); } catch { /* default */ }
    }

    this.#stampCells();
    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals, { manageTabindex: false }));

    // Set initial value
    const valAttr = this.getAttribute('value');
    if (valAttr) this.value = valAttr;

    this.addEventListener('paste', this.#onPaste);
  }

  teardown(): void {
    for (const cell of this.#cells) {
      cell.removeEventListener('input', this.#onCellInput);
      cell.removeEventListener('keydown', this.#onCellKeyDown);
      cell.removeEventListener('focus', this.#onCellFocus);
    }
    this.removeEventListener('paste', this.#onPaste);
    super.teardown();
  }

  // ── Cell management ──

  #stampCells(): void {
    // Clear existing — remove listeners before removing DOM
    for (const cell of this.#cells) {
      cell.removeEventListener('input', this.#onCellInput);
      cell.removeEventListener('keydown', this.#onCellKeyDown);
      cell.removeEventListener('focus', this.#onCellFocus);
      cell.remove();
    }
    this.#cells = [];
    this.#value = [];

    for (let i = 0; i < this.#length; i++) {
      const cell = document.createElement('div');
      cell.classList.add('ui-otp-cell');
      cell.setAttribute('data-empty', '');
      cell.setAttribute('contenteditable', 'plaintext-only');
      cell.setAttribute('inputmode', 'numeric');
      cell.addEventListener('input', this.#onCellInput);
      cell.addEventListener('keydown', this.#onCellKeyDown);
      cell.addEventListener('focus', this.#onCellFocus);
      this.appendChild(cell);
      this.#cells.push(cell);
      this.#value.push('');
    }
  }

  #renderCells(): void {
    for (let i = 0; i < this.#length; i++) {
      const cell = this.#cells[i];
      if (!cell) continue;
      const char = this.#value[i] ?? '';
      cell.textContent = char;
      if (char) {
        cell.removeAttribute('data-empty');
      } else {
        cell.setAttribute('data-empty', '');
      }
    }
  }

  #syncFormValue(): void {
    this.#internals.setFormValue(this.value);
  }

  #focusCell(index: number): void {
    const cell = this.#cells[index];
    if (cell) {
      cell.focus();
      // Place cursor at end
      const sel = window.getSelection();
      if (sel) {
        sel.selectAllChildren(cell);
        sel.collapseToEnd();
      }
    }
  }

  // ── Events ──

  #onCellInput = (e: Event): void => {
    if (this.disabled) return;
    const cell = e.target as HTMLDivElement;
    const index = this.#cells.indexOf(cell);
    if (index === -1) return;

    const text = cell.textContent ?? '';

    // Filter to allowed pattern
    if (text.length > 0) {
      const lastChar = text[text.length - 1];
      if (this.#pattern.test(lastChar)) {
        this.#value[index] = lastChar;
        cell.textContent = lastChar;
        cell.removeAttribute('data-empty');
        this.#syncFormValue();
        this.#dispatchInput();

        // Auto-advance
        if (index < this.#length - 1) {
          this.#focusCell(index + 1);
        }

        // Check if complete
        if (this.value.length === this.#length) {
          this.#dispatchChange();
        }
      } else {
        // Reject character
        cell.textContent = this.#value[index] || '';
      }
    } else {
      // Cell cleared
      this.#value[index] = '';
      cell.setAttribute('data-empty', '');
      this.#syncFormValue();
      this.#dispatchInput();
    }
  };

  #onCellKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    const cell = e.target as HTMLDivElement;
    const index = this.#cells.indexOf(cell);
    if (index === -1) return;

    if (e.key === 'Backspace') {
      if (this.#value[index]) {
        // Clear current cell
        this.#value[index] = '';
        cell.textContent = '';
        cell.setAttribute('data-empty', '');
        this.#syncFormValue();
        this.#dispatchInput();
      } else if (index > 0) {
        // Move to previous cell
        this.#focusCell(index - 1);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      this.#focusCell(index - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < this.#length - 1) {
      this.#focusCell(index + 1);
      e.preventDefault();
    } else if (e.key === 'Delete') {
      this.#value[index] = '';
      cell.textContent = '';
      cell.setAttribute('data-empty', '');
      this.#syncFormValue();
      this.#dispatchInput();
      e.preventDefault();
    }
  };

  #onCellFocus = (e: FocusEvent): void => {
    const cell = e.target as HTMLDivElement;
    // Select all content for easy replacement
    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(cell);
      sel.collapseToEnd();
    }
  };

  #onPaste = (e: ClipboardEvent): void => {
    if (this.disabled) { e.preventDefault(); return; }
    e.preventDefault();
    const text = e.clipboardData?.getData('text') ?? '';
    const chars = text.split('').filter(c => this.#pattern.test(c)).slice(0, this.#length);

    for (let i = 0; i < this.#length; i++) {
      this.#value[i] = chars[i] ?? '';
    }
    this.#renderCells();
    this.#syncFormValue();
    this.#dispatchInput();

    // Focus the next empty cell or last cell
    const nextEmpty = this.#value.findIndex(v => !v);
    this.#focusCell(nextEmpty >= 0 ? nextEmpty : this.#length - 1);

    if (chars.length === this.#length) {
      this.#dispatchChange();
    }
  };

  // ── Form callbacks ──

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.signal.value = disabled;
    for (const cell of this.#cells) {
      cell.setAttribute('contenteditable', disabled ? 'false' : 'plaintext-only');
    }
  }

  override onFormReset(): void {
    this.value = '';
    this.#disabled.signal.value = this.hasAttribute('disabled');
  }

  // ── Dispatch ──

  #dispatchInput(): void {
    this.dispatchEvent(new CustomEvent('ui-input', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  #dispatchChange(): void {
    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }
}
