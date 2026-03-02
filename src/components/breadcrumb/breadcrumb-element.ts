import { NativeElement } from '../../core/native-element.ts';

/** Breadcrumb navigation container with landmark role. */
export class NBreadcrumb extends NativeElement {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'navigation';
  }

  setup(): void {
    super.setup();
    const label = this.getAttribute('aria-label') ?? 'Breadcrumb';
    this.#internals.ariaLabel = label;
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', label);
  }
}
