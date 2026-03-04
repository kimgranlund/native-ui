// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { TelemetryEmitter } from '../emitter.ts';
import { CHAT_EVENTS } from '../events.ts';
import type { TelemetryCorrelation } from '../types.ts';

function makeCorrelation(): TelemetryCorrelation {
  return { requestId: 'req-123', sessionId: 'sess-1' };
}

describe('TelemetryEmitter', () => {
  it('dispatches CustomEvent with correct type', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target);
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_START, handler);

    emitter.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation: makeCorrelation(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('native:generation-start');
    expect(event.detail.correlation.requestId).toBe('req-123');
  });

  it('applies redactor before dispatch', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'minimal');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_START, handler);

    emitter.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation: makeCorrelation(),
      detail: { query: 'sensitive data' },
    });

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.detail.query).toBe('[redacted:14chars]');
  });

  it('debug level preserves sensitive fields', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'debug');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_START, handler);

    emitter.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation: makeCorrelation(),
      detail: { query: 'sensitive data' },
    });

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.detail.query).toBe('sensitive data');
  });

  it('setLevel changes redaction behavior', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'minimal');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_START, handler);

    // Start minimal — should redact
    emitter.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation: makeCorrelation(),
      detail: { query: 'secret' },
    });
    expect(
      (handler.mock.calls[0][0] as CustomEvent).detail.detail.query,
    ).toMatch(/^\[redacted:/);

    // Switch to debug — should preserve
    emitter.setLevel('debug');
    emitter.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation: makeCorrelation(),
      detail: { query: 'secret' },
    });
    expect(
      (handler.mock.calls[1][0] as CustomEvent).detail.detail.query,
    ).toBe('secret');
  });

  it('setRedactor replaces the redaction function', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target);
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_START, handler);

    emitter.setRedactor((event) => ({
      ...event,
      detail: { custom: 'redacted' },
    }));

    emitter.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation: makeCorrelation(),
      detail: { query: 'anything' },
    });

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.detail).toEqual({ custom: 'redacted' });
  });

  it('events bubble by default', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const emitter = new TelemetryEmitter(target);
    const handler = vi.fn();

    document.body.addEventListener(CHAT_EVENTS.TRANSPORT, handler);

    emitter.emitTransport(makeCorrelation(), 'sse', 'text/event-stream');

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeEventListener(CHAT_EVENTS.TRANSPORT, handler);
    document.body.removeChild(target);
  });
});

describe('TelemetryEmitter — convenience methods', () => {
  it('emitTransport dispatches with correct type and detail', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'debug');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.TRANSPORT, handler);

    emitter.emitTransport(makeCorrelation(), 'sse', 'text/event-stream');

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('native:chat-transport');
    expect(event.detail.detail.mode).toBe('sse');
    expect(event.detail.detail.contentType).toBe('text/event-stream');
  });

  it('emitGenerationStart sets timing.startedAt', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'debug');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_START, handler);

    const before = Date.now();
    emitter.emitGenerationStart(makeCorrelation());
    const after = Date.now();

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('native:generation-start');
    expect(event.detail.timing.startedAt).toBeGreaterThanOrEqual(before);
    expect(event.detail.timing.startedAt).toBeLessThanOrEqual(after);
  });

  it('emitGenerationComplete sets timing.completedAt and durationMs', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'debug');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.GENERATION_COMPLETE, handler);

    emitter.emitGenerationComplete(makeCorrelation(), 1500);

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('native:generation-complete');
    expect(event.detail.timing.durationMs).toBe(1500);
    expect(event.detail.timing.completedAt).toBeDefined();
  });

  it('emitWarning includes message and optional detail', () => {
    const target = new EventTarget();
    const emitter = new TelemetryEmitter(target, 'debug');
    const handler = vi.fn();

    target.addEventListener(CHAT_EVENTS.WARNING, handler);

    emitter.emitWarning(makeCorrelation(), 'Rate limited', { retryAfter: 5 });

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('native:chat-warning');
    expect(event.detail.detail.message).toBe('Rate limited');
    expect(event.detail.detail.retryAfter).toBe(5);
  });
});
