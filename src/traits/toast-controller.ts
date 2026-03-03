import type { ToastOptions } from './runtime.ts';
// WHY: Side-effect import ensures n-toast is defined before createElement.
import '../components/toast/toast.ts';

export type { ToastOptions };

interface ToastEntry {
  id: number;
  el: HTMLElement;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Creates and manages toast notifications within its own host element.
 * Each controller owns its own container and toast entries — no global singleton.
 * Container uses [popover="manual"] for top-layer rendering while inheriting
 * CSS custom properties from the host's position in the component tree.
 */
export class ToastController {
  readonly host: HTMLElement;
  #container: HTMLElement | null = null;
  #nextId = 0;
  readonly #toasts: ToastEntry[] = [];

  constructor(host: HTMLElement) {
    this.host = host;
  }

  #getContainer(): HTMLElement {
    if (this.#container && this.#container.isConnected) return this.#container;
    this.#container = document.createElement('div');
    this.#container.className = 'n-toast-container';
    this.#container.setAttribute('role', 'status');
    this.#container.setAttribute('aria-live', 'polite');
    this.#container.setAttribute('aria-atomic', 'false');
    // WHY: popover="manual" promotes to the top layer — no z-index needed.
    // Styling (position, gap, etc.) lives in toast.css.
    // WHY: Append to this.host so the container inherits CSS custom properties
    // from the component tree. The popover + position:fixed means it renders
    // at a fixed viewport position regardless of DOM location.
    // If the host disconnects, isConnected check above recreates on next toast.
    this.#container.setAttribute('popover', 'manual');
    this.host.appendChild(this.#container);
    this.#container.showPopover();
    return this.#container;
  }

  toast(options: ToastOptions): number {
    const { message, intent = 'info', duration = 4000, dismissible = true } = options;
    const id = this.#nextId++;
    const c = this.#getContainer();

    const el = document.createElement('n-toast');
    el.setAttribute('message', message);
    el.setAttribute('intent', intent);
    if (dismissible) el.setAttribute('dismissible', '');

    // WHY: Listen for native:dismiss from the toast's close button.
    el.addEventListener('native:dismiss', () => this.dismissToast(id));

    c.appendChild(el);

    const timer = duration > 0 ? setTimeout(() => this.dismissToast(id), duration) : null;
    this.#toasts.push({ id, el, timer });

    this.host.dispatchEvent(new CustomEvent('native:toast', {
      bubbles: true,
      composed: true,
      detail: { id, message, intent },
    }));

    return id;
  }

  dismissToast(id: number): void {
    const idx = this.#toasts.findIndex(t => t.id === id);
    if (idx === -1) return;
    const entry = this.#toasts[idx];
    if (entry.timer) clearTimeout(entry.timer);
    entry.el.remove();
    this.#toasts.splice(idx, 1);
    if (this.#toasts.length === 0 && this.#container) {
      try { this.#container.hidePopover(); } catch { /* already hidden */ }
      this.#container.remove();
      this.#container = null;
    }
  }

  dismissAllToasts(): void {
    for (const entry of [...this.#toasts]) {
      this.dismissToast(entry.id);
    }
  }

  destroy(): void {
    this.dismissAllToasts();
  }
}
