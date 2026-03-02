import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { NTheme, NSyntaxHighlighting, NBaseExtensions } from '@nonoun/native-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

export type TabName = 'html' | 'css' | 'js';

export interface EditorInstance {
  view: EditorView;
  getCode(): string;
  setCode(code: string): void;
  destroy(): void;
}

export interface EditorOptions {
  parent: HTMLElement;
  initialCode: string;
  language: TabName;
  readonly?: boolean;
  onChange?: (code: string) => void;
}

// ── Language helpers ──

function getLanguageExtension(language: TabName) {
  switch (language) {
    case 'html': return html();
    case 'css': return css();
    case 'js': return javascript();
  }
}

// ── Factory ──

export function createEditor(options: EditorOptions): EditorInstance {
  const { parent, initialCode, language, readonly: ro = false, onChange } = options;

  const extensions = [
    NTheme,
    NSyntaxHighlighting,
    NBaseExtensions,
    getLanguageExtension(language),
    EditorState.readOnly.of(ro),
  ];

  if (onChange) {
    extensions.push(
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      })
    );
  }

  const view = new EditorView({
    state: EditorState.create({
      doc: initialCode,
      extensions,
    }),
    parent,
  });

  return {
    view,
    getCode() {
      return view.state.doc.toString();
    },
    setCode(code: string) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: code },
      });
    },
    destroy() {
      view.destroy();
    },
  };
}
