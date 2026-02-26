// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { CommandBus, createCommandBus } from '../command-bus.ts';
import type { Command } from '../types.ts';

describe('CommandBus', () => {
  it('creates via factory', () => {
    const bus = createCommandBus();
    expect(bus).toBeInstanceOf(CommandBus);
  });

  it('dispatches to type-based handler', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('test.action', handler);
    bus.dispatch('test.action', { foo: 1 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]).toMatchObject({
      type: 'test.action',
      payload: { foo: 1 },
      source: 'human',
    });
  });

  it('returns a frozen Command object', () => {
    const bus = createCommandBus();
    const cmd = bus.dispatch('test', null);
    expect(cmd.type).toBe('test');
    expect(cmd.id).toMatch(/^cmd-/);
    expect(cmd.timestamp).toBeGreaterThan(0);
    expect(cmd.source).toBe('human');
    expect(Object.isFrozen(cmd)).toBe(true);
  });

  it('dispatches a pre-built Command object', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('pre.built', handler);

    const cmd: Command = Object.freeze({
      type: 'pre.built',
      payload: 'hello',
      id: 'cmd-test',
      timestamp: 1000,
      source: 'generated' as const,
    });
    const returned = bus.dispatch(cmd);
    expect(returned).toBe(cmd);
    expect(handler).toHaveBeenCalledWith(cmd);
  });

  it('supports multiple handlers for same type', () => {
    const bus = createCommandBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('multi', h1);
    bus.on('multi', h2);
    bus.dispatch('multi', null);
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('dispose removes handler', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    const dispose = bus.on('test', handler);
    dispose();
    bus.dispatch('test', null);
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches to filter-based handler', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on((cmd) => cmd.type.startsWith('user.'), handler);
    bus.dispatch('user.login', { name: 'Kim' });
    bus.dispatch('system.boot', null);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].type).toBe('user.login');
  });

  it('dispose removes filter handler', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    const dispose = bus.on(() => true, handler);
    dispose();
    bus.dispatch('test', null);
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs middleware in order', () => {
    const bus = createCommandBus();
    const order: number[] = [];

    bus.use((_cmd, next) => { order.push(1); next(); });
    bus.use((_cmd, next) => { order.push(2); next(); });

    const handler = vi.fn(() => { order.push(3); });
    bus.on('test', handler);
    bus.dispatch('test', null);
    expect(order).toEqual([1, 2, 3]);
  });

  it('middleware can block dispatch', () => {
    const bus = createCommandBus();
    bus.use((_cmd, _next) => { /* don't call next */ });
    const handler = vi.fn();
    bus.on('test', handler);
    bus.dispatch('test', null);
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose removes middleware', () => {
    const bus = createCommandBus();
    const blocker = vi.fn((_cmd: Command, _next: () => void) => { /* block */ });
    const dispose = bus.use(blocker);
    dispose();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.dispatch('test', null);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('updates lastCommand signal', () => {
    const bus = createCommandBus();
    expect(bus.lastCommand.value).toBe(null);
    const cmd = bus.dispatch('test', 42);
    expect(bus.lastCommand.value).toBe(cmd);
  });

  it('captures sync handler errors in errors signal', () => {
    const bus = createCommandBus();
    bus.on('fail', () => { throw new Error('boom'); });
    expect(bus.errors.value).toBe(null);
    bus.dispatch('fail', null);
    expect(bus.errors.value).toBeInstanceOf(Error);
    expect(bus.errors.value!.message).toBe('boom');
  });

  it('tracks async handlers via dispatching signal', async () => {
    const bus = createCommandBus();
    let resolve!: () => void;
    const p = new Promise<void>((r) => { resolve = r; });

    bus.on('async', () => p);
    bus.dispatch('async', null);
    expect(bus.dispatching.value).toBe(true);

    resolve();
    await p;
    // Let microtask settle
    await new Promise((r) => setTimeout(r, 0));
    expect(bus.dispatching.value).toBe(false);
  });

  it('captures async handler errors in errors signal', async () => {
    const bus = createCommandBus();
    bus.on('async.fail', () => Promise.reject(new Error('async boom')));
    bus.dispatch('async.fail', null);
    await new Promise((r) => setTimeout(r, 0));
    expect(bus.errors.value).toBeInstanceOf(Error);
    expect(bus.errors.value!.message).toBe('async boom');
  });

  it('includes meta when provided', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('undoable', handler);
    bus.dispatch('undoable', 'data', { undoType: 'undoable.undo', undoPayload: 'prev' });
    const cmd = handler.mock.calls[0]![0] as Command;
    expect(cmd.meta).toBeDefined();
    expect(cmd.meta!.undoType).toBe('undoable.undo');
    expect(cmd.meta!.undoPayload).toBe('prev');
  });

  it('payload defaults to null', () => {
    const bus = createCommandBus();
    const cmd = bus.dispatch('test');
    expect(cmd.payload).toBe(null);
  });
});
