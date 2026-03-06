// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NSessionManager } from '../session/session-manager.ts';
import { NCatalog, buildCatalogFromRegistry } from '../session/catalog.ts';
import { Kernel, resetKernel } from '../../../../src/kernel/kernel.ts';

describe('NSessionManager', () => {
  let kernel: Kernel;
  let manager: NSessionManager;

  beforeEach(() => {
    resetKernel();
    kernel = new Kernel({ allowUnregistered: true });
    manager = new NSessionManager(kernel);
  });

  afterEach(() => {
    manager.destroy();
    resetKernel();
  });

  // ── Session Creation ──

  it('creates a session with core-only catalog', () => {
    const session = manager.createSession({
      agentId: 'test-agent',
      catalog: 'core-only',
    });

    expect(session.id).toBeTruthy();
    expect(session.agentId).toBe('test-agent');
    expect(session.status).toBe('active');
    expect(session.catalog.has('Button')).toBe(true);
  });

  it('creates a session with full catalog', () => {
    const session = manager.createSession({
      agentId: 'test-agent',
      catalog: 'full',
    });

    expect(session.catalog.has('Button')).toBe(true);
  });

  it('creates a session with custom catalog', () => {
    const catalog = new NCatalog([
      { a2uiType: 'Button', tagName: 'n-button', properties: [], events: [] },
    ]);
    const session = manager.createSession({
      agentId: 'test-agent',
      catalog,
    });

    expect(session.catalog.has('Button')).toBe(true);
    expect(session.catalog.has('Text')).toBe(false);
  });

  // ── Session Retrieval ──

  it('retrieves session by ID', () => {
    const session = manager.createSession({
      agentId: 'test-agent',
      catalog: 'core-only',
    });

    expect(manager.getSession(session.id)).toBe(session);
    expect(manager.getSession('nonexistent')).toBeUndefined();
  });

  it('lists all sessions', () => {
    manager.createSession({ agentId: 'a1', catalog: 'core-only' });
    manager.createSession({ agentId: 'a2', catalog: 'core-only' });

    expect(manager.getSessions()).toHaveLength(2);
  });

  // ── Surface Ownership ──

  it('auto-assigns ownership for pre-authorized surfaces', () => {
    const el = document.createElement('div');
    manager.surfaces.registerMount('s1', el);

    const session = manager.createSession({
      agentId: 'test-agent',
      catalog: 'core-only',
      surfaces: ['s1'],
    });

    expect(manager.surfaces.isOwner('s1', session)).toBe(true);
  });

  it('transfers surface ownership between sessions', () => {
    const el = document.createElement('div');
    manager.surfaces.registerMount('s1', el);

    const sessionA = manager.createSession({
      agentId: 'agent-a',
      catalog: 'core-only',
      surfaces: ['s1'],
    });
    const sessionB = manager.createSession({
      agentId: 'agent-b',
      catalog: 'core-only',
    });

    manager.transferSurfaceOwnership('s1', sessionB.id);

    expect(manager.surfaces.isOwner('s1', sessionB)).toBe(true);
    expect(manager.surfaces.isOwner('s1', sessionA)).toBe(false);
  });

  it('throws on transfer to nonexistent session', () => {
    const el = document.createElement('div');
    manager.surfaces.registerMount('s1', el);

    expect(() => manager.transferSurfaceOwnership('s1', 'fake')).toThrow();
  });

  // ── Session Termination ──

  it('terminates a single session', () => {
    const session = manager.createSession({
      agentId: 'test-agent',
      catalog: 'core-only',
    });

    manager.terminateSession(session.id);

    expect(session.status).toBe('terminated');
    expect(manager.getSession(session.id)).toBeUndefined();
  });

  it('terminateAll clears all sessions', () => {
    manager.createSession({ agentId: 'a1', catalog: 'core-only' });
    manager.createSession({ agentId: 'a2', catalog: 'core-only' });

    manager.terminateAll();

    expect(manager.getSessions()).toHaveLength(0);
  });

  it('destroy cleans up everything', () => {
    const el = document.createElement('div');
    manager.surfaces.registerMount('s1', el);
    manager.createSession({ agentId: 'a1', catalog: 'core-only' });

    manager.destroy();

    expect(manager.getSessions()).toHaveLength(0);
    expect(manager.surfaces.getMount('s1')).toBeUndefined();
  });
});
