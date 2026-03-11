import { signal } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';
import { ListNavigateController } from '@nonoun/native-traits';
import { FormAssociable } from '@nonoun/native-core';
import type { NSegment } from './segment-element.ts';

/**
 * Segmented control with a sliding indicator for single-value selection.
 * @attr {string} value - Currently selected segment value
 * @attr {boolean} disabled - Disables all segments
 * @attr {string} name - Form field name
 * @fires native:change - Fired when selection changes with `{ value, label }` detail
 */
export class NSegmentedControl extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'disabled', 'name', 'required'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #required = signal(false);
  #initialValue: string | null = null;
  #nav!: ListNavigateController;
  #indicator: HTMLDivElement | null = null;

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

  // ── Required ──

  get required(): boolean { return this.#required.value; }
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
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#initialValue = this.getAttribute('value');

    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > n-segment:not([disabled])',
      ariaAttr: 'aria-checked',
      orientation: 'horizontal',
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

    // Validity: required constraint
    this.#required.value = this.hasAttribute('required');
    this.addEffect(() => {
      const val = this.#nav.listValue.value;
      if (this.#required.value && (val === null || val === '')) {
        this.#internals.setValidity({ valueMissing: true }, 'Please select one of these options.', this);
      } else {
        this.#internals.setValidity({});
      }
    });

    this.addEffect(() => {
      const val = this.#nav.listValue.value;
      this.#internals.setFormValue(val);
    });

    this.deferChildren(() => {
      if (__DEV__) {
        if (!this.querySelector(':scope > n-segment')) console.warn('[n-segmented-control] No <n-segment> children found. Add at least two segments.');
      }

      this.addEffect(() => {
        const selected = this.#nav.listValue.value;
        const segments = this.querySelectorAll<NSegment & HTMLElement>(':scope > n-segment');

        let selectedIndex = -1;
        let count = 0;
        for (const seg of segments) {
          if ((seg.getAttribute('value') ?? '') === selected) selectedIndex = count;
          count++;
        }

        // WHY: Position the floating indicator via percentage calc
        this.#updateIndicator(selectedIndex, count);
      });
    });
  }

  teardown(): void {
    this.#indicator?.remove();
    this.#indicator = null;
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

  #updateIndicator(selectedIndex: number, count: number): void {
    if (selectedIndex < 0) {
      this.#internals.states.delete('ready');
      return;
    }

    // WHY: Lazy-create a real DOM element instead of ::before — CSS transitions
    // on transform work reliably without @property registration, which can fail
    // in dynamic CSS injection contexts (Vite HMR, bundler <style> elements).
    let el = this.#indicator;
    if (!el) {
      el = document.createElement('div');
      el.className = 'n-segmented-indicator';
      this.prepend(el);
      this.#indicator = el;
    }

    // WHY: --n-segment-count stays on the host for CSS width calc.
    // transform is set directly on the indicator — translateX(N * 100%)
    // moves by N indicator-widths. GPU-accelerated, no @property needed.
    this.style.setProperty('--n-segment-count', `${count}`);
    el.style.setProperty('transform', `translateX(${selectedIndex * 100}%)`);
    this.#internals.states.add('ready');
  }
}
