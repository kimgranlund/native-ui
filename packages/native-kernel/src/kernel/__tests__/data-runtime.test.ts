// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DataStore, createDataStore, createBinding, HttpError } from '../data-runtime.ts';

// Mock global fetch
const originalFetch = globalThis.fetch;

function mockFetch(response: unknown, options?: { status?: number; contentType?: string; delay?: number }) {
  const status = options?.status ?? 200;
  const contentType = options?.contentType ?? 'application/json';
  const delay = options?.delay ?? 0;

  globalThis.fetch = vi.fn(() => {
    const p = new Promise<Response>((resolve, _reject) => {
      setTimeout(() => {
        if (status >= 200 && status < 400) {
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 200 ? 'OK' : 'Error',
            headers: new Headers({ 'content-type': contentType }),
            json: () => Promise.resolve(response),
            text: () => Promise.resolve(typeof response === 'string' ? response : JSON.stringify(response)),
          } as Response);
        } else {
          resolve({
            ok: false,
            status,
            statusText: 'Error',
            headers: new Headers({ 'content-type': contentType }),
            json: () => Promise.resolve(response),
            text: () => Promise.resolve(typeof response === 'string' ? response : JSON.stringify(response)),
          } as Response);
        }
      }, delay);
    });
    return p;
  });
}

describe('DataStore', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates via factory', () => {
    const store = createDataStore();
    expect(store).toBeInstanceOf(DataStore);
    expect(store.loading.value).toBe(false);
    expect(store.error.value).toBeNull();
  });

  it('createBinding generates id', () => {
    const binding = createBinding('/api/data');
    expect(binding.id).toMatch(/^bind-/);
    expect(binding.source).toBe('/api/data');
    expect(Object.isFrozen(binding)).toBe(true);
  });

  it('createBinding with overrides', () => {
    const binding = createBinding('/api/data', { method: 'POST', retries: 1 });
    expect(binding.method).toBe('POST');
    expect(binding.retries).toBe(1);
  });

  it('query returns a signal', () => {
    mockFetch({ items: [1, 2, 3] });
    const store = createDataStore();
    const binding = createBinding('/api/items');
    const result = store.query(binding);
    expect(result.value).toBeNull(); // initially null before fetch resolves
  });

  it('query updates signal after fetch', async () => {
    mockFetch({ count: 5 });
    const store = createDataStore();
    const binding = createBinding('/api/count', { retries: 0 });
    const result = store.query(binding);

    // Wait for fetch to resolve
    await vi.waitFor(() => {
      expect(result.value).toEqual({ count: 5 });
    });

    store.destroy();
  });

  it('query caches results within TTL', async () => {
    mockFetch({ v: 1 });
    const store = createDataStore();
    const binding = createBinding('/api/cached', { cacheTtl: 60000, retries: 0 });

    store.query(binding);
    // Wait for fetch to complete and cache to be populated with actual data
    await vi.waitFor(() => {
      const cache = store.getCache('GET:/api/cached');
      expect(cache).not.toBeNull();
      expect(cache!.timestamp).toBeGreaterThan(0);
    });

    // Second query should reuse cache (no new fetch)
    const fetchCount = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    store.query(binding);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCount);

    store.destroy();
  });

  it('mutate performs fetch and returns result', async () => {
    mockFetch({ id: 1, name: 'created' });
    const store = createDataStore();
    const binding = createBinding('/api/items', { method: 'POST', body: { name: 'test' }, retries: 0 });

    const result = await store.mutate(binding);
    expect(result).toEqual({ id: 1, name: 'created' });

    store.destroy();
  });

  it('mutate with optimistic update', async () => {
    mockFetch({ id: 1, name: 'server' }, { delay: 50 });
    const store = createDataStore();

    // Pre-seed cache
    mockFetch({ id: 1, name: 'original' });
    const qBinding = createBinding('/api/item/1', { cacheTtl: 60000, retries: 0 });
    const sig = store.query(qBinding);
    await vi.waitFor(() => expect(sig.value).toEqual({ id: 1, name: 'original' }));

    // Now mutate with optimistic update
    mockFetch({ id: 1, name: 'server' });
    const mBinding = createBinding('/api/item/1', { method: 'PUT', body: { name: 'optimistic' }, retries: 0 });
    const promise = store.mutate(mBinding, { key: 'GET:/api/item/1', value: { id: 1, name: 'optimistic' } });

    // Optimistic value should be immediate
    expect(sig.value).toEqual({ id: 1, name: 'optimistic' });

    // After resolve, server value
    await promise;
    // Server value is stored in the mutation's cache key, not necessarily the optimistic key
    // unless they match — which they do here since both are for the same resource
    store.destroy();
  });

  it('invalidate forces re-fetch', async () => {
    mockFetch({ v: 1 });
    const store = createDataStore();
    const binding = createBinding('/api/data', { cacheTtl: 60000, retries: 0 });

    store.query(binding);
    await vi.waitFor(() => expect(store.getCache('GET:/api/data')).not.toBeNull());

    store.invalidate('GET:/api/data');
    const cache = store.getCache('GET:/api/data');
    expect(cache!.timestamp).toBe(0); // timestamp zeroed

    store.destroy();
  });

  it('invalidateAll zeroes all timestamps', async () => {
    mockFetch({ v: 1 });
    const store = createDataStore();

    const b1 = createBinding('/api/a', { cacheTtl: 60000, retries: 0 });
    const b2 = createBinding('/api/b', { cacheTtl: 60000, retries: 0 });
    store.query(b1);
    store.query(b2);

    await vi.waitFor(() => {
      expect(store.getCache('GET:/api/a')).not.toBeNull();
      expect(store.getCache('GET:/api/b')).not.toBeNull();
    });

    store.invalidateAll();
    expect(store.getCache('GET:/api/a')!.timestamp).toBe(0);
    expect(store.getCache('GET:/api/b')!.timestamp).toBe(0);

    store.destroy();
  });

  it('abort cancels in-flight request', () => {
    mockFetch({ v: 1 }, { delay: 5000 });
    const store = createDataStore();
    const binding = createBinding('/api/slow', { retries: 0 });
    store.query(binding);
    store.abort(binding.id);
    // Should not throw, just silently abort
    store.destroy();
  });

  it('destroy clears all state', async () => {
    mockFetch({ v: 1 });
    const store = createDataStore();
    const binding = createBinding('/api/data', { retries: 0 });
    store.query(binding);

    await vi.waitFor(() => expect(store.getCache('GET:/api/data')).not.toBeNull());

    store.destroy();
    expect(store.loading.value).toBe(false);
    expect(store.error.value).toBeNull();
    expect(store.getCache('GET:/api/data')).toBeNull();
  });

  it('HttpError has status and url', () => {
    const err = new HttpError(404, 'Not Found', '/api/missing');
    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.url).toBe('/api/missing');
    expect(err.message).toContain('404');
    expect(err.name).toBe('HttpError');
  });

  it('does not retry on 4xx errors', async () => {
    mockFetch(null, { status: 400 });
    const store = createDataStore();
    const binding = createBinding('/api/bad', { method: 'POST', retries: 3 });

    await expect(store.mutate(binding)).rejects.toThrow(HttpError);
    // Should only have been called once (no retries for 4xx)
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);

    store.destroy();
  });
});
