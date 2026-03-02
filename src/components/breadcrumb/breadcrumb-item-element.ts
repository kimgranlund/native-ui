import { NativeElement } from '../../core/native-element.ts';

/**
 * Individual breadcrumb link item.
 * @attr {string} href - Navigation URL
 * @attr {boolean} current - Marks as the current page (disables navigation)
 */
export class NBreadcrumbItem extends NativeElement {
  static observedAttributes = ['href', 'current'];

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'link';
  }

  setup(): void {
    super.setup();
    this.#syncState();
    if (!this.hasAttribute('current') && !this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeyDown);
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (this.isConnected) this.#syncState();
    super.attributeChangedCallback(name, old, val);
  }

  #syncState(): void {
    if (this.hasAttribute('current')) {
      // WHY: setAttribute (not internals.ariaDisabled) so CSS [aria-disabled] selectors match
      this.setAttribute('aria-disabled', 'true');
      this.setAttribute('aria-current', 'page');
      this.removeAttribute('tabindex');
    } else {
      this.removeAttribute('aria-disabled');
      this.removeAttribute('aria-current');
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
    }
  }

  #onClick = (): void => {
    if (this.hasAttribute('current')) return;
    const href = this.getAttribute('href');
    if (href) window.location.href = href;
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#onClick();
    }
  };
}
