// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MentionController } from './mention-controller.ts';
import type { MentionItem } from './mention-controller.ts';

const ITEMS: MentionItem[] = [
  { value: 'kim', label: 'Kim Granlund', description: 'Designer' },
  { value: 'alex', label: 'Alex Chen', description: 'Engineer' },
  { value: 'sam', label: 'Sam Rivera', description: 'Product Manager' },
  { value: 'kai', label: 'Kai Nakamura' },
  { value: 'jordan', label: 'Jordan Lee', description: 'Engineer', avatar: 'https://example.com/jordan.png' },
];

function create(items = ITEMS): {
  host: HTMLElement;
  input: HTMLElement;
  ctrl: MentionController;
} {
  const host = document.createElement('div');
  const input = document.createElement('div');
  input.setAttribute('contenteditable', 'plaintext-only');
  host.appendChild(input);
  document.body.appendChild(host);

  const ctrl = new MentionController(host, { input, items });
  return { host, input, ctrl };
}

function mockCaret(textNode: Text, offset: number): void {
  const mockSel = {
    focusNode: textNode,
    focusOffset: offset,
    rangeCount: 1,
    getRangeAt: () => ({
      collapsed: true,
      startContainer: textNode,
      startOffset: offset,
      endContainer: textNode,
      endOffset: offset,
      cloneRange() {
        return {
          collapsed: true,
          collapse() {},
          getBoundingClientRect: () => ({ left: 10, top: 10, right: 11, bottom: 26, width: 1, height: 16 }),
        };
      },
      collapse() {},
      getBoundingClientRect: () => ({ left: 10, top: 10, right: 11, bottom: 26, width: 1, height: 16 }),
    }),
    removeAllRanges() {},
    addRange() {},
  } as unknown as Selection;

  vi.spyOn(window, 'getSelection').mockReturnValue(mockSel);
}

function simulateTyping(host: HTMLElement, input: HTMLElement, text: string): void {
  input.textContent = text;
  const textNode = input.firstChild as Text;
  if (textNode) {
    mockCaret(textNode, text.length);
  } else {
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
  }
  host.dispatchEvent(new CustomEvent('native:input', {
    bubbles: true,
    detail: { value: text },
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('MentionController', () => {
  it('creates a listbox popover when @ is typed at start', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const listbox = host.querySelector('n-listbox');
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute('popover')).toBe('manual');
    expect(ctrl.open).toBe(true);
    ctrl.destroy();
  });

  it('shows all items when only @ is typed', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const options = host.querySelectorAll('n-option');
    expect(options.length).toBe(ITEMS.length);
    ctrl.destroy();
  });

  it('filters items by query (case-insensitive)', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@ki');

    const options = host.querySelectorAll('n-option');
    expect(options.length).toBe(1);
    expect(options[0].getAttribute('value')).toBe('kim');
    ctrl.destroy();
  });

  it('filters by description too', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@engineer');

    const options = host.querySelectorAll('n-option');
    // alex and jordan both have "Engineer" description
    expect(options.length).toBe(2);
    ctrl.destroy();
  });

  it('dispatches native:mention-query when typing after @', () => {
    const { host, input, ctrl } = create();
    const handler = vi.fn();
    host.addEventListener('native:mention-query', handler);

    simulateTyping(host, input, '@kim');

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.query).toBe('kim');
    expect(Array.isArray(detail.commands)).toBe(true);
    ctrl.destroy();
  });

  it('auto-activates first option on render', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const options = host.querySelectorAll('n-option');
    expect(options[0].hasAttribute('active')).toBe(true);
    for (let i = 1; i < options.length; i++) {
      expect(options[i].hasAttribute('active')).toBe(false);
    }
    ctrl.destroy();
  });

  it('dispatches native:mention-select on Enter with active option', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@kim');

    const handler = vi.fn();
    host.addEventListener('native:mention-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('kim');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('inserts a tag span with data-mention and @label format', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@kim');

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    const tag = input.querySelector('[data-mention="kim"]');
    expect(tag).not.toBeNull();
    expect(tag?.textContent).toBe('@Kim Granlund');
    expect(tag?.getAttribute('contenteditable')).toBe('false');
    ctrl.destroy();
  });

  it('mention tag uses accent color styling', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@kim');

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    const tag = input.querySelector('[data-mention="kim"]') as HTMLElement;
    expect(tag.style.background).toBe('var(--n-color-accent-100)');
    expect(tag.style.color).toBe('var(--n-color-accent-700)');
    ctrl.destroy();
  });

  it('closes the popover on Escape', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@test');
    expect(ctrl.open).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('closes the popover when caret leaves @ context', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@test');
    expect(ctrl.open).toBe(true);

    simulateTyping(host, input, 'test');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('does not open popover for text without @', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, 'hello');

    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('does not open popover for @ not preceded by whitespace', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, 'hello@world');

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('detects @ after whitespace mid-text', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, 'hello @ki');

    expect(ctrl.open).toBe(true);
    const options = host.querySelectorAll('n-option');
    expect(options.length).toBe(1);
    ctrl.destroy();
  });

  it('Tab selects first option when query has 2+ chars', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@ki');

    const handler = vi.fn();
    host.addEventListener('native:mention-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('kim');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('ArrowDown moves active to next option', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const options = host.querySelectorAll('n-option');
    expect(options[0].hasAttribute('active')).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    }));

    expect(options[0].hasAttribute('active')).toBe(false);
    expect(options[1].hasAttribute('active')).toBe(true);
    ctrl.destroy();
  });

  it('ArrowUp wraps to last option', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const options = host.querySelectorAll('n-option');
    expect(options[0].hasAttribute('active')).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    }));

    expect(options[0].hasAttribute('active')).toBe(false);
    expect(options[options.length - 1].hasAttribute('active')).toBe(true);
    ctrl.destroy();
  });

  it('click on option selects it', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const handler = vi.fn();
    host.addEventListener('native:mention-select', handler);

    const option = host.querySelectorAll('n-option')[1];
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('alex');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('dispatches native:mention-select on listbox native:change', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    const handler = vi.fn();
    host.addEventListener('native:mention-select', handler);

    const listbox = host.querySelector('n-listbox')!;
    listbox.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      detail: { value: 'alex' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('alex');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('items can be updated dynamically', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    let options = host.querySelectorAll('n-option');
    expect(options.length).toBe(5);

    const newItems: MentionItem[] = [
      { value: 'new1', label: 'New Person 1' },
      { value: 'new2', label: 'New Person 2' },
    ];
    ctrl.items = newItems;

    options = host.querySelectorAll('n-option');
    expect(options.length).toBe(2);
    ctrl.destroy();
  });

  it('destroy cleans up DOM and listeners', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@');

    expect(host.querySelector('n-listbox')).not.toBeNull();

    ctrl.destroy();

    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);

    simulateTyping(host, input, '@test');
    expect(host.querySelector('n-listbox')).toBeNull();
  });

  it('dismiss event closes the popover', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '@test');
    expect(ctrl.open).toBe(true);

    host.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('has no keyboard shortcut (no Cmd+@ toggle)', () => {
    const { host, input, ctrl } = create();

    // Cmd+@ should not open the popover
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: '@',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });
});
