import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { RovingFocusController } from '../../traits/roving-focus-controller.ts';

/**
 * Tree view with roving focus and keyboard navigation across nested items.
 * @attr {boolean} disabled - Disables interaction
 */
export class UITree extends UIElement {
  static observedAttributes = ['disabled'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #roving!: RovingFocusController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'tree';
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'disabled') this.#disabled.value = val !== null;
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#roving = new RovingFocusController(this, {
      selector: ':scope ui-tree-item > [slot="label"]',
      orientation: 'vertical',
    });
    const label = this.getAttribute('aria-label') ?? 'Tree';
    this.#internals.ariaLabel = label;
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', label);
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
  }

  teardown(): void {
    this.#roving.destroy();
    super.teardown();
  }
}
