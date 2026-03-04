export interface TelemetryCorrelation {
  requestId: string;
  sessionId?: string;
  conversationId?: string;
  messageId?: string;
  parentMessageId?: string;
}

export interface TelemetryTiming {
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface TelemetryRetry {
  attempt?: number;
  maxAttempts?: number;
  retryReason?: string;
}

export type TelemetryLevel = 'minimal' | 'debug';

export interface TelemetryEvent {
  type: string;
  correlation: TelemetryCorrelation;
  timing?: TelemetryTiming;
  retry?: TelemetryRetry;
  detail?: Record<string, unknown>;
}

export type TelemetryRedactor = (event: TelemetryEvent) => TelemetryEvent;
