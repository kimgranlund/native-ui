// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../command.ts';

// ── Helpers ──

function createCommand(opts: { withInput?: boolean; withEmpty?: boolean } = {}): HTMLElement {
  const cmd = document.createElement('n-command');

  if (opts.withInput !== false) {
    const input = document.createElement('n-command-input');
    const nativeInput = document.createElement('input');
    nativeInput.setAttribute('type', 'text');
    nativeInput.setAttribute('placeholder', 'Search...');
    input.appendChild(nativeInput);
    cmd.appendChild(input);
  }

  const list = document.createElement('n-command-list');

  const item1 = document.createElement('n-command-item');
  item1.setAttribute('value', 'copy');
  item1.textContent = 'Copy';
  list.appendChild(item1);

  const item2 = document.createElement('n-command-item');
  item2.setAttribute('value', 'paste');
  item2.textContent = 'Paste';
  list.appendChild(item2);

  const item3 = document.createElement('n-command-item');
  item3.setAttribute('value', 'cut');
  item3.textContent = 'Cut';
  list.appendChild(item3);

  cmd.appendChild(list);

  if (opts.withEmpty) {
    const empty = document.createElement('n-command-empty');
    empty.textContent = 'No results found';
    cmd.appendChild(empty);
  }

  document.body.appendChild(cmd);
  return cmd;
}

function createGroupedCommand(): HTMLElement {
  const cmd = document.createElement('n-command');

  const input = document.createElement('n-command-input');
  const nativeInput = document.createElement('input');
  nativeInput.setAttribute('type', 'text');
  input.appendChild(nativeInput);
  cmd.appendChild(input);

  const list = document.createElement('n-command-list');

  // Group 1: Edit
  const group1 = document.createElement('n-command-group');
  const heading1 = document.createElement('span');
  heading1.setAttribute('slot', 'heading');
  heading1.textContent = 'Edit';
  group1.appendChild(heading1);

  const item1 = document.createElement('n-command-item');
  item1.setAttribute('value', 'copy');
  item1.textContent = 'Copy';
  group1.appendChild(item1);

  const item2 = document.createElement('n-command-item');
  item2.setAttribute('value', 'paste');
  item2.textContent = 'Paste';
  group1.appendChild(item2);

  list.appendChild(group1);

  // Group 2: View
  const group2 = document.createElement('n-command-group');
  const heading2 = document.createElement('span');
  heading2.setAttribute('slot', 'heading');
  heading2.textContent = 'View';
  group2.appendChild(heading2);

  const item3 = document.createElement('n-command-item');
  item3.setAttribute('value', 'zoom-in');
  item3.textContent = 'Zoom In';
  group2.appendChild(item3);

  list.appendChild(group2);

  cmd.appendChild(list);
  document.body.appendChild(cmd);
  return cmd;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Registration ──

describe('n-command registration', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-command')).toBeDefined();
  });

  it('registers all sub-elements', () => {
    expect(customElements.get('n-command-input')).toBeDefined();
    expect(customElements.get('n-command-item')).toBeDefined();
    expect(customElements.get('n-command-group')).toBeDefined();
    expect(customElements.get('n-command-list')).toBeDefined();
    expect(customElements.get('n-command-empty')).toBeDefined();
  });
});

// ── Store ──

describe('n-command store', () => {
  it('store is accessible', () => {
    const cmd = createCommand();
    const store = (cmd as any).store;
    expect(store).toBeDefined();
    expect(store.query).toBeDefined();
    expect(store.activeIndex).toBeDefined();
  });

  it('store starts with empty query and index 0', () => {
    const cmd = createCommand();
    const store = (cmd as any).store;
    expect(store.query.value).toBe('');
    expect(store.activeIndex.value).toBe(0);
  });
});

// ── Command Item ──

