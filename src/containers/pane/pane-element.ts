import { NativeElement } from '../../core/native-element.ts';
import { signal } from '../../reactivity/signal.ts';

/**
 * Closeable, minimizable pane with optional auto-stamped header.
 *
 * If `label` is set and no `<n-header>` child exists, stamps a compact header
 * with label text, optional icon, and close/minimize buttons.
 *
 * @attr {string} label - Header label text
 * @attr {string} icon - Phosphor icon name for header
 * @attr {boolean} closeable - Shows close button
 * @attr {boolean} minimizable - Shows minimize/restore button
 * @attr {boolean} minimized - Collapsed to header-only
 * @attr {number} min-size - Minimum size in px (width or height depending on group orientation)
 * @attr {number} max-size - Maximum size in px
 */
export class NPane extends NativeElement {
  static observedAttributes = ['label', 'icon', 'closeable', 'minimizable', 'minimized', 'min-size', 'max-size'];

  #minimized = signal(false);
  #stampedHeader: HTMLElement | null = null;
  #labelEl: HTMLElement | null = null;
  #iconEl: HTMLElement | null = null;
  #minimizeBtn: HTMLElement | null = null;
  #closeBtn: HTMLElement | null = null;

  get minimized(): boolean { return this.#minimized.value; }
  set minimized(val: boolean) {
    if (val) {
      this.setAttribute('minimized', '');
    } else {
      this.removeAttribute('minimized');
    }
  }

  get minSize(): number {
    const v = this.getAttribute('min-size');
    return v ? Number(v) : 0;
  }

  get maxSize(): number {
    const v = this.getAttribute('max-size');
    return v ? Number(v) : Infinity;
  }

  setup(): void {
    super.setup();
    this.#stampHeader();
    this.#syncMinimized();
  }

  teardown(): void {
    if (this.#stampedHeader) {
      this.#stampedHeader.remove();
      this.#stampedHeader = null;
      this.#labelEl = null;
      this.#iconEl = null;
      this.#minimizeBtn = null;
      this.#closeBtn = null;
    }
    super.teardown();
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    switch (name) {
      case 'label':
        if (this.#labelEl) this.#labelEl.textContent = val ?? '';
        else if (val && !this.#stampedHeader) this.#stampHeader();
        break;
      case 'icon':
        this.#syncIcon(val);
        break;
      case 'closeable':
        this.#syncCloseButton(val !== null);
        break;
      case 'minimizable':
        this.#syncMinimizeButton(val !== null);
        break;
      case 'minimized':
        this.#syncMinimized();
        break;
    }
  }

  /** Close the pane. Dispatches cancelable `native:pane-close`. */
  close(): void {
    const event = new CustomEvent('native:pane-close', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { pane: this },
    });
    if (this.dispatchEvent(event)) {
      this.hidden = true;
    }
  }

  /** Minimize the pane to header-only. */
  minimize(): void {
    this.#minimized.value = true;
    this.setAttribute('minimized', '');
    this.dispatchEvent(new CustomEvent('native:pane-minimize', {
      bubbles: true,
      composed: true,
      detail: { pane: this },
    }));
  }

  /** Restore from minimized state. */
  restore(): void {
    this.#minimized.value = false;
    this.removeAttribute('minimized');
    this.dispatchEvent(new CustomEvent('native:pane-restore', {
      bubbles: true,
      composed: true,
      detail: { pane: this },
    }));
  }

  #syncMinimized(): void {
    this.#minimized.value = this.hasAttribute('minimized');
    if (this.#minimizeBtn) {
      const icon = this.#minimizeBtn.querySelector('n-icon');
      if (icon) icon.setAttribute('name', this.#minimized.value ? 'caret-up' : 'minus');
    }
  }

  #stampHeader(): void {
    // Don't stamp if user already provided a header
    if (this.querySelector(':scope > n-header')) return;
    // Don't stamp if no label
    const label = this.getAttribute('label');
    if (!label) return;

    const header = document.createElement('n-header');

    // Icon (optional)
    const icon = this.getAttribute('icon');
    if (icon) {
      const iconEl = document.createElement('n-icon');
      iconEl.setAttribute('name', icon);
      iconEl.setAttribute('inline', '');
      header.appendChild(iconEl);
      this.#iconEl = iconEl;
    }

    // Label
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    header.appendChild(labelEl);
    this.#labelEl = labelEl;

    // Trailing buttons container
    const aside = document.createElement('aside');

    // Minimize button
    if (this.hasAttribute('minimizable')) {
      this.#minimizeBtn = this.#createButton(
        this.#minimized.value ? 'caret-up' : 'minus',
        this.#onMinimize,
      );
      aside.appendChild(this.#minimizeBtn);
    }

    // Close button
    if (this.hasAttribute('closeable')) {
      this.#closeBtn = this.#createButton('x', this.#onClose);
      aside.appendChild(this.#closeBtn);
    }

    if (aside.childElementCount > 0) {
      header.appendChild(aside);
    }

    this.prepend(header);
    this.#stampedHeader = header;
  }

  #createButton(iconName: string, handler: () => void): HTMLElement {
    const btn = document.createElement('n-button');
    btn.setAttribute('variant', 'ghost');
    btn.setAttribute('size', 'xs');
    btn.setAttribute('inline', '');
    const icon = document.createElement('n-icon');
    icon.setAttribute('name', iconName);
    icon.setAttribute('inline', '');
    btn.appendChild(icon);
    btn.addEventListener('click', handler);
    return btn;
  }

  #syncIcon(val: string | null): void {
    if (!this.#stampedHeader) return;
    if (val && this.#iconEl) {
      this.#iconEl.setAttribute('name', val);
    } else if (val && !this.#iconEl) {
      const iconEl = document.createElement('n-icon');
      iconEl.setAttribute('name', val);
      iconEl.setAttribute('inline', '');
      this.#stampedHeader.prepend(iconEl);
      this.#iconEl = iconEl;
    } else if (!val && this.#iconEl) {
      this.#iconEl.remove();
      this.#iconEl = null;
    }
  }

  #syncCloseButton(show: boolean): void {
    if (!this.#stampedHeader) return;
    const aside = this.#stampedHeader.querySelector('aside') ?? this.#ensureAside();
    if (show && !this.#closeBtn) {
      this.#closeBtn = this.#createButton('x', this.#onClose);
      aside.appendChild(this.#closeBtn);
    } else if (!show && this.#closeBtn) {
      this.#closeBtn.remove();
      this.#closeBtn = null;
    }
  }

  #syncMinimizeButton(show: boolean): void {
    if (!this.#stampedHeader) return;
    const aside = this.#stampedHeader.querySelector('aside') ?? this.#ensureAside();
    if (show && !this.#minimizeBtn) {
      this.#minimizeBtn = this.#createButton(
        this.#minimized.value ? 'caret-up' : 'minus',
        this.#onMinimize,
      );
      // Insert before close button if it exists
      if (this.#closeBtn) {
        aside.insertBefore(this.#minimizeBtn, this.#closeBtn);
      } else {
        aside.appendChild(this.#minimizeBtn);
      }
    } else if (!show && this.#minimizeBtn) {
      this.#minimizeBtn.remove();
      this.#minimizeBtn = null;
    }
  }

  #ensureAside(): HTMLElement {
    const aside = document.createElement('aside');
    this.#stampedHeader!.appendChild(aside);
    return aside;
  }

  #onClose = (): void => { this.close(); };
  #onMinimize = (): void => {
    if (this.#minimized.value) {
      this.restore();
    } else {
      this.minimize();
    }
  };
}
