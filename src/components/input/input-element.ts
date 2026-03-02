import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Single-line text input using an inner contenteditable surface with form association.
 *
 * WHY inner surface: Browsers break contenteditable text insertion when the
 * contenteditable element uses `display: flex` and contains child elements
 * (like slot icons). Moving the editable surface into a child `<span>` inside
 * the flex container fixes this — the flex host handles layout while the
 * surface handles editing.
 *
 * @attr {string} value - Current text value
 * @attr {string} placeholder - Placeholder text shown when empty
 * @attr {boolean} disabled - Disables interaction
 * @attr {boolean} readonly - Prevents editing while remaining focusable
 * @attr {boolean} required - Marks as required for form validation
 * @attr {string} name - Form field name
 * @fires native:input - Fired on each keystroke with `{ value }` detail
 * @fires native:change - Fired on blur with `{ value }` detail
 */
export class NInput extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'readonly', 'required', 'pattern'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #required = signal(false);
  #formValue = signal('');
  #initialValue = '';
  #pattern: string | null = null;
  // WHY: Inner <span> that is contenteditable — isolates editing from flex layout.
  #surface: HTMLSpanElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'textbox';
  }

  // ── Value ──

  get value(): string {
    return this.#surface?.textContent ?? '';
  }

  set value(val: string) {
    if (this.#surface) this.#surface.textContent = val;
    this.#formValue.value = val;
    this.#internals.setFormValue(val);
    this.#updateEmptyState();
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
    this.#syncSurfaceEditable();
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
        if (this.#surface) this.#surface.textContent = val ?? '';
        this.#formValue.value = val ?? '';
        this.#internals.setFormValue(val ?? '');
        this.#updateEmptyState();
        break;
      case 'placeholder':
        if (this.#surface) this.#surface.dataset.placeholder = val ?? '';
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        this.#syncSurfaceEditable();
        break;
      case 'readonly':
        this.#syncSurfaceEditable();
        break;
      case 'required':
        this.#required.value = val !== null;
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

    // WHY: Read initial text from host's text nodes BEFORE creating the surface,
    // because the surface will replace the text nodes as the content location.
    const initialText = this.getAttribute('value') ?? this.#readHostText();

    // Create inner editing surface
    this.#surface = document.createElement('span');
    this.#surface.className = 'n-input-surface';
    this.#surface.setAttribute('tabindex', '0');
    this.#syncSurfaceEditable();
    if (initialText) this.#surface.textContent = initialText;
    this.#surface.dataset.placeholder = this.getAttribute('placeholder') ?? '';

    // WHY: Remove whitespace text nodes from host — they came from HTML indentation
    // and would interfere with the flex layout (appear as anonymous flex items).
    for (const node of [...this.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }

    // WHY: Insert surface as first child — CSS `order` on slot children
    // handles visual ordering (leading: -1, surface: 0, trailing: 1).
    this.prepend(this.#surface);

    // WHY: Sync signals from initial attributes (attributeChangedCallback fires before setup)
    this.#required.value = this.hasAttribute('required');
    this.#pattern = this.getAttribute('pattern');
    this.#initialValue = initialText;
    this.#formValue.value = this.#surface.textContent ?? '';
    this.#updateEmptyState();
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    // WHY: Manage surface tabindex alongside disabled state — when disabled,
    // surface must not be focusable. createDisabledEffect handles the host
    // attributes; this effect handles the surface's tabindex.
    this.addEffect(() => {
      if (!this.#surface) return;
      this.#surface.setAttribute('tabindex', this.#disabled.value ? '-1' : '0');
    });

    // Constraint validation: report valueMissing and patternMismatch
    this.addEffect(() => {
      const val = this.#formValue.value;
      if (this.#required.value && val === '') {
        this.#internals.setValidity(
          { valueMissing: true },
          'Please fill out this field.',
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

    // WHY: Events on the surface (not host) because the surface owns the
    // contenteditable. Custom events dispatch on the host for consumer listeners.
    this.#surface.addEventListener('keydown', this.#onKeyDown);
    this.#surface.addEventListener('input', this.#onInput);
    this.#surface.addEventListener('blur', this.#onBlur);
    // WHY: Clicking the host (padding, border area) should focus the surface.
    this.addEventListener('mousedown', this.#onHostMousedown);
  }

  teardown(): void {
    this.#surface?.removeEventListener('keydown', this.#onKeyDown);
    this.#surface?.removeEventListener('input', this.#onInput);
    this.#surface?.removeEventListener('blur', this.#onBlur);
    this.removeEventListener('mousedown', this.#onHostMousedown);
    this.#surface?.remove();
    this.#surface = null;
    super.teardown();
  }

  // ── Focus delegation ──

  /** Programmatic select-all on the editing surface. */
  select(): void {
    if (!this.#surface) return;
    const range = document.createRange();
    range.selectNodeContents(this.#surface);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  /** Programmatic focus on the editing surface. */
  override focus(options?: FocusOptions): void {
    this.#surface?.focus(options);
  }

  // ── Form callbacks ──

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
    this.#syncSurfaceEditable();
  }

  override onFormReset(): void {
    if (this.#surface) this.#surface.textContent = this.#initialValue;
    this.#formValue.value = this.#initialValue;
    this.#internals.setFormValue(this.#initialValue);
    this.#updateEmptyState();
    this.#disabled.value = this.hasAttribute('disabled');
    this.#syncSurfaceEditable();
  }

  override onFormStateRestore(state: string | FormData | null): void {
    this.value = typeof state === 'string' ? state : '';
  }

  // ── Private helpers ──

  /** Read text content from the host's own text nodes (before surface exists). */
  #readHostText(): string {
    let text = '';
    for (const node of this.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    }
    return text.trim();
  }

  /** Sync the surface's contenteditable based on disabled + readonly state. */
  #syncSurfaceEditable(): void {
    if (!this.#surface) return;
    const locked = this.#disabled.value || this.hasAttribute('readonly');
    this.#surface.setAttribute('contenteditable', locked ? 'false' : 'plaintext-only');
  }

  // ── Empty state (for CSS placeholder) ──

  #updateEmptyState(): void {
    const empty = (this.#surface?.textContent ?? '').trim() === '';
    if (empty) this.#internals.states.add('empty');
    else this.#internals.states.delete('empty');
  }

  // ── Events ──

  #onHostMousedown = (e: MouseEvent): void => {
    // WHY: When user clicks the host's padding/border area (not the surface itself),
    // prevent the default (which would blur the surface) and redirect focus.
    if (e.target === this) {
      e.preventDefault();
      this.#surface?.focus();
    }
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      // WHY: contenteditable inserts <br> on Enter — prevent for single-line input
      e.preventDefault();
      // WHY: Implicit form submission (like native <input>). Skip when inside a
      // coordinator that handles Enter for its own purposes (combobox selection).
      if (!this.closest('n-combobox')) {
        this.#internals.form?.requestSubmit();
      }
    }
  };

  #onInput = (): void => {
    const val = this.#surface?.textContent ?? '';
    this.#formValue.value = val;
    this.#internals.setFormValue(val);
    this.#updateEmptyState();
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
      detail: { value: this.#surface?.textContent ?? '' },
    }));
  };
}
