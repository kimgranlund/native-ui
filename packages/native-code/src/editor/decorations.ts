/**
 * Live Preview Decorations
 *
 * Reads the @lezer/markdown parse tree and builds a DecorationSet that applies
 * visual formatting in live preview mode (Obsidian-style: markdown source with
 * inline decorations). Wrapped in a Compartment for mode switching.
 */

import { Compartment, RangeSetBuilder } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';

// ---------------------------------------------------------------------------
// Compartment
// ---------------------------------------------------------------------------

/** Compartment for toggling live preview on/off */
export const previewCompartment = new Compartment();

// ---------------------------------------------------------------------------
// Reusable decoration specs
// ---------------------------------------------------------------------------

const markBold = Decoration.mark({ class: 'md-bold' });
const markItalic = Decoration.mark({ class: 'md-italic' });
const markCode = Decoration.mark({ class: 'md-code' });
const markStrikethrough = Decoration.mark({ class: 'md-strikethrough' });
const markLink = Decoration.mark({ class: 'md-link' });
const markUrl = Decoration.mark({ class: 'md-url' });
const markSyntax = Decoration.mark({ class: 'md-syntax-marker' });
const markSyntaxVisible = Decoration.mark({ class: 'md-syntax-marker md-syntax-visible' });

const lineHeading1 = Decoration.line({ class: 'md-heading md-heading-1' });
const lineHeading2 = Decoration.line({ class: 'md-heading md-heading-2' });
const lineHeading3 = Decoration.line({ class: 'md-heading md-heading-3' });
const lineHeading4 = Decoration.line({ class: 'md-heading md-heading-4' });
const lineHeading5 = Decoration.line({ class: 'md-heading md-heading-5' });
const lineHeading6 = Decoration.line({ class: 'md-heading md-heading-6' });
const lineBulletItem = Decoration.line({ class: 'md-list-item md-bullet-item' });
const lineOrderedItem = Decoration.line({ class: 'md-list-item md-ordered-item' });
const lineBlockquote = Decoration.line({ class: 'md-blockquote' });
const lineCodeBlock = Decoration.line({ class: 'md-code-block' });
const lineHr = Decoration.line({ class: 'md-hr' });

// ---------------------------------------------------------------------------
// Heading line decoration lookup
// ---------------------------------------------------------------------------

const headingDecorations: Record<string, Decoration> = {
  ATXHeading1: lineHeading1,
  ATXHeading2: lineHeading2,
  ATXHeading3: lineHeading3,
  ATXHeading4: lineHeading4,
  ATXHeading5: lineHeading5,
  ATXHeading6: lineHeading6,
};

// ---------------------------------------------------------------------------
// Syntax marker node names
// ---------------------------------------------------------------------------

const SYNTAX_MARKER_TYPES = new Set([
  'HeaderMark',
  'EmphasisMark',
  'CodeMark',
  'StrikethroughMark',
  'LinkMark',
  'QuoteMark',
  'ListMark',
]);

// ---------------------------------------------------------------------------
// Image widget
// ---------------------------------------------------------------------------

class ImageWidget extends WidgetType {
  src: string;
  alt: string;

  constructor(src: string, alt: string) {
    super();
    this.src = src;
    this.alt = alt;
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src && this.alt === other.alt;
  }

