// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { SelectionController } from './selection-controller.ts';
import { define } from '../../core/define.ts';

// ── Trait tests ──

class SelectTestEl extends NativeElement {
  disabled = false;
  #ctrl: SelectionController | null = null;

  // Mixin-compatible properties that delegate to the controller
  get selectableSelector(): string { return this.#ctrl?.selector ?? ''; }
  set selectableSelector(v: string) { if (this.#ctrl) this.#ctrl.selector = v; else this._pendingSelector = v; }

  get selectableMode(): string { return this.#ctrl?.mode ?? 'multiple'; }
  set selectableMode(v: 'single' | 'multiple') { if (this.#ctrl) this.#ctrl.mode = v; }

  get selectableDisabled(): boolean { return this.#ctrl?.disabled ?? false; }
  set selectableDisabled(v: boolean) { if (this.#ctrl) this.#ctrl.disabled = v; }

  _pendingSelector = '';

  setup() {
    super.setup();
    this.#ctrl = new SelectionController(this, { selector: this._pendingSelector || '.item' });
  }

  getSelection(): HTMLElement[] { return this.#ctrl?.getSelection() ?? []; }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('select-test')) {
  define('select-test', SelectTestEl);
}

function create(count = 5): SelectTestEl {
  const el = document.createElement('select-test') as SelectTestEl;
  el.selectableSelector = '.item';
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

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Selectable', () => {
  it('defaults to multiple mode', () => {
    const el = create();
    expect(el.selectableMode).toBe('multiple');
  });

  it('starts with empty selection', () => {
    const el = create();
    expect(el.getSelection()).toHaveLength(0);
  });

  it('selects an item on click', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:selection-change', handler);
    items(el)[0].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.count).toBe(1);
    expect(items(el)[0].hasAttribute('selected')).toBe(true);
  });

  it('clicking another item deselects previous', () => {
    const el = create();
    items(el)[0].click();
    items(el)[2].click();
    expect(items(el)[0].hasAttribute('selected')).toBe(false);
    expect(items(el)[2].hasAttribute('selected')).toBe(true);
    expect(el.getSelection()).toHaveLength(1);
  });

  it('ctrl+click toggles selection in multiple mode', () => {
    const el = create();
    items(el)[0].click();
    items(el)[2].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(items(el)[0].hasAttribute('selected')).toBe(true);
    expect(items(el)[2].hasAttribute('selected')).toBe(true);
    expect(el.getSelection()).toHaveLength(2);
  });

  it('ctrl+click deselects already-selected item', () => {
    const el = create();
    items(el)[0].click();
    items(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(items(el)[0].hasAttribute('selected')).toBe(false);
  });

  it('shift+click selects range', () => {
    const el = create();
    items(el)[1].click(); // anchor
    items(el)[4].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    // Should select items 1, 2, 3, 4
    expect(el.getSelection()).toHaveLength(4);
    for (let i = 1; i <= 4; i++) {
      expect(items(el)[i].hasAttribute('selected')).toBe(true);
    }
  });

  it('Ctrl+A selects all in multiple mode', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:selection-change', handler);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(el.getSelection()).toHaveLength(5);
  });

  it('Ctrl+A does nothing in single mode', () => {
    const el = create();
    el.selectableMode = 'single';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
    expect(el.getSelection()).toHaveLength(0);
  });

  it('does nothing when selectableDisabled', () => {
    const el = create();
    el.selectableDisabled = true;
    items(el)[0].click();
    expect(el.getSelection()).toHaveLength(0);
  });

  it('teardown clears selection and removes listeners', () => {
    const el = create();
    items(el)[0].click();
    expect(el.getSelection()).toHaveLength(1);
    el.teardown();
    expect(items(el)[0].hasAttribute('selected')).toBe(false);
  });
});

// ── SelectionController standalone tests ──

function createHost(count = 5): HTMLElement {
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

describe('SelectionController', () => {
  it('select() sets selected and selection-anchor', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    const all = items(host);
    ctrl.select(all[0]);
    expect(all[0].hasAttribute('selected')).toBe(true);
    expect(all[0].hasAttribute('selection-anchor')).toBe(true);
    ctrl.destroy();
  });

  it('toggle() adds and removes', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    const all = items(host);
    ctrl.select(all[0]);
    ctrl.toggle(all[1]);
    expect(ctrl.getSelection()).toHaveLength(2);
    ctrl.toggle(all[0]);
    expect(ctrl.getSelection()).toHaveLength(1);
    expect(all[0].hasAttribute('selected')).toBe(false);
    ctrl.destroy();
  });

  it('rangeTo() selects contiguous range', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    const all = items(host);
    ctrl.select(all[1]); // sets anchor
    ctrl.rangeTo(all[3]);
    expect(ctrl.getSelection()).toHaveLength(3); // items 1,2,3
    expect(all[0].hasAttribute('selected')).toBe(false);
    expect(all[4].hasAttribute('selected')).toBe(false);
    ctrl.destroy();
  });

  it('selectAll() selects everything', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    ctrl.selectAll();
    expect(ctrl.getSelection()).toHaveLength(5);
    ctrl.destroy();
  });

  it('selectAll() does nothing in single mode', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item', mode: 'single' });
    ctrl.selectAll();
    expect(ctrl.getSelection()).toHaveLength(0);
    ctrl.destroy();
  });

  it('clear() removes all selection', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    ctrl.selectAll();
    ctrl.clear();
    expect(ctrl.getSelection()).toHaveLength(0);
    for (const item of items(host)) {
      expect(item.hasAttribute('selected')).toBe(false);
    }
    ctrl.destroy();
  });

  it('dispatches native:selection-change on each operation', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    const handler = vi.fn();
    host.addEventListener('native:selection-change', handler);
    ctrl.select(items(host)[0]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.count).toBe(1);
    ctrl.destroy();
  });

  it('respects disabled option', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item', disabled: true });
    ctrl.select(items(host)[0]);
    expect(ctrl.getSelection()).toHaveLength(0);
    ctrl.destroy();
  });

  it('detach stops listening to clicks', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    ctrl.detach();
    items(host)[0].click();
    expect(ctrl.getSelection()).toHaveLength(0);
    ctrl.destroy();
  });

  it('attach re-enables after detach', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    ctrl.detach();
    ctrl.attach();
    items(host)[0].click();
    expect(ctrl.getSelection()).toHaveLength(1);
    ctrl.destroy();
  });

  it('handleClick with shift does rangeTo', () => {
    const host = createHost();
    const ctrl = new SelectionController(host, { selector: '.item' });
    const all = items(host);
    ctrl.handleClick(all[0], { shift: false, ctrl: false }); // sets anchor
    ctrl.handleClick(all[3], { shift: true, ctrl: false });
    expect(ctrl.getSelection()).toHaveLength(4);
    ctrl.destroy();
  });
});