describe('n-command-item', () => {
  it('value property reflects attribute', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item[value="copy"]') as any;
    expect(item.value).toBe('copy');
  });

  it('value property setter reflects to attribute', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item') as any;
    item.value = 'new-value';
    expect(item.getAttribute('value')).toBe('new-value');
  });

  it('label returns text content', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item[value="copy"]') as any;
    expect(item.label).toBe('Copy');
  });

  it('searchText includes label, value, and keywords', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item[value="copy"]') as any;
    item.keywords = 'duplicate clone';
    const search = item.searchText;
    expect(search).toContain('copy');
    expect(search).toContain('duplicate clone');
  });

  it('dispatches native:select on click', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item[value="copy"]')!;
    const handler = vi.fn();
    cmd.addEventListener('native:select', handler);

    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('copy');
    expect(handler.mock.calls[0][0].detail.label).toBe('Copy');
  });

  it('disabled item does not dispatch native:select on click', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item[value="copy"]') as any;
    item.disabled = true;
    const handler = vi.fn();
    cmd.addEventListener('native:select', handler);

    item.click();

    expect(handler).not.toHaveBeenCalled();
  });

  it('disabled property toggles attribute', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item') as any;
    item.disabled = true;
    expect(item.hasAttribute('disabled')).toBe(true);
    item.disabled = false;
    expect(item.hasAttribute('disabled')).toBe(false);
  });

  it('disabled sets aria-disabled attribute', async () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item') as any;
    item.disabled = true;
    await Promise.resolve();
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('keywords property reflects to attribute', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item') as any;
    item.keywords = 'foo bar';
    expect(item.getAttribute('keywords')).toBe('foo bar');
  });

  it('keywords attribute updates property', () => {
    const cmd = createCommand();
    const item = cmd.querySelector('n-command-item')!;
    item.setAttribute('keywords', 'baz qux');
    expect((item as any).keywords).toBe('baz qux');
  });
});

// ── Command dispatches native:change on native:select ──

describe('n-command event re-dispatch', () => {
  it('dispatches native:change when item emits native:select', () => {
    const cmd = createCommand();
    const handler = vi.fn();
    cmd.addEventListener('native:change', handler);

    const item = cmd.querySelector('n-command-item[value="copy"]')!;
    item.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true,
      composed: true,
      detail: { value: 'copy', label: 'Copy' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('copy');
    expect(handler.mock.calls[0][0].detail.label).toBe('Copy');
  });
});

// ── Filtering ──

describe('n-command filtering', () => {
  it('typing in input dispatches native:input and updates store query', async () => {
    const cmd = createCommand();
    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;

    input.value = 'cop';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const store = (cmd as any).store;
    expect(store.query.value).toBe('cop');
  });

  it('filtering hides non-matching items', async () => {
    const cmd = createCommand();
    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;

    input.value = 'cop';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // Allow effect to run
    await Promise.resolve();

    const items = cmd.querySelectorAll('n-command-item');
    // "Copy" matches "cop", "Paste" and "Cut" do not
    expect(items[0].hasAttribute('hidden')).toBe(false); // Copy
    expect(items[1].hasAttribute('hidden')).toBe(true);  // Paste
    expect(items[2].hasAttribute('hidden')).toBe(true);  // Cut
  });

  it('clearing filter shows all items', async () => {
    const cmd = createCommand();
    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;

    // Filter first
    input.value = 'cop';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    // Clear filter
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const items = cmd.querySelectorAll('n-command-item');
    for (const item of items) {
      expect(item.hasAttribute('hidden')).toBe(false);
    }
  });

  it('filtering resets activeIndex to 0', async () => {
    const cmd = createCommand();
    const store = (cmd as any).store;

    // Move active to index 2
    store.activeIndex.value = 2;

    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;
    input.value = 'cop';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    expect(store.activeIndex.value).toBe(0);
  });
});

// ── Keyboard Navigation ──

describe('n-command keyboard navigation', () => {
  it('ArrowDown moves activeIndex forward', async () => {
    const cmd = createCommand();
    const store = (cmd as any).store;

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.activeIndex.value).toBe(1);
  });

  it('ArrowUp moves activeIndex backward (wraps)', async () => {
    const cmd = createCommand();
    const store = (cmd as any).store;

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    // Wraps from 0 to last item (index 2)
    expect(store.activeIndex.value).toBe(2);
  });

  it('ArrowDown wraps around at end', () => {
    const cmd = createCommand();
    const store = (cmd as any).store;
    store.activeIndex.value = 2;

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.activeIndex.value).toBe(0);
  });

  it('Home sets activeIndex to 0', () => {
    const cmd = createCommand();
    const store = (cmd as any).store;
    store.activeIndex.value = 2;

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(store.activeIndex.value).toBe(0);
  });

  it('End sets activeIndex to last item', () => {
    const cmd = createCommand();
    const store = (cmd as any).store;

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(store.activeIndex.value).toBe(2);
  });

  it('Enter clicks the active item', () => {
    const cmd = createCommand();
    const handler = vi.fn();
    cmd.addEventListener('native:select', handler);

    // Active index defaults to 0 -> first item "Copy"
    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('copy');
  });

  it('Escape dispatches native:dismiss', () => {
    const cmd = createCommand();
    const handler = vi.fn();
    cmd.addEventListener('native:dismiss', handler);

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('active attribute is set on the active item via effect', async () => {
    const cmd = createCommand();
    await Promise.resolve();

    const items = cmd.querySelectorAll('n-command-item');
    // Index 0 is active by default
    expect(items[0].hasAttribute('active')).toBe(true);
    expect(items[1].hasAttribute('active')).toBe(false);
    expect(items[2].hasAttribute('active')).toBe(false);
  });

  it('active attribute moves when ArrowDown is pressed', async () => {
    const cmd = createCommand();
    await Promise.resolve();

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();

    const items = cmd.querySelectorAll('n-command-item');
    expect(items[0].hasAttribute('active')).toBe(false);
    expect(items[1].hasAttribute('active')).toBe(true);
  });
});

// ── Grouped Items ──

describe('n-command-group', () => {
  it('groups items with heading', () => {
    const cmd = createGroupedCommand();
    const groups = cmd.querySelectorAll('n-command-group');
    expect(groups).toHaveLength(2);
  });

  it('items inside groups are discoverable', () => {
    const cmd = createGroupedCommand();
    const items = cmd.querySelectorAll('n-command-item');
    expect(items).toHaveLength(3);
  });

  it('keyboard navigation traverses across groups', () => {
    const cmd = createGroupedCommand();
    const store = (cmd as any).store;

    // Start at 0 (Copy in group 1)
    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.activeIndex.value).toBe(1); // Paste in group 1

    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.activeIndex.value).toBe(2); // Zoom In in group 2
  });

  it('filtering works across groups', async () => {
    const cmd = createGroupedCommand();
    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;

    input.value = 'zoom';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const items = cmd.querySelectorAll('n-command-item');
    // Only "Zoom In" matches
    expect(items[0].hasAttribute('hidden')).toBe(true);  // Copy
    expect(items[1].hasAttribute('hidden')).toBe(true);  // Paste
    expect(items[2].hasAttribute('hidden')).toBe(false); // Zoom In
  });
});

