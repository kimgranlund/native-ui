/**
 * Register native-editor
 *
 * Side-effect module that registers the <native-editor> custom element.
 *
 * Usage:
 *   import '@nonoun/native-editor/register';
 */

import { define, NSegmentedControl, NSegment } from '@nonoun/native-ui';
import { NEditor } from './editor-element.ts';

// WHY: Editor stamps n-segmented-control + n-segment for the mode toggle — ensure they're registered.
define('n-segmented-control', NSegmentedControl);
define('n-segment', NSegment);
define('native-editor', NEditor);