  toDOM(): HTMLElement {
    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.className = 'md-image';
    img.style.maxWidth = '100%';
    return img;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: extract text from a node range
// ---------------------------------------------------------------------------

function nodeText(doc: { sliceString(from: number, to: number): string }, from: number, to: number): string {
  return doc.sliceString(from, to);
}

// ---------------------------------------------------------------------------
// Plugin class
// ---------------------------------------------------------------------------

const previewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;
      const tree = syntaxTree(view.state);
      const cursorLine = doc.lineAt(view.state.selection.main.head).number;

      // Collect decorations first, then sort by from position.
      // Line decorations and range decorations need to be interleaved in
      // document order for RangeSetBuilder.
      const lineDecos: Array<{ pos: number; deco: Decoration }> = [];
      const rangeDecos: Array<{ from: number; to: number; deco: Decoration }> = [];
      const widgetDecos: Array<{ pos: number; deco: Decoration }> = [];

      // Track parent context for ListItem classification
      const parentStack: string[] = [];

      tree.iterate({
        enter(node) {
          const type = node.name;

          // ---------------------------------------------------------------
          // Block-level: headings
          // ---------------------------------------------------------------
          const headingDeco = headingDecorations[type];
          if (headingDeco) {
            // Apply to all lines the heading spans
            const startLine = doc.lineAt(node.from);
            const endLine = doc.lineAt(node.to);
            for (let ln = startLine.number; ln <= endLine.number; ln++) {
              const line = doc.line(ln);
              lineDecos.push({ pos: line.from, deco: headingDeco });
            }
          }

          // ---------------------------------------------------------------
          // Block-level: list items
          // ---------------------------------------------------------------
          if (type === 'BulletList' || type === 'OrderedList') {
            parentStack.push(type);
          }

          if (type === 'ListItem') {
            const parent = parentStack[parentStack.length - 1];
            const deco = parent === 'OrderedList' ? lineOrderedItem : lineBulletItem;
            const startLine = doc.lineAt(node.from);
            const endLine = doc.lineAt(node.to);
            for (let ln = startLine.number; ln <= endLine.number; ln++) {
              const line = doc.line(ln);
              lineDecos.push({ pos: line.from, deco });
            }
          }

          // ---------------------------------------------------------------
          // Block-level: blockquote
          // ---------------------------------------------------------------
          if (type === 'Blockquote') {
            const startLine = doc.lineAt(node.from);
            const endLine = doc.lineAt(node.to);
            for (let ln = startLine.number; ln <= endLine.number; ln++) {
              const line = doc.line(ln);
              lineDecos.push({ pos: line.from, deco: lineBlockquote });
            }
          }

          // ---------------------------------------------------------------
          // Block-level: fenced code
          // ---------------------------------------------------------------
          if (type === 'FencedCode') {
            const startLine = doc.lineAt(node.from);
            const endLine = doc.lineAt(node.to);
            for (let ln = startLine.number; ln <= endLine.number; ln++) {
              const line = doc.line(ln);
              lineDecos.push({ pos: line.from, deco: lineCodeBlock });
            }
          }

          // ---------------------------------------------------------------
          // Block-level: horizontal rule
          // ---------------------------------------------------------------
          if (type === 'HorizontalRule') {
            const line = doc.lineAt(node.from);
            lineDecos.push({ pos: line.from, deco: lineHr });
          }

          // ---------------------------------------------------------------
          // Inline: strong emphasis
          // ---------------------------------------------------------------
          if (type === 'StrongEmphasis') {
            rangeDecos.push({ from: node.from, to: node.to, deco: markBold });
          }

          // ---------------------------------------------------------------
          // Inline: emphasis
          // ---------------------------------------------------------------
          if (type === 'Emphasis') {
            rangeDecos.push({ from: node.from, to: node.to, deco: markItalic });
          }

          // ---------------------------------------------------------------
          // Inline: inline code
          // ---------------------------------------------------------------
          if (type === 'InlineCode') {
            rangeDecos.push({ from: node.from, to: node.to, deco: markCode });
          }

          // ---------------------------------------------------------------
          // Inline: strikethrough
          // ---------------------------------------------------------------
          if (type === 'Strikethrough') {
            rangeDecos.push({ from: node.from, to: node.to, deco: markStrikethrough });
          }

          // ---------------------------------------------------------------
          // Inline: link (the whole [text](url) span)
          // ---------------------------------------------------------------
          if (type === 'Link') {
            rangeDecos.push({ from: node.from, to: node.to, deco: markLink });
          }

          // ---------------------------------------------------------------
          // Inline: URL (inside links/images)
          // ---------------------------------------------------------------
          if (type === 'URL') {
            rangeDecos.push({ from: node.from, to: node.to, deco: markUrl });
          }

          // ---------------------------------------------------------------
          // Syntax markers — dimmed unless cursor is on the same line
          // ---------------------------------------------------------------
          if (SYNTAX_MARKER_TYPES.has(type)) {
            const markerLine = doc.lineAt(node.from).number;
            const onCursorLine = markerLine === cursorLine;
            const deco = onCursorLine ? markSyntaxVisible : markSyntax;
            rangeDecos.push({ from: node.from, to: node.to, deco });
          }

          // ---------------------------------------------------------------
          // Widget: image
          // ---------------------------------------------------------------
          if (type === 'Image') {
            let src = '';
            let alt = '';
            const cursor = node.node.cursor();
            // Walk children to find URL and alt text
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'URL') {
                  src = nodeText(doc, cursor.from, cursor.to);
                } else if (cursor.name === 'AltText') {
                  alt = nodeText(doc, cursor.from, cursor.to);
                }
              } while (cursor.nextSibling());
            }
            if (src) {
              widgetDecos.push({
                pos: node.to,
                deco: Decoration.widget({
                  widget: new ImageWidget(src, alt),
                  side: 1,
                }),
              });
            }
          }
        },

