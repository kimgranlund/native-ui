// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { scrubPII, createDefaultRedactor } from '../redactor.ts';
import type { TelemetryEvent } from '../types.ts';

function makeEvent(detail?: Record<string, unknown>): TelemetryEvent {
  return {
    type: 'native:generation-start',
    correlation: { requestId: 'req-1' },
    detail,
  };
}

describe('scrubPII', () => {
  it('redacts email addresses', () => {
    const result = scrubPII('Contact user@example.com for details');
    expect(result).toBe('Contact [redacted:email] for details');
    expect(result).not.toContain('user@example.com');
  });

  it('redacts multiple email addresses', () => {
    const result = scrubPII('From a@b.co to c@d.org');
    expect(result).toBe('From [redacted:email] to [redacted:email]');
  });

  it('redacts phone-like patterns', () => {
    const result = scrubPII('Call +1-555-123-4567 now');
    expect(result).toContain('[redacted:phone]');
    expect(result).not.toContain('555-123-4567');
  });

  it('redacts credit-card-like patterns', () => {
    const result = scrubPII('Card: 4111-1111-1111-1111 on file');
    expect(result).toContain('[redacted:card]');
    expect(result).not.toContain('4111');
  });

  it('redacts card numbers with spaces', () => {
    const result = scrubPII('Card: 4111 1111 1111 1111');
    expect(result).toContain('[redacted:card]');
  });

  it('returns clean text unchanged', () => {
    const clean = 'Hello world, no PII here';
    expect(scrubPII(clean)).toBe(clean);
  });
});

describe('createDefaultRedactor — minimal', () => {
  const redactor = createDefaultRedactor('minimal');

  it('replaces sensitive fields with [redacted:Nchars]', () => {
    const event = makeEvent({
      query: 'what is my balance',
      message: 'Your balance is $100',
      requestId: 'req-1',
    });

    const result = redactor(event);

    expect(result.detail!.query).toBe('[redacted:18chars]');
    expect(result.detail!.message).toBe('[redacted:20chars]');
    // Safe field preserved
    expect(result.detail!.requestId).toBe('req-1');
  });

  it('preserves safe fields', () => {
    const event = makeEvent({
      mode: 'streaming',
      contentType: 'text/event-stream',
      durationMs: 1234,
    });

    const result = redactor(event);

    expect(result.detail!.mode).toBe('streaming');
    expect(result.detail!.contentType).toBe('text/event-stream');
    expect(result.detail!.durationMs).toBe(1234);
  });

  it('passes through events without detail', () => {
    const event = makeEvent();
    const result = redactor(event);
    expect(result).toEqual(event);
  });

  it('redacts all known sensitive fields', () => {
    const event = makeEvent({
      query: 'q',
      message: 'm',
      delta: 'd',
      fullMessage: 'fm',
      body: 'b',
      content: 'c',
      prompt: 'p',
      response: 'r',
    });

    const result = redactor(event);

    for (const key of [
      'query', 'message', 'delta', 'fullMessage',
      'body', 'content', 'prompt', 'response',
    ]) {
      expect(result.detail![key]).toMatch(/^\[redacted:\d+chars\]$/);
    }
  });

  it('only redacts string values for sensitive fields', () => {
    const event = makeEvent({
      content: 42,
      body: true,
    });

    const result = redactor(event);
    // Non-string values pass through even for sensitive keys
    expect(result.detail!.content).toBe(42);
    expect(result.detail!.body).toBe(true);
  });
});

describe('createDefaultRedactor — debug', () => {
  const redactor = createDefaultRedactor('debug');

  it('preserves all fields including sensitive ones', () => {
    const event = makeEvent({
      query: 'what is my balance',
      message: 'Your balance is $100',
      requestId: 'req-1',
    });

    const result = redactor(event);

    expect(result.detail!.query).toBe('what is my balance');
    expect(result.detail!.message).toBe('Your balance is $100');
    expect(result.detail!.requestId).toBe('req-1');
  });

  it('returns the same event object', () => {
    const event = makeEvent({ content: 'secret' });
    const result = redactor(event);
    expect(result).toBe(event);
  });
});
