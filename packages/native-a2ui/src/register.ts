/**
 * Register native-a2ui
 *
 * Side-effect module that registers the <native-a2ui> custom element.
 *
 * Usage:
 *   import '@nonoun/native-a2ui/register';
 */

import { define } from '@nonoun/native-ui';
import { NA2UI } from './a2ui-element.ts';

define('native-a2ui', NA2UI);
