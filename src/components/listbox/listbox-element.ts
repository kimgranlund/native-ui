import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { uid } from '../../core/uid.ts';
import { ListNavigateController } from '../../traits/list-navigate-controller.ts';
import { DataListController } from '../../core/data-list.ts';
import type { DataItem } from '../../core/data-list.ts';
import type { NOption } from './option-element.ts';

/**
 * Listbox component with single or multiple selection and keyboard navigation.
 * @attr {boolean} disabled - Disables interaction
 * @attr {boolean} multiple - Enables multi-select mode
 * @attr {boolean} virtual-focus - Uses active attribute instead of roving tabindex (for combobox)
 * @fires native:change - Fired when selection changes with `{ value, label }` detail
 */
export class NListbox extends NativeElement {
  static observedAttributes = ['disabled', 'multiple', 'virtual-focus'];

  #internals: ElementInternals;
  #disabled: ReactiveProp<boolean>;
  #multiple = signal(false);
  #controller = new DataListController<DataItem>();
  #nav!: ListNavigateController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'listbox';
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
  }

  // ── Virtual Focus ──
  // WHY: When used inside a combobox, real focus stays in the input.
  // The listbox uses [active] attribute styling instead of roving tabindex.

  get virtualFocus(): boolean {
    return this.hasAttribute('virtual-focus');
  }

  set virtualFocus(val: boolean) {
    this.toggleAttribute('virtual-focus', val);
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  get multiple(): boolean {
    return this.#multiple.value;
  }

  set multiple(val: boolean) {
    this.#multiple.value = val;
    this.#controller.multiple = val;
    this.toggleAttribute('multiple', val);
  }

  get value(): string | null {
    return this.#controller.value.value;
  }

  get controller(): DataListController<DataItem> {
    return this.#controller;
  }

  get listValue() {
    return this.#nav.listValue;
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (syncProp({ disabled: this.#disabled }, name, val)) {
      super.attributeChangedCallback?.(name, old, val);
      return;
    }
    switch (name) {
      case 'multiple':
        this.#multiple.value = val !== null;
        this.#controller.multiple = val !== null;
        break;
      case 'virtual-focus':
        if (this.#nav) this.#nav.rovingFocus.disabled = val !== null;
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope n-option:not([disabled])',
      autoSync: false,
      orientation: 'vertical',
      disabled: this.virtualFocus,
      onChildSelect: (detail) => {
        if (this.#multiple.value) {
          this.#controller.toggle(detail.value);
        } else {
          this.#controller.select(detail.value);
        }

        this.dispatchEvent(new CustomEvent('native:change', {
          bubbles: true,
          composed: true,
          cancelable: true,
          detail,
        }));
      },
      addEffect: (fn) => this.addEffect(fn),
      deferChildren: (fn) => this.deferChildren(fn),
    });

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals));

    this.deferChildren(() => {
      this.addEffect(() => {
        const selected = this.#controller.value.value;
        const selectedSet = this.#controller.selected.value;
        const isMultiple = this.#multiple.value;
        const options = this.querySelectorAll<NOption & HTMLElement>(':scope n-option');

        for (const opt of options) {
          const optVal = opt.getAttribute('value') ?? '';
          const isSelected = isMultiple
            ? selectedSet.has(optVal)
            : optVal === selected;
          // WHY: setAttribute (not toggleAttribute) — ARIA selected must be a string 'true'/'false'
          opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        }
      });

      this.addEffect(() => {
        const idx = this.#controller.activeIndex.value;
        const options = this.querySelectorAll<HTMLElement>(':scope n-option:not([disabled])');

        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const isActive = i === idx;
          opt.toggleAttribute('active', isActive);
          // WHY: Ensure each option has an id for aria-activedescendant
          if (isActive) {
            if (!opt.id) opt.id = uid('opt');
            this.setAttribute('aria-activedescendant', opt.id);
          }
        }
        if (idx < 0 || idx >= options.length) {
          this.removeAttribute('aria-activedescendant');
        }
      });
    });
  }

  teardown(): void {
    this.#nav.destroy();
    super.teardown();
  }

  getActiveOption(): HTMLElement | null {
    const idx = this.#controller.activeIndex.value;
    const options = this.querySelectorAll<HTMLElement>(':scope n-option:not([disabled])');
    return options[idx] ?? null;
  }
}
