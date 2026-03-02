import { getTraitRuntime } from './runtime.ts';
import type { ToastOptions } from './runtime.ts';

export type { ToastOptions };

/** Creates and manages toast notifications via the global toast manager. */
export class ToastController {
  readonly host: HTMLElement;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  toast(options: ToastOptions): number {
    return getTraitRuntime().toastManager.toast(this.host, options);
  }

  dismissToast(id: number): void {
    getTraitRuntime().toastManager.dismiss(id);
  }

  dismissAllToasts(): void {
    getTraitRuntime().toastManager.dismissAll();
  }

  destroy(): void {
    // No persistent state to clean up
  }
}
