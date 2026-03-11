import type { Constructor } from './types.ts';

/**
 * Mixin that provides the common form-association boilerplate:
 *
 * - `static formAssociated = true`
 * - `formDisabledCallback` → calls `onFormDisabled(disabled)`
 * - `formResetCallback` → calls `onFormReset()`
 * - `formStateRestoreCallback` → calls `onFormStateRestore(state)`
 *
 * Must remain a mixin (not a controller) because the Web Components spec
 * requires `static formAssociated = true` on the class constructor.
 *
 * ```ts
 * class NInput extends FormAssociable(NativeElement) {
 *   #internals = this.attachInternals();
 *   onFormDisabled(disabled: boolean) { this.#disabled.value = disabled; }
 *   onFormReset() { this.textContent = ''; }
 * }
 * ```
 */
export function FormAssociable<T extends Constructor>(Base: T) {
  return class extends Base {
    static formAssociated = true;

    /** Override to handle form-initiated disabled state changes. */
    onFormDisabled(_disabled: boolean): void {}

    /** Override to handle form reset. */
    onFormReset(): void {}

    /** Override to handle form state restore (e.g. back/forward navigation). */
    onFormStateRestore(_state: string | FormData | null): void {}

    formDisabledCallback(disabled: boolean): void {
      this.onFormDisabled(disabled);
    }

    formResetCallback(): void {
      this.onFormReset();
    }

    formStateRestoreCallback(state: string | FormData | null, _mode: string): void {
      this.onFormStateRestore(state);
    }

    formAssociatedCallback(_form: HTMLFormElement | null): void {
      // No-op by default.
    }
  };
}
