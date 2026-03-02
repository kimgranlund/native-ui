import { NativeElement } from '../../core/native-element.ts';

/** Individual slide content within a slideshow. */
export class NSlide extends NativeElement {
  setup(): void {
    super.setup();
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '-1');
    }
  }
}
