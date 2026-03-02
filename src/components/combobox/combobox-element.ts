import { signal } from '../../reactivity/signal.ts';
import { batch } from '../../reactivity/batch.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';
import { PopoverController } from '../../traits/popover-controller.ts';
import { DataListController } from '../../core/data-list.ts';
import { parseDataOptions, fetchDataOptions } from '../../core/data-options.ts';
import type { BaseOption } from '../../core/data-options.ts';
import { uid } from '../../core/uid.ts';

export type ComboboxOption = BaseOption;

/**
 * Filterable select (combobox) coordinator wiring a text input to a popover listbox.
 * @attr {string} value - Currently selected value
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {string} options - JSON array of `{ value, label }` objects for data-driven mode
 * @attr {string} src - URL to fetch options from for data-driven mode
 * @attr {string} placeholder - Placeholder text for the input
 * @fires native:change - Fired when selection changes with `{ value, label }` detail
 */
export class NCombobox extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'disabled', 'name', 'options', 'src', 'placeholder', 'required'];

  #internals: ElementInternals;
  #list = new DataListController<ComboboxOption>();
  #open = signal(false);
  #disabled = signal(false);
  #required = signal(false);
  #popover!: PopoverController;
  #listboxId = uid('listbox');
  #input: HTMLElement | null = null;

  // ── Data-driven state ──
  #options = signal<ComboboxOption[]>([]);
  #src = signal<string | null>(null);
  #placeholder = signal<string>('');
  #dataMode = false;
  #fetchController: AbortController | null = null;
  #listbox: HTMLElement | null = null;
  #initialValue: string | null = null;
  #initialLabel = '';

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get store(): DataListController<ComboboxOption> {
    return this.#list;
  }

  get value(): string | null {
    return this.#list.value.value;
  }

  set value(val: string | null) {
    if (val === null) {
      batch(() => {
        this.#list.clearSelection();
        this.#list.query.value = '';
        this.#list.activeIndex.value = -1;
        this.#open.value = false;
      });
      return;
    }
    this.#list.select(val);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  // ── Required ──

  get required(): boolean { return this.#required.value; }
  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  get options(): ComboboxOption[] {
    return this.#options.value;
  }

  set options(val: ComboboxOption[]) {
    this.#options.value = val;
    this.setAttribute('options', JSON.stringify(val));
  }

  get src(): string | null {
    return this.#src.value;
  }

  set src(val: string | null) {
    this.#src.value = val;
    if (val != null) this.setAttribute('src', val);
    else this.removeAttribute('src');
  }

  get placeholder(): string {
    return this.#placeholder.value;
  }

  set placeholder(val: string) {
    this.#placeholder.value = val;
    if (val) this.setAttribute('placeholder', val);
    else this.removeAttribute('placeholder');
  }

  // ── Data-driven helpers ──

  #parseOptions(json: string): ComboboxOption[] {
    return parseDataOptions<ComboboxOption>(json, 'n-combobox');
  }

  async #fetchOptions(url: string): Promise<void> {
    this.#fetchController = await fetchDataOptions<ComboboxOption>(
      url, this.#fetchController, this.#options, 'n-combobox',
    );
  }

  // WHY: Stamps the input + listbox shell that data-driven mode needs
  #stampDOM(): void {
    const input = document.createElement('n-input');
    const placeholder = this.#placeholder.value;
    if (placeholder) input.setAttribute('placeholder', placeholder);

    // WHY: Inherit size from combobox if set
    const size = this.getAttribute('size');
    if (size) input.setAttribute('size', size);

    const listbox = document.createElement('n-listbox');
    listbox.setAttribute('popover', 'manual');

    this.appendChild(input);
    this.appendChild(listbox);
  }

  #renderOptions(opts: ComboboxOption[]): void {
    const listbox = this.#listbox;
    if (!listbox) return;

    // WHY: Clear existing options but keep the listbox shell
    while (listbox.firstChild) listbox.removeChild(listbox.firstChild);

    for (const opt of opts) {
      const el = document.createElement('n-option');
      el.setAttribute('value', opt.value);
      el.setAttribute('label', opt.label);
      el.textContent = opt.label;
      if (opt.disabled) el.setAttribute('disabled', '');
      listbox.appendChild(el);
    }

    // WHY: Sync DataListController data so the filter computed stays in sync
    this.#list.data.value = opts;
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        if (val !== null) {
          const opt = this.querySelector(`n-option[value="${CSS.escape(val)}"]`);
          const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? val;
          this.#list.select(val);
          this.#list.query.value = label;
          // WHY: Sync input text to show selected label
          if (this.#input && 'value' in this.#input) {
            (this.#input as HTMLElement & { value: string }).value = label;
          }
        } else {
          batch(() => {
            this.#list.clearSelection();
            this.#list.query.value = '';
          });
          if (this.#input && 'value' in this.#input) {
            (this.#input as HTMLElement & { value: string }).value = '';
          }
        }
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'required':
        this.#required.value = val !== null;
        break;
      case 'options':
        if (val) this.#options.value = this.#parseOptions(val);
        else this.#options.value = [];
        break;
      case 'src':
        this.#src.value = val;
        break;
      case 'placeholder':
        this.#placeholder.value = val ?? '';
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    this.#popover = new PopoverController(this);

    // WHY: Detect data-driven mode — if options or src is present, stamp our own children
    this.#dataMode = this.hasAttribute('options') || this.hasAttribute('src');

    if (this.#dataMode) {
      // Seed signals from attributes before stamping
      const optionsAttr = this.getAttribute('options');
      if (optionsAttr) this.#options.value = this.#parseOptions(optionsAttr);
      this.#src.value = this.getAttribute('src');
      this.#placeholder.value = this.getAttribute('placeholder') ?? '';

      // WHY: Synchronous DOM stamp so querySelector below finds input + listbox
      this.#stampDOM();
    }

    const input = this.querySelector<HTMLElement>(':scope > n-input');
    this.#input = input;
    const listbox = this.querySelector<HTMLElement>(':scope > n-listbox[popover]');
    this.#listbox = listbox;

    if (__DEV__ && !this.#dataMode) {
      if (!input) console.warn('[n-combobox] Manual mode requires a <n-input> child. None found.');
      if (!listbox) console.warn('[n-combobox] Manual mode requires a <n-listbox popover> child. None found.');
    }

    // WHY: popover="manual" prevents native light-dismiss from conflicting with Dismissable trait
    listbox?.setAttribute('popover', 'manual');
    // Enable virtual focus on listbox
    listbox?.setAttribute('virtual-focus', '');

    // Wire anchor positioning
    if (input && listbox) {
      this.#popover.wirePopover(input, listbox);
      if (!listbox.id) listbox.id = this.#listboxId;
    }

    // ARIA
    input?.setAttribute('role', 'combobox');
    input?.setAttribute('aria-autocomplete', 'list');
    input?.setAttribute('aria-controls', listbox?.id ?? '');
    input?.setAttribute('aria-expanded', 'false');

    // ── Data-mode-only effects (outside deferChildren — no child DOM dependency) ──
    // WHY: These effects only read signals and operate on references captured above (#listbox,
    // input). They must be registered outside deferChildren so they fire immediately when
    // signals change, without waiting for the microtask that deferChildren introduces.

    if (this.#dataMode) {
      // Effect: #options signal → re-render option list
      // WHY: #renderOptions clears and re-stamps into #listbox — no child query needed
      this.addEffect(() => {
        const opts = this.#options.value;
        this.#renderOptions(opts);
      });

      // Effect: #src signal → fetch remote options
      this.addEffect(() => {
        const url = this.#src.value;
        if (url) this.#fetchOptions(url);
      });

      // Effect: placeholder signal → input placeholder attribute
      // WHY: In manual mode the input's placeholder is set by the author directly; this effect
      // is intentionally data-mode-only. Uses `input` reference captured above, no child query.
      this.addEffect(() => {
        const placeholder = this.#placeholder.value;
        if (input) {
          if (placeholder) input.setAttribute('placeholder', placeholder);
          else input.removeAttribute('placeholder');
        }
      });
    }

    // Collect options into store and set up child-dependent effects
    this.deferChildren(() => {
      // WHY: In manual mode, read options from DOM. In data mode, options come from signal.
      if (!this.#dataMode) {
        const optionEls = listbox?.querySelectorAll('n-option') ?? [];
        this.#list.data.value = [...optionEls].map(o => ({
          value: o.getAttribute('value') ?? '',
          label: o.getAttribute('label') ?? o.textContent?.trim() ?? '',
        }));
      }

      // Seed: read initial value attribute
      const initialValue = this.getAttribute('value');
      if (initialValue) {
        const opt = this.querySelector(`n-option[value="${CSS.escape(initialValue)}"]`);
        const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? initialValue;
        this.#list.value.value = initialValue;
        this.#list.query.value = label;
        this.#initialValue = initialValue;
        this.#initialLabel = label;
      }

      // Effect: filter options by query
      this.addEffect(() => {
        const filtered = this.#list.view.value;
        const filteredValues = new Set(filtered.map(o => o.value));
        const allOptions = listbox?.querySelectorAll('n-option') ?? [];
        for (const opt of allOptions) {
          opt.toggleAttribute('hidden', !filteredValues.has(opt.getAttribute('value') ?? ''));
        }
      });

      // Effect: sync [active] + scrollIntoView + aria-activedescendant
      this.addEffect(() => {
        this.#list.view.value; // WHY: Track filtering — re-run even when activeIndex stays at -1
        const idx = this.#list.activeIndex.value;
        const visibleOptions = [...(listbox?.querySelectorAll<HTMLElement>('n-option:not([hidden]):not([disabled])') ?? [])];

        for (let i = 0; i < visibleOptions.length; i++) {
          visibleOptions[i].toggleAttribute('active', i === idx);
        }

        const activeOpt = visibleOptions[idx];
        if (activeOpt) {
          activeOpt.scrollIntoView({ block: 'nearest' });
          // WHY: Ensure option has an ID for aria-activedescendant
          if (!activeOpt.id) activeOpt.id = uid('opt');
          input?.setAttribute('aria-activedescendant', activeOpt.id);
        } else {
          input?.removeAttribute('aria-activedescendant');
        }
      });

      // Effect: sync selected state on options
      this.addEffect(() => {
        const val = this.#list.value.value;
        const options = listbox?.querySelectorAll<HTMLElement>('n-option') ?? [];
        for (const opt of options) {
          const isSelected = opt.getAttribute('value') === val;
          opt.setAttribute('aria-selected', String(isSelected));
        }
      });
    });

    // Effect: disabled → aria-disabled + attribute + cascade to input
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
    this.addEffect(() => {
      const val = this.#disabled.value;
      if (input) input.toggleAttribute('disabled', val);
      // WHY: Close popover when disabled to prevent stale open state
      // WHY: peek() avoids tracking open signal — this effect should only re-run on disabled change
      if (val && this.#open.peek()) this.#open.value = false;
    });

    // Validity: required constraint
    this.#required.value = this.hasAttribute('required');
    this.addEffect(() => {
      const val = this.#list.value.value;
      if (this.#required.value && (val === null || val === '')) {
        this.#internals.setValidity({ valueMissing: true }, 'Please select an option.', this);
      } else {
        this.#internals.setValidity({});
      }
    });

    // Effect: open → popover + dismissable + aria-expanded
    this.addEffect(() => {
      const open = this.#open.value;
      this.#popover.syncPopover(open);
      input?.setAttribute('aria-expanded', String(open));
    });

    // Effect: value → form value + attribute reflection
    this.addEffect(() => {
      const val = this.#list.value.value;
      this.#internals.setFormValue(val ?? '');
      if (val != null) this.setAttribute('value', val);
      else this.removeAttribute('value');
    });

    // Event: click/focus on input → open
    // WHY: focusin (not focus) because n-input uses an inner contenteditable surface.
    // focus does not bubble, so focusing the surface wouldn't reach this listener.
    // focusin bubbles from the surface → n-input host → combobox.
    input?.addEventListener('focusin', this.#onInputFocus);

    // Event: input typing → store.setQuery
    this.addEventListener('native:input', this.#onInput);

    // WHY: Stop child native:change events (from n-listbox and n-input blur) from leaking out —
    // the combobox fires its own canonical native:change on option selection.
    // stopImmediatePropagation prevents same-element listeners (e.g. demo handlers) from seeing child events too.
    this.addEventListener('native:change', this.#onChildChange);

    // Event: option selection → store.select + public native:change
    this.addEventListener('native:select', this.#onOptionSelect);

    // Event: dismiss → close
    this.addEventListener('native:dismiss', this.#onDismiss);

    // Keyboard on input
    input?.addEventListener('keydown', this.#onInputKeydown);
  }

  // ── Event handlers (arrow properties for stable references) ──

  #onInputFocus = (): void => {
    if (!this.#disabled.value && !this.#open.value) {
      this.#open.value = true;
    }
  };

  #onInput = (e: Event): void => {
    this.#list.setQuery((e as CustomEvent).detail.value);
    // WHY: DataListController.setQuery doesn't manage open state — element handles it
    this.#open.value = true;
  };

  #onChildChange = (e: Event): void => {
    if (e.target !== this) e.stopImmediatePropagation();
  };

  #onOptionSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { value: string; label: string };
    batch(() => {
      this.#list.select(detail.value);
      this.#list.query.value = detail.label;
      this.#list.activeIndex.value = -1;
      this.#open.value = false;
    });
    // WHY: Update input text to show selected label
    const input = this.#input;
    if (input && 'value' in input) {
      (input as HTMLElement & { value: string }).value = detail.label;
    }
    this.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      composed: true,
      detail,
    }));
  };

  #onDismiss = (): void => {
    this.#open.value = false;
  };

  #onInputKeydown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;
    const input = this.#input;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.#open.value) {
          this.#open.value = true;
        }
        this.#list.moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.#open.value) {
          this.#open.value = true;
        }
        this.#list.moveActive(-1);
        break;
      case 'Enter':
        if (this.#open.value) {
          e.preventDefault();
          // WHY: Read activeItem before selectActive — selectActive only sets value
          const active = this.#list.activeItem.value;
          this.#list.selectActive();
          if (active && input && 'value' in input) {
            this.#list.query.value = active.label;
            (input as HTMLElement & { value: string }).value = active.label;
          }
          this.#list.activeIndex.value = -1;
          this.#open.value = false;
        }
        break;
      case 'Escape':
        if (this.#open.value) {
          e.preventDefault();
          this.#open.value = false;
        }
        break;
      case 'Home':
        if (this.#open.value) {
          e.preventDefault();
          this.#list.activeIndex.value = 0;
        }
        break;
      case 'End':
        if (this.#open.value) {
          e.preventDefault();
          const len = this.#list.view.value.length;
          this.#list.activeIndex.value = Math.max(0, len - 1);
        }
        break;
    }
  };

  teardown(): void {
    // WHY: Remove listeners from child elements to prevent stacking on re-setup
    this.#input?.removeEventListener('focusin', this.#onInputFocus);
    this.#input?.removeEventListener('keydown', this.#onInputKeydown);
    this.removeEventListener('native:input', this.#onInput);
    this.removeEventListener('native:change', this.#onChildChange);
    this.removeEventListener('native:select', this.#onOptionSelect);
    this.removeEventListener('native:dismiss', this.#onDismiss);
    this.#input = null;
    this.#listbox = null;
    this.#fetchController?.abort();
    this.#fetchController = null;
    this.#popover.destroy();
    super.teardown();
  }

  // ── Form callbacks ──

  override onFormReset(): void {
    batch(() => {
      if (this.#initialValue !== null) {
        this.#list.select(this.#initialValue);
        this.#list.query.value = this.#initialLabel;
      } else {
        this.#list.clearSelection();
        this.#list.query.value = '';
      }
      this.#list.activeIndex.value = -1;
      this.#open.value = false;
    });
    const input = this.querySelector<HTMLElement & { value: string }>(':scope > n-input');
    if (input) input.value = this.#initialLabel;
  }

  override onFormStateRestore(state: string | FormData | null): void {
    if (typeof state === 'string' && state) {
      this.value = state;
    }
  }

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
  }
}