        leave(node) {
          const type = node.name;
          if (type === 'BulletList' || type === 'OrderedList') {
            parentStack.pop();
          }
        },
      });

      // Merge all decorations and sort by position.
      // RangeSetBuilder requires decorations in document order.
      type DecoEntry =
        | { kind: 'line'; pos: number; deco: Decoration }
        | { kind: 'range'; from: number; to: number; deco: Decoration }
        | { kind: 'widget'; pos: number; deco: Decoration };

      const allDecos: DecoEntry[] = [];

      for (const d of lineDecos) {
        allDecos.push({ kind: 'line', pos: d.pos, deco: d.deco });
      }
      for (const d of rangeDecos) {
        allDecos.push({ kind: 'range', from: d.from, to: d.to, deco: d.deco });
      }
      for (const d of widgetDecos) {
        allDecos.push({ kind: 'widget', pos: d.pos, deco: d.deco });
      }

      // Sort by start position; for same position, line < range < widget
      allDecos.sort((a, b) => {
        const aPos = a.kind === 'range' ? a.from : a.pos;
        const bPos = b.kind === 'range' ? b.from : b.pos;
        if (aPos !== bPos) return aPos - bPos;
        // Same position: line decorations first, then ranges, then widgets
        const kindOrder = { line: 0, range: 1, widget: 2 };
        const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
        if (kindDiff !== 0) return kindDiff;
        // For ranges at same start, shorter range first
        if (a.kind === 'range' && b.kind === 'range') {
          return a.to - b.to;
        }
        return 0;
      });

      // Deduplicate line decorations (same pos + same class)
      const seenLines = new Set<string>();

      for (const entry of allDecos) {
        if (entry.kind === 'line') {
          // Allow multiple line decos at same position (e.g. blockquote + list)
          // but deduplicate exact same decoration object
          const dedupeKey = `${entry.pos}:${(entry.deco.spec as { class?: string }).class ?? ''}`;
          if (seenLines.has(dedupeKey)) continue;
          seenLines.add(dedupeKey);
          builder.add(entry.pos, entry.pos, entry.deco);
        } else if (entry.kind === 'range') {
          if (entry.from < entry.to) {
            builder.add(entry.from, entry.to, entry.deco);
          }
        } else {
          builder.add(entry.pos, entry.pos, entry.deco);
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create the live preview extension (active state) */
export function createPreviewExtension(): Extension {
  return previewPlugin;
}

/** Empty extension (source mode -- no decorations) */
export const sourceExtension: Extension = [];
