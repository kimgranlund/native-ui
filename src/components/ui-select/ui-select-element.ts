import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';
import { PopoverController } from '../../traits/popover-controller.ts';
import { parseDataOptions, fetchDataOptions } from '../../core/data-options.ts';
import type { BaseOption } from '../../core/data-options.ts';
import { SelectController } from './select-controller.ts';
import type { UIListbox } from '../ui-listbox/ui-listbox-element.ts';

export type SelectOption = BaseOption;

/**
 * Select dropdown coordinator wiring a trigger button to a popover listbox.
 * @attr {string} value - Currently selected value
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {string} options - JSON array of `{ value, label }` objects for data-driven mode
 * @attr {string} src - URL to fetch options from for data-driven mode
 * @attr {string} placeholder - Placeholder text when no value is selected
 * @fires ui-change - Fired when selection changes with `{ value, label }` detail
 */
export class UISelect extends FormAssociable(UIElement) {
  static observedAttributes = ['value', 'disabled', 'name', 'options', 'src', 'placeholder', 'required'];

  #internals: ElementInternals;
  #controller = new SelectController();
  #disabled = signal(false);
  #required = signal(false);
  #popover!: PopoverController;

  // ── Data-driven state ──
  #options = signal<SelectOption[]>([]);
  #src = signal<string | null>(null);
  #placeholder = signal<string>('');
  #dataMode = false;
  #fetchController: AbortController | null = null;
  #listbox: (HTMLElement & UIListbox) | null = null;
  #trigger: HTMLElement | null = null;

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
    // WHY: Find the label from the matching option
    const opt = this.querySelector(`ui-option[value="${CSS.escape(val)}"]`);
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

  // ── Required ──

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

  // ── Data-driven helpers ──

