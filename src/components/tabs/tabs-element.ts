import { signal } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';
import { ListNavigateController } from '@nonoun/native-traits';
import type { NTab } from './tab-element.ts';
import type { NTabPanel } from './tab-panel-element.ts';

/**
 * Tab container managing tab selection, panel visibility, and a sliding indicator.
 * @attr {string} value - Currently selected tab value
 * @attr {boolean} disabled - Disables all tabs
 * @attr {string} orientation - Layout direction: "horizontal" | "vertical"
 * @fires native:change - Fired when the active tab changes with `{ value, label }` detail
 */
export class NTabs extends NativeElement {
  static observedAttributes = ['value', 'disabled', 'orientation'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #nav!: ListNavigateController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'tablist';
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

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        if (this.#nav) this.#nav.listValue.value = val;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'orientation':
        if (this.#nav) this.#nav.rovingFocus.orientation = val === 'vertical' ? 'vertical' : 'horizontal';
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > n-tab:not([disabled])',
      orientation: 'horizontal',
      autoSync: true,
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

    // WHY: Default aria-label for tablist so AT announces role context
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Tabs');

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    // WHY: Cascade disabled to child n-tab elements so they become inert
    this.addEffect(() => {
      const disabled = this.#disabled.value;
      const tabs = this.querySelectorAll<HTMLElement>(':scope > n-tab');
      for (const tab of tabs) tab.toggleAttribute('disabled', disabled);
    });

    this.deferChildren(() => {
      if (__DEV__) {
        if (!this.querySelector(':scope > n-tab')) console.warn('[n-tabs] No <n-tab> children found. Tabs require at least one <n-tab>.');
      }

      this.#wireAria();

      this.addEffect(() => {
        const selected = this.#nav.listValue.value;
        const tabs = this.querySelectorAll<NTab & HTMLElement>(':scope > n-tab');
        const panels = this.querySelectorAll<NTabPanel & HTMLElement>(':scope > n-tab-panels > n-tab-panel');

        let selectedIndex = -1;
        let count = 0;

        for (const tab of tabs) {
          // WHY: Use getAttribute — child may not be upgraded yet in static HTML contexts
          if ((tab.getAttribute('value') ?? '') === selected) selectedIndex = count;
          count++;
        }

        for (const panel of panels) {
          const isActive = (panel.getAttribute('value') ?? '') === selected;
          panel.toggleAttribute('hidden', !isActive);
          panel.setAttribute('tabindex', isActive ? '0' : '-1');
        }

        // WHY: Position the sliding indicator via percentage calc
        this.#updateIndicator(selectedIndex, count);
      });
    });
  }

  teardown(): void {
    this.#nav?.destroy();
    super.teardown();
  }

  #wireAria(): void {
    const tabs = this.querySelectorAll<NTab & HTMLElement>(':scope > n-tab');
    const panels = this.querySelectorAll<NTabPanel & HTMLElement>(':scope > n-tab-panels > n-tab-panel');

    // WHY: Build a value→panel map for linking tabs to their panels
    const panelMap = new Map<string, HTMLElement>();
    for (const panel of panels) {
      if (!panel.id) panel.id = uid('tp');
      panelMap.set(panel.getAttribute('value') ?? '', panel);
    }

    for (const tab of tabs) {
      if (!tab.id) tab.id = uid('tab');
      const panel = panelMap.get(tab.getAttribute('value') ?? '');
      if (panel) {
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
      }
    }
  }

  #updateIndicator(selectedIndex: number, count: number): void {
    if (selectedIndex < 0) {
      this.#internals.states.delete('ready');
      return;
    }

    this.style.setProperty('--n-indicator-index', `${selectedIndex}`);
    this.style.setProperty('--n-tab-count', `${count}`);
    this.#internals.states.add('ready');
  }
}
