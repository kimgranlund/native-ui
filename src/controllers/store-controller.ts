import { signal } from '../reactivity/signal.ts';
import type { Signal } from '../reactivity/types.ts';

export interface StoreControllerOptions {
  /** Parse fetch response. Default: `res.json()` */
  parse?: (res: Response) => Promise<Record<string, unknown>>;
}

export class StoreController {
  readonly loading: Signal<boolean> = signal(false);
  readonly error: Signal<string | null> = signal<string | null>(null);

  #signals = new Map<string, Signal<unknown>>();
  #abortController: AbortController | null = null;
  #parse: (res: Response) => Promise<Record<string, unknown>>;

  constructor(options: StoreControllerOptions = {}) {
    this.#parse = options.parse ?? ((res) => res.json());
  }

  /** Get or create a signal for a key. */
  get<T = unknown>(key: string): Signal<T> {
    let s = this.#signals.get(key);
    if (!s) {
      s = signal<unknown>(undefined);
      this.#signals.set(key, s);
    }
    return s as Signal<T>;
  }

  /** Set a value (creates signal if needed). */
  set(key: string, value: unknown): void {
    this.get(key).value = value;
  }

  /** Bulk-set from a plain object. */
  setAll(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  /** Fetch JSON from URL, populate signals from top-level keys. */
  async load(url: string): Promise<boolean> {
    this.#abortController?.abort();
    const controller = new AbortController();
    this.#abortController = controller;

    this.loading.value = true;
    this.error.value = null;

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return false;

      if (!res.ok) {
        this.error.value = `Load failed (${res.status})`;
        this.loading.value = false;
        return false;
      }

      const data = await this.#parse(res);
      if (controller.signal.aborted) return false;

      this.setAll(data);
      this.loading.value = false;
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      this.error.value = err instanceof Error ? err.message : 'Load failed';
      this.loading.value = false;
      return false;
    }
  }

  /** Check if a key exists. */
  has(key: string): boolean {
    return this.#signals.has(key);
  }

  /** All current keys. */
  keys(): IterableIterator<string> {
    return this.#signals.keys();
  }

  destroy(): void {
    this.#abortController?.abort();
    this.#abortController = null;
  }
}
