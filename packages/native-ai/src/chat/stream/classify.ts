import type { ChatStreamChunk, TransportState } from './types.ts';

export type StreamEndReason = 'complete' | 'partial' | 'error' | 'stopped';

/**
 * Classify how a stream ended based on the final chunk and optional error.
 * - `complete` — explicit done signal received (e.g., `[DONE]` sentinel, `finish_reason`)
 * - `partial` — stream ended without explicit completion (truncated)
 * - `error` — an error occurred during streaming
 * - `stopped` — consumer aborted the stream
 */
export function classifyStreamEnd(chunk: ChatStreamChunk, error?: Error): StreamEndReason {
  if (error) {
    if (error.name === 'AbortError') return 'stopped';
    return 'error';
  }
  if (chunk.partial) return 'partial';
  return 'complete';
}

/**
 * Classify an HTTP status code into a transport state.
 */
export function classifyHttpError(status: number): TransportState {
  if (status === 401 || status === 403) return 'auth-required';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'server-error';
  return 'server-error';
}

/**
 * Calculate exponential backoff delay with jitter.
 */
export function backoffDelay(attempt: number, base = 1000, max = 30000): number {
  return Math.min(max, base * 2 ** attempt + Math.random() * 500);
}
