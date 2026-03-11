// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GestureRouter } from '../gesture-router.ts';
import type { GestureParticipant } from '../gesture-router.ts';

let router: GestureRouter;
let host: HTMLElement;

function makeParticipant(overrides: Partial<GestureParticipant> = {}): GestureParticipant {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    priority: 10,
    host,
    onGestureStart: () => 'claim',
    ...overrides,
  };
}

function firePointerDown(target: EventTarget = host): void {
  const ev = new PointerEvent('pointerdown', { bubbles: true, composed: true });
  Object.defineProperty(ev, 'target', { value: target });
  document.dispatchEvent(ev);
}

function firePointerUp(): void {
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }));
}

beforeEach(() => {
  router = new GestureRouter();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GestureRouter', () => {
  it('starts with no active participant', () => {
    expect(router.activeParticipant).toBeNull();
  });

  it('claims gesture for the first (and only) participant', () => {
    const p = makeParticipant();
    router.register(p);
    firePointerDown();
    expect(router.activeParticipant).toBe(p);
  });

  it('releases claim on pointerup', () => {
    const p = makeParticipant();
    router.register(p);
    firePointerDown();
    expect(router.activeParticipant).toBe(p);
    firePointerUp();
    expect(router.activeParticipant).toBeNull();
  });

  it('respects priority — lower number wins', () => {
    const low = makeParticipant({ priority: 10, id: 'low' });
    const high = makeParticipant({ priority: 20, id: 'high' });
    router.register(high);
    router.register(low);
    firePointerDown();
    expect(router.activeParticipant).toBe(low);
  });

  it('skips participants that pass', () => {
    const passer = makeParticipant({ priority: 10, id: 'passer', onGestureStart: () => 'pass' });
    const claimer = makeParticipant({ priority: 20, id: 'claimer' });
    router.register(passer);
    router.register(claimer);
    firePointerDown();
    expect(router.activeParticipant).toBe(claimer);
  });

  it('notifies losing participants via onGestureCancel', () => {
    const cancelled: string[] = [];
    const winner = makeParticipant({
      priority: 10,
      id: 'winner',
    });
    const loser = makeParticipant({
      priority: 20,
      id: 'loser',
      onGestureCancel: () => cancelled.push('loser'),
    });
    router.register(winner);
    router.register(loser);
    firePointerDown();
    expect(cancelled).toEqual(['loser']);
  });

  it('ignores events when target is outside participant hosts', () => {
    const outsideTarget = document.createElement('span');
    document.body.appendChild(outsideTarget);
    const p = makeParticipant();
    router.register(p);
    firePointerDown(outsideTarget);
    expect(router.activeParticipant).toBeNull();
  });

  it('does not claim again while already active', () => {
    let callCount = 0;
    const p = makeParticipant({
      onGestureStart: () => { callCount++; return 'claim'; },
    });
    router.register(p);
    firePointerDown();
    expect(callCount).toBe(1);
    firePointerDown();
    expect(callCount).toBe(1); // not called again
  });

  it('unregistering clears active participant if it was the active one', () => {
    const p = makeParticipant();
    router.register(p);
    firePointerDown();
    expect(router.activeParticipant).toBe(p);
    router.unregister(p);
    expect(router.activeParticipant).toBeNull();
  });

  it('manual release clears the active participant', () => {
    const p = makeParticipant();
    router.register(p);
    firePointerDown();
    router.release();
    expect(router.activeParticipant).toBeNull();
  });

  it('no active participant when all pass', () => {
    const p1 = makeParticipant({ onGestureStart: () => 'pass' });
    const p2 = makeParticipant({ onGestureStart: () => 'pass' });
    router.register(p1);
    router.register(p2);
    firePointerDown();
    expect(router.activeParticipant).toBeNull();
  });

  it('auto-releases stale active participant when host is disconnected', () => {
    const p = makeParticipant();
    router.register(p);
    firePointerDown();
    expect(router.activeParticipant).toBe(p);

    // Simulate View Transition disconnect — host removed from DOM
    host.remove();

    // Next pointerdown should auto-release the stale participant
    const host2 = document.createElement('div');
    document.body.appendChild(host2);
    const p2 = makeParticipant({ id: 'new', host: host2 });
    router.register(p2);
    firePointerDown(host2);

    expect(router.activeParticipant).toBe(p2);
  });

  it('prunes disconnected participants on pointerdown', () => {
    const p = makeParticipant();
    router.register(p);

    // Disconnect the host
    host.remove();

    // The stale participant should be pruned
    const host2 = document.createElement('div');
    document.body.appendChild(host2);
    const p2 = makeParticipant({ id: 'new', host: host2 });
    router.register(p2);
    firePointerDown(host2);

    expect(router.activeParticipant).toBe(p2);
  });
});
