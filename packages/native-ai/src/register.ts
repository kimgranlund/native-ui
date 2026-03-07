/**
 * Register native-ai
 *
 * Side-effect module that registers all A2UI and Chat custom elements
 * plus dogfooded n-* components they create via document.createElement.
 *
 * Usage:
 *   import '@nonoun/native-ai/register';
 */

import './a2ui/register.ts';
import './chat/register.ts';
