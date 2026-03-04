// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SlashCommandController } from '../slash-command-controller.ts';
import type { SlashCommand } from '../slash-command-controller.ts';

const COMMANDS: SlashCommand[] = [
  { value: 'help', label: 'Help', description: 'Show help information' },
  { value: 'search', label: 'Search', description: 'Search for items' },
  { value: 'settings', label: 'Settings', description: 'Open settings' },
  { value: 'heading', label: 'Heading', description: 'Insert a heading' },
  { value: 'hello', label: 'Hello World' },
];

function create(commands = COMMANDS): {
  host: HTMLElement;
  input: HTMLElement;
  ctrl: SlashCommandController;
} {
  const host = document.createElement('div');
  const input = document.createElement('div');
  input.setAttribute('contenteditable', 'plaintext-only');
  host.appendChild(input);
  document.body.appendChild(host);

  const ctrl = new SlashCommandController(host, { input, commands });
  return { host, input, ctrl };
}

/**
 * Mock window.getSelection() to simulate a collapsed caret at a given
 * offset within the specified text node.
 */
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

/** Set text in the contenteditable input, mock caret at end, fire native:input on host. */
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

describe('SlashCommandController', () => {
  it('creates a listbox popover when / is typed at start', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const listbox = host.querySelector('n-listbox');
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute('popover')).toBe('manual');
    expect(ctrl.open).toBe(true);
    ctrl.destroy();
  });

  it('shows all commands when only / is typed', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const options = host.querySelectorAll('n-option');
    expect(options.length).toBe(COMMANDS.length);
    ctrl.destroy();
  });

  it('filters commands by query (case-insensitive)', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/he');

    const options = host.querySelectorAll('n-option');
    // help, heading, hello all contain "he"
    expect(options.length).toBe(3);
    ctrl.destroy();
  });

  it('filters by description too', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/open');

    const options = host.querySelectorAll('n-option');
    // "settings" has description "Open settings" which contains "open"
    expect(options.length).toBe(1);
    expect(options[0].getAttribute('value')).toBe('settings');
    ctrl.destroy();
  });

  it('dispatches native:slash-query when typing after /', () => {
    const { host, input, ctrl } = create();
    const handler = vi.fn();
    host.addEventListener('native:slash-query', handler);

    simulateTyping(host, input, '/test');

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.query).toBe('test');
    expect(Array.isArray(detail.commands)).toBe(true);
    ctrl.destroy();
  });

  it('dispatches native:slash-query with empty query for bare /', () => {
    const { host, input, ctrl } = create();
    const handler = vi.fn();
    host.addEventListener('native:slash-query', handler);

    simulateTyping(host, input, '/');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.query).toBe('');
    expect(handler.mock.calls[0][0].detail.commands.length).toBe(COMMANDS.length);
    ctrl.destroy();
  });

  it('closes the popover on Escape', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/test');
    expect(ctrl.open).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('closes the popover when caret leaves slash context', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/test');
    expect(ctrl.open).toBe(true);

    simulateTyping(host, input, 'test');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('closes the popover when value is empty', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/test');
    expect(ctrl.open).toBe(true);

    input.textContent = '';
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    host.dispatchEvent(new CustomEvent('native:input', {
      bubbles: true,
      detail: { value: '' },
    }));
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('dispatches native:slash-select on Enter with active option', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/help');

    const option = host.querySelector('n-option');
    expect(option).not.toBeNull();
    option!.setAttribute('active', '');

    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('help');
    expect(handler.mock.calls[0][0].detail.command.label).toBe('Help');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('inserts a tag span on command selection', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/help');

    const option = host.querySelector('n-option');
    option!.setAttribute('active', '');

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    const tag = input.querySelector('[data-slash-command="help"]');
    expect(tag).not.toBeNull();
    expect(tag?.textContent).toBe('/help');
    expect(tag?.getAttribute('contenteditable')).toBe('false');
    ctrl.destroy();
  });

  it('dispatches native:slash-select on listbox native:change', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    const listbox = host.querySelector('n-listbox')!;
    listbox.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      detail: { value: 'search' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('search');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('commands can be updated dynamically', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    let options = host.querySelectorAll('n-option');
    expect(options.length).toBe(5);

    const newCommands: SlashCommand[] = [
      { value: 'new1', label: 'New Command 1' },
      { value: 'new2', label: 'New Command 2' },
    ];
    ctrl.commands = newCommands;

    options = host.querySelectorAll('n-option');
    expect(options.length).toBe(2);
    expect(options[0].getAttribute('value')).toBe('new1');
    expect(options[1].getAttribute('value')).toBe('new2');
    ctrl.destroy();
  });

  it('destroy cleans up DOM and listeners', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    expect(host.querySelector('n-listbox')).not.toBeNull();

    ctrl.destroy();

    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);

    // Further events should not throw or create a new listbox
    simulateTyping(host, input, '/test');
    expect(host.querySelector('n-listbox')).toBeNull();
  });

  it('does not open popover for text without slash', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, 'hello');

    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('does not open popover for / not preceded by whitespace', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, 'hello/world');

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('detects / after whitespace mid-text', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, 'hello /he');

    expect(ctrl.open).toBe(true);
    const options = host.querySelectorAll('n-option');
    // help, heading, hello — all contain "he"
    expect(options.length).toBe(3);
    ctrl.destroy();
  });

  it('sets option values and text correctly', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const options = host.querySelectorAll('n-option');
    expect(options[0].getAttribute('value')).toBe('help');
    // Label is in a span, textContent includes description too
    expect(options[0].textContent).toContain('Help');
    ctrl.destroy();
  });

  it('sets title attribute from description', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const options = host.querySelectorAll('n-option');
    expect(options[0].getAttribute('title')).toBe('Show help information');
    // "Hello World" has no description
    expect(options[4].getAttribute('title')).toBeNull();
    ctrl.destroy();
  });

  it('Enter does nothing when popover is closed', () => {
    const { host, input, ctrl } = create();
    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('Escape does nothing when popover is closed', () => {
    const { host, input, ctrl } = create();

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('re-renders options when query changes', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/he');

    let options = host.querySelectorAll('n-option');
    expect(options.length).toBe(3); // help, heading, hello

    simulateTyping(host, input, '/hel');

    options = host.querySelectorAll('n-option');
    expect(options.length).toBe(2); // help, hello
    ctrl.destroy();
  });

  it('delegates ArrowDown to listbox', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const listbox = host.querySelector('n-listbox')!;
    const spy = vi.fn();
    listbox.addEventListener('keydown', spy);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    }));

    expect(spy).toHaveBeenCalled();
    ctrl.destroy();
  });

  it('delegates ArrowUp to listbox', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const listbox = host.querySelector('n-listbox')!;
    const spy = vi.fn();
    listbox.addEventListener('keydown', spy);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    }));

    expect(spy).toHaveBeenCalled();
    ctrl.destroy();
  });

  it('listbox has correct attributes', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const listbox = host.querySelector('n-listbox');
    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox?.getAttribute('size')).toBe('sm');
    expect(listbox?.getAttribute('density')).toBe('compact');
    ctrl.destroy();
  });

  it('dismiss event closes the popover', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/test');
    expect(ctrl.open).toBe(true);

    host.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  // ── Tab-to-select ──

  it('Tab selects first option when query has 2+ chars', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/he');

    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    // First filtered result for "he" is "help"
    expect(handler.mock.calls[0][0].detail.command.value).toBe('help');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('Tab selects active option over first when query has 2+ chars', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/he');

    // Set the second option as active
    const options = host.querySelectorAll('n-option');
    options[1].setAttribute('active', '');

    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.command.value).toBe('heading');
    ctrl.destroy();
  });

  it('Tab does not select when query has fewer than 2 chars', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/h');

    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).not.toHaveBeenCalled();
    // Popover stays open — Tab was not prevented
    expect(ctrl.open).toBe(true);
    ctrl.destroy();
  });

  it('Tab does nothing when popover is closed', () => {
    const { host, input, ctrl } = create();
    const handler = vi.fn();
    host.addEventListener('native:slash-select', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  // ── Description spans ──

  it('renders description span inside options', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const firstOption = host.querySelector('n-option')!;
    const spans = firstOption.querySelectorAll('span');
    // Label span + description span
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('Help');
    expect(spans[1].textContent).toBe('Show help information');
    ctrl.destroy();
  });

  it('does not render description span when description is absent', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    // "Hello World" (index 4) has no description
    const options = host.querySelectorAll('n-option');
    const spans = options[4].querySelectorAll('span');
    expect(spans.length).toBe(1); // label only
    expect(spans[0].textContent).toBe('Hello World');
    ctrl.destroy();
  });

  it('options have flex display for label/description layout', () => {
    const { host, input, ctrl } = create();
    simulateTyping(host, input, '/');

    const firstOption = host.querySelector('n-option')!;
    expect(firstOption.style.display).toBe('flex');
    expect(firstOption.style.alignItems).toBe('center');
    ctrl.destroy();
  });
});
