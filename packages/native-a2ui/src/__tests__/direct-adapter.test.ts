// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DirectAdapter } from '../adapters/direct-adapter.ts';
import { NSessionManager } from '../session/session-manager.ts';
import { NEventEmitter } from '../session/event-emitter.ts';
import { buildCatalogFromRegistry } from '../session/catalog.ts';
import { Kernel, resetKernel } from '../../../../src/kernel/kernel.ts';
import type { NInteractionEvent } from '../session/types.ts';

describe('DirectAdapter', () => {
  let kernel: Kernel;
  let manager: NSessionManager;
  let adapter: DirectAdapter;

  beforeEach(async () => {
    resetKernel();
    kernel = new Kernel({ allowUnregistered: true });
    manager = new NSessionManager(kernel);
    adapter = new DirectAdapter({ agentId: 'test-direct', surfaces: ['test-surface'] });

    // Register a surface mount
    const mount = document.createElement('div');
    manager.surfaces.registerMount('test-surface', mount);

    await adapter.connect({
      sessionManager: manager,
      eventEmitter: new NEventEmitter(),
      defaultCatalog: buildCatalogFromRegistry('core-only'),
    });
  });

  afterEach(async () => {
    await adapter.disconnect();
    manager.destroy();
    resetKernel();
  });

  it('creates a session on connect', () => {
    expect(adapter.session).not.toBeNull();
    expect(adapter.session!.agentId).toBe('test-direct');
    expect(adapter.session!.status).toBe('active');
  });

  it('sends A2UI messages to the session', () => {
    // Send a createSurface message
    adapter.send({
      createSurface: { surfaceId: 'test-surface' },
    });

    // No error thrown = success (surface was created in the session's adapter)
  });

  it('sends updateComponents messages', () => {
    adapter.send({
      updateComponents: {
        surfaceId: 'test-surface',
        components: [
          { id: '1', component: 'Button', label: 'Click me' },
        ],
      },
    });

    // Verify the surface was rendered
    const mount = manager.surfaces.getMount('test-surface');
    expect(mount?.children.length).toBeGreaterThan(0);
  });

  it('throws when sending before connect', async () => {
    const disconnected = new DirectAdapter();
    expect(() => disconnected.send({ createSurface: { surfaceId: 's1' } })).toThrow('not connected');
  });

  it('terminates session on disconnect', async () => {
    const session = adapter.session!;
    await adapter.disconnect();

    expect(session.status).toBe('terminated');
    expect(adapter.session).toBeNull();
  });

  it('can subscribe to interaction events', () => {
    const events: NInteractionEvent[] = [];
    const unsub = adapter.onInteraction(e => events.push(e));

    // Interaction events are emitted by the session's eventEmitter
    // when the rendered surface's action handlers fire.
    // We can test the subscription mechanism directly:
    adapter.session!.eventEmitter.emit({
      surfaceId: 'test-surface',
      componentId: 'btn-1',
      eventType: 'press',
      payload: {},
      timestamp: Date.now(),
    });

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('press');

    unsub();

    adapter.session!.eventEmitter.emit({
      surfaceId: 'test-surface',
      componentId: 'btn-1',
      eventType: 'press',
      payload: {},
      timestamp: Date.now(),
    });

    expect(events).toHaveLength(1); // no new events after unsub
  });
});
