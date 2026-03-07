/**
 * Editor Factory
 *
 * createEditorView() assembles theme, syntax highlighting, base extensions,
 * and user-supplied extensions into a ready-to-use EditorView.
 */

import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { NTheme, NSyntaxHighlighting } from './theme.ts';
import { NBaseExtensions } from './base-extensions.ts';

/**
 * Options for createEditorView.
 */
export interface CreateEditorOptions {
  /** Initial document content. Defaults to empty string. */
  doc?: string;
  /** Additional extensions appended after the base set. */
  extensions?: Extension[];
  /** When true, the editor is read-only (no editing, but still selectable). */
  readonly?: boolean;
}

/**
 * Create a fully themed CodeMirror EditorView.
 *
 * Combines the NativeUI dark theme, syntax highlighting, base extensions
 * (keymaps, history, brackets, autocomplete, line numbers, etc.), and any
 * additional extensions the consumer provides.
 *
 * @param container - DOM element to mount the editor into.
 * @param options   - Optional configuration.
 * @returns A live EditorView instance.
 *
 * @example
 * ```ts
 * import { createEditorView } from '@nonoun/native-codemirror';
 *
 * const view = createEditorView(document.getElementById('editor')!, {
 *   doc: 'console.log("hello");',
 *   readonly: true,
 * });
 * ```
 */
export function createEditorView(
  container: HTMLElement,
  options?: CreateEditorOptions,
): EditorView {
  const { doc = '', extensions = [], readonly = false } = options ?? {};

  const allExtensions: Extension[] = [
    NTheme,
    NSyntaxHighlighting,
    NBaseExtensions,
    ...extensions,
  ];

  if (readonly) {
    allExtensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  }

  const state = EditorState.create({
    doc,
    extensions: allExtensions,
  });

  return new EditorView({
    state,
    parent: container,
    // WHY: When the editor parent is slotted inside a shadow host (e.g. native-dashboard),
    // CM6's getRoot() follows assignedSlot → shadow root, then mounts its StyleModule
    // into the shadow root's adoptedStyleSheets. But the editor DOM stays in the light
    // DOM, so those styles don't apply. Force document root for correct style mounting.
    root: container.ownerDocument,
  });
}
