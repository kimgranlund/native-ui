import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { ListNavigateController } from '../../traits/list-navigate-controller.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Radio group managing mutual exclusion and keyboard navigation across radio children.
 * @attr {string} value - Currently selected radio value
 * @attr {boolean} disabled - Disables all radios in the group
 * @attr {string} name - Form field name
 * @attr {boolean} required - Marks as required for form validation
 * @attr {string} orientation - Layout direction: "vertical" | "horizontal"
 * @fires native:change - Fired when selection changes with `{ value, label }` detail
 */
export class NRadioGroup extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'disabled', 'name', 'required', 'orientation'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #required = signal(false);
  #initialValue: string | null = null;
  #nav!: ListNavigateController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'radiogroup';
  }

  get value(): string | null {
    return this.#nav?.listValue.value ?? null;
  }

  set value(val: string | null) {
    if (this.#nav) this.#nav.listValue.value = val;
    if (val !== null) {
      this.setAttribute('value', val);
    } else {
      this.removeAttribute('value');
    }
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get required(): boolean {
    return this.#required.value;
  }

  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        if (this.#nav) this.#nav.listValue.value = val;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'required':
        this.#required.value = val !== null;
        break;
      case 'orientation':
        if (this.#nav) this.#nav.rovingFocus.orientation = (val as 'vertical' | 'horizontal') ?? 'vertical';
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#initialValue = this.getAttribute('value');
    // WHY: Sync signal from initial attribute (attributeChangedCallback fires before setup)
    this.#required.value = this.hasAttribute('required');

    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope n-radio:not([disabled])',
      ariaAttr: 'aria-checked',
      orientation: 'vertical',
      onChildSelect: (detail) => {
        this.#nav.listValue.value = detail.value;
        this.setAttribute('value', detail.value);

        this.dispatchEvent(new CustomEvent('native:change', {
          bubbles: true,
          composed: true,
          detail,
        }));
      },
      addEffect: (fn) => this.addEffect(fn),
      deferChildren: (fn) => this.deferChildren(fn),
    });

    // WHY: attributeChangedCallback fires before setup(), so sync initial value
    const initialValue = this.getAttribute('value');
    if (initialValue !== null) this.#nav.listValue.value = initialValue;

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    // WHY: Cascade disabled to child n-radio elements so they become inert
    this.addEffect(() => {
      const disabled = this.#disabled.value;
      const radios = this.querySelectorAll<HTMLElement>('n-radio');
      for (const radio of radios) radio.toggleAttribute('disabled', disabled);
    });

    if (__DEV__) {
      this.deferChildren(() => {
        if (!this.querySelector('n-radio')) console.warn('[n-radio-group] No <n-radio> descendants found.');
      });
    }

    this.addEffect(() => {
      const required = this.#required.value;
      // WHY: setAttribute instead of internals.ariaRequired — DOM attribute needed for CSS/AT
      if (required) this.setAttribute('aria-required', 'true');
      else this.removeAttribute('aria-required');
    });

    // WHY: Form value synced from selection
    this.addEffect(() => {
      const val = this.#nav.listValue.value;
      this.#internals.setFormValue(val);
    });

    // Constraint validation: report valueMissing when required and no selection
    this.addEffect(() => {
      const val = this.#nav.listValue.value;
      if (this.#required.value && (val === null || val === '')) {
        this.#internals.setValidity(
          { valueMissing: true },
          'Please select one of these options.',
          this,
        );
      } else {
        this.#internals.setValidity({});
      }
    });
  }

  teardown(): void {
    this.#nav?.destroy();
    super.teardown();
  }

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
  }

  override onFormReset(): void {
    if (this.#nav) this.#nav.listValue.value = this.#initialValue;
    if (this.#initialValue !== null) {
      this.setAttribute('value', this.#initialValue);
    } else {
      this.removeAttribute('value');
    }
  }

  override onFormStateRestore(state: string | FormData | null): void {
    if (typeof state === 'string' && state) {
      this.value = state;
    }
  }
}
