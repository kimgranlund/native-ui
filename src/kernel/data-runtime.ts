import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import { batch } from '../reactivity/batch.ts';
import { uid } from '../core/uid.ts';
import type { Signal, ReadonlySignal } from '../reactivity/types.ts';

// ── Data Binding ──

export interface DataBinding {
  readonly id: string;
  readonly source: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly transform?: string;
  readonly cacheKey?: string;
  readonly cacheTtl?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
}

// ── Cache Entry ──

export interface CacheEntry<T = unknown> {
  readonly data: T;
  readonly timestamp: number;
  readonly etag?: string;
}

// ── Internals ──

interface CacheRecord {
  entry: CacheEntry;
  signal: Signal<unknown>;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

function cacheKeyFor(binding: DataBinding): string {
  return binding.cacheKey ?? `${binding.method ?? 'GET'}:${binding.source}`;
}

// ── DataStore ──

export class DataStore {
  #cache = new Map<string, CacheRecord>();
  #inflight = new Map<string, AbortController>();
  #loading: Signal<boolean> = signal(false);
  #error: Signal<Error | null> = signal(null);
  #activeCount = 0;

  readonly loading: ReadonlySignal<boolean> = computed(() => this.#loading.value);
  readonly error: ReadonlySignal<Error | null> = computed(() => this.#error.value);

  // ── Query ──

  query<T = unknown>(binding: DataBinding): ReadonlySignal<T | null> {
    const key = cacheKeyFor(binding);
    const ttl = binding.cacheTtl ?? 0;

    // Check cache freshness
    const existing = this.#cache.get(key);
    if (existing && ttl > 0 && Date.now() - existing.entry.timestamp < ttl) {
      return computed(() => existing.signal.value as T | null);
    }

    // Reuse existing signal or create a new one
    let record = existing;
    if (!record) {
      const sig = signal<unknown>(null);
      record = { entry: { data: null, timestamp: 0 }, signal: sig };
      this.#cache.set(key, record);
    }

    // Fire fetch (non-blocking)
    this.#fetchWithRetry(binding, key);

    return computed(() => record!.signal.value as T | null);
  }

  // ── Mutation ──

  async mutate<T = unknown>(
    binding: DataBinding,
    optimistic?: { readonly key: string; readonly value: T },
  ): Promise<T> {
    let rollbackData: unknown = undefined;
    let rollbackRecord: CacheRecord | undefined;

    // Optimistic update
    if (optimistic) {
      rollbackRecord = this.#cache.get(optimistic.key);
      rollbackData = rollbackRecord?.signal.peek() ?? null;

      if (rollbackRecord) {
        rollbackRecord.signal.value = optimistic.value;
        rollbackRecord.entry = Object.freeze({
          data: optimistic.value,
          timestamp: Date.now(),
        });
      } else {
        const sig = signal<unknown>(optimistic.value);
        const entry: CacheEntry = Object.freeze({
          data: optimistic.value,
          timestamp: Date.now(),
        });
        rollbackRecord = { entry, signal: sig };
        this.#cache.set(optimistic.key, rollbackRecord);
      }
    }

    try {
      const result = await this.#fetch<T>(binding);
      const key = cacheKeyFor(binding);

      // Update cache with server response
      batch(() => {
        const entry: CacheEntry = Object.freeze({
          data: result,
          timestamp: Date.now(),
        });

        const existing = this.#cache.get(key);
        if (existing) {
          existing.signal.value = result;
          existing.entry = entry;
        } else {
          this.#cache.set(key, { entry, signal: signal<unknown>(result) });
        }

        // Also update the optimistic key if different from mutation key
        if (optimistic && optimistic.key !== key) {
          const optRecord = this.#cache.get(optimistic.key);
          if (optRecord) {
            optRecord.signal.value = result;
            optRecord.entry = entry;
          }
        }
      });

      return result;
    } catch (err) {
      // Rollback optimistic update
      if (optimistic && rollbackRecord) {
        batch(() => {
          rollbackRecord!.signal.value = rollbackData;
          rollbackRecord!.entry = Object.freeze({
            data: rollbackData,
            timestamp: Date.now(),
          });
        });
      }

      const error = err instanceof Error ? err : new Error(String(err));
      this.#error.value = error;
      throw error;
    }
  }

  // ── Cache Management ──

  invalidate(key: string): void {
    const record = this.#cache.get(key);
    if (record) {
      // Zero out timestamp to force re-fetch on next query
      record.entry = Object.freeze({
        data: record.entry.data,
        timestamp: 0,
        ...(record.entry.etag ? { etag: record.entry.etag } : {}),
      });
    }
  }

  invalidateAll(): void {
    for (const key of this.#cache.keys()) {
      this.invalidate(key);
    }
  }

  getCache(key: string): CacheEntry | null {
    return this.#cache.get(key)?.entry ?? null;
  }

  // ── Abort ──

  abort(bindingId: string): void {
    const controller = this.#inflight.get(bindingId);
    if (controller) {
      controller.abort();
      this.#inflight.delete(bindingId);
    }
  }

  abortAll(): void {
    for (const controller of this.#inflight.values()) {
      controller.abort();
    }
    this.#inflight.clear();
  }

  // ── Destroy ──

  destroy(): void {
    this.abortAll();
    this.#cache.clear();
    batch(() => {
      this.#loading.value = false;
      this.#error.value = null;
    });
    this.#activeCount = 0;
  }

  // ── Private: Fetch With Retry ──

  async #fetchWithRetry(binding: DataBinding, key: string): Promise<void> {
    this.#incrementLoading();

    try {
      const data = await this.#fetchRetryLoop(binding);

      batch(() => {
        const entry: CacheEntry = Object.freeze({
          data,
          timestamp: Date.now(),
        });

        const existing = this.#cache.get(key);
        if (existing) {
          existing.signal.value = data;
          existing.entry = entry;
        } else {
          this.#cache.set(key, { entry, signal: signal<unknown>(data) });
        }

        this.#error.value = null;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      this.#error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      this.#decrementLoading();
    }
  }

  async #fetchRetryLoop(binding: DataBinding): Promise<unknown> {
    const maxRetries = binding.retries ?? DEFAULT_RETRIES;
    const baseDelay = binding.retryDelay ?? DEFAULT_RETRY_DELAY;

    // Abort any existing request for this binding
    this.abort(binding.id);

    const controller = new AbortController();
    this.#inflight.set(binding.id, controller);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Wait before retry (skip delay on first attempt)
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.#wait(delay, controller.signal);
      }

      // Check abort before fetch
      if (controller.signal.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      try {
        const result = await this.#fetch(binding, controller.signal);
        this.#inflight.delete(binding.id);
        return result;
      } catch (err) {
        // Don't retry aborted requests
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }

        // Don't retry 4xx client errors
        if (err instanceof HttpError && err.status >= 400 && err.status < 500) {
          this.#inflight.delete(binding.id);
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));

        // On last attempt, throw
        if (attempt === maxRetries) {
          this.#inflight.delete(binding.id);
          throw lastError;
        }
      }
    }

