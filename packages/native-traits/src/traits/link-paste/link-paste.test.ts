// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { LinkPasteController } from './link-paste-controller.ts';

function create(disabled = false): {
  host: HTMLElement;
  input: HTMLElement;
  ctrl: LinkPasteController;
} {
  const host = document.createElement('div');
  const input = document.createElement('div');
  input.setAttribute('contenteditable', 'plaintext-only');
  host.appendChild(input);
  document.body.appendChild(host);

  const ctrl = new LinkPasteController(host, { input, disabled });
  return { host, input, ctrl };
}

/**
 * Mock window.getSelection() with a non-collapsed selection range.
 */
function mockSelection(textNode: Text, startOffset: number, endOffset: number): void {
  const selectedText = (textNode.textContent ?? '').slice(startOffset, endOffset);

  const mockRange = {
    collapsed: false,
    startContainer: textNode,
    startOffset,
    endContainer: textNode,
    endOffset,
    cloneRange() { return { ...this, collapse() {} }; },
    collapse() {},
    deleteContents() {
      const text = textNode.textContent ?? '';
      textNode.textContent = text.slice(0, startOffset) + text.slice(endOffset);
    },
    insertNode(node: Node) {
      textNode.parentNode?.insertBefore(node, textNode.nextSibling ?? null);
    },
    toString() { return selectedText; },
  };

  const mockSel = {
    focusNode: textNode,
    focusOffset: endOffset,
    rangeCount: 1,
    getRangeAt: () => mockRange,
    removeAllRanges() {},
    addRange() {},
  } as unknown as Selection;

  vi.spyOn(window, 'getSelection').mockReturnValue(mockSel);
}

/**
 * Mock window.getSelection() with a collapsed caret.
 */
function mockCollapsedCaret(textNode: Text, offset: number): void {
  const mockRange = {
    collapsed: true,
    startContainer: textNode,
    startOffset: offset,
    endContainer: textNode,
    endOffset: offset,
  };

  const mockSel = {
    focusNode: textNode,
    focusOffset: offset,
    rangeCount: 1,
    getRangeAt: () => mockRange,
    removeAllRanges() {},
    addRange() {},
  } as unknown as Selection;

  vi.spyOn(window, 'getSelection').mockReturnValue(mockSel);
}

/**
 * Create a paste event with clipboard data.
 */
function createPasteEvent(text: string): ClipboardEvent {
  const clipboardData = {
    getData: (type: string) => type === 'text/plain' ? text : '',
  } as DataTransfer;

  return new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('LinkPasteController', () => {
  describe('link creation', () => {
    it('wraps selected text in <a> when URL is pasted', () => {
      const { host, input, ctrl } = create();
      input.textContent = 'click here for docs';
      const textNode = input.firstChild as Text;
      // Select "here"
      mockSelection(textNode, 6, 10);

      const handler = vi.fn();
      host.addEventListener('native:link-paste', handler);

      input.dispatchEvent(createPasteEvent('https://example.com'));

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = handler.mock.calls[0][0].detail;
      expect(detail.url).toBe('https://example.com');
      expect(detail.text).toBe('here');

      const anchor = input.querySelector('a');
      expect(anchor).not.toBeNull();
      expect(anchor?.textContent).toBe('here');
      expect(anchor?.href).toContain('example.com');
      expect(anchor?.target).toBe('_blank');
      expect(anchor?.rel).toBe('noopener noreferrer');
      ctrl.destroy();
    });

    it('applies link styling', () => {
      const { input, ctrl } = create();
      input.textContent = 'my link text';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 3, 7);

      input.dispatchEvent(createPasteEvent('https://example.com'));

      const anchor = input.querySelector('a') as HTMLElement;
      expect(anchor.style.color).toBe('var(--n-color-accent-700)');
      expect(anchor.style.textDecoration).toBe('underline');
      ctrl.destroy();
    });

    it('handles http URLs', () => {
      const { input, ctrl } = create();
      input.textContent = 'visit site';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent('http://example.com'));

      const anchor = input.querySelector('a');
      expect(anchor).not.toBeNull();
      expect(anchor?.href).toContain('example.com');
      ctrl.destroy();
    });

    it('handles protocol-relative URLs', () => {
      const { input, ctrl } = create();
      input.textContent = 'visit site';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent('//cdn.example.com/file.js'));

      const anchor = input.querySelector('a');
      expect(anchor).not.toBeNull();
      ctrl.destroy();
    });
  });

  describe('no-op cases', () => {
    it('does nothing when no text is selected (collapsed caret)', () => {
      const { input, ctrl } = create();
      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 5);

      input.dispatchEvent(createPasteEvent('https://example.com'));

      expect(input.querySelector('a')).toBeNull();
      ctrl.destroy();
    });

    it('does nothing when pasted text is not a URL', () => {
      const { input, ctrl } = create();
      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent('just some text'));

      expect(input.querySelector('a')).toBeNull();
      ctrl.destroy();
    });

    it('rejects bare domain names without protocol', () => {
      const { input, ctrl } = create();
      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent('example.com'));

      expect(input.querySelector('a')).toBeNull();
      ctrl.destroy();
    });

    it('does nothing when clipboard is empty', () => {
      const { input, ctrl } = create();
      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent(''));

      expect(input.querySelector('a')).toBeNull();
      ctrl.destroy();
    });
  });

  describe('disabled state', () => {
    it('does nothing when disabled', () => {
      const { input, ctrl } = create(true);
      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent('https://example.com'));

      expect(input.querySelector('a')).toBeNull();
      ctrl.destroy();
    });

    it('can be toggled at runtime', () => {
      const { ctrl } = create(true);
      expect(ctrl.disabled).toBe(true);

      ctrl.disabled = false;
      expect(ctrl.disabled).toBe(false);
      ctrl.destroy();
    });
  });

  describe('cleanup', () => {
    it('destroy removes listeners', () => {
      const { input, ctrl } = create();
      ctrl.destroy();

      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      mockSelection(textNode, 0, 5);

      input.dispatchEvent(createPasteEvent('https://example.com'));

      expect(input.querySelector('a')).toBeNull();
    });
  });
});
