import { NativeElement, createDisabledEffect, prop, syncProp, ListNavigateController } from '@nonoun/native-ui';
import type { ReactiveProp } from '@nonoun/native-ui';

/**
 * Sidebar navigation with roving focus and selection indicator.
 * @attr {string} value - Currently selected nav item value
 * @attr {boolean} disabled - Disables all nav items
 * @fires native:change - Fired when selection changes with `{ value, label }` detail
 */
export class NSidebarNav extends NativeElement {
  static observedAttributes = ['value', 'disabled'];

  #internals: ElementInternals;
  #disabled: ReactiveProp<boolean>;
  #nav!: ListNavigateController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'navigation';
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
  }

  get value(): string | null { return this.#nav?.listValue.value ?? null; }

  set value(val: string | null) {
    if (this.#nav) this.#nav.listValue.value = val;
    if (val !== null) {
      this.setAttribute('value', val);
    } else {
      this.removeAttribute('value');
    }
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (syncProp({ disabled: this.#disabled }, name, val)) {
      super.attributeChangedCallback?.(name, old, val);
      return;
    }
    if (name === 'value') {
      if (this.#nav) this.#nav.listValue.value = val;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope n-sidebar-nav-item:not([disabled])',
      orientation: 'vertical',
      ariaAttr: 'aria-current',
      onChildSelect: (detail) => {
        this.#nav.listValue.value = detail.value;
        this.setAttribute('value', detail.value);

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

    // WHY: Seed the controller's value from the attribute — attributeChangedCallback
    // fires before setup() creates #nav, so pre-connection setAttribute is lost.
    const initial = this.getAttribute('value');
    if (initial !== null) this.#nav.listValue.value = initial;

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals));

    if (__DEV__) {
      this.deferChildren(() => {
        if (!this.querySelector('n-sidebar-nav-item')) console.warn('[n-sidebar-nav] No <n-sidebar-nav-item> descendants found.');
      });
    }
  }

  teardown(): void {
    this.#nav.destroy();
    super.teardown();
  }
}
