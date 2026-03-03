import { NativeElement, signal, createDisabledEffect } from '@nonoun/native-ui';

export interface StructuredOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

/**
 * Structured multi-choice input — appears before submission for
 * guided input (like modern Claude chat's multiple-choice UI).
 *
 * ```html
 * <n-chat-input-structured
 *   question="What would you like to do?"
 *   type="single"
 *   options='[{"value":"a","label":"Option A"},{"value":"b","label":"Option B"}]'>
 * </n-chat-input-structured>
 * ```
 *
 * @attr {string} question - Prompt text
 * @attr {string} type - `single` (default) | `multi`
 * @attr {string} options - JSON array of `{ value, label, description?, icon? }`
 * @attr {boolean} required - At least one selection required before submit
 * @attr {boolean} disabled - Disables interaction
 * @fires native:structured-submit - Fired on submit with selections
 * @fires native:structured-cancel - Fired when dismissed without selecting
 */
export class NChatInputStructured extends NativeElement {
  static observedAttributes = ['question', 'type', 'options', 'required', 'disabled'];

  #internals: ElementInternals;
  #question = signal('');
  #type = signal<'single' | 'multi'>('single');
  #options = signal<StructuredOption[]>([]);
  #required = signal(false);
  #disabled = signal(false);
  #selected = signal<Set<string>>(new Set());

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get question(): string { return this.#question.value; }
  set question(val: string) {
    this.#question.value = val;
    this.setAttribute('question', val);
  }

  get options(): StructuredOption[] { return this.#options.value; }
  set options(val: StructuredOption[]) {
    this.#options.value = val;
    this.setAttribute('options', JSON.stringify(val));
  }

  get selections(): StructuredOption[] {
    const sel = this.#selected.value;
    return this.#options.value.filter(o => sel.has(o.value));
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'question': this.#question.value = val ?? ''; break;
      case 'type': this.#type.value = val === 'multi' ? 'multi' : 'single'; break;
      case 'options':
        try { this.#options.value = val ? JSON.parse(val) : []; }
        catch { this.#options.value = []; }
        break;
      case 'required': this.#required.value = val !== null; break;
      case 'disabled': this.#disabled.value = val !== null; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    this.addEffect(() => {
      this.#render();
    });

    this.addEventListener('native:press', this.#onPress);
  }

  teardown(): void {
    this.removeEventListener('native:press', this.#onPress);
    super.teardown();
  }

  // ── Render ──

  #render(): void {
    const question = this.#question.value;
    const options = this.#options.value;
    const selected = this.#selected.value;
    const type = this.#type.value;

    this.textContent = '';

    // Question
    if (question) {
      const q = document.createElement('div');
      q.className = 'n-chat-structured-question';
      q.textContent = question;
      this.appendChild(q);
    }

    // Options
    const grid = document.createElement('div');
    grid.className = 'n-chat-structured-options';
    grid.setAttribute('role', type === 'multi' ? 'group' : 'radiogroup');

    for (const opt of options) {
      const btn = document.createElement('n-button');
      const isSelected = selected.has(opt.value);
      btn.setAttribute('variant', isSelected ? 'primary' : 'outline');
      btn.setAttribute('data-value', opt.value);
      btn.setAttribute('aria-pressed', String(isSelected));

      if (opt.icon) {
        const icon = document.createElement('n-icon');
        icon.setAttribute('name', opt.icon);
        icon.setAttribute('slot', 'leading');
        btn.appendChild(icon);
      }

      const label = document.createElement('span');
      label.setAttribute('slot', 'label');
      label.textContent = opt.label;
      btn.appendChild(label);

      grid.appendChild(btn);
    }

    this.appendChild(grid);

    // Actions row
    const actions = document.createElement('div');
    actions.className = 'n-chat-structured-actions';

    const cancelBtn = document.createElement('n-button');
    cancelBtn.setAttribute('variant', 'ghost');
    cancelBtn.setAttribute('size', 'sm');
    cancelBtn.setAttribute('inline', '');
    cancelBtn.setAttribute('data-action', 'cancel');
    cancelBtn.textContent = 'Skip';
    actions.appendChild(cancelBtn);

    const submitBtn = document.createElement('n-button');
    submitBtn.setAttribute('variant', 'primary');
    submitBtn.setAttribute('size', 'sm');
    submitBtn.setAttribute('inline', '');
    submitBtn.setAttribute('data-action', 'submit');
    submitBtn.textContent = 'Submit';

    if (this.#required.value && selected.size === 0) {
      submitBtn.setAttribute('disabled', '');
    }

    actions.appendChild(submitBtn);
    this.appendChild(actions);
  }

  // ── Events ──

  #onPress = (e: Event): void => {
    if (this.#disabled.value) return;
    const target = (e as CustomEvent).target as HTMLElement;

    // Option toggle
    const value = target?.getAttribute('data-value');
    if (value) {
      const sel = new Set(this.#selected.value);
      if (this.#type.value === 'single') {
        sel.clear();
        sel.add(value);
      } else {
        if (sel.has(value)) sel.delete(value);
        else sel.add(value);
      }
      this.#selected.value = sel;
      return;
    }

    // Action buttons
    const action = target?.getAttribute('data-action');
    if (action === 'submit') {
      this.dispatchEvent(new CustomEvent('native:structured-submit', {
        bubbles: true,
        composed: true,
        detail: {
          question: this.#question.value,
          selections: this.selections,
        },
      }));
      return;
    }

    if (action === 'cancel') {
      this.dispatchEvent(new CustomEvent('native:structured-cancel', {
        bubbles: true,
        composed: true,
        detail: {},
      }));
    }
  };
}
