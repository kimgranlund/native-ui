import { define } from '@nonoun/native-ui';
import { NChatMessage } from './chat-message-element.ts';
import { NChatMessages } from './chat-messages-element.ts';
import { NChatMessageText } from './chat-message-text-element.ts';
import { NChatMessageActivity } from './chat-message-activity-element.ts';
import { NChatMessageSeed } from './chat-message-seed-element.ts';
import { NChatMessageGenUI } from './chat-message-genui-element.ts';
import { NChatInputStructured } from './chat-input-structured-element.ts';

define('n-chat-message', NChatMessage);
define('n-chat-messages', NChatMessages);
define('n-chat-message-text', NChatMessageText);
define('n-chat-message-activity', NChatMessageActivity);
define('n-chat-message-seed', NChatMessageSeed);
define('n-chat-message-genui', NChatMessageGenUI);
define('n-chat-input-structured', NChatInputStructured);
