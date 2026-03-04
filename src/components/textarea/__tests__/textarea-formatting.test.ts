// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import '../textarea.ts';

/**
 * Helper: create a mounted n-textarea with optional attributes.
 */
function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-textarea');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

/**
 * Helper: set up a mock selection that reports a range within the element.
 * Since happy-dom doesn't support contenteditable selection, we mock
 * window.getSelection() to return a range pointing at the element's text node.
 */
function mockSelection(el: HTMLElement, startOffset: number, endOffset: number): void {
  const textNode = el.firstChild;
  if (!textNode) throw new Error('Element has no text node — set .value first');

  const range = document.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);

  const mockSel = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  };

  vi.spyOn(window, 'getSelection').mockReturnValue(mockSel as unknown as Selection);
}

/**
 * Helper: mock an empty / collapsed selection (no text selected).
 */
function mockCollapsedSelection(el: HTMLElement, offset: number): void {
  const textNode = el.firstChild;
  if (!textNode) throw new Error('Element has no text node — set .value first');

  const range = document.createRange();
  range.setStart(textNode, offset);
  range.setEnd(textNode, offset);

  const mockSel = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  };

  vi.spyOn(window, 'getSelection').mockReturnValue(mockSel as unknown as Selection);
}

/**
 * Helper: mock no selection at all (getSelection returns null).
 */
