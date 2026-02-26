import { UIElement } from '../../core/ui-element.ts';

/**
 * Avatar displaying an image, initials from a name, or a fallback placeholder.
 * @attr {string} src - Image URL to display
 * @attr {string} name - Full name used to generate initials when no image
 * @attr {string} alt - Accessible label for the avatar
 */
export class UIAvatar extends UIElement {
  static observedAttributes = ['src', 'name', 'alt'];

  #internals: ElementInternals;
  #img: HTMLImageElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'img';
  }

  // ── Attributes ──

  get src(): string { return this.getAttribute('src') ?? ''; }
  set src(val: string) { this.setAttribute('src', val); }

  get name(): string { return this.getAttribute('name') ?? ''; }
  set name(val: string) { this.setAttribute('name', val); }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (this.isConnected) this.#render();
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    this.#render();
  }

  teardown(): void {
    if (this.#img) {
      this.#img.removeEventListener('error', this.#onImgError);
      this.#img = null;
    }
    super.teardown();
  }

  // ── Render ──

  #render(): void {
    // Clear children
    this.textContent = '';
    this.#img = null;

    const src = this.getAttribute('src');
    const name = this.getAttribute('name');
    const alt = this.getAttribute('alt') ?? name ?? '';

    this.#internals.ariaLabel = alt;
    this.setAttribute('aria-label', alt);

    if (src) {
      this.#img = document.createElement('img');
      this.#img.src = src;
      this.#img.alt = alt;
      this.#img.addEventListener('error', this.#onImgError);
      this.appendChild(this.#img);
    } else if (name) {
      this.textContent = this.#getInitials(name);
    } else {
      // Fallback: generic user icon (rendered as text placeholder)
      this.textContent = '?';
    }
  }

  #getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  #onImgError = (): void => {
    // Image failed to load — fallback to initials
    if (this.#img) {
      this.#img.removeEventListener('error', this.#onImgError);
      this.#img.remove();
      this.#img = null;
    }
    const name = this.getAttribute('name');
    if (name) {
      this.textContent = this.#getInitials(name);
    } else {
      this.textContent = '?';
    }
  };
}
