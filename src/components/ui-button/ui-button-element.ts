import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { PressController } from '../../traits/press-controller.ts';
import { FormAssociable } from '../../core/form-associable.ts';

type ButtonType = 'button' | 'submit' | 'reset';

/**
 * Button component with press feedback and form association.
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} type - Form button type: "button" | "submit" | "reset"
 * @fires ui-press - Fired on activation (click, Enter, Space)
 */
export class UIButton extends FormAssociable(UIElement) {
  static observedAttributes = ['disabled', 'type'];

  #internals: ElementInternals;
  #disabled: ReactiveProp<boolean>;
  #type: ReactiveProp<string>;
  #press!: PressController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'button';
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
    this.#type = prop(this, 'type', { type: 'string', initial: 'button' });
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  get type(): ButtonType { return this.#type.value as ButtonType; }
  set type(val: ButtonType) { this.#type.set(val); }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    syncProp({ disabled: this.#disabled, type: this.#type }, name, val);
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#press = new PressController(this, {
      disabled: () => this.disabled,
    });
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals, { manageTabindex: true }));
    this.addEventListener('ui-press', this.#onPress);
  }

  teardown(): void {
    this.removeEventListener('ui-press', this.#onPress);
    this.#press.destroy();
    super.teardown();
  }

  #onPress = (): void => {
    if (this.#disabled.value) return;
    const form = this.#internals.form;
    if (!form) return;

    const t = this.#type.value;
    if (t === 'submit') {
      form.requestSubmit();
    } else if (t === 'reset') {
      form.reset();
    }
  };

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.signal.value = disabled;
  }

  override onFormReset(): void {
    this.#disabled.signal.value = this.hasAttribute('disabled');
  }
}
