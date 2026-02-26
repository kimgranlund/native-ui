import { UIElement } from '../../core/ui-element.ts';

/** Breadcrumb navigation container with landmark role. */
export class UIBreadcrumb extends UIElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'navigation';
  }

  setup(): void {
    super.setup();
    this.#internals.ariaLabel = this.getAttribute('aria-label') ?? 'Breadcrumb';
  }
}