// ── Empty State ──

describe('n-command empty state', () => {
  it('shows empty element when no items match', async () => {
    const cmd = createCommand({ withEmpty: true });
    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;

    // All items visible initially — empty should be hidden
    await Promise.resolve();
    const empty = cmd.querySelector('n-command-empty')!;
    expect(empty.hasAttribute('hidden')).toBe(true);

    // Filter to something that matches nothing
    input.value = 'zzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    expect(empty.hasAttribute('hidden')).toBe(false);
  });

  it('hides empty element when items become visible again', async () => {
    const cmd = createCommand({ withEmpty: true });
    const input = cmd.querySelector('n-command-input input') as HTMLInputElement;

    // Filter to no match
    input.value = 'zzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const empty = cmd.querySelector('n-command-empty')!;
    expect(empty.hasAttribute('hidden')).toBe(false);

    // Clear filter
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    expect(empty.hasAttribute('hidden')).toBe(true);
  });
});

// ── Command Input ──

describe('n-command-input', () => {
  it('inputElement returns the native input', async () => {
    const cmd = createCommand();
    await Promise.resolve(); // deferChildren microtask
    const cmdInput = cmd.querySelector('n-command-input') as any;
    expect(cmdInput.inputElement).toBeInstanceOf(HTMLInputElement);
  });

  it('clear() resets the input value and dispatches native:input', async () => {
    const cmd = createCommand();
    await Promise.resolve();
    const cmdInput = cmd.querySelector('n-command-input') as any;
    const nativeInput = cmdInput.querySelector('input') as HTMLInputElement;

    nativeInput.value = 'hello';
    const handler = vi.fn();
    cmd.addEventListener('native:input', handler);

    cmdInput.clear();

    expect(nativeInput.value).toBe('');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('');
  });

  it('focus() delegates to the native input', async () => {
    const cmd = createCommand();
    await Promise.resolve();
    const cmdInput = cmd.querySelector('n-command-input') as any;
    const nativeInput = cmdInput.querySelector('input') as HTMLInputElement;
    const spy = vi.spyOn(nativeInput, 'focus');

    cmdInput.focus();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dispatches native:input on native input event', async () => {
    const cmd = createCommand();
    await Promise.resolve();
    const handler = vi.fn();
    cmd.addEventListener('native:input', handler);

    const nativeInput = cmd.querySelector('n-command-input input') as HTMLInputElement;
    nativeInput.value = 'test';
    nativeInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('test');
  });

  it('teardown cleans up event listener', async () => {
    const cmd = createCommand();
    await Promise.resolve();
    const cmdInput = cmd.querySelector('n-command-input') as any;

    // Trigger teardown by removing from DOM
    document.body.removeChild(cmd);

    // After teardown, inputElement should be null
    expect(cmdInput.inputElement).toBeNull();
  });

  it('inputElement is null before setup', () => {
    // Create without appending — no connectedCallback
    const cmdInput = document.createElement('n-command-input');
    expect((cmdInput as any).inputElement).toBeNull();
  });
});
