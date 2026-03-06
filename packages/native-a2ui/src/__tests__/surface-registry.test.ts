// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { NSurfaceRegistry } from '../session/surface-registry.ts';
import type { NSurfaceState } from '../session/types.ts';

// Minimal mock session for ownership tracking
const mockSession = (id: string) => ({ id, agentId: id } as import('../session/agent-session.ts').NAgentSession);

describe('NSurfaceRegistry', () => {
  // ── Mount Points ──

  it('registers and retrieves mount points', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);

    expect(registry.getMount('s1')).toBe(el);
  });

  it('returns undefined for unknown surfaces', () => {
    const registry = new NSurfaceRegistry();
    expect(registry.getMount('nope')).toBeUndefined();
  });

  it('unregisters mount points', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);
    registry.unregisterMount('s1');

    expect(registry.getMount('s1')).toBeUndefined();
  });

  // ── Ownership ──

  it('sets and gets owner', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    const session = mockSession('a');
    registry.registerMount('s1', el);
    registry.setOwner('s1', session);

    expect(registry.getOwner('s1')).toBe(session);
    expect(registry.isOwner('s1', session)).toBe(true);
  });

  it('throws when setting owner on unregistered surface', () => {
    const registry = new NSurfaceRegistry();
    expect(() => registry.setOwner('nope', mockSession('a'))).toThrow();
  });

  it('clears owner', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    const session = mockSession('a');
    registry.registerMount('s1', el);
    registry.setOwner('s1', session);
    registry.clearOwner('s1');

    expect(registry.getOwner('s1')).toBeUndefined();
  });

  it('transfers ownership', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    const sessionA = mockSession('a');
    const sessionB = mockSession('b');
    registry.registerMount('s1', el);
    registry.setOwner('s1', sessionA);
    registry.transferOwnership('s1', sessionB);

    expect(registry.isOwner('s1', sessionB)).toBe(true);
    expect(registry.isOwner('s1', sessionA)).toBe(false);
  });

  // ── Observers ──

  it('adds and removes observers', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    const session = mockSession('a');
    registry.registerMount('s1', el);
    registry.addObserver('s1', session);

    expect(registry.getObservers('s1')).toHaveLength(1);

    registry.removeObserver('s1', session);
    expect(registry.getObservers('s1')).toHaveLength(0);
  });

  // ── State Snapshots ──

  it('updates and retrieves state', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);

    const state: NSurfaceState = {
      surfaceId: 's1',
      components: [],
      dataModel: { name: 'test' },
      updatedAt: Date.now(),
    };
    registry.updateState('s1', state);

    expect(registry.getState('s1')).toBe(state);
  });

  // ── Events ──

  it('fires surface-updated event', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);

    const updates: string[] = [];
    registry.on('surface-updated', (id) => updates.push(id));

    const state: NSurfaceState = {
      surfaceId: 's1',
      components: [],
      dataModel: {},
      updatedAt: Date.now(),
    };
    registry.updateState('s1', state);

    expect(updates).toEqual(['s1']);
  });

  it('fires surface-removed event on unregister', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);

    const removals: string[] = [];
    registry.on('surface-removed', (id) => removals.push(id));

    registry.unregisterMount('s1');
    expect(removals).toEqual(['s1']);
  });

  it('unsubscribes from events', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);

    let count = 0;
    const unsub = registry.on('surface-removed', () => count++);
    unsub();

    registry.unregisterMount('s1');
    expect(count).toBe(0);
  });

  // ── Lifecycle ──

  it('destroy clears all state', () => {
    const registry = new NSurfaceRegistry();
    const el = document.createElement('div');
    registry.registerMount('s1', el);
    registry.destroy();

    expect(registry.getMount('s1')).toBeUndefined();
  });
});
