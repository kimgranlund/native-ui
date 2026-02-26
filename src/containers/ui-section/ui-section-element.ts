import { UIElement } from '../../core/ui-element.ts';

/**
 * Semantic section with heading and optional collapse behavior.
 * @attr {boolean} collapsible - Enables heading click to toggle collapse
 * @attr {boolean} collapsed - Whether the section body is hidden
 * @attr {boolean} divider - Shows a bottom border divider
 */
export class UISection extends UIElement {
  static observedAttributes = ['collapsible', 'collapsed', 'divider'];

  setup(): void {
    super.setup();

    if (this.hasAttribute('collapsible')) {
      const heading = this.querySelector('[slot="heading"]') as HTMLElement | null;
      if (heading) {
        heading.addEventListener('click', this.#onHeadingClick);
      }
    }
  }

  teardown(): void {
    const heading = this.querySelector('[slot="heading"]') as HTMLElement | null;
    if (heading) {
      heading.removeEventListener('click', this.#onHeadingClick);
    }
    super.teardown();
  }

  #onHeadingClick = (): void => {
    if (!this.hasAttribute('collapsible')) return;
    this.toggleAttribute('collapsed');
  };
}
