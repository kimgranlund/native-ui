// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GatewayController } from './gateway-controller.ts';

describe('GatewayController', () => {
  let host: HTMLElement;
  let ctrl: GatewayController;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    ctrl = new GatewayController(host);
  });

  afterEach(() => {
    ctrl.destroy();
    host.remove();
    vi.restoreAllMocks();
  });

  // ── Construction ──

  it('creates with default state', () => {
    expect(ctrl.host).toBe(host);
    expect(ctrl.loading.value).toBe(false);
    expect(ctrl.saving.value).toBe(false);
    expect(ctrl.error.value).toBeNull();
    expect(ctrl.dirty.value).toBe(false);
  });

  // ── Dirty tracking ──

  it('markDirty sets dirty to true', () => {
    ctrl.markDirty();
    expect(ctrl.dirty.value).toBe(true);
  });

  it('markClean sets dirty to false', () => {
    ctrl.markDirty();
    ctrl.markClean();
    expect(ctrl.dirty.value).toBe(false);
  });

  // ── Load ──

  it('load sets loading to true during request', async () => {
    const textPromise = Promise.resolve('hello');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => textPromise,
    } as unknown as Response);

    const p = ctrl.load('/api/data');
    expect(ctrl.loading.value).toBe(true);

    const result = await p;
    expect(result).toBe('hello');
    expect(ctrl.loading.value).toBe(false);
  });

  it('load clears dirty on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('data'),
    } as unknown as Response);

    ctrl.markDirty();
    await ctrl.load('/api/data');
    expect(ctrl.dirty.value).toBe(false);
  });

  it('load sets error on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const result = await ctrl.load('/api/missing');
    expect(result).toBeNull();
    expect(ctrl.error.value).toBe('Load failed (404)');
    expect(ctrl.loading.value).toBe(false);
  });

  it('load sets error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await ctrl.load('/api/data');
    expect(result).toBeNull();
    expect(ctrl.error.value).toBe('Network error');
    expect(ctrl.loading.value).toBe(false);
  });

  it('load clears previous error on new request', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('ok'),
      } as unknown as Response);

    await ctrl.load('/api/data');
    expect(ctrl.error.value).toBe('fail');

    await ctrl.load('/api/data');
    expect(ctrl.error.value).toBeNull();
  });

  // ── Save ──

  it('save sets saving to true during request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
    } as unknown as Response);

    const p = ctrl.save('/api/data', 'content');
    expect(ctrl.saving.value).toBe(true);

    const result = await p;
    expect(result).toBe(true);
    expect(ctrl.saving.value).toBe(false);
  });

  it('save clears dirty on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
    } as unknown as Response);

    ctrl.markDirty();
    await ctrl.save('/api/data', 'content');
    expect(ctrl.dirty.value).toBe(false);
  });

  it('save sends PUT with content-type', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
    } as unknown as Response);

    await ctrl.save('/api/data', 'hello');

    expect(fetchSpy).toHaveBeenCalledWith('/api/data', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    }));
  });

  it('save uses custom content-type from options', async () => {
    ctrl.destroy();
    ctrl = new GatewayController(host, { contentType: 'application/json' });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
    } as unknown as Response);

    await ctrl.save('/api/data', '{}');

    expect(fetchSpy).toHaveBeenCalledWith('/api/data', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('save sets error on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const result = await ctrl.save('/api/data', 'content');
    expect(result).toBe(false);
    expect(ctrl.error.value).toBe('Save failed (500)');
    expect(ctrl.saving.value).toBe(false);
  });

  it('save sets error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));

    const result = await ctrl.save('/api/data', 'content');
    expect(result).toBe(false);
    expect(ctrl.error.value).toBe('Offline');
    expect(ctrl.saving.value).toBe(false);
  });

  // ── Custom parse/serialize ──

  it('uses custom parse function', async () => {
    ctrl.destroy();
    ctrl = new GatewayController(host, {
      parse: async (res) => {
        const json = await res.json();
        return json.content;
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: 'parsed' }),
    } as unknown as Response);

    const result = await ctrl.load('/api/data');
    expect(result).toBe('parsed');
  });

  it('uses custom serialize function', async () => {
    ctrl.destroy();
    ctrl = new GatewayController(host, {
      serialize: (content) => JSON.stringify({ data: content }),
      contentType: 'application/json',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
    } as unknown as Response);

    await ctrl.save('/api/data', 'hello');

    expect(fetchSpy).toHaveBeenCalledWith('/api/data', expect.objectContaining({
      body: '{"data":"hello"}',
    }));
  });

  // ── Abort ──

  it('abort cancels in-flight requests', () => {
    // Abort should not throw even when no requests are active
    expect(() => ctrl.abort()).not.toThrow();
  });

  // ── Destroy ──

  it('destroy calls abort', () => {
    const abortSpy = vi.spyOn(ctrl, 'abort');
    ctrl.destroy();
    expect(abortSpy).toHaveBeenCalled();
  });
});
