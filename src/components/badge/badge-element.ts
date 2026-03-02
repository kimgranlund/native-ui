import { NativeElement } from '../../core/native-element.ts';

/**
 * Badge label for counts or status indicators with optional max truncation.
 * @attr {number} max - When set, truncates numeric content to "max+" if exceeded
 */
export class NBadge extends NativeElement {
  static observedAttributes = ['max'];

  #internals: ElementInternals;
  #originalContent = '';

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'status';
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'max' && this.isConnected) this.#applyMax();
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    this.#originalContent = this.textContent?.trim() ?? '';
    this.#applyMax();
  }

  // ── Max truncation ──

  #applyMax(): void {
    const maxAttr = this.getAttribute('max');
    if (!maxAttr) return;
    const max = parseInt(maxAttr, 10);
    if (isNaN(max)) return;

    const num = parseInt(this.#originalContent, 10);
    if (isNaN(num)) return;

    if (num > max) {
      this.textContent = `${max}+`;
    } else {
      this.textContent = this.#originalContent;
    }
  }
}
