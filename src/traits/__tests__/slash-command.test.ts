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
  input: HTMLInputElement;
  ctrl: SlashCommandController;
} {
  const host = document.createElement('div');
  const input = document.createElement('input');
  host.appendChild(input);
  document.body.appendChild(host);

  const ctrl = new SlashCommandController(host, { input, commands });
  return { host, input, ctrl };
}

function dispatchNativeInput(host: HTMLElement, input: HTMLElement, value: string): void {
  // Set the input value
  (input as HTMLInputElement).value = value;
  host.dispatchEvent(new CustomEvent('native:input', {
    bubbles: true,
    detail: { value },
  }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SlashCommandController', () => {
  it('creates a listbox popover when / is typed at start', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

    const listbox = host.querySelector('n-listbox');
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute('popover')).toBe('manual');
    expect(ctrl.open).toBe(true);
    ctrl.destroy();
  });

  it('shows all commands when only / is typed', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

    const options = host.querySelectorAll('n-option');
    expect(options.length).toBe(COMMANDS.length);
    ctrl.destroy();
  });

  it('filters commands by query (case-insensitive)', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/he');

    const options = host.querySelectorAll('n-option');
    // "help" (value), "heading" (value), "Hello World" (label), "Show help information" (description: help) — all contain "he"
    // help: value "help" contains "he" -> yes
    // search: value "search" no, label "Search" no, desc "Search for items" no
    // settings: value "settings" no, label "Settings" no, desc "Open settings" no
    // heading: value "heading" contains "he" -> yes
    // hello: value "hello" contains "he" -> yes
    expect(options.length).toBe(3);
    ctrl.destroy();
  });

  it('filters by description too', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/open');

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

    dispatchNativeInput(host, input, '/test');

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

    dispatchNativeInput(host, input, '/');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.query).toBe('');
    expect(handler.mock.calls[0][0].detail.commands.length).toBe(COMMANDS.length);
    ctrl.destroy();
  });

  it('closes the popover on Escape', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/test');
    expect(ctrl.open).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('closes the popover when value no longer starts with /', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/test');
    expect(ctrl.open).toBe(true);

    dispatchNativeInput(host, input, 'test');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('closes the popover when value is empty', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/test');
    expect(ctrl.open).toBe(true);

    dispatchNativeInput(host, input, '');
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('dispatches native:slash-select on Enter with active option', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/help');

    // Simulate an active option (normally set by listbox keyboard navigation)
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

  it('clears input value on selection', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/help');

    const option = host.querySelector('n-option');
    option!.setAttribute('active', '');

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    expect(input.value).toBe('');
    ctrl.destroy();
  });

  it('dispatches native:slash-select on listbox native:change', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

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
    dispatchNativeInput(host, input, '/');

    let options = host.querySelectorAll('n-option');
    expect(options.length).toBe(5);

    const newCommands: SlashCommand[] = [
      { value: 'new1', label: 'New Command 1' },
      { value: 'new2', label: 'New Command 2' },
    ];
    ctrl.commands = newCommands;

    // Options should be re-rendered since popover is open
    options = host.querySelectorAll('n-option');
    expect(options.length).toBe(2);
    expect(options[0].getAttribute('value')).toBe('new1');
    expect(options[1].getAttribute('value')).toBe('new2');
    ctrl.destroy();
  });

  it('destroy cleans up DOM and listeners', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

    expect(host.querySelector('n-listbox')).not.toBeNull();

    ctrl.destroy();

    // Listbox should be removed
    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);

    // Further native:input events should not throw or create a new listbox
    dispatchNativeInput(host, input, '/test');
    expect(host.querySelector('n-listbox')).toBeNull();
  });

  it('does not open popover for text not starting with /', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, 'hello');

    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('does not open popover for / in the middle of text', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, 'hello/world');

    expect(host.querySelector('n-listbox')).toBeNull();
    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });

  it('sets option values and text correctly', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

    const options = host.querySelectorAll('n-option');
    expect(options[0].getAttribute('value')).toBe('help');
    expect(options[0].textContent).toBe('Help');
    ctrl.destroy();
  });

  it('sets title attribute from description', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

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
    dispatchNativeInput(host, input, '/he');

    let options = host.querySelectorAll('n-option');
    expect(options.length).toBe(3); // help, heading, hello

    dispatchNativeInput(host, input, '/hel');

    options = host.querySelectorAll('n-option');
    expect(options.length).toBe(2); // help, hello
    ctrl.destroy();
  });

  it('delegates ArrowDown to listbox', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

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
    dispatchNativeInput(host, input, '/');

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

  it('listbox has correct role attribute', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/');

    const listbox = host.querySelector('n-listbox');
    expect(listbox?.getAttribute('role')).toBe('listbox');
    ctrl.destroy();
  });

  it('dismiss event closes the popover', () => {
    const { host, input, ctrl } = create();
    dispatchNativeInput(host, input, '/test');
    expect(ctrl.open).toBe(true);

    host.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true }));

    expect(ctrl.open).toBe(false);
    ctrl.destroy();
  });
});
