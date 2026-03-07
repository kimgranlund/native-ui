export const CHAT_EVENTS = {
  TRANSPORT: 'native:chat-transport',
  GENERATION_START: 'native:generation-start',
  GENERATION_COMPLETE: 'native:generation-complete',
  GENERATION_STOP: 'native:generation-stop',
  GENERATION_ERROR: 'native:generation-error',
  WARNING: 'native:chat-warning',
} as const;

export const SAFE_FIELDS = [
  'requestId',
  'sessionId',
  'conversationId',
  'messageId',
  'mode',
  'contentType',
  'durationMs',
  'startedAt',
  'completedAt',
  'attempt',
  'maxAttempts',
  'chunkIndex',
] as const;

export const SENSITIVE_FIELDS = [
  'query',
  'message',
  'delta',
  'fullMessage',
  'body',
  'content',
  'prompt',
  'response',
] as const;
