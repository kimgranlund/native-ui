/**
 * Readiness helper — wait for custom element definitions.
 *
 * @example
 *   import { whenNativeReady } from '@nonoun/native-ui';
 *   await whenNativeReady(['n-button', 'n-select']);
 *
 * @example With timeout:
 *   await whenNativeReady(['n-button'], { timeout: 5000 });
 */

export interface ReadyOptions {
  /** Timeout in milliseconds. Rejects if elements aren't defined within this time. Default: 10000. */
  timeout?: number;
}

/**
 * Resolves when all specified custom elements are defined.
 * Uses `customElements.whenDefined()` internally.
 *
 * @param tags - Array of tag names to wait for (e.g. `['n-button', 'n-select']`)
 * @param options - Optional timeout configuration
 * @throws If timeout is reached before all elements are defined
 */
export function whenNativeReady(tags: string[], options?: ReadyOptions): Promise<void> {
  const timeout = options?.timeout ?? 10_000;

  const definitions = tags.map(tag => customElements.whenDefined(tag));

  if (timeout <= 0) return Promise.all(definitions).then(() => {});

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const missing = tags.filter(tag => !customElements.get(tag));
      reject(new Error(
        `whenNativeReady timed out after ${timeout}ms. Missing definitions: ${missing.join(', ')}`,
      ));
    }, timeout);

    Promise.all(definitions).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
