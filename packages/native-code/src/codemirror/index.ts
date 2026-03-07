/**
 * @nonoun/native-code — CodeMirror integration
 *
 * Shared CodeMirror 6 integration for the NativeUI ecosystem.
 *
 * Provides a dark theme, syntax highlighting, base extensions, and a
 * factory function. Also re-exports key CodeMirror APIs so consumer
 * packages can import through this single dependency.
 */

// ---------------------------------------------------------------------------
// Package modules
// ---------------------------------------------------------------------------

export { NTheme, NHighlightStyle, NSyntaxHighlighting } from './theme.ts';
export { NBaseExtensions } from './base-extensions.ts';
export { createEditorView } from './factory.ts';
export type { CreateEditorOptions } from './factory.ts';
export { NCodemirror } from './codemirror-element.ts';

// ---------------------------------------------------------------------------
// Re-exports: @codemirror/view
// ---------------------------------------------------------------------------

export {
  EditorView,
  keymap,
  Decoration,
  ViewPlugin,
  WidgetType,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view';

export type { DecorationSet, ViewUpdate } from '@codemirror/view';

// ---------------------------------------------------------------------------
// Re-exports: @codemirror/state
// ---------------------------------------------------------------------------

export { EditorState, Compartment, StateField, StateEffect } from '@codemirror/state';
export type { Extension, Transaction } from '@codemirror/state';

// ---------------------------------------------------------------------------
// Re-exports: @codemirror/language
// ---------------------------------------------------------------------------

export {
  syntaxHighlighting,
  HighlightStyle,
  syntaxTree,
  foldGutter,
  bracketMatching,
  indentOnInput,
} from '@codemirror/language';

// ---------------------------------------------------------------------------
// Re-exports: @codemirror/commands
// ---------------------------------------------------------------------------

export { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands';

// ---------------------------------------------------------------------------
// Re-exports: @codemirror/autocomplete
// ---------------------------------------------------------------------------

export {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';

// ---------------------------------------------------------------------------
// Re-exports: @lezer/highlight
// ---------------------------------------------------------------------------

export { tags } from '@lezer/highlight';
