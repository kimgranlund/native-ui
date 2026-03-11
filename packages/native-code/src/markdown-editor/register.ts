/**
 * Register n-markdown-editor
 *
 * Side-effect module that registers the <n-markdown-editor> custom element.
 *
 * Usage:
 *   import '@nonoun/native-code/register';
 */

import { define } from '@nonoun/native-core';
import { NSegmentedControl, NSegment } from '@nonoun/native-ui';
import { NMarkdownEditor } from './markdown-editor-element.ts';

// WHY: Editor stamps n-segmented-control + n-segment for the mode toggle — ensure they're registered.
define('n-segmented-control', NSegmentedControl);
define('n-segment', NSegment);
define('n-markdown-editor', NMarkdownEditor);

export { NMarkdownEditor };
