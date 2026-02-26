import { UIElement } from '../../core/ui-element.ts';

/** Individual slide content within a slideshow. */
export class UISlide extends UIElement {
  setup(): void {
    super.setup();
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '-1');
    }
  }
}
