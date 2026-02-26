import { getTraitRuntime } from '../core/trait-runtime.ts';

/** Manages a dismiss layer that dispatches `ui-dismiss` on outside click or Escape. */
export class DismissController {
  readonly host: HTMLElement;

  #rafId = 0;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  enable(): void {
    // WHY: rAF delay prevents the opening click from immediately dismissing
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = 0;
      getTraitRuntime().dismissStack.push(this.host);
    });
  }

  disable(): void {
    // WHY: Cancel pending rAF to prevent zombie layer if disable is called before the frame fires
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
    }
    getTraitRuntime().dismissStack.remove(this.host);
  }

  destroy(): void {
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
    }
    getTraitRuntime().dismissStack.remove(this.host);
  }
}
