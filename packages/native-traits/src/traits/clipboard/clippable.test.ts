// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { NativeElement, define } from '@nonoun/native-core';
import { ClipboardController } from './clipboard-controller.ts';

// ── Mock clipboard ──

let clipboardText = '';
const mockWriteText = vi.fn(async (text: string) => { clipboardText = text; });
const mockReadText = vi.fn(async () => clipboardText);

beforeEach(() => {
  clipboardText = '';
  mockWriteText.mockClear();
  mockReadText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText, readText: mockReadText },
    writable: true,
    configurable: true,
  });
});

// ── Trait tests ──

class ClipTestEl extends NativeElement {
  disabled = false;
  #ctrl: ClipboardController | null = null;

  _pendingSelector = '.item';

  get clippableSelector(): string { return this.#ctrl?.selector ?? this._pendingSelector; }
  set clippableSelector(v: string) { if (this.#ctrl) this.#ctrl.selector = v; else this._pendingSelector = v; }

  setup() {
    super.setup();
    this.#ctrl = new ClipboardController(this, { selector: this._pendingSelector });
  }

  async clipCopy(): Promise<string> {
    if (!this.#ctrl) return '';
    const selected = [...this.querySelectorAll<HTMLElement>(`${this.clippableSelector}[selected]`)];
    return this.#ctrl.copy(selected);
  }

  async clipCut(): Promise<string> {
    if (!this.#ctrl) return '';
    const selected = [...this.querySelectorAll<HTMLElement>(`${this.clippableSelector}[selected]`)];
    return this.#ctrl.cut(selected);
  }

  async clipPaste(): Promise<string> {
    if (!this.#ctrl) return '';
    return this.#ctrl.paste();
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('clip-test')) {
  define('clip-test', ClipTestEl);
}

function create(count = 3): ClipTestEl {
  const el = document.createElement('clip-test') as ClipTestEl;
  el.clippableSelector = '.item';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Item ${i}`;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

function items(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.item')];
}

function selectItems(el: HTMLElement, indices: number[]): void {
  for (const i of indices) {
    items(el)[i].setAttribute('selected', '');
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Clippable', () => {
  it('clipCopy copies selected items to clipboard', async () => {
    const el = create();
    selectItems(el, [0, 2]);
    const handler = vi.fn();
    el.addEventListener('native:clip-copy', handler);
    const data = await el.clipCopy();
    expect(mockWriteText).toHaveBeenCalled();
    expect(data).toContain('Item 0');
    expect(data).toContain('Item 2');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clipCut marks items with clip-cut', async () => {
    const el = create();
    selectItems(el, [1]);
    const handler = vi.fn();
    el.addEventListener('native:clip-cut', handler);
    await el.clipCut();
    expect(items(el)[1].hasAttribute('clip-cut')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clipPaste reads from clipboard and dispatches native:clip-paste', async () => {
    const el = create();
    clipboardText = 'pasted content';
    const handler = vi.fn();
    el.addEventListener('native:clip-paste', handler);
    const data = await el.clipPaste();
    expect(data).toBe('pasted content');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.data).toBe('pasted content');
  });

  it('returns empty string when no controller (before setup)', async () => {
    // Create element without appending (no setup called)
    const el = document.createElement('clip-test') as ClipTestEl;
    el.clippableSelector = '.item';
    // Don't append to DOM
    const data = await el.clipCopy();
    expect(data).toBe('');
  });

  it('teardown destroys controller and clears cut marks', async () => {
    const el = create();
    selectItems(el, [0]);
    await el.clipCut();
    expect(items(el)[0].hasAttribute('clip-cut')).toBe(true);
    el.teardown();
    expect(items(el)[0].hasAttribute('clip-cut')).toBe(false);
  });
});

// ── ClipboardController standalone tests ──

function createHost(count = 3): HTMLElement {
  const el = document.createElement('div');
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Item ${i}`;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

describe('ClipboardController', () => {
  it('copy serializes items and writes to clipboard', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    const all = items(host);
    const data = await ctrl.copy([all[0], all[1]]);
    expect(data).toBe('Item 0\nItem 1');
    expect(mockWriteText).toHaveBeenCalledWith('Item 0\nItem 1');
    ctrl.destroy();
  });

  it('cut sets clip-cut attribute on items', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    const all = items(host);
    await ctrl.cut([all[0]]);
    expect(all[0].hasAttribute('clip-cut')).toBe(true);
    expect(ctrl.hasCutPending).toBe(true);
    ctrl.destroy();
  });

  it('paste reads clipboard and dispatches event', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    clipboardText = 'pasted text';
    const handler = vi.fn();
    host.addEventListener('native:clip-paste', handler);
    const data = await ctrl.paste();
    expect(data).toBe('pasted text');
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('cancelCut removes clip-cut from all items', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    const all = items(host);
    await ctrl.cut([all[0], all[1]]);
    ctrl.cancelCut();
    expect(all[0].hasAttribute('clip-cut')).toBe(false);
    expect(all[1].hasAttribute('clip-cut')).toBe(false);
    expect(ctrl.hasCutPending).toBe(false);
    ctrl.destroy();
  });

  it('paste clears pending cut items', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    const all = items(host);
    await ctrl.cut([all[0]]);
    expect(ctrl.hasCutPending).toBe(true);
    clipboardText = 'text';
    await ctrl.paste();
    expect(ctrl.hasCutPending).toBe(false);
    ctrl.destroy();
  });

  it('copy does nothing when disabled', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item', disabled: true });
    const data = await ctrl.copy(items(host));
    expect(data).toBe('');
    ctrl.destroy();
  });

  it('deserialize splits by newline', () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    expect(ctrl.deserialize('a\nb\nc')).toEqual(['a', 'b', 'c']);
    ctrl.destroy();
  });

  it('keyboard shortcut Ctrl+C copies selected items', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    items(host)[0].setAttribute('selected', '');
    const handler = vi.fn();
    host.addEventListener('native:clip-copy', handler);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true }));
    // Wait for the async copy
    await new Promise(r => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('keyboard shortcut does nothing without selected items', () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    const handler = vi.fn();
    host.addEventListener('native:clip-copy', handler);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('detach removes keyboard listener', () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    ctrl.detach();
    items(host)[0].setAttribute('selected', '');
    const handler = vi.fn();
    host.addEventListener('native:clip-copy', handler);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('destroy cancels pending cut and detaches', async () => {
    const host = createHost();
    const ctrl = new ClipboardController(host, { selector: '.item' });
    const all = items(host);
    await ctrl.cut([all[0]]);
    ctrl.destroy();
    expect(all[0].hasAttribute('clip-cut')).toBe(false);
  });
});
