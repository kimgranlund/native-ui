// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { RangeSelectController } from './range-select-controller.ts';
import { define } from '../../core/define.ts';

class RangeTestEl extends NativeElement {
  #range: RangeSelectController | null = null;
  #selector = '';
  #mode: 'drag' | 'click' = 'drag';
  #disabled = false;

  get rangeSelector(): string { return this.#range ? this.#range.selector : this.#selector; }
  set rangeSelector(val: string) { this.#selector = val; if (this.#range) this.#range.selector = val; }

  get rangeMode(): 'drag' | 'click' { return this.#range ? this.#range.mode : this.#mode; }
  set rangeMode(val: 'drag' | 'click') { this.#mode = val; if (this.#range) this.#range.mode = val; }

  get rangeDisabled(): boolean { return this.#range ? this.#range.disabled : this.#disabled; }
  set rangeDisabled(val: boolean) { this.#disabled = val; if (this.#range) this.#range.disabled = val; }

  clearRange(): void { this.#range?.clearRange(); }

  setup() {
    super.setup();
    this.#range = new RangeSelectController(this, {
      selector: this.#selector,
      mode: this.#mode,
      disabled: this.#disabled,
    });
  }
  teardown() { this.#range?.destroy(); this.#range = null; super.teardown(); }
}

if (!customElements.get('range-test')) {
  define('range-test', RangeTestEl);
}

function create(mode: 'drag' | 'click' = 'drag', count = 7): RangeTestEl {
  const el = document.createElement('range-test') as RangeTestEl;
  el.rangeSelector = '.item';
  el.rangeMode = mode;

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Item ${i}`;
    el.appendChild(item);
  }

  document.body.appendChild(el);
  return el;
}

function items(el: RangeTestEl): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.item')];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RangeSelectable — drag mode', () => {
  it('defaults to drag mode', () => {
    const el = create();
    expect(el.rangeMode).toBe('drag');
  });

  it('does nothing when disabled', () => {
    const el = create();
    el.rangeDisabled = true;
    const handler = vi.fn();
    el.addEventListener('native:range-select', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing with no selector', () => {
    const el = create();
    el.rangeSelector = '';
    const handler = vi.fn();
    el.addEventListener('native:range-select', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores non-primary button', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:range-select', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets range-selected on pointerdown', () => {
    const el = create();
    items(el)[2].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[2].hasAttribute('range-selected')).toBe(true);
    expect(items(el)[2].hasAttribute('range-start')).toBe(true);
    expect(items(el)[2].hasAttribute('range-end')).toBe(true);
  });

  it('dispatches native:range-select on pointerup', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:range-select', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.startIndex).toBe(0);
    expect(handler.mock.calls[0][0].detail.endIndex).toBe(0);
  });

  it('clears on pointercancel', () => {
    const el = create();
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[1].hasAttribute('range-selected')).toBe(true);
    document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    expect(items(el)[1].hasAttribute('range-selected')).toBe(false);
  });

  it('clearRange() resets everything', () => {
    const el = create();
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[1].hasAttribute('range-selected')).toBe(true);
    el.clearRange();
    for (const item of items(el)) {
      expect(item.hasAttribute('range-selected')).toBe(false);
      expect(item.hasAttribute('range-start')).toBe(false);
      expect(item.hasAttribute('range-end')).toBe(false);
    }
  });
});

describe('RangeSelectable — click mode', () => {
  it('first click sets start and enters selecting phase', () => {
    const el = create('click');
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    // Start is set, item is highlighted
    expect(items(el)[1].hasAttribute('range-selected')).toBe(true);
    expect(items(el)[1].hasAttribute('range-start')).toBe(true);
    expect(items(el)[1].hasAttribute('range-end')).toBe(true);
    // No commit event yet
    const handler = vi.fn();
    el.addEventListener('native:range-select', handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('hover in selecting phase updates range preview', () => {
    const el = create('click');
    const changeHandler = vi.fn();
    el.addEventListener('native:range-change', changeHandler);

    // First click: pick start
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    // Hover over item 4 (simulated via pointermove with target)
    const moveEvent = new PointerEvent('pointermove', { bubbles: true });
    Object.defineProperty(moveEvent, 'target', { value: items(el)[4] });
    el.dispatchEvent(moveEvent);

    expect(changeHandler).toHaveBeenCalled();
    // Items 1-4 should be range-selected
    expect(items(el)[1].hasAttribute('range-selected')).toBe(true);
    expect(items(el)[2].hasAttribute('range-selected')).toBe(true);
    expect(items(el)[3].hasAttribute('range-selected')).toBe(true);
    expect(items(el)[4].hasAttribute('range-selected')).toBe(true);
    expect(items(el)[0].hasAttribute('range-selected')).toBe(false);
  });

  it('second click commits range', () => {
    const el = create('click');
    const selectHandler = vi.fn();
    el.addEventListener('native:range-select', selectHandler);

    // First click: pick start at index 1
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    // Second click: commit at index 4
    items(el)[4].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    // Need pointerup to actually commit
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(selectHandler).toHaveBeenCalledTimes(1);
    const detail = selectHandler.mock.calls[0][0].detail;
    expect(detail.startIndex).toBe(1);
    expect(detail.endIndex).toBe(4);
  });

  it('clearRange() resets click mode state', () => {
    const el = create('click');
    // First click
    items(el)[2].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[2].hasAttribute('range-selected')).toBe(true);

    el.clearRange();
    for (const item of items(el)) {
      expect(item.hasAttribute('range-selected')).toBe(false);
    }

    // Should be back to idle — can start a new range
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[0].hasAttribute('range-selected')).toBe(true);
  });

  it('does nothing when disabled in click mode', () => {
    const el = create('click');
    el.rangeDisabled = true;
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[0].hasAttribute('range-selected')).toBe(false);
  });
});

// ── RangeSelectController standalone tests ──

function createHost(count = 7): HTMLElement {
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

function hostItems(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.item')];
}

describe('RangeSelectController', () => {
  it('attaches to a plain HTMLElement', () => {
    const host = createHost();
    const ctrl = new RangeSelectController(host, { selector: '.item' });

    hostItems(host)[2].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(hostItems(host)[2].hasAttribute('range-selected')).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('controller dispatches native:range-select on pointerup', () => {
    const host = createHost();
    const ctrl = new RangeSelectController(host, { selector: '.item' });
    const handler = vi.fn();
    host.addEventListener('native:range-select', handler);

    hostItems(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('respects disabled option', () => {
    const host = createHost();
    const ctrl = new RangeSelectController(host, { selector: '.item', disabled: true });

    hostItems(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(hostItems(host)[0].hasAttribute('range-selected')).toBe(false);

    ctrl.destroy();
  });

  it('controller clearRange() resets everything', () => {
    const host = createHost();
    const ctrl = new RangeSelectController(host, { selector: '.item' });

    hostItems(host)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(hostItems(host)[1].hasAttribute('range-selected')).toBe(true);

    ctrl.clearRange();
    for (const item of hostItems(host)) {
      expect(item.hasAttribute('range-selected')).toBe(false);
    }

    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new RangeSelectController(host, { selector: '.item' });
    ctrl.detach();

    hostItems(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(hostItems(host)[0].hasAttribute('range-selected')).toBe(false);

    ctrl.destroy();
  });
});