    // Unreachable, but satisfies TypeScript
    this.#inflight.delete(binding.id);
    throw lastError ?? new Error('Fetch failed');
  }

  async #fetch<T = unknown>(binding: DataBinding, abortSignal?: AbortSignal): Promise<T> {
    const method = binding.method ?? 'GET';
    const headers: Record<string, string> = { ...binding.headers };

    const init: RequestInit = {
      method,
      headers,
      ...(abortSignal ? { signal: abortSignal } : {}),
    };

    if (binding.body !== undefined && method !== 'GET' && method !== 'DELETE') {
      if (typeof binding.body === 'string') {
        init.body = binding.body;
      } else {
        init.body = JSON.stringify(binding.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await fetch(binding.source, init);

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText, binding.source);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  // ── Private: Helpers ──

  #incrementLoading(): void {
    this.#activeCount++;
    if (this.#activeCount === 1) this.#loading.value = true;
  }

  #decrementLoading(): void {
    this.#activeCount--;
    if (this.#activeCount <= 0) {
      this.#activeCount = 0;
      this.#loading.value = false;
    }
  }

  #wait(ms: number, abortSignal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }

      const timer = setTimeout(resolve, ms);

      abortSignal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      }, { once: true });
    });
  }
}

// ── HttpError ──

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;

  constructor(status: number, statusText: string, url: string) {
    super(`HTTP ${status} ${statusText}: ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

// ── Factory ──

export function createDataStore(): DataStore {
  return new DataStore();
}

// ── Binding Helper ──

export function createBinding(
  source: string,
  overrides?: Partial<Omit<DataBinding, 'id' | 'source'>>,
): DataBinding {
  return Object.freeze({
    id: uid('bind'),
    source,
    ...overrides,
  });
}
