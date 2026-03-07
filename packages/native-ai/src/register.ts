/**
 * Register native-ai
 *
 * Side-effect module that registers all A2UI and Chat custom elements
 * plus dogfooded n-* components they create via document.createElement.
 *
 * Usage:
 *   import '@nonoun/native-ai/register';
 */

export { NA2UI } from './a2ui/register.ts';
export {
  NChatInput, NChatPanel, NChatFeed, NChatAvatar,
  NChatMessage, NChatMessages, NChatMessageText,
  NChatMessageActivity, NChatMessageSeed, NChatMessageGenUI,
  NChatInputStructured,
} from './chat/register.ts';
