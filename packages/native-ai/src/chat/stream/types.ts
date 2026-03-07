export interface ChatStreamChunk {
  delta: string;
  fullMessage: string;
  role: 'assistant' | 'user';
  datetime: number;
  done: boolean;
  /** True when stream ended without an explicit completion signal (e.g., no `[DONE]` sentinel). */
  partial?: boolean;
}

export type StreamFormat = 'sse' | 'ndjson' | 'json';

// ── Transport status primitives (T0050) ──

export type TransportState =
  | 'idle'
  | 'sending'
  | 'streaming'
  | 'retrying'
  | 'rate-limited'
  | 'auth-required'
  | 'server-error'
  | 'offline'
  | 'ready';

export interface TransportStatus {
  state: TransportState;
  statusCode?: number;
  retryInMs?: number;
  attempt?: number;
  maxAttempts?: number;
  error?: Error;
}

export type TransportStateCallback = (status: TransportStatus) => void;

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface ChatTransportOptions {
  baseUrl: string;
  clientId?: string;
  format?: StreamFormat;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onStateChange?: TransportStateCallback;
  retry?: RetryOptions;
}

export interface ChatStreamEvent {
  type: 'start' | 'chunk' | 'complete' | 'partial' | 'error' | 'stop';
  chunk?: ChatStreamChunk;
  error?: Error;
  durationMs?: number;
  requestId: string;
}
