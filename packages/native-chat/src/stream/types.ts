export interface ChatStreamChunk {
  delta: string;
  fullMessage: string;
  role: 'assistant' | 'user';
  datetime: number;
  done: boolean;
}

export type StreamFormat = 'sse' | 'ndjson' | 'json';

export interface ChatTransportOptions {
  baseUrl: string;
  clientId?: string;
  format?: StreamFormat;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ChatStreamEvent {
  type: 'start' | 'chunk' | 'complete' | 'error' | 'stop';
  chunk?: ChatStreamChunk;
  error?: Error;
  durationMs?: number;
  requestId: string;
}
