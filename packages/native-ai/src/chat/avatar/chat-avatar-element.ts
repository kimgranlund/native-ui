import { NativeElement, signal } from '@nonoun/native-core';

/**
 * Chat avatar — renders an image, icon, or initials for a chat participant.
 *
 * Priority: `src` (image) → `icon` (phosphor icon) → `name` (initials) → default icon.
 *
 * @attr {string} src - Image URL
 * @attr {string} name - Display name (used for initials fallback)
 * @attr {string} icon - Phosphor icon name
 */
export class NChatAvatar extends NativeElement {
  static observedAttributes = ['src', 'name', 'icon'];

  #src = signal('');
  #name = signal('');
  #icon = signal('');

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'src': this.#src.value = val ?? ''; break;
      case 'name': this.#name.value = val ?? ''; break;
      case 'icon': this.#icon.value = val ?? ''; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEffect(() => {
      const src = this.#src.value;
      const icon = this.#icon.value;
      const name = this.#name.value;

      this.textContent = '';

      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = name || '';
        img.loading = 'lazy';
        img.draggable = false;
        this.appendChild(img);
        return;
      }

      if (icon) {
        const el = document.createElement('n-icon');
        el.setAttribute('name', icon);
        this.appendChild(el);
        return;
      }

      if (name) {
        const span = document.createElement('span');
        span.className = 'n-chat-avatar-initials';
        span.textContent = initials(name);
        span.setAttribute('aria-hidden', 'true');
        this.appendChild(span);
        return;
      }

      // Default: person icon
      const el = document.createElement('n-icon');
      el.setAttribute('name', 'user');
      this.appendChild(el);
    });
  }

  teardown(): void {
    this.textContent = '';
    super.teardown();
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
