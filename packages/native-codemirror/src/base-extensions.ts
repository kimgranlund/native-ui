/**
 * Base CodeMirror Extensions
 *
 * Shared defaults for all CodeMirror instances in the NativeUI ecosystem.
 * Includes keymaps, bracket handling, autocompletion, line numbers, and
 * active-line highlighting.
 */

import type { Extension } from '@codemirror/state';
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightSpecialChars,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from '@codemirror/language';
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';

/**
 * Base extension set shared by all NativeUI CodeMirror instances.
 *
 * Includes:
 * - Default, history, close-brackets, fold, and completion keymaps
 * - Undo/redo history
 * - Bracket matching and auto-close
 * - Autocompletion
 * - Line numbers with fold gutter
 * - Active line + gutter highlighting
 * - Selection drawing and special character highlighting
 * - Indent on input
 */
export const NBaseExtensions: Extension = [
  // Input handling
  highlightSpecialChars(),
  drawSelection(),
  indentOnInput(),

  // History
  history(),

  // Brackets
  bracketMatching(),
  closeBrackets(),

  // Autocompletion
  autocompletion(),

  // Gutters
  lineNumbers(),
  foldGutter(),

  // Active line
  highlightActiveLine(),
  highlightActiveLineGutter(),

  // Keymaps (order matters: specific before general)
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
  ]),
];
