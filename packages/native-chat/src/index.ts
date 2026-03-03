import './register.ts';

// ── Existing ──
export { NChatInput } from './chat-input-element.ts';
export { NChatPanel } from './chat-panel-element.ts';

// ── Feed ──
export { NChatFeed } from './feed/index.ts';

// ── Avatar ──
export { NChatAvatar } from './avatar/index.ts';

// ── Message ──
export {
  NChatMessage,
  NChatMessages,
  NChatMessageText,
  NChatMessageActivity,
  NChatMessageSeed,
  NChatMessageGenUI,
  NChatInputStructured,
} from './message/index.ts';

// ── Types ──
export type { SeedOption } from './message/chat-message-seed-element.ts';
export type { StructuredOption } from './message/chat-input-structured-element.ts';
export type { GenUINode } from './message/chat-message-genui-element.ts';

// ── Utilities ──
export { renderMarkdown, renderInline, sanitizeHtml } from './message/chat-message-text-element.ts';
