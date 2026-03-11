import { NativeElement } from '@nonoun/native-core';
import { signal } from '@nonoun/native-core';
import { ResizeController } from '@nonoun/native-traits';

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
 * @attr {string} size - Initial main-axis size (e.g. "300px", "33%", "20rem"). Default: auto (equal distribution)
 * @attr {number} size-min - Minimum size in px (width or height depending on group orientation)
 * @attr {number} size-max - Maximum size in px
 * @attr {boolean|string} scrollable - Overflow scrolling: boolean (y), "x", "y", or "both" (CSS-only)
 */
type Edge = 'top' | 'right' | 'bottom' | 'left';

function parseEdges(value: string | null): Edge[] {
  if (!value) return [];
  const v = value.trim().toLowerCase();
  if (v === 'all') return ['top', 'right', 'bottom', 'left'];
  if (v === 'x') return ['left', 'right'];
  if (v === 'y') return ['top', 'bottom'];
  return v.split(/\s+/).filter((e): e is Edge =>
    e === 'top' || e === 'right' || e === 'bottom' || e === 'left'
  );
}

export class NPane extends NativeElement {
  static observedAttributes = ['label', 'icon', 'closeable', 'minimizable', 'minimized', 'size', 'size-min', 'size-max', 'resize'];

  #minimized = signal(false);
  #stampedHeader: HTMLElement | null = null;
  #labelEl: HTMLElement | null = null;
  #iconEl: HTMLElement | null = null;
  #minimizeBtn: HTMLElement | null = null;
  #closeBtn: HTMLElement | null = null;

  // Resize edge handles
  #edgeHandles = new Map<Edge, HTMLElement>();
  #resizeControllers = new Map<Edge, ResizeController>();

  get minimized(): boolean { return this.#minimized.value; }
  set minimized(val: boolean) {
    if (val) {
      this.setAttribute('minimized', '');
    } else {
      this.removeAttribute('minimized');
    }
  }

  get minSize(): number {
    const v = this.getAttribute('size-min');
    return v ? Number(v) : 0;
  }

  get maxSize(): number {
    const v = this.getAttribute('size-max');
    return v ? Number(v) : Infinity;
  }

  setup(): void {
    super.setup();
    this.addEventListener('native:resize-start', this.#onResizeStart);
    this.#stampHeader();
    this.#syncMinimized();
    this.#syncSize();
    this.#syncEdgeHandles();
  }

  teardown(): void {
    this.removeEventListener('native:resize-start', this.#onResizeStart);
    this.#removeEdgeHandles();
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
      case 'size':
        this.#syncSize();
        break;
      case 'size-min':
      case 'size-max':
        for (const [_, ctrl] of this.#resizeControllers) {
          ctrl.min = this.minSize;
          ctrl.max = this.maxSize;
        }
        break;
      case 'resize':
        this.#syncEdgeHandles();
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

  #syncSize(): void {
    const size = this.getAttribute('size');
    if (size && size !== 'auto') {
      this.style.flex = `0 1 ${size}`;
    } else {
      this.style.removeProperty('flex');
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

  // ── Edge resize handles (delegated to ResizeController) ──

  #syncEdgeHandles(): void {
    const wanted = new Set(parseEdges(this.getAttribute('resize')));

    // Remove handles and controllers no longer needed
    for (const [edge, el] of this.#edgeHandles) {
      if (!wanted.has(edge)) {
        el.remove();
        this.#edgeHandles.delete(edge);
        this.#resizeControllers.get(edge)?.destroy();
        this.#resizeControllers.delete(edge);
      }
    }

    // Add new handles with ResizeController
    for (const edge of wanted) {
      if (this.#edgeHandles.has(edge)) continue;
      const handle = document.createElement('div');
      handle.className = 'pane-edge';
      handle.dataset.edge = edge;
      this.appendChild(handle);
      this.#edgeHandles.set(edge, handle);

      const isInline = edge === 'left' || edge === 'right';
      const controller = new ResizeController(this as unknown as HTMLElement, {
        handle,
        axis: isInline ? 'horizontal' : 'vertical',
        reverse: edge === 'left' || edge === 'top',
        min: this.minSize,
        max: this.maxSize,
        stateAttribute: 'data-resizing',
      });
      this.#resizeControllers.set(edge, controller);
    }
  }

  #removeEdgeHandles(): void {
    for (const [_, el] of this.#edgeHandles) el.remove();
    this.#edgeHandles.clear();
    for (const [_, ctrl] of this.#resizeControllers) ctrl.destroy();
    this.#resizeControllers.clear();
  }

  /** When edge resize starts, lock flex so the explicit size takes effect. */
  #onResizeStart = (): void => {
    this.style.flex = 'none';
  };
}
