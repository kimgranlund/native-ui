/** Formatting marker definitions: format name → wrapper string */
export const FORMAT_MARKERS: Record<string, string> = {
  code: '`',
  bold: '**',
  italic: '_',
};

/** Keyboard shortcut → format name mapping */
export const FORMAT_SHORTCUTS: Record<string, string> = {
  e: 'code',
  b: 'bold',
  i: 'italic',
};

/** Check whether a format type is enabled in the element's formatting attribute. */
export function isFormatEnabled(el: HTMLElement, type: string): boolean {
  const attr = el.getAttribute('formatting');
  if (!attr) return false;
  return attr.split(/\s+/).includes(type);
}

/**
 * Calculate flat text offsets from a Range within a contenteditable root.
 * Walks the text nodes to compute character positions.
 */
export function getSelectionOffsets(root: HTMLElement, range: Range): { start: number; end: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charIndex = 0;
  let start = -1;
  let end = -1;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const nodeLen = textNode.length;

    if (textNode === range.startContainer) {
      start = charIndex + range.startOffset;
    }
    if (textNode === range.endContainer) {
      end = charIndex + range.endOffset;
      break;
    }
    charIndex += nodeLen;
  }

  if (start === -1 || end === -1) return null;
  return { start, end };
}

/**
 * Toggle wrapping markers around selected text.
 * If the selected text (or the surrounding text) already has the marker, unwrap. Otherwise wrap.
 */
export function toggleMarker(
  text: string,
  selectedText: string,
  start: number,
  end: number,
  marker: string,
  markerLen: number,
): { text: string; selStart: number; selEnd: number } {
  // Check if selection is already wrapped: marker before start and after end
  const before = text.slice(Math.max(0, start - markerLen), start);
  const after = text.slice(end, end + markerLen);

  if (before === marker && after === marker) {
    // Unwrap: remove surrounding markers
    const newText = text.slice(0, start - markerLen) + selectedText + text.slice(end + markerLen);
    return {
      text: newText,
      selStart: start - markerLen,
      selEnd: start - markerLen + selectedText.length,
    };
  }

  // Check if the selected text itself starts and ends with the marker (user selected markers too)
  if (
    selectedText.length >= markerLen * 2 &&
    selectedText.startsWith(marker) &&
    selectedText.endsWith(marker)
  ) {
    const inner = selectedText.slice(markerLen, -markerLen);
    const newText = text.slice(0, start) + inner + text.slice(end);
    return {
      text: newText,
      selStart: start,
      selEnd: start + inner.length,
    };
  }

  // Wrap: add markers around selection
  const newText = text.slice(0, start) + marker + selectedText + marker + text.slice(end);
  return {
    text: newText,
    selStart: start + markerLen,
    selEnd: start + markerLen + selectedText.length,
  };
}

/** Restore a text selection by flat character offsets within a contenteditable root. */
export function restoreSelection(root: HTMLElement, start: number, end: number): void {
  const sel = window.getSelection();
  if (!sel) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charIndex = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const nodeLen = textNode.length;

    if (!startNode && charIndex + nodeLen >= start) {
      startNode = textNode;
      startOffset = start - charIndex;
    }
    if (charIndex + nodeLen >= end) {
      endNode = textNode;
      endOffset = end - charIndex;
      break;
    }
    charIndex += nodeLen;
  }

  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
