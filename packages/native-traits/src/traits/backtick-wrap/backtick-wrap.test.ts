// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { BacktickWrapController } from './backtick-wrap-controller.ts';

function create(disabled = false): {
  host: HTMLElement;
  input: HTMLElement;
  ctrl: BacktickWrapController;
} {
  const host = document.createElement('div');
  const input = document.createElement('div');
  input.setAttribute('contenteditable', 'plaintext-only');
  host.appendChild(input);
  document.body.appendChild(host);

  const ctrl = new BacktickWrapController(host, { input, disabled });
  return { host, input, ctrl };
}

/**
 * Mock window.getSelection() with a collapsed caret at a given offset.
 */
function mockCollapsedCaret(textNode: Text, offset: number): void {
  const mockRange = {
    collapsed: true,
    startContainer: textNode,
    startOffset: offset,
    endContainer: textNode,
    endOffset: offset,
    cloneRange() { return { ...this, collapse() {} }; },
    collapse() {},
    deleteContents() {
      // Simulate deleting text from startOffset to endOffset in the text node
      const text = textNode.textContent ?? '';
      textNode.textContent = text.slice(0, this.startOffset) + text.slice(this.endOffset);
    },
    setStart(node: Node, off: number) { this.startContainer = node; this.startOffset = off; },
    setEnd(node: Node, off: number) { this.endContainer = node; this.endOffset = off; },
    insertNode(node: Node) {
      textNode.parentNode?.insertBefore(node, textNode.nextSibling ?? null);
    },
    toString() { return ''; },
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

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('BacktickWrapController', () => {
  describe('paired backtick detection', () => {
    it('wraps text between backtick pair in <code>', () => {
      const { host, input, ctrl } = create();
      input.textContent = '`hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 6); // caret after "hello"

      const handler = vi.fn();
      host.addEventListener('native:backtick-wrap', handler);

      // Type closing backtick
      const ke = new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(ke);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.text).toBe('hello');

      const code = input.querySelector('code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe('hello');
      expect(code?.getAttribute('contenteditable')).toBe('false');
      ctrl.destroy();
    });

    it('applies mono font styling to code element', () => {
      const { input, ctrl } = create();
      input.textContent = '`styled';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 7);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      const code = input.querySelector('code') as HTMLElement;
      expect(code.style.fontFamily).toBe('var(--n-font-family-mono)');
      ctrl.destroy();
    });

    it('does nothing for empty backtick pair', () => {
      const { input, ctrl } = create();
      input.textContent = '`';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 1); // caret right after opening backtick

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });

    it('does nothing when no opening backtick exists', () => {
      const { input, ctrl } = create();
      input.textContent = 'hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 5);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });

    it('does not cross newlines', () => {
      const { input, ctrl } = create();
      input.textContent = '`line1\nline2';
      const textNode = input.firstChild as Text;
      // Caret at end of "line2" — opening backtick is before newline
      mockCollapsedCaret(textNode, 12);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });
  });

  describe('selection wrapping', () => {
    it('wraps selected text when backtick is typed', () => {
      const { host, input, ctrl } = create();
      input.textContent = 'hello world';
      const textNode = input.firstChild as Text;
      // Select "world" (indices 6-11)
      mockSelection(textNode, 6, 11);

      const handler = vi.fn();
      host.addEventListener('native:backtick-wrap', handler);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.text).toBe('world');

      const code = input.querySelector('code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe('world');
      ctrl.destroy();
    });
  });

  describe('disabled state', () => {
    it('does nothing when disabled', () => {
      const { input, ctrl } = create(true);
      input.textContent = '`hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 6);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });

    it('can be toggled at runtime', () => {
      const { input, ctrl } = create(true);
      expect(ctrl.disabled).toBe(true);

      ctrl.disabled = false;
      expect(ctrl.disabled).toBe(false);
      ctrl.destroy();
    });
  });

  describe('modifier keys ignored', () => {
    it('ignores Cmd+backtick', () => {
      const { input, ctrl } = create();
      input.textContent = '`hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 6);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });

    it('ignores Ctrl+backtick', () => {
      const { input, ctrl } = create();
      input.textContent = '`hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 6);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });
  });

  describe('cleanup', () => {
    it('destroy removes listeners', () => {
      const { host, input, ctrl } = create();
      ctrl.destroy();

      input.textContent = '`hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 6);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: '`',
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
    });
  });

  describe('non-backtick keys ignored', () => {
    it('ignores regular typing', () => {
      const { input, ctrl } = create();
      input.textContent = '`hello';
      const textNode = input.firstChild as Text;
      mockCollapsedCaret(textNode, 6);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
        cancelable: true,
      }));

      expect(input.querySelector('code')).toBeNull();
      ctrl.destroy();
    });
  });
});
