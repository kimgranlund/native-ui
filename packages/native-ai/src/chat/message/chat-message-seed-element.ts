import { NativeElement, signal, createDisabledEffect } from '@nonoun/native-ui';

export interface SeedOption {
  value: string;
  label: string;
  icon?: string;
}

/**
 * Suggestion chips — pre-seeded quick responses.
 *
 * Options can be provided as JSON attribute or via the `options` property.
 *
 * ```html
 * <n-chat-message-seed options='[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]'>
 * </n-chat-message-seed>
 * ```
 *
 * @attr {string} options - JSON array of `{ value, label, icon? }`
 * @attr {boolean} disabled - Disables all chips
 * @fires native:seed-select - Fired when a chip is clicked
 */
export class NChatMessageSeed extends NativeElement {
  static observedAttributes = ['options', 'disabled'];

  #internals: ElementInternals;
  #options = signal<SeedOption[]>([]);
  #disabled = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get options(): SeedOption[] { return this.#options.value; }
  set options(val: SeedOption[]) {
    this.#options.value = val;
    this.setAttribute('options', JSON.stringify(val));
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
      case 'options':
        try { this.#options.value = val ? JSON.parse(val) : []; }
        catch { this.#options.value = []; }
        break;
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

    this.addEffect(() => {
      const opts = this.#options.value;
      this.textContent = '';

      const stack = document.createElement('div');
      stack.className = 'stack';
      stack.setAttribute('direction', 'row');
      stack.setAttribute('wrap', '');

      for (const opt of opts) {
        const btn = document.createElement('n-button');
        btn.setAttribute('variant', 'outline');
        btn.setAttribute('size', 'sm');
        btn.setAttribute('inline', '');
        btn.setAttribute('data-value', opt.value);

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

        stack.appendChild(btn);
      }

      this.appendChild(stack);
    });

    this.addEventListener('native:press', this.#onPress);
  }

  teardown(): void {
    this.removeEventListener('native:press', this.#onPress);
    super.teardown();
  }

  // ── Events ──

  #onPress = (e: Event): void => {
    if (this.#disabled.value) return;
    const target = (e as CustomEvent).target as HTMLElement;
    const value = target?.getAttribute('data-value');
    if (!value) return;

    const opt = this.#options.value.find(o => o.value === value);
    if (!opt) return;

    this.dispatchEvent(new CustomEvent('native:seed-select', {
      bubbles: true,
      composed: true,
      detail: { value: opt.value, label: opt.label },
    }));
  };
}
