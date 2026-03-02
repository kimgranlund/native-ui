/**
 * NativeUI CodeMirror Theme
 *
 * Dark theme inspired by one-dark, designed to harmonize with the
 * @nonoun/native-ui OKLCH design system. Uses EditorView.theme()
 * with { dark: true } and HighlightStyle.define() for syntax tokens.
 */

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// ---------------------------------------------------------------------------
// Color palette (one-dark inspired)
// ---------------------------------------------------------------------------

const bg = '#282c34';
const darkBg = '#21252b';
const text = '#abb2bf';
const muted = '#7d8799';
const cursor = '#528bff';
const selection = '#3E4451';

const violet = '#c678dd';
const green = '#98c379';
const blue = '#61afef';
const coral = '#e06c75';
const yellow = '#e5c07b';
const cyan = '#56b6c2';
const orange = '#d19a66';

// ---------------------------------------------------------------------------
// Editor chrome theme
// ---------------------------------------------------------------------------

export const NTheme = EditorView.theme(
  {
    // Root editor
    '&': {
      color: text,
      backgroundColor: bg,
      fontSize: '14px',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, SFMono-Regular, Menlo, monospace",
    },

    // Content area
    '.cm-content': {
      caretColor: cursor,
      padding: '4px 0',
    },

    // Cursor
    '&.cm-focused .cm-cursor': {
      borderLeftColor: cursor,
      borderLeftWidth: '2px',
    },

    // Selection
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: selection,
    },

    '.cm-activeLine': {
      backgroundColor: '#2c313a',
    },

    // Gutters
    '.cm-gutters': {
      backgroundColor: darkBg,
      color: muted,
      borderRight: 'none',
      paddingRight: '4px',
    },

    '.cm-activeLineGutter': {
      backgroundColor: '#2c313a',
      color: text,
    },

    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 16px',
      minWidth: '40px',
    },

    // Fold gutter
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      cursor: 'pointer',
    },

    // Matching brackets
    '&.cm-focused .cm-matchingBracket': {
      backgroundColor: '#515a6b',
      outline: '1px solid #515a6b',
    },

    '&.cm-focused .cm-nonmatchingBracket': {
      color: coral,
    },

    // Search match
    '.cm-searchMatch': {
      backgroundColor: 'rgba(229, 192, 123, 0.25)',
      outline: '1px solid rgba(229, 192, 123, 0.4)',
    },

    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(97, 175, 239, 0.3)',
    },

    // Tooltips / autocomplete
    '.cm-tooltip': {
      backgroundColor: darkBg,
      color: text,
      border: '1px solid #3E4451',
      borderRadius: '6px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },

    '.cm-tooltip .cm-tooltip-arrow::before': {
      borderTopColor: '#3E4451',
      borderBottomColor: '#3E4451',
    },

    '.cm-tooltip .cm-tooltip-arrow::after': {
      borderTopColor: darkBg,
      borderBottomColor: darkBg,
    },

    '.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: 'inherit',
        maxHeight: '240px',
      },
      '& > ul > li': {
        padding: '4px 8px',
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: selection,
        color: text,
      },
    },

    // Panels (search bar, etc.)
    '.cm-panels': {
      backgroundColor: darkBg,
      color: text,
    },

    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #3E4451',
    },

    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #3E4451',
    },

    '.cm-panel input, .cm-panel button, .cm-panel select': {
      fontSize: 'inherit',
    },

    '.cm-panel input': {
      backgroundColor: bg,
      color: text,
      border: '1px solid #3E4451',
      borderRadius: '4px',
      padding: '2px 6px',
    },

    '.cm-panel button': {
      backgroundColor: '#3E4451',
      color: text,
      border: 'none',
      borderRadius: '4px',
      padding: '2px 8px',
      cursor: 'pointer',
    },

    // Fat cursor (vim mode etc.)
    '.cm-fat-cursor .cm-cursor': {
      display: 'block',
      backgroundColor: `${cursor}77`,
      borderLeft: 'none',
      width: '0.5em',
    },

    // Selection layer for non-focused
    '.cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: `${selection}80`,
    },

    // Fold placeholder
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: muted,
    },
  },
  { dark: true },
);

// ---------------------------------------------------------------------------
// Syntax highlight style
// ---------------------------------------------------------------------------

export const NHighlightStyle = HighlightStyle.define([
  // Comments
  { tag: t.comment, color: muted, fontStyle: 'italic' },
  { tag: t.lineComment, color: muted, fontStyle: 'italic' },
  { tag: t.blockComment, color: muted, fontStyle: 'italic' },
  { tag: t.docComment, color: muted, fontStyle: 'italic' },

  // Keywords & control flow
  { tag: t.keyword, color: violet },
  { tag: t.controlKeyword, color: violet },
  { tag: t.operatorKeyword, color: violet },
  { tag: t.definitionKeyword, color: violet },
  { tag: t.moduleKeyword, color: violet },

  // Strings & related
  { tag: t.string, color: green },
  { tag: t.special(t.string), color: green },
  { tag: t.regexp, color: green },
  { tag: t.escape, color: cyan },
  { tag: t.character, color: green },

  // Functions & methods
  { tag: t.function(t.definition(t.variableName)), color: blue },
  { tag: t.function(t.variableName), color: blue },

  // Variables & properties
  { tag: t.variableName, color: coral },
  { tag: t.definition(t.variableName), color: coral },
  { tag: t.propertyName, color: coral },
  { tag: t.definition(t.propertyName), color: coral },

  // Types & classes
  { tag: t.typeName, color: yellow },
  { tag: t.className, color: yellow },
  { tag: t.namespace, color: yellow },
  { tag: t.macroName, color: yellow },
  { tag: t.annotation, color: yellow },

  // Numbers & constants
  { tag: t.number, color: orange },
  { tag: t.integer, color: orange },
  { tag: t.float, color: orange },
  { tag: t.bool, color: orange },
  { tag: t.null, color: orange },
  { tag: t.atom, color: orange },

  // Operators
  { tag: t.operator, color: cyan },
  { tag: t.punctuation, color: text },
  { tag: t.paren, color: text },
  { tag: t.squareBracket, color: text },
  { tag: t.brace, color: text },
  { tag: t.derefOperator, color: text },
  { tag: t.separator, color: text },

  // URL / link
  { tag: t.url, color: cyan, textDecoration: 'underline' },
  { tag: t.link, color: cyan },
  { tag: t.labelName, color: coral },

  // Tags (HTML/JSX)
  { tag: t.tagName, color: coral },
  { tag: t.attributeName, color: orange },
  { tag: t.attributeValue, color: green },
  { tag: t.angleBracket, color: text },

  // Special
  { tag: t.self, color: coral },
  { tag: t.processingInstruction, color: muted },
  { tag: t.meta, color: muted },

  // Headings (markdown)
  { tag: t.heading, color: coral, fontWeight: 'bold' },
  { tag: t.heading1, color: coral, fontWeight: 'bold' },
  { tag: t.heading2, color: coral, fontWeight: 'bold' },
  { tag: t.heading3, color: coral, fontWeight: 'bold' },

  // Emphasis / strong
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through' },

  // Invalid
  { tag: t.invalid, color: '#ffffff', backgroundColor: coral },
]);

export const NSyntaxHighlighting = syntaxHighlighting(NHighlightStyle);
