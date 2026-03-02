import type { EditorView } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

// ---------------------------------------------------------------------------
//  Inline marker toggle (bold, italic, code, strikethrough)
// ---------------------------------------------------------------------------

function toggleInlineMarker(view: EditorView, marker: string): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to: number; insert: string }> = [];
  const selections: Array<{ anchor: number; head?: number }> = [];

  for (const range of state.selection.ranges) {
    const { from, to } = range;

    if (from === to) {
      // No selection -- insert marker pair and place cursor between them
      changes.push({ from, to, insert: marker + marker });
      selections.push({ anchor: from + marker.length });
    } else {
      const selected = state.sliceDoc(from, to);

      // Check if the selection is already wrapped with the marker
      if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
        // Unwrap: remove markers from inside the selection
        const inner = selected.slice(marker.length, selected.length - marker.length);
        changes.push({ from, to, insert: inner });
        selections.push({ anchor: from, head: from + inner.length });
      } else {
        // Also check if markers exist just outside the selection
        const before = state.sliceDoc(from - marker.length, from);
        const after = state.sliceDoc(to, to + marker.length);

        if (before === marker && after === marker) {
          // Unwrap: remove markers outside the selection
          changes.push({ from: from - marker.length, to: from, insert: '' });
          changes.push({ from: to, to: to + marker.length, insert: '' });
          selections.push({ anchor: from - marker.length, head: to - marker.length });
        } else {
          // Wrap selection with marker
          changes.push({ from, to, insert: marker + selected + marker });
          selections.push({ anchor: from + marker.length, head: from + marker.length + selected.length });
        }
      }
    }
  }

  view.dispatch({
    changes,
    selection: EditorSelection.create(
      selections.map((s) => EditorSelection.range(s.anchor, s.head ?? s.anchor)),
    ),
  });

  return true;
}

// ---------------------------------------------------------------------------
//  Block-level helpers
// ---------------------------------------------------------------------------

/** Get the full lines covered by a selection range. */
function getLinesInRange(view: EditorView, from: number, to: number): Array<{ from: number; to: number; text: string; number: number }> {
  const { state } = view;
  const lines: Array<{ from: number; to: number; text: string; number: number }> = [];
  const startLine = state.doc.lineAt(from);
  const endLine = state.doc.lineAt(to);

  for (let n = startLine.number; n <= endLine.number; n++) {
    const line = state.doc.line(n);
    lines.push({ from: line.from, to: line.to, text: line.text, number: n });
  }

  return lines;
}

// ---------------------------------------------------------------------------
//  setHeading
// ---------------------------------------------------------------------------

function setHeading(view: EditorView, level: 1 | 2 | 3): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to: number; insert: string }> = [];

  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.from);
    const headingMatch = line.text.match(/^(#{1,6})\s/);
    const prefix = '#'.repeat(level) + ' ';

    if (headingMatch) {
      const existingLevel = headingMatch[1].length;
      const existingPrefix = headingMatch[0];

      if (existingLevel === level) {
        // Same level -- toggle off (remove heading prefix)
        changes.push({ from: line.from, to: line.from + existingPrefix.length, insert: '' });
      } else {
        // Different level -- replace
        changes.push({ from: line.from, to: line.from + existingPrefix.length, insert: prefix });
      }
    } else {
      // No heading -- add prefix
      changes.push({ from: line.from, to: line.from, insert: prefix });
    }
  }

  view.dispatch({ changes });
  return true;
}

// ---------------------------------------------------------------------------
//  toggleBulletList
// ---------------------------------------------------------------------------

function toggleBulletList(view: EditorView): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to: number; insert: string }> = [];

  for (const range of state.selection.ranges) {
    const lines = getLinesInRange(view, range.from, range.to);
    const allBulleted = lines.every((l) => /^- /.test(l.text));

    for (const line of lines) {
      if (allBulleted) {
        // Remove bullet prefix
        changes.push({ from: line.from, to: line.from + 2, insert: '' });
      } else if (/^- /.test(line.text)) {
        // Already bulleted, skip
      } else {
        // Add bullet prefix
        changes.push({ from: line.from, to: line.from, insert: '- ' });
      }
    }
  }

  view.dispatch({ changes });
  return true;
}

// ---------------------------------------------------------------------------
//  toggleOrderedList
// ---------------------------------------------------------------------------

