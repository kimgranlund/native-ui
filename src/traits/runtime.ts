import { GestureRouter } from './gesture-router.ts';

/**
 * DismissStack — manages a global stack of dismissable layers.
 * Extracted from the module-level singleton in dismissable.ts.
 * Handles click-outside and Escape key dismissal for the top-most layer.
 */
export class DismissStack {
  readonly #stack: HTMLElement[] = [];
  #listening = false;

  #onPointerDown = (e: PointerEvent): void => {
    const top = this.#stack[this.#stack.length - 1];
    if (!top) return;
    // WHY: composedPath() crosses shadow DOM boundaries — e.target is retargeted
    // to the shadow host, so top.contains(e.target) always fails for elements
    // rendered inside a shadow root (e.g. n-select inside native-app's shadow DOM).
    if (e.composedPath().includes(top)) return;
    top.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true, composed: true }));
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    const top = this.#stack[this.#stack.length - 1];
    if (!top) return;
    e.preventDefault();
    top.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true, composed: true }));
  };

  push(el: HTMLElement): void {
    const idx = this.#stack.indexOf(el);
    if (idx !== -1) this.#stack.splice(idx, 1);
    this.#stack.push(el);
    this.#attachListeners();
  }

  remove(el: HTMLElement): void {
    const idx = this.#stack.indexOf(el);
    if (idx !== -1) this.#stack.splice(idx, 1);
    this.#detachListeners();
  }

  #attachListeners(): void {
    if (this.#listening) return;
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('keydown', this.#onKeyDown);
    this.#listening = true;
  }

  #detachListeners(): void {
    if (this.#stack.length > 0) return;
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    document.removeEventListener('keydown', this.#onKeyDown);
    this.#listening = false;
  }
}

/**
 * ToastManager — manages a global toast container and toast entries.
 * Extracted from the module-level singleton in toastable.ts.
 */
export interface ToastOptions {
  message: string;
  intent?: 'info' | 'success' | 'warning' | 'danger';
  duration?: number;
  dismissible?: boolean;
}

interface ToastEntry {
  id: number;
  el: HTMLElement;
  timer: ReturnType<typeof setTimeout> | null;
}

export class ToastManager {
  #container: HTMLElement | null = null;
  #nextId = 0;
  readonly #toasts: ToastEntry[] = [];

  #getContainer(): HTMLElement {
    if (this.#container && this.#container.isConnected) return this.#container;
    this.#container = document.createElement('div');
    this.#container.className = 'n-toast-container';
    this.#container.setAttribute('role', 'status');
    this.#container.setAttribute('aria-live', 'polite');
    this.#container.setAttribute('aria-atomic', 'false');
    // WHY: popover="manual" promotes to the top layer — no z-index needed.
    // Styling (position, gap, etc.) lives in n-toast.css.
    this.#container.setAttribute('popover', 'manual');
    document.body.appendChild(this.#container);
    this.#container.showPopover();
    return this.#container;
  }

  toast(host: HTMLElement, options: ToastOptions): number {
    const { message, intent = 'info', duration = 4000, dismissible = true } = options;
    const id = this.#nextId++;
    const c = this.#getContainer();

    const el = document.createElement('div');
    el.className = 'n-toast';
    el.setAttribute('intent', intent);
    el.setAttribute('role', 'alert');

    const msg = document.createElement('span');
    msg.className = 'n-toast-message';
    msg.textContent = message;
    el.appendChild(msg);

    if (dismissible) {
      const close = document.createElement('button');
      close.className = 'n-toast-close';
      close.setAttribute('aria-label', 'Dismiss');
      close.textContent = '\u00d7';
      close.addEventListener('click', () => this.dismiss(id));
      el.appendChild(close);
    }

    c.appendChild(el);

    const timer = duration > 0 ? setTimeout(() => this.dismiss(id), duration) : null;
    this.#toasts.push({ id, el, timer });

    host.dispatchEvent(new CustomEvent('native:toast', {
      bubbles: true,
      composed: true,
      detail: { id, message, intent },
    }));

    return id;
  }

  dismiss(id: number): void {
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

  dismissAll(): void {
    for (const entry of [...this.#toasts]) {
      this.dismiss(entry.id);
    }
  }
}

/**
 * TraitRuntime — singleton holding shared services for trait controllers.
 */
export interface TraitRuntime {
  readonly dismissStack: DismissStack;
  readonly toastManager: ToastManager;
  readonly gestureRouter: GestureRouter;
}

let runtime: TraitRuntime | null = null;

export function getTraitRuntime(): TraitRuntime {
  if (!runtime) {
    runtime = {
      dismissStack: new DismissStack(),
      toastManager: new ToastManager(),
      gestureRouter: new GestureRouter(),
    };
  }
  return runtime;
}
