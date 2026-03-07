// A2UI — protocol adapter, workbench, session management
export * from './a2ui/index.ts';

// Chat — input, message layout, stream, telemetry
// Re-export everything except TransportState (name collision with a2ui)
export {
  NChatInput,
  NChatPanel,
  NChatFeed,
  NChatAvatar,
  NChatMessage,
  NChatMessages,
  NChatMessageText,
  NChatMessageActivity,
  NChatMessageSeed,
  NChatMessageGenUI,
  NChatInputStructured,
  ACTION_REGISTRY, ROLE_DEFAULTS,
  renderMarkdown, renderInline, sanitizeHtml,
  parseSSE, parseNDJSON, parseJSON, detectFormat,
  createChatStream, createChatTransport,
  classifyStreamEnd, classifyHttpError, backoffDelay,
  CHAT_EVENTS, SAFE_FIELDS, SENSITIVE_FIELDS,
  scrubPII, createDefaultRedactor, TelemetryEmitter,
} from './chat/index.ts';

export type {
  AutoFocusPolicy, ChatPanelOpenOptions, FocusComposerOptions, ModelOption,
  ChatMessageActionDef,
  SeedOption,
  StructuredOption,
  GenUINode,
  ChatStreamChunk, StreamFormat, ChatTransportOptions, ChatStreamEvent,
  ChatTransport, TransportStatus, TransportStateCallback,
  RetryOptions, StreamEndReason,
  TelemetryCorrelation, TelemetryTiming, TelemetryRetry,
  TelemetryLevel, TelemetryEvent, TelemetryRedactor,
} from './chat/index.ts';

// Disambiguated re-exports for colliding names
export type { TransportState as ChatTransportState } from './chat/index.ts';
