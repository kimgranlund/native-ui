// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreController } from './store-controller.ts';

describe('StoreController', () => {
  let store: StoreController;

  beforeEach(() => {
    store = new StoreController();
  });

  it('initialises with default signal values', () => {
    expect(store.loading.value).toBe(false);
    expect(store.error.value).toBeNull();
  });

  it('get() creates a signal on first access', () => {
    const s = store.get('name');
    expect(s.value).toBeUndefined();
  });

  it('get() returns the same signal on repeated access', () => {
    const a = store.get('name');
    const b = store.get('name');
    expect(a).toBe(b);
  });

  it('set() creates and populates a signal', () => {
    store.set('count', 42);
    expect(store.get('count').value).toBe(42);
  });

  it('set() updates an existing signal', () => {
    store.set('count', 1);
    store.set('count', 2);
    expect(store.get('count').value).toBe(2);
  });

  it('setAll() populates multiple signals', () => {
    store.setAll({ a: 1, b: 'hello', c: true });
    expect(store.get('a').value).toBe(1);
    expect(store.get('b').value).toBe('hello');
    expect(store.get('c').value).toBe(true);
  });

  it('has() returns false for unknown keys', () => {
    expect(store.has('missing')).toBe(false);
  });

  it('has() returns true after get()', () => {
    store.get('key');
    expect(store.has('key')).toBe(true);
  });

  it('keys() returns all created keys', () => {
    store.set('x', 1);
    store.set('y', 2);
    expect([...store.keys()]).toEqual(['x', 'y']);
  });

  describe('load()', () => {
    it('sets loading during fetch', async () => {
      const json = { name: 'Kim', age: 30 };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(json), { status: 200 }),
      );

      const result = await store.load('/api/user');
      expect(result).toBe(true);
      expect(store.loading.value).toBe(false);
      expect(store.get('name').value).toBe('Kim');
      expect(store.get('age').value).toBe(30);
    });

    it('sets error on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      );

      const result = await store.load('/api/missing');
      expect(result).toBe(false);
      expect(store.error.value).toBe('Load failed (404)');
      expect(store.loading.value).toBe(false);
    });

    it('sets error on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      );

      const result = await store.load('/api/down');
      expect(result).toBe(false);
      expect(store.error.value).toBe('Failed to fetch');
      expect(store.loading.value).toBe(false);
    });

    it('supports custom parse function', async () => {
      const custom = new StoreController({
        parse: async (res) => {
          const text = await res.text();
          return { raw: text };
        },
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('hello world', { status: 200 }),
      );

      await custom.load('/api/text');
      expect(custom.get('raw').value).toBe('hello world');
    });
  });

  it('destroy() aborts pending loads', () => {
    const abortSpy = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init?.signal as AbortSignal)?.addEventListener('abort', () => {
            abortSpy();
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    store.load('/api/slow');
    store.destroy();
    expect(abortSpy).toHaveBeenCalled();
  });
});
