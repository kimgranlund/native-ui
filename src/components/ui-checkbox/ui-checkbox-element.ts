import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { PressController } from '../../traits/press-controller.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Checkbox toggle with tri-state support and form association.
 * @attr {boolean} checked - Whether the checkbox is checked
 * @attr {boolean} indeterminate - Whether the checkbox is in an indeterminate state
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {string} value - Form value when checked (defaults to "on")
 * @attr {boolean} required - Marks as required for form validation
 * @fires ui-change - Fired on toggle with `{ checked, value }` detail
 */
export class UICheckbox extends FormAssociable(UIElement) {
  static observedAttributes = ['checked', 'indeterminate', 'disabled', 'name', 'value', 'required'];

  #internals: ElementInternals;
  #checked: ReactiveProp<boolean>;
  #indeterminate: ReactiveProp<boolean>;
  #disabled: ReactiveProp<boolean>;
  #required = signal(false);
  #initialChecked = false;
  #press!: PressController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'checkbox';
    this.#checked = prop(this, 'checked', { type: 'boolean' });
    this.#indeterminate = prop(this, 'indeterminate', { type: 'boolean' });
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
  }

  get checked(): boolean { return this.#checked.value; }
  set checked(val: boolean) { this.#checked.set(val); }

  get indeterminate(): boolean { return this.#indeterminate.value; }
  set indeterminate(val: boolean) { this.#indeterminate.set(val); }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  get name(): string { return this.getAttribute('name') ?? ''; }
  set name(val: string) { this.setAttribute('name', val); }

  get value(): string { return this.getAttribute('value') ?? 'on'; }
  set value(val: string) { this.setAttribute('value', val); }

  get required(): boolean { return this.#required.value; }
  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (syncProp({ checked: this.#checked, indeterminate: this.#indeterminate, disabled: this.#disabled }, name, val)) {
      super.attributeChangedCallback?.(name, old, val);
      return;
    }
    if (name === 'required') this.#required.value = val !== null;
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#press = new PressController(this, {
      disabled: () => this.disabled,
    });
    this.#initialChecked = this.hasAttribute('checked');
    // WHY: Sync signal from initial attribute (attributeChangedCallback fires before setup)
    this.#required.value = this.hasAttribute('required');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals, { manageTabindex: true }));

    this.addEffect(() => {
      const checked = this.#checked.value;
      const indeterminate = this.#indeterminate.value;
      // WHY: setAttribute (not internals.ariaChecked) so CSS [aria-checked] selectors match
      const state = indeterminate ? 'mixed' : checked ? 'true' : 'false';
      this.setAttribute('aria-checked', state);
      this.#internals.setFormValue(checked ? this.value : null);
    });

    this.addEffect(() => {
      const required = this.#required.value;
      this.#internals.ariaRequired = required ? 'true' : null;
    });

    // Constraint validation: report valueMissing when required and unchecked
    this.addEffect(() => {
      if (this.#required.value && !this.#checked.value) {
        this.#internals.setValidity(
          { valueMissing: true },
          'Please check this box if you want to proceed.',
          this,
        );
      } else {
        this.#internals.setValidity({});
      }
    });

    this.addEventListener('ui-press', this.#onPress);
  }

  teardown(): void {
    this.removeEventListener('ui-press', this.#onPress);
    this.#press.destroy();
    super.teardown();
  }

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.signal.value = disabled;
  }

  override onFormReset(): void {
    this.#checked.set(this.#initialChecked);
    this.#indeterminate.set(false);
  }

  #onPress = (): void => {
    if (this.#disabled.value) return;

    // WHY: Indeterminate clears first, then next press toggles
    if (this.#indeterminate.value) {
      this.indeterminate = false;
      this.checked = true;
    } else {
      this.checked = !this.#checked.value;
    }

    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { checked: this.#checked.value, value: this.value },
    }));
  };
}
