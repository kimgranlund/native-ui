import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { uid } from '../../core/uid.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';
import { PopoverController } from '../../traits/popover/popover-controller.ts';
import { parseDataOptions, fetchDataOptions } from '../../core/data-options.ts';
import type { BaseOption } from '../../core/data-options.ts';
import { SelectController } from './controller/select-controller.ts';
import type { NListbox } from '../listbox/listbox-element.ts';

export type SelectOption = BaseOption;

/**
 * Select dropdown coordinator wiring a trigger button to a popover listbox.
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

  // ── Data-driven state ──
  #options = signal<SelectOption[]>([]);
  #src = signal<string | null>(null);
  #placeholder = signal<string>('');
  #dataMode = false;
  #fetchController: AbortController | null = null;
  #listbox: (HTMLElement & NListbox) | null = null;
  #trigger: HTMLElement | null = null;
  #initialValue: string | null = null;
  #initialLabel = '';

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
    const opt = this.querySelector(`n-option[value="${CSS.escape(val)}"]`);
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
    // WHY: If data mode wasn't active at setup() time, activate it now.
    // This enables setting options via JS property on a manually-authored element.
    if (!this.#dataMode && this.isConnected) this.#activateDataMode();
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

  #activateDataMode(): void {
    if (this.#dataMode) return;
    this.#dataMode = true;
    this.#stampDOM();
    this.#listbox = this.querySelector<HTMLElement & NListbox>(':scope > n-listbox[popover]');
    this.#trigger = this.querySelector<HTMLElement>(':scope > n-button');

    if (this.#trigger && this.#listbox) {
      this.#popover.wirePopover(this.#trigger, this.#listbox);
      this.#trigger.setAttribute('aria-haspopup', 'listbox');
      if (!this.#listbox.id) this.#listbox.id = uid('lb');
      this.#trigger.setAttribute('aria-controls', this.#listbox.id);
      this.#trigger.addEventListener('native:press', this.#onTriggerPress);
      this.#trigger.addEventListener('keydown', this.#onTriggerKeydown);
    }

    this.addEffect(() => {
      const opts = this.#options.value;
      this.#renderOptions(opts);
    });
  }

  #parseOptions(json: string): SelectOption[] {
    return parseDataOptions<SelectOption>(json, 'n-select');
  }

  async #fetchOptions(url: string): Promise<void> {
    this.#fetchController = await fetchDataOptions<SelectOption>(
      url, this.#fetchController, this.#options, 'n-select',
    );
  }

  // WHY: Stamps the trigger button + listbox shell that data-driven mode needs
  #stampDOM(): void {
    const button = document.createElement('n-button');
    button.setAttribute('justify', 'spread');
    const labelSpan = document.createElement('span');
    labelSpan.setAttribute('slot', 'label');
    labelSpan.textContent = this.#placeholder.value || '\u00A0';
    button.appendChild(labelSpan);

    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'caret-up-down');
    icon.setAttribute('slot', 'trailing');
    button.appendChild(icon);

    const listbox = document.createElement('n-listbox');
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
          const opt = this.querySelector(`n-option[value="${CSS.escape(val)}"]`);
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

    // WHY: Detect data-driven mode — if options or src is present, stamp our own children.
    // Also activate when there are zero children (zero-config: bare <n-select></n-select> must render).
    this.#dataMode = this.hasAttribute('options') || this.hasAttribute('src') || this.children.length === 0;

    if (this.#dataMode) {
      // Seed signals from attributes before stamping
      const optionsAttr = this.getAttribute('options');
      if (optionsAttr) this.#options.value = this.#parseOptions(optionsAttr);
      this.#src.value = this.getAttribute('src');
      this.#placeholder.value = this.getAttribute('placeholder') ?? '';

      // WHY: Synchronous DOM stamp so querySelector below finds trigger + listbox
      this.#stampDOM();
    }

    const trigger = this.querySelector<HTMLElement>(':scope > n-button');
    this.#trigger = trigger;
    const listbox = this.querySelector<HTMLElement & NListbox>(':scope > n-listbox[popover]');
    this.#listbox = listbox;

    if (__DEV__ && !this.#dataMode) {
      if (!trigger) console.warn('[n-select] Manual mode requires a <n-button> child as the trigger. None found.');
      if (!listbox) console.warn('[n-select] Manual mode requires a <n-listbox popover> child. None found.');
    }

    // WHY: popover="manual" prevents native light-dismiss from conflicting with Dismissable trait
    listbox?.setAttribute('popover', 'manual');

    // Wire anchor positioning
    if (trigger && listbox) {
      this.#popover.wirePopover(trigger, listbox);
    }

    // ARIA
    trigger?.setAttribute('aria-haspopup', 'listbox');
    if (trigger && listbox) {
      if (!listbox.id) listbox.id = uid('lb');
      trigger.setAttribute('aria-controls', listbox.id);
    }

    // ── Data-mode-only effects (outside deferChildren — no child DOM dependency) ──
    // WHY: These effects only read signals and operate on references captured above (#listbox,
    // trigger). They must be registered outside deferChildren so they fire immediately when
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

      // Effect: placeholder signal → trigger label when no value selected
      // WHY: placeholder is only relevant in data-driven mode — in manual mode the trigger
      // button's own slotted content is the author's responsibility and is not driven by
      // the placeholder attribute. So this effect is intentionally data-mode-only.
      this.addEffect(() => {
        const placeholder = this.#placeholder.value;
        const label = this.#controller.label.value;
        const labelEl = trigger?.querySelector('[slot="label"]');
        if (labelEl && !label) {
          labelEl.textContent = placeholder || '\u00A0';
        }
      });
    }

    // Seed: read value attribute before effects (rule 5.9)
    this.deferChildren(() => {
      const initialValue = this.getAttribute('value');
      if (initialValue) {
        const opt = this.querySelector(`n-option[value="${CSS.escape(initialValue)}"]`);
        const label = opt?.getAttribute('label') ?? opt?.textContent?.trim() ?? initialValue;
        this.#controller.value.value = initialValue;
        this.#controller.label.value = label;
        this.#initialValue = initialValue;
        this.#initialLabel = label;
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
        const options = listbox?.querySelectorAll<HTMLElement>('n-option') ?? [];
        for (const opt of options) {
          const isSelected = opt.getAttribute('value') === val;
          opt.setAttribute('aria-selected', String(isSelected));
        }
      });
    });

    // Effect: disabled → aria-disabled + attribute + cascade to trigger
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
    this.addEffect(() => {
      const val = this.#disabled.value;
      if (trigger) trigger.toggleAttribute('disabled', val);
      // WHY: Close popover when disabled to prevent stale open state
      // WHY: peek() avoids tracking open signal — this effect should only re-run on disabled change
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
    trigger?.addEventListener('native:press', this.#onTriggerPress);

    // WHY: Stop child native:change events (from n-listbox) from leaking out —
    // the select fires its own canonical native:change on option selection.
    // stopImmediatePropagation prevents same-element listeners from seeing child events too.
    this.addEventListener('native:change', this.#onChildChange);

    // Event: option selected → commit
    this.addEventListener('native:select', this.#onOptionSelect);

    // Event: dismiss → close
    this.addEventListener('native:dismiss', this.#onDismiss);

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
          // WHY: Descendant selector (not >) so options inside n-option-group are included
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
    // WHY: Remove listeners from child elements to prevent stacking on re-setup
    this.#trigger?.removeEventListener('native:press', this.#onTriggerPress);
    this.#trigger?.removeEventListener('keydown', this.#onTriggerKeydown);
    this.removeEventListener('native:change', this.#onChildChange);
    this.removeEventListener('native:select', this.#onOptionSelect);
    this.removeEventListener('native:dismiss', this.#onDismiss);
    this.#trigger = null;
    this.#fetchController?.abort();
    this.#fetchController = null;
    this.#listbox = null;
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
