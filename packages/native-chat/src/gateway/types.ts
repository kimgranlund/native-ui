export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  datetime: number;
  role: ChatRole;
  message: string;
  isOpeningMessage?: boolean;
  partial?: boolean;
}

export interface BootstrapResponse {
  id: string;
  messages?: ChatMessage[];
}

export interface SendMessageResponse {
  role: ChatRole;
  message: string;
  datetime?: number;
  context?: string[];
  partial?: boolean;
}

export interface GatewayModel {
  id: string;
  label: string;
  default?: boolean;
}

export interface ClientMetadataResponse {
  clientId: string;
  name?: string;
  timezone?: string;
}

export interface SendMessageStreamChunk {
  delta: string;
  fullMessage: string;
  role: ChatRole;
  datetime: number;
  done: boolean;
  partial?: boolean;
}

export interface GatewayStreamEvent {
  phase: 'start' | 'delta' | 'complete' | 'error';
  mode: SendTransportMode | 'unknown';
  contentType?: string;
  delta?: string;
  fullMessage?: string;
  message?: string;
}

export type SendTransportMode = 'sse' | 'ndjson' | 'json';

export type GatewayErrorKind = 'auth' | 'rate-limit' | 'server' | 'client' | 'network' | 'unknown';

export interface GatewayEvent {
  type: 'request:start' | 'request:retry' | 'request:success' | 'request:error';
  requestId: string;
  endpoint: string;
  method: string;
  attempt: number;
  maxAttempts: number;
  durationMs?: number;
  status?: number;
  errorKind?: GatewayErrorKind;
}

export interface GatewayHealth {
  healthy: boolean;
  requestId: string;
  status: number;
  durationMs: number;
}

export interface GatewayErrorLike {
  kind: GatewayErrorKind;
  status?: number;
  body?: string;
  contentType?: string;
  message: string;
}

export function isGatewayErrorLike(error: unknown): error is GatewayErrorLike {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error;
}
