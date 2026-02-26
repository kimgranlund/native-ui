import { UIElement } from '../../core/ui-element.ts';

/**
 * Card surface container with optional click-to-navigate behavior.
 * @attr {boolean} interactive - Makes the card focusable and clickable
 * @attr {string} href - Navigation URL when interactive
 */
export class UICard extends UIElement {
  static observedAttributes = ['interactive', 'href'];

  setup(): void {
    super.setup();

    if (this.hasAttribute('interactive')) {
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKeyDown);
    }
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeyDown);
    super.teardown();
  }

  #onClick = (): void => {
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
