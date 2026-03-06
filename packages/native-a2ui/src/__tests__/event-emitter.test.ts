// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { NEventEmitter } from '../session/event-emitter.ts';
import type { NInteractionEvent } from '../session/types.ts';

const makeEvent = (overrides?: Partial<NInteractionEvent>): NInteractionEvent => ({
  surfaceId: 'surface-1',
  componentId: 'btn-1',
  eventType: 'press',
  payload: {},
  timestamp: Date.now(),
  ...overrides,
});

describe('NEventEmitter', () => {
  it('emits events to subscribers', () => {
    const emitter = new NEventEmitter();
    const received: NInteractionEvent[] = [];
    emitter.on(e => received.push(e));

    const event = makeEvent();
    emitter.emit(event);

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(event);
  });

  it('supports multiple subscribers', () => {
    const emitter = new NEventEmitter();
    let count = 0;
    emitter.on(() => count++);
    emitter.on(() => count++);

    emitter.emit(makeEvent());
    expect(count).toBe(2);
  });

  it('returns unsubscribe function', () => {
    const emitter = new NEventEmitter();
    const received: NInteractionEvent[] = [];
    const unsub = emitter.on(e => received.push(e));

    emitter.emit(makeEvent());
    expect(received).toHaveLength(1);

    unsub();
    emitter.emit(makeEvent());
    expect(received).toHaveLength(1);
  });

  it('destroy clears all subscribers', () => {
    const emitter = new NEventEmitter();
    let count = 0;
    emitter.on(() => count++);
    emitter.on(() => count++);

    emitter.destroy();
    emitter.emit(makeEvent());
    expect(count).toBe(0);
  });
});
