import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { ListNavigateController } from '../../traits/list-navigate-controller.ts';
import { FormAssociable } from '../../core/form-associable.ts';
import type { UISegment } from './ui-segment-element.ts';

/**
 * Segmented control with a sliding indicator for single-value selection.
 * @attr {string} value - Currently selected segment value
 * @attr {boolean} disabled - Disables all segments
 * @attr {string} name - Form field name
 * @fires ui-change - Fired when selection changes with `{ value, label }` detail
 */
export class UISegmentedControl extends FormAssociable(UIElement) {
  static observedAttributes = ['value', 'disabled', 'name'];

  #internals: ElementInternals;
  #disabled = signal(false);
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

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        if (this.#nav) this.#nav.listValue.value = val;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#initialValue = this.getAttribute('value');

    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > ui-segment:not([disabled])',
      ariaAttr: 'aria-checked',
      orientation: 'horizontal',
      onChildSelect: (detail) => {
        this.#nav.listValue.value = detail.value;
        this.setAttribute('value', detail.value);

        this.dispatchEvent(new CustomEvent('ui-change', {
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

    this.addEffect(() => {
      const val = this.#nav.listValue.value;
      this.#internals.setFormValue(val);
    });

    this.deferChildren(() => {
      if (__DEV__) {
        if (!this.querySelector(':scope > ui-segment')) console.warn('[ui-segmented-control] No <ui-segment> children found. Add at least two segments.');
      }

      this.addEffect(() => {
        const selected = this.#nav.listValue.value;
        const segments = this.querySelectorAll<UISegment & HTMLElement>(':scope > ui-segment');

        let selectedIndex = -1;
        let count = 0;
        for (const seg of segments) {
          if (seg.value === selected) selectedIndex = count;
          count++;
        }

        // WHY: Position the floating indicator via percentage calc
        this.#updateIndicator(selectedIndex, count);
      });
    });
  }

  teardown(): void {
    this.#nav.destroy();
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

  #updateIndicator(selectedIndex: number, count: number): void {
    if (selectedIndex < 0) {
      this.#internals.states.delete('ready');
      return;
    }

    this.style.setProperty('--_indicator-index', `${selectedIndex}`);
    this.style.setProperty('--_segment-count', `${count}`);
    this.#internals.states.add('ready');
  }
}