function toggleOrderedList(view: EditorView): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to: number; insert: string }> = [];

  for (const range of state.selection.ranges) {
    const lines = getLinesInRange(view, range.from, range.to);
    const allOrdered = lines.every((l) => /^\d+\.\s/.test(l.text));

    let index = 1;
    for (const line of lines) {
      if (allOrdered) {
        // Remove ordered prefix
        const match = line.text.match(/^\d+\.\s/);
        if (match) {
          changes.push({ from: line.from, to: line.from + match[0].length, insert: '' });
        }
      } else if (/^\d+\.\s/.test(line.text)) {
        // Already ordered -- renumber
        const match = line.text.match(/^\d+\.\s/);
        if (match) {
          changes.push({ from: line.from, to: line.from + match[0].length, insert: `${index}. ` });
        }
        index++;
      } else {
        // Add ordered prefix
        changes.push({ from: line.from, to: line.from, insert: `${index}. ` });
        index++;
      }
    }
  }

  view.dispatch({ changes });
  return true;
}

// ---------------------------------------------------------------------------
//  toggleBlockquote
// ---------------------------------------------------------------------------

function toggleBlockquote(view: EditorView): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to: number; insert: string }> = [];

  for (const range of state.selection.ranges) {
    const lines = getLinesInRange(view, range.from, range.to);
    const allQuoted = lines.every((l) => /^> /.test(l.text));

    for (const line of lines) {
      if (allQuoted) {
        // Remove blockquote prefix
        changes.push({ from: line.from, to: line.from + 2, insert: '' });
      } else if (/^> /.test(line.text)) {
        // Already quoted, skip
      } else {
        // Add blockquote prefix
        changes.push({ from: line.from, to: line.from, insert: '> ' });
      }
    }
  }

  view.dispatch({ changes });
  return true;
}

// ---------------------------------------------------------------------------
//  Insert commands
// ---------------------------------------------------------------------------

function insertLink(view: EditorView, url?: string, text?: string): boolean {
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);

  const linkText = text ?? (selected || 'link text');
  const linkUrl = url ?? 'url';
  const insert = `[${linkText}](${linkUrl})`;

  // Place cursor on the url placeholder if no url was provided
  const urlStart = range.from + 1 + linkText.length + 2; // after `[text](`
  const urlEnd = urlStart + linkUrl.length;

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: url
      ? { anchor: range.from + insert.length }
      : { anchor: urlStart, head: urlEnd },
  });

  return true;
}

function insertImage(view: EditorView, url?: string, alt?: string): boolean {
  const { state } = view;
  const range = state.selection.main;

  const altText = alt ?? 'alt text';
  const imageUrl = url ?? 'url';
  const insert = `![${altText}](${imageUrl})`;

  const urlStart = range.from + 2 + altText.length + 2; // after `![alt](`
  const urlEnd = urlStart + imageUrl.length;

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: url
      ? { anchor: range.from + insert.length }
      : { anchor: urlStart, head: urlEnd },
  });

  return true;
}

function insertHorizontalRule(view: EditorView): boolean {
  const range = view.state.selection.main;
  const insert = '\n---\n';

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + insert.length },
  });

  return true;
}

// ---------------------------------------------------------------------------
//  Public commands object
// ---------------------------------------------------------------------------

export interface EditorCommands {
  toggleBold(view: EditorView): boolean;
  toggleItalic(view: EditorView): boolean;
  toggleCode(view: EditorView): boolean;
  toggleStrikethrough(view: EditorView): boolean;
  setHeading(view: EditorView, level: 1 | 2 | 3): boolean;
  toggleBulletList(view: EditorView): boolean;
  toggleOrderedList(view: EditorView): boolean;
  toggleBlockquote(view: EditorView): boolean;
  insertLink(view: EditorView, url?: string, text?: string): boolean;
  insertImage(view: EditorView, url?: string, alt?: string): boolean;
  insertHorizontalRule(view: EditorView): boolean;
}

export const commands: EditorCommands = {
  toggleBold: (view) => toggleInlineMarker(view, '**'),
  toggleItalic: (view) => toggleInlineMarker(view, '*'),
  toggleCode: (view) => toggleInlineMarker(view, '`'),
  toggleStrikethrough: (view) => toggleInlineMarker(view, '~~'),
  setHeading,
  toggleBulletList,
  toggleOrderedList,
  toggleBlockquote,
  insertLink,
  insertImage,
  insertHorizontalRule,
};

// ---------------------------------------------------------------------------
//  Keyboard shortcut keymap
// ---------------------------------------------------------------------------

export const markdownKeymap = keymap.of([
  { key: 'Mod-b', run: (v) => commands.toggleBold(v) },
  { key: 'Mod-i', run: (v) => commands.toggleItalic(v) },
  { key: 'Mod-e', run: (v) => commands.toggleCode(v) },
  { key: 'Mod-k', run: (v) => commands.insertLink(v) },
  { key: 'Mod-Shift-1', run: (v) => commands.setHeading(v, 1) },
  { key: 'Mod-Shift-2', run: (v) => commands.setHeading(v, 2) },
  { key: 'Mod-Shift-3', run: (v) => commands.setHeading(v, 3) },
]);
