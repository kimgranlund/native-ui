/**
 * Register native-editor
 *
 * Side-effect module that registers the <native-editor> custom element.
 *
 * Usage:
 *   import '@nonoun/native-editor/register';
 */

import { define } from '@nonoun/native-ui';
import { NEditor } from './editor-element.ts';

define('native-editor', NEditor);
