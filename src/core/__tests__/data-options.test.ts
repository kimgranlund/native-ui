// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDataOptions, fetchDataOptions } from '../data-options.ts';
import { signal } from '../../reactivity/signal.ts';

// ── parseDataOptions ──

describe('parseDataOptions', () => {
  it('parses valid JSON array', () => {
    const json = '[{"value":"a","label":"Alpha"},{"value":"b","label":"Beta"}]';
    const result = parseDataOptions(json, 'test');
    expect(result).toEqual([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
  });

  it('filters out items missing value', () => {
    const json = '[{"label":"No Value"},{"value":"ok","label":"OK"}]';
    const result = parseDataOptions(json, 'test');
    expect(result).toEqual([{ value: 'ok', label: 'OK' }]);
  });

  it('filters out items missing label', () => {
    const json = '[{"value":"no-label"},{"value":"ok","label":"OK"}]';
    const result = parseDataOptions(json, 'test');
    expect(result).toEqual([{ value: 'ok', label: 'OK' }]);
  });

  it('filters out non-object items', () => {
    const json = '["string", 42, null, {"value":"ok","label":"OK"}]';
    const result = parseDataOptions(json, 'test');
    expect(result).toEqual([{ value: 'ok', label: 'OK' }]);
  });

  it('returns empty for non-array JSON', () => {
    const result = parseDataOptions('{"key":"value"}', 'test');
    expect(result).toEqual([]);
  });

  it('returns empty and warns for invalid JSON', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseDataOptions('not json', 'ui-select');
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith('<ui-select>: invalid options JSON', 'not json');
    spy.mockRestore();
  });

  it('preserves extra fields on items', () => {
    const json = '[{"value":"a","label":"Alpha","disabled":true,"extra":"data"}]';
    const result = parseDataOptions(json, 'test');
    expect(result[0]).toEqual({ value: 'a', label: 'Alpha', disabled: true, extra: 'data' });
  });

  it('returns empty for empty array', () => {
    const result = parseDataOptions('[]', 'test');
    expect(result).toEqual([]);
  });
});

// ── fetchDataOptions ──

describe('fetchDataOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and sets valid options on target signal', async () => {
    const target = signal<{ value: string; label: string }[]>([]);
    const data = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 }),
    );

    await fetchDataOptions('/api/test', null, target, 'test');

    expect(target.value).toEqual(data);
  });

  it('filters invalid items from response', async () => {
    const target = signal<{ value: string; label: string }[]>([]);
    const data = [{ value: 'a', label: 'Alpha' }, { bad: true }, 'string'];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 }),
    );

    await fetchDataOptions('/api/test', null, target, 'test');

    expect(target.value).toEqual([{ value: 'a', label: 'Alpha' }]);
  });

  it('warns on non-ok response', async () => {
    const target = signal<{ value: string; label: string }[]>([]);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    );

    await fetchDataOptions('/api/test', null, target, 'ui-combobox');

    expect(target.value).toEqual([]);
    expect(spy).toHaveBeenCalledWith('<ui-combobox>: fetch failed (404) for /api/test');
  });

  it('aborts previous controller', async () => {
    const target = signal<{ value: string; label: string }[]>([]);
    const previous = new AbortController();
    const abortSpy = vi.spyOn(previous, 'abort');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200 }),
    );

    await fetchDataOptions('/api/test', previous, target, 'test');

    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  it('returns a new AbortController', async () => {
    const target = signal<{ value: string; label: string }[]>([]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200 }),
    );

    const result = await fetchDataOptions('/api/test', null, target, 'test');

    expect(result).toBeInstanceOf(AbortController);
  });

  it('handles non-array response body', async () => {
    const target = signal<{ value: string; label: string }[]>([]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"key":"value"}', { status: 200 }),
    );

    await fetchDataOptions('/api/test', null, target, 'test');

    expect(target.value).toEqual([]);
  });

  it('silently handles AbortError', async () => {
    const target = signal<{ value: string; label: string }[]>([]);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const abortError = new DOMException('Aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    await fetchDataOptions('/api/test', null, target, 'test');

    expect(spy).not.toHaveBeenCalled();
    expect(target.value).toEqual([]);
  });

  it('warns on non-abort fetch errors', async () => {
    const target = signal<{ value: string; label: string }[]>([]);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = new Error('Network failure');

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(error);

    await fetchDataOptions('/api/test', null, target, 'ui-select');

    expect(spy).toHaveBeenCalledWith('<ui-select>: fetch error', error);
  });
});