function mockNoSelection(): void {
  vi.spyOn(window, 'getSelection').mockReturnValue(null);
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('n-textarea — formatting', () => {
  describe('formatting attribute is observed', () => {
    it('formatting is in observedAttributes', () => {
      const Ctor = customElements.get('n-textarea') as any;
      expect(Ctor.observedAttributes).toContain('formatting');
    });

    it('formatting attribute can be read and changed', () => {
      const el = create({ formatting: 'code bold' });
      expect(el.getAttribute('formatting')).toBe('code bold');

      el.setAttribute('formatting', 'italic');
      expect(el.getAttribute('formatting')).toBe('italic');
    });
  });

  describe('applyFormat() — wrapping', () => {
    it('wraps selected text with backticks for code format', () => {
      const el = create({ formatting: 'code bold italic' });
      (el as any).value = 'hello world';
      mockSelection(el, 6, 11); // select "world"

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('hello `world`');
    });

    it('wraps selected text with ** for bold format', () => {
      const el = create({ formatting: 'bold' });
      (el as any).value = 'hello world';
      mockSelection(el, 6, 11); // select "world"

      (el as any).applyFormat('bold');

      expect((el as any).value).toBe('hello **world**');
    });

    it('wraps selected text with _ for italic format', () => {
      const el = create({ formatting: 'italic' });
      (el as any).value = 'hello world';
      mockSelection(el, 0, 5); // select "hello"

      (el as any).applyFormat('italic');

      expect((el as any).value).toBe('_hello_ world');
    });

    it('wraps text in the middle of a string', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'a bc d';
      mockSelection(el, 2, 4); // select "bc"

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('a `bc` d');
    });
  });

  describe('applyFormat() — unwrapping (toggle)', () => {
    it('unwraps backtick-wrapped text when surrounding markers present', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello `world` end';
      // Select "world" (indices 7-12), which is surrounded by backticks at 6 and 12
      mockSelection(el, 7, 12);

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('hello world end');
    });

    it('unwraps bold-wrapped text when surrounding markers present', () => {
      const el = create({ formatting: 'bold' });
      (el as any).value = 'hello **world** end';
      // Select "world" (indices 8-13), surrounded by ** at 6-8 and 13-15
      mockSelection(el, 8, 13);

      (el as any).applyFormat('bold');

      expect((el as any).value).toBe('hello world end');
    });

    it('unwraps when selection includes the markers', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello `world` end';
      // Select "`world`" (indices 6-13) — selection includes markers
      mockSelection(el, 6, 13);

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('hello world end');
    });

    it('unwraps italic when selection includes _ markers', () => {
      const el = create({ formatting: 'italic' });
      (el as any).value = 'hello _world_ end';
      // Select "_world_" (indices 6-13) — selection includes markers
      mockSelection(el, 6, 13);

      (el as any).applyFormat('italic');

      expect((el as any).value).toBe('hello world end');
    });
  });

  describe('applyFormat() — no-op cases', () => {
    it('is a no-op when format not in formatting attribute', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello world';
      mockSelection(el, 0, 5);

      (el as any).applyFormat('bold'); // bold not enabled

      expect((el as any).value).toBe('hello world');
    });

    it('is a no-op when formatting attribute is absent', () => {
      const el = create();
      (el as any).value = 'hello world';
      mockSelection(el, 0, 5);

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('hello world');
    });

    it('is a no-op with unknown format type', () => {
      const el = create({ formatting: 'code bold italic' });
      (el as any).value = 'hello world';
      mockSelection(el, 0, 5);

      (el as any).applyFormat('strikethrough');

      expect((el as any).value).toBe('hello world');
    });

    it('is a no-op when no selection (getSelection returns null)', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello world';
      mockNoSelection();

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('hello world');
    });

    it('is a no-op when selection is collapsed (cursor, no text selected)', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello world';
      mockCollapsedSelection(el, 3);

      (el as any).applyFormat('code');

      expect((el as any).value).toBe('hello world');
    });
  });

  describe('native:format event', () => {
    it('dispatches native:format with correct type and value', () => {
      const el = create({ formatting: 'bold' });
      (el as any).value = 'hello world';
      mockSelection(el, 6, 11);

      const handler = vi.fn();
      el.addEventListener('native:format', handler);

      (el as any).applyFormat('bold');

      expect(handler).toHaveBeenCalledOnce();
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.type).toBe('bold');
      expect(detail.value).toBe('hello **world**');
    });

    it('native:format event bubbles', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'test';
      mockSelection(el, 0, 4);

      const handler = vi.fn();
      document.body.addEventListener('native:format', handler);

      (el as any).applyFormat('code');

      expect(handler).toHaveBeenCalledOnce();
      document.body.removeEventListener('native:format', handler);
    });

    it('native:format event is composed', () => {
      const el = create({ formatting: 'italic' });
      (el as any).value = 'test';
      mockSelection(el, 0, 4);

      let composed = false;
      el.addEventListener('native:format', (e: Event) => {
        composed = e.composed;
      });

      (el as any).applyFormat('italic');

      expect(composed).toBe(true);
    });

    it('does not dispatch native:format when format is not enabled', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      const handler = vi.fn();
      el.addEventListener('native:format', handler);

      (el as any).applyFormat('bold');

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not dispatch native:format when selection is collapsed', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello';
      mockCollapsedSelection(el, 2);

      const handler = vi.fn();
      el.addEventListener('native:format', handler);

      (el as any).applyFormat('code');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('Ctrl+E triggers code format', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'e',
        ctrlKey: true,
        bubbles: true,
      }));

      expect((el as any).value).toBe('`hello`');
    });

    it('Meta+B triggers bold format', () => {
      const el = create({ formatting: 'bold' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'b',
        metaKey: true,
        bubbles: true,
      }));

      expect((el as any).value).toBe('**hello**');
    });

    it('Ctrl+I triggers italic format', () => {
      const el = create({ formatting: 'italic' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: true,
        bubbles: true,
      }));

      expect((el as any).value).toBe('_hello_');
    });

    it('shortcut is no-op when format is not enabled', () => {
      const el = create({ formatting: 'code' }); // only code, not bold
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      }));

      expect((el as any).value).toBe('hello');
    });

    it('shortcut is no-op without Ctrl or Meta', () => {
      const el = create({ formatting: 'code bold italic' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'e',
        bubbles: true,
      }));

      expect((el as any).value).toBe('hello');
    });

    it('shortcut prevents default', () => {
      const el = create({ formatting: 'bold' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      const event = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');

      el.dispatchEvent(event);

      expect(spy).toHaveBeenCalledOnce();
    });

    it('does not prevent default when format is not enabled', () => {
      const el = create({ formatting: 'code' }); // no bold
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      const event = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');

      el.dispatchEvent(event);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('formatting attribute changes at runtime', () => {
    it('respects dynamically added format types', () => {
      const el = create({ formatting: 'code' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      // bold not enabled yet
      (el as any).applyFormat('bold');
      expect((el as any).value).toBe('hello');

      // enable bold
      el.setAttribute('formatting', 'code bold');
      (el as any).applyFormat('bold');
      expect((el as any).value).toBe('**hello**');
    });

    it('respects dynamically removed format types', () => {
      const el = create({ formatting: 'code bold' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      // remove bold
      el.setAttribute('formatting', 'code');
      (el as any).applyFormat('bold');
      expect((el as any).value).toBe('hello');
    });

    it('removing formatting attribute disables all formats', () => {
      const el = create({ formatting: 'code bold italic' });
      (el as any).value = 'hello';
      mockSelection(el, 0, 5);

      el.removeAttribute('formatting');
      (el as any).applyFormat('code');
      expect((el as any).value).toBe('hello');
    });
  });
});
