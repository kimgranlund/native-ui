// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { classifyStreamEnd, classifyHttpError, backoffDelay } from '../classify.ts';
import type { ChatStreamChunk } from '../types.ts';

function makeChunk(overrides: Partial<ChatStreamChunk> = {}): ChatStreamChunk {
  return {
    delta: '',
    fullMessage: 'test',
    role: 'assistant',
    datetime: Date.now(),
    done: true,
    ...overrides,
  };
}

describe('classifyStreamEnd', () => {
  it('returns "complete" for a normal done chunk', () => {
    expect(classifyStreamEnd(makeChunk())).toBe('complete');
  });

  it('returns "partial" when chunk.partial is true', () => {
    expect(classifyStreamEnd(makeChunk({ partial: true }))).toBe('partial');
  });

  it('returns "error" for a non-abort error', () => {
    expect(classifyStreamEnd(makeChunk(), new Error('fail'))).toBe('error');
  });

  it('returns "stopped" for an AbortError', () => {
    const err = new DOMException('Aborted', 'AbortError');
    expect(classifyStreamEnd(makeChunk(), err)).toBe('stopped');
  });

  it('error takes precedence over partial', () => {
    expect(classifyStreamEnd(makeChunk({ partial: true }), new Error('fail'))).toBe('error');
  });
});

describe('classifyHttpError', () => {
  it('classifies 401 as auth-required', () => {
    expect(classifyHttpError(401)).toBe('auth-required');
  });

  it('classifies 403 as auth-required', () => {
    expect(classifyHttpError(403)).toBe('auth-required');
  });

  it('classifies 429 as rate-limited', () => {
    expect(classifyHttpError(429)).toBe('rate-limited');
  });

  it('classifies 500 as server-error', () => {
    expect(classifyHttpError(500)).toBe('server-error');
  });

  it('classifies 503 as server-error', () => {
    expect(classifyHttpError(503)).toBe('server-error');
  });

  it('classifies 400 as server-error (fallback)', () => {
    expect(classifyHttpError(400)).toBe('server-error');
  });
});

describe('backoffDelay', () => {
  it('returns a number', () => {
    expect(typeof backoffDelay(0)).toBe('number');
  });

  it('increases with attempt count', () => {
    // Due to jitter we test the base pattern
    const d0 = backoffDelay(0, 1000, 30000);
    const d3 = backoffDelay(3, 1000, 30000);
    // attempt 3 base = 1000 * 2^3 = 8000, attempt 0 base = 1000
    // Even with jitter (+0-500), d3 should be significantly larger
    expect(d3).toBeGreaterThan(d0);
  });

  it('respects max delay', () => {
    const delay = backoffDelay(20, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5500); // max + jitter
  });
});
