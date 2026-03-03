import { define, NTextarea, NButton, NIcon, NToolbar, NDialog, NCard, registerIcon } from '@nonoun/native-ui';
import { NChatInput } from './chat-input-element.ts';
import { NChatPanel } from './chat-panel-element.ts';
import { NChatFeed } from './feed/chat-feed-element.ts';
import { NChatAvatar } from './avatar/chat-avatar-element.ts';
import { NChatMessage } from './message/chat-message-element.ts';
import { NChatMessages } from './message/chat-messages-element.ts';
import { NChatMessageText } from './message/chat-message-text-element.ts';
import { NChatMessageActivity } from './message/chat-message-activity-element.ts';
import { NChatMessageSeed } from './message/chat-message-seed-element.ts';
import { NChatMessageGenUI } from './message/chat-message-genui-element.ts';
import { NChatInputStructured } from './message/chat-input-structured-element.ts';

// ── Chat components ──
define('n-chat-input', NChatInput);
define('native-chat-panel', NChatPanel);
define('n-chat-feed', NChatFeed);
define('n-chat-avatar', NChatAvatar);
define('n-chat-message', NChatMessage);
define('n-chat-messages', NChatMessages);
define('n-chat-message-text', NChatMessageText);
define('n-chat-message-activity', NChatMessageActivity);
define('n-chat-message-seed', NChatMessageSeed);
define('n-chat-message-genui', NChatMessageGenUI);
define('n-chat-input-structured', NChatInputStructured);

// ── Dogfooded n-* components created via document.createElement ──
define('n-textarea', NTextarea);
define('n-button', NButton);
define('n-icon', NIcon);
define('n-toolbar', NToolbar);
define('n-dialog', NDialog);
define('n-card', NCard);

// ── Icons used in chat components ──
registerIcon('chat-dots', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M116,128a12,12,0,1,1,12,12A12,12,0,0,1,116,128ZM84,140a12,12,0,1,0-12-12A12,12,0,0,0,84,140Zm88,0a12,12,0,1,0-12-12A12,12,0,0,0,172,140Zm60-76V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216A16,16,0,0,1,232,64ZM40,224h0ZM216,64H40V224l34.77-30A8,8,0,0,1,80,192H216Z"/></svg>');
registerIcon('user', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8C55.71,194.74,89.05,176,128,176s72.29,18.74,89.07,44a8,8,0,0,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/></svg>');

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
};
