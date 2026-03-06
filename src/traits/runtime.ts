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
    // WHY: Prune disconnected elements. After View Transition navigation, elements
    // may be disconnected without being popped from the stack (teardown didn't run).
    // Stale references block real dismissable layers.
    this.#pruneDisconnected();
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
    this.#pruneDisconnected();
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

  #pruneDisconnected(): void {
    for (let i = this.#stack.length - 1; i >= 0; i--) {
      if (!this.#stack[i].isConnected) this.#stack.splice(i, 1);
    }
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
 * ToastOptions — configuration for toast notifications.
 * Used by ToastController (toast-controller.ts).
 */
export interface ToastOptions {
  message: string;
  intent?: 'info' | 'success' | 'warning' | 'danger';
  duration?: number;
  dismissible?: boolean;
}

/**
 * TraitRuntime — singleton holding shared services for trait controllers.
 */
export interface TraitRuntime {
  readonly dismissStack: DismissStack;
  readonly gestureRouter: GestureRouter;
}

let runtime: TraitRuntime | null = null;

export function getTraitRuntime(): TraitRuntime {
  if (!runtime) {
    runtime = {
      dismissStack: new DismissStack(),
      gestureRouter: new GestureRouter(),
    };
  }
  return runtime;
}