  #parseOptions(json: string): SelectOption[] {
    return parseDataOptions<SelectOption>(json, 'ui-select');
  }

  async #fetchOptions(url: string): Promise<void> {
    this.#fetchController = await fetchDataOptions<SelectOption>(
      url, this.#fetchController, this.#options, 'ui-select',
    );
  }

  // WHY: Stamps the trigger button + listbox shell that data-driven mode needs
  #stampDOM(): void {
    const button = document.createElement('ui-button');
    button.setAttribute('justify', 'spread');
    const labelSpan = document.createElement('span');
    labelSpan.setAttribute('slot', 'label');
    labelSpan.textContent = this.#placeholder.value || '\u00A0';
    button.appendChild(labelSpan);

    const icon = document.createElement('ui-icon');
    icon.setAttribute('name', 'caret-up-down');
    icon.setAttribute('slot', 'trailing');
    button.appendChild(icon);

    const listbox = document.createElement('ui-listbox');
    listbox.setAttribute('popover', 'manual');

    this.appendChild(button);
    this.appendChild(listbox);
  }

  #renderOptions(opts: SelectOption[]): void {
    const listbox = this.#listbox;
    if (!listbox) return;

    // WHY: Clear existing options but keep the listbox shell
    while (listbox.firstChild) listbox.removeChild(listbox.firstChild);

    for (const opt of opts) {
      const el = document.createElement('ui-option');
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

      // WHY: Synchronous DOM stamp so querySelector below finds trigger + listbox
      this.#stampDOM();
    }

    const trigger = this.querySelector<HTMLElement>(':scope > ui-button');
    this.#trigger = trigger;
    const listbox = this.querySelector<HTMLElement & UIListbox>(':scope > ui-listbox[popover]');
    this.#listbox = listbox;

    if (__DEV__ && !this.#dataMode) {
      if (!trigger) console.warn('[ui-select] Manual mode requires a <ui-button> child as the trigger. None found.');
      if (!listbox) console.warn('[ui-select] Manual mode requires a <ui-listbox popover> child. None found.');
    }

    // WHY: popover="manual" prevents native light-dismiss from conflicting with Dismissable trait
    listbox?.setAttribute('popover', 'manual');

    // Wire anchor positioning
    if (trigger && listbox) {
      this.#popover.wirePopover(trigger, listbox);
    }

    // ARIA
    trigger?.setAttribute('aria-haspopup', 'listbox');

    // Seed: read value attribute before effects (rule 5.9)
    this.deferChildren(() => {
      const initialValue = this.getAttribute('value');
      if (initialValue) {
        const opt = this.querySelector(`ui-option[value="${CSS.escape(initialValue)}"]`);
        const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? initialValue;
        this.#controller.value.value = initialValue;
        this.#controller.label.value = label;
      }

      // Effect: label → trigger text (show placeholder in data mode when empty)
      this.addEffect(() => {
        const label = this.#controller.label.value;
        const labelEl = trigger?.querySelector('[slot="label"]');
        if (labelEl) {
          labelEl.textContent = label || (this.#dataMode ? this.#placeholder.value || '\u00A0' : labelEl.textContent ?? '');
        }
      });

      // Effect: sync selected state on options
      this.addEffect(() => {
        const val = this.#controller.value.value;
        const options = listbox?.querySelectorAll<HTMLElement>('ui-option') ?? [];
        for (const opt of options) {
          const isSelected = opt.getAttribute('value') === val;
          opt.setAttribute('aria-selected', String(isSelected));
        }
      });

      // ── Data-mode-only effects ──

      if (this.#dataMode) {
        // Effect: #options signal → re-render option list
        this.addEffect(() => {
          const opts = this.#options.value;
          this.#renderOptions(opts);
        });

        // Effect: #src signal → fetch remote options
        this.addEffect(() => {
          const url = this.#src.value;
          if (url) this.#fetchOptions(url);
        });

        // Effect: placeholder signal → trigger label when no value selected
        this.addEffect(() => {
          const placeholder = this.#placeholder.value;
          const label = this.#controller.label.value;
          const labelEl = trigger?.querySelector('[slot="label"]');
          if (labelEl && !label) {
            labelEl.textContent = placeholder || '\u00A0';
          }
        });
      }
    });

    // Effect: disabled → aria-disabled + attribute + cascade to trigger
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
    this.addEffect(() => {
      const val = this.#disabled.value;
      if (trigger) trigger.toggleAttribute('disabled', val);
      // WHY: Close popover when disabled to prevent stale open state
      if (val && this.#controller.open.value) this.#controller.hide();
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

    // Effect: open → popover + dismissable + aria-expanded
    this.addEffect(() => {
      const open = this.#controller.open.value;
      this.#popover.syncPopover(open);
      trigger?.setAttribute('aria-expanded', String(open));
    });

    // Effect: value → form value + attribute reflection
    this.addEffect(() => {
      const val = this.#controller.value.value;
      this.#internals.setFormValue(val ?? '');
      if (val != null) this.setAttribute('value', val);
      else this.removeAttribute('value');
    });

    // Event: trigger press → toggle
    trigger?.addEventListener('ui-press', this.#onTriggerPress);

    // WHY: Stop child ui-change events (from ui-listbox) from leaking out —
    // the select fires its own canonical ui-change on option selection.
    // stopImmediatePropagation prevents same-element listeners from seeing child events too.
    this.addEventListener('ui-change', this.#onChildChange);

    // Event: option selected → commit
    this.addEventListener('ui-select', this.#onOptionSelect);

    // Event: dismiss → close
    this.addEventListener('ui-dismiss', this.#onDismiss);

    // Keyboard on trigger: ArrowDown/Up opens and navigates
    trigger?.addEventListener('keydown', this.#onTriggerKeydown);
  }

  // ── Event handlers (arrow properties for stable references) ──

  #onTriggerPress = (): void => {
    if (this.#disabled.value) return;
    this.#controller.toggle();
  };

  #onChildChange = (e: Event): void => {
    if (e.target !== this) e.stopImmediatePropagation();
  };

  #onOptionSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { value: string; label: string };
    this.#controller.select(detail.value, detail.label);
    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail,
    }));
  };

  #onDismiss = (): void => {
    this.#controller.hide();
  };

  #onTriggerKeydown = (e: KeyboardEvent): void => {
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
          const items = listbox?.querySelectorAll<HTMLElement>(':scope > ui-option:not([disabled])');
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
          const items = listbox?.querySelectorAll<HTMLElement>(':scope > ui-option:not([disabled])');
          ctrl.activeIndex.value = Math.max(0, (items?.length ?? 1) - 1);
        }
        break;
      }
    }
  };

  teardown(): void {
    // WHY: Remove listeners from child elements to prevent stacking on re-setup
    this.#trigger?.removeEventListener('ui-press', this.#onTriggerPress);
    this.#trigger?.removeEventListener('keydown', this.#onTriggerKeydown);
    this.removeEventListener('ui-change', this.#onChildChange);
    this.removeEventListener('ui-select', this.#onOptionSelect);
    this.removeEventListener('ui-dismiss', this.#onDismiss);
    this.#trigger = null;
    this.#fetchController?.abort();
    this.#fetchController = null;
    this.#listbox = null;
    this.#popover.destroy();
    super.teardown();
  }

  // ── Form callbacks ──

  override onFormReset(): void {
    this.#controller.reset();
  }

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
  }
}
