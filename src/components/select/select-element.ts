import { signal } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';
import { FormAssociable } from '@nonoun/native-core';
import { PressController } from '@nonoun/native-traits';
import { PopoverController } from '@nonoun/native-traits';
import { parseDataOptions, fetchDataOptions } from '@nonoun/native-core';
import type { BaseOption } from '@nonoun/native-core';
import { SelectController } from './controller/select-controller.ts';
import type { NListbox } from '../listbox/listbox-element.ts';

export type SelectOption = BaseOption;

/**
 * Select dropdown — the element IS the trigger button.
 * Stamps its own label + caret chrome. Children are options or a popover listbox.
 * @attr {string} value - Currently selected value
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {string} options - JSON array of `{ value, label }` objects for data-driven mode
 * @attr {string} src - URL to fetch options from for data-driven mode
 * @attr {string} placeholder - Placeholder text when no value is selected
 * @fires native:change - Fired when selection changes with `{ value, label }` detail
 */
export class NSelect extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'disabled', 'name', 'options', 'src', 'placeholder', 'required'];

  #internals: ElementInternals;
  #controller = new SelectController();
  #disabled = signal(false);
  #required = signal(false);
  #popover!: PopoverController;
  #press!: PressController;

  // ── Data-driven state ──
  #options = signal<SelectOption[]>([]);
  #src = signal<string | null>(null);
  #placeholder = signal<string>('');
  #fetchController: AbortController | null = null;
  #listbox: (HTMLElement & NListbox) | null = null;
  #labelEl: HTMLElement | null = null;
  #initialValue: string | null = null;
  #initialLabel = '';
  #dataModeActive = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get controller(): SelectController {
    return this.#controller;
  }

  get value(): string | null {
    return this.#controller.value.value;
  }

  set value(val: string | null) {
    if (val === null) {
      this.#controller.reset();
      return;
    }
    const opt = this.#listbox?.querySelector(`n-option[value="${CSS.escape(val)}"]`);
    const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? val;
    this.#controller.select(val, label);
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

  get required(): boolean { return this.#required.value; }
  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  get options(): SelectOption[] {
    return this.#options.value;
  }

  set options(val: SelectOption[]) {
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

  // ── Internal helpers ──

  #parseOptions(json: string): SelectOption[] {
    return parseDataOptions<SelectOption>(json, 'n-select');
  }

  async #fetchOptions(url: string): Promise<void> {
    this.#fetchController = await fetchDataOptions<SelectOption>(
      url, this.#fetchController, this.#options, 'n-select',
    );
  }

  /** Stamps the label span + caret icon chrome directly into the select. */
  #stampChrome(): void {
    const labelSpan = document.createElement('span');
    labelSpan.setAttribute('slot', 'label');
    labelSpan.textContent = this.#placeholder.value || '\u00A0';
    this.#labelEl = labelSpan;

    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'caret-up-down');
    icon.setAttribute('slot', 'trailing');

    // WHY: Prepend chrome so it appears before listbox child in DOM order
    this.prepend(labelSpan, icon);
  }

  /** Stamps the listbox + options for data-driven mode. */
  #stampListbox(): void {
    const listbox = document.createElement('n-listbox');
    listbox.setAttribute('popover', 'manual');
    this.appendChild(listbox);
  }

  /** Activates data-driven mode when options/src is set after initial setup. */
  #activateDataMode(): void {
    if (this.#dataModeActive || !this.#popover) return;
    this.#dataModeActive = true;

    // Stamp listbox if missing
    if (!this.#listbox) {
      this.#stampListbox();
      this.#listbox = this.querySelector<HTMLElement & NListbox>(':scope > n-listbox[popover]');
      this.#listbox?.setAttribute('popover', 'manual');
      if (this.#listbox) {
        if (!this.#listbox.id) this.#listbox.id = uid('lb');
        this.setAttribute('aria-controls', this.#listbox.id);
        this.#popover.wirePopover(this, this.#listbox);
        this.#listbox.addEventListener('pointerdown', this.#onListboxPointerDown);
      }
    }

    // Create data-mode effects
    this.addEffect(() => {
      const opts = this.#options.value;
      this.#renderOptions(opts);
    });

    this.addEffect(() => {
      const url = this.#src.value;
      if (url) this.#fetchOptions(url);
    });

    this.addEffect(() => {
      const placeholder = this.#placeholder.value;
      const label = this.#controller.label.value;
      if (this.#labelEl && !label) {
        this.#labelEl.textContent = placeholder || '\u00A0';
      }
    });
  }

  #renderOptions(opts: SelectOption[]): void {
    const listbox = this.#listbox;
    if (!listbox) return;

    while (listbox.firstChild) listbox.removeChild(listbox.firstChild);

    for (const opt of opts) {
      const el = document.createElement('n-option');
      el.setAttribute('value', opt.value);
      el.setAttribute('label', opt.label);
      el.textContent = opt.label;
      if (opt.disabled) el.setAttribute('disabled', '');
      listbox.appendChild(el);
    }
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        if (val !== null) {
          const opt = this.#listbox?.querySelector(`n-option[value="${CSS.escape(val)}"]`);
          const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? val;
          this.#controller.select(val, label);
        } else {
          this.#controller.reset();
        }
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'required':
        this.#required.value = val !== null;
        break;
      case 'options':
        if (val) {
          this.#options.value = this.#parseOptions(val);
          this.#activateDataMode();
        } else {
          this.#options.value = [];
        }
        break;
      case 'src':
        this.#src.value = val;
        if (val) this.#activateDataMode();
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

    // WHY: Select IS the trigger button — set justify and tabindex on self
    if (!this.hasAttribute('justify')) this.setAttribute('justify', 'spread');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

    // Seed signals from attributes before stamping
    const optionsAttr = this.getAttribute('options');
    if (optionsAttr) this.#options.value = this.#parseOptions(optionsAttr);
    this.#src.value = this.getAttribute('src');
    this.#placeholder.value = this.getAttribute('placeholder') ?? '';

    // WHY: Detect data mode — stamp listbox when options/src is present or no listbox child exists
    const hasDataAttr = this.hasAttribute('options') || this.hasAttribute('src');
    const existingListbox = this.querySelector<HTMLElement & NListbox>(':scope > n-listbox[popover]');

    if (hasDataAttr && !existingListbox) {
      this.#stampListbox();
    }

    // WHY: Stamp label + caret chrome if no authored slot content exists.
    // Authors can provide custom trigger content via [slot] attributes
    // (e.g., icon-only triggers, custom label + icon combos).
    const existingChrome = this.querySelector(':scope > [slot]:not(n-listbox)');
    if (!existingChrome) {
      this.#stampChrome();
    } else {
      this.#labelEl = this.querySelector(':scope > [slot="label"]') as HTMLElement;
    }

    this.#listbox = this.querySelector<HTMLElement & NListbox>(':scope > n-listbox[popover]');

    // WHY: popover="manual" prevents native light-dismiss from conflicting with Dismissable trait
    this.#listbox?.setAttribute('popover', 'manual');

    // Wire anchor positioning — the select itself IS the anchor
    if (this.#listbox) {
      this.#popover.wirePopover(this, this.#listbox);

      // WHY: Prevent pointerdown inside the popover listbox from bubbling to
      // n-select's PressController. Without this, PressController calls
      // setPointerCapture on n-select, stealing pointerup/click from n-option
      // so the option's click handler never fires native:select.
      this.#listbox.addEventListener('pointerdown', this.#onListboxPointerDown);
    }

    // ARIA on self
    this.setAttribute('aria-haspopup', 'listbox');
    if (this.#listbox) {
      if (!this.#listbox.id) this.#listbox.id = uid('lb');
      this.setAttribute('aria-controls', this.#listbox.id);
    }

    // PressController on self for click/keyboard activation
    this.#press = new PressController(this, {
      disabled: () => this.disabled,
    });

    // ── Data-mode effects ──
    if (hasDataAttr) {
      this.#dataModeActive = true;
      this.addEffect(() => {
        const opts = this.#options.value;
        this.#renderOptions(opts);
      });

      this.addEffect(() => {
        const url = this.#src.value;
        if (url) this.#fetchOptions(url);
      });

      // Effect: placeholder → label text when no value selected
      this.addEffect(() => {
        const placeholder = this.#placeholder.value;
        const label = this.#controller.label.value;
        if (this.#labelEl && !label) {
          this.#labelEl.textContent = placeholder || '\u00A0';
        }
      });
    }

    // Seed value and child-dependent effects
    this.deferChildren(() => {
      const initialValue = this.getAttribute('value');
      if (initialValue) {
        const opt = this.#listbox?.querySelector(`n-option[value="${CSS.escape(initialValue)}"]`);
        const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? initialValue;
        this.#controller.value.value = initialValue;
        this.#controller.label.value = label;
        this.#initialValue = initialValue;
        this.#initialLabel = label;
      }

      // Effect: label → trigger text
      this.addEffect(() => {
        const label = this.#controller.label.value;
        if (this.#labelEl) {
          this.#labelEl.textContent = label || this.#placeholder.value || '\u00A0';
        }
      });

      // Effect: sync selected state on options
      this.addEffect(() => {
        const val = this.#controller.value.value;
        const options = this.#listbox?.querySelectorAll<HTMLElement>('n-option') ?? [];
        for (const opt of options) {
          const isSelected = opt.getAttribute('value') === val;
          opt.setAttribute('aria-selected', String(isSelected));
        }
      });
    });

    // Effect: disabled → aria-disabled + attribute
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));
    this.addEffect(() => {
      const val = this.#disabled.value;
      if (val && this.#controller.open.peek()) this.#controller.hide();
    });

    // Validity: required constraint
    this.#required.value = this.hasAttribute('required');
    this.addEffect(() => {
      const val = this.#controller.value.value;
      if (this.#required.value && (val === null || val === '')) {
        this.#internals.setValidity({ valueMissing: true }, 'Please select an option.', this);
      } else {
        this.#internals.setValidity({});
      }
    });

    // Effect: open → popover + aria-expanded on self
    this.addEffect(() => {
      const open = this.#controller.open.value;
      this.#popover.syncPopover(open);
      this.setAttribute('aria-expanded', String(open));
    });

    // Effect: value → form value + attribute reflection
    this.addEffect(() => {
      const val = this.#controller.value.value;
      this.#internals.setFormValue(val ?? '');
      if (val != null) this.setAttribute('value', val);
      else this.removeAttribute('value');
    });

    // Event: press → toggle (PressController fires native:press on click/Enter/Space)
    this.addEventListener('native:press', this.#onPress);

    // WHY: Stop child native:change events (from n-listbox) from leaking out
    this.addEventListener('native:change', this.#onChildChange);

    // Event: option selected → commit
    this.addEventListener('native:select', this.#onOptionSelect);

    // Event: dismiss → close
    this.addEventListener('native:dismiss', this.#onDismiss);

    // Keyboard: ArrowDown/Up opens and navigates
    this.addEventListener('keydown', this.#onKeydown);
  }

  // ── Event handlers ──

  #onListboxPointerDown = (e: Event): void => {
    e.stopPropagation();
  };

  #onPress = (): void => {
    if (this.#disabled.value) return;
    this.#controller.toggle();
  };

  #onChildChange = (e: Event): void => {
    if (e.target !== this) e.stopImmediatePropagation();
  };

  #onOptionSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { value: string; label: string };
    const previousValue = this.#controller.value.peek();
    this.#controller.select(detail.value, detail.label);
    this.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      composed: true,
      detail: { value: detail.value, label: detail.label, previousValue },
    }));
  };

  #onDismiss = (): void => {
    this.#controller.hide();
  };

  #onKeydown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;
    const listbox = this.#listbox;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        const ctrl = listbox?.controller;
        if (!this.#controller.open.value) {
          this.#controller.show();
        }
        if (ctrl) {
          const items = listbox?.querySelectorAll<HTMLElement>(':scope n-option:not([disabled])');
          const count = items?.length ?? 0;
          ctrl.moveActive(e.key === 'ArrowDown' ? 1 : -1, count);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (this.#controller.open.value) {
          const activeOpt = listbox?.getActiveOption();
          if (activeOpt) {
            activeOpt.click();
          }
        } else {
          this.#controller.toggle();
        }
        break;
      }
      case 'Escape':
        if (this.#controller.open.value) {
          e.preventDefault();
          this.#controller.hide();
        }
        break;
      case 'Home': {
        e.preventDefault();
        const ctrl = listbox?.controller;
        if (ctrl) ctrl.activeIndex.value = 0;
        break;
      }
      case 'End': {
        e.preventDefault();
        const ctrl = listbox?.controller;
        if (ctrl) {
          const items = listbox?.querySelectorAll<HTMLElement>(':scope n-option:not([disabled])');
          ctrl.activeIndex.value = Math.max(0, (items?.length ?? 1) - 1);
        }
        break;
      }
    }
  };

  teardown(): void {
    this.removeEventListener('native:press', this.#onPress);
    this.removeEventListener('keydown', this.#onKeydown);
    this.removeEventListener('native:change', this.#onChildChange);
    this.removeEventListener('native:select', this.#onOptionSelect);
    this.removeEventListener('native:dismiss', this.#onDismiss);
    this.#listbox?.removeEventListener('pointerdown', this.#onListboxPointerDown);
    this.#fetchController?.abort();
    this.#fetchController = null;
    this.#listbox = null;
    this.#labelEl = null;
    this.#press?.destroy();
    this.#popover?.destroy();
    super.teardown();
  }

  // ── Form callbacks ──

  override onFormReset(): void {
    if (this.#initialValue !== null) {
      this.#controller.select(this.#initialValue, this.#initialLabel);
    } else {
      this.#controller.reset();
    }
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
