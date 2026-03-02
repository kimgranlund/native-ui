// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { DragController } from '../drag-controller.ts';
import { define } from '../../core/define.ts';

// ── Test element using DragController ──

class DragTestEl extends NativeElement {
  #drag: DragController | null = null;
  #selector = '';
  #axis: 'vertical' | 'horizontal' | 'both' = 'both';
  #mode: 'drop' | 'slot' | 'preview' = 'drop';
  #disabled = false;

  get dragSelector(): string { return this.#drag ? this.#drag.selector : this.#selector; }
  set dragSelector(val: string) { this.#selector = val; if (this.#drag) this.#drag.selector = val; }

  get dragAxis(): 'vertical' | 'horizontal' | 'both' { return this.#drag ? this.#drag.axis : this.#axis; }
  set dragAxis(val: 'vertical' | 'horizontal' | 'both') { this.#axis = val; if (this.#drag) this.#drag.axis = val; }

  get dragMode(): 'drop' | 'slot' | 'preview' { return this.#drag ? this.#drag.mode : this.#mode; }
  set dragMode(val: 'drop' | 'slot' | 'preview') { this.#mode = val; if (this.#drag) this.#drag.mode = val; }

  get dragDisabled(): boolean { return this.#drag ? this.#drag.disabled : this.#disabled; }
  set dragDisabled(val: boolean) { this.#disabled = val; if (this.#drag) this.#drag.disabled = val; }

  setup() {
    super.setup();
    this.#drag = new DragController(this, {
      selector: this.#selector,
      axis: this.#axis,
      mode: this.#mode,
      disabled: this.#disabled,
    });
  }
  teardown() { this.#drag?.destroy(); this.#drag = null; super.teardown(); }
}

if (!customElements.get('drag-test')) {
  define('drag-test', DragTestEl);
}

function create(mode: 'drop' | 'slot' | 'preview' = 'drop', count = 5): DragTestEl {
  const el = document.createElement('drag-test') as DragTestEl;
  el.dragSelector = '.item';
  el.dragAxis = 'vertical';
  el.dragMode = mode;

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

describe('Draggable — drop mode', () => {
  it('defaults to drop mode', () => {
    const el = create();
    expect(el.dragMode).toBe('drop');
  });

  it('does nothing when disabled', () => {
    const el = create();
    el.dragDisabled = true;
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing with no selector', () => {
    const el = create();
    el.dragSelector = '';
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores non-primary button', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets dragging attribute on first pointermove', () => {
    const el = create();
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[1].hasAttribute('dragging')).toBe(false);

    // First move creates ghost and sets dragging
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(items(el)[1].hasAttribute('dragging')).toBe(true);
  });

  it('dispatches native:drag-start on first move', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.item).toBe(items(el)[0]);
    expect(handler.mock.calls[0][0].detail.index).toBe(0);
  });

  it('dispatches native:drop on pointerup after drag', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.fromIndex).toBe(0);
  });

  it('does not dispatch native:drop without movement', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches native:drag-cancel on Escape', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drag-cancel', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cleanup removes dragging attribute and ghost', () => {
    const el = create();
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    expect(items(el)[0].hasAttribute('dragging')).toBe(true);
    // Ghost appended to document.body (not host) to avoid polluting host queries
    expect(document.body.querySelectorAll('[popover][aria-hidden="true"]').length).toBeGreaterThan(0);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(items(el)[0].hasAttribute('dragging')).toBe(false);
  });
});

describe('Draggable — slot mode', () => {
  it('has dragMode slot when configured', () => {
    const el = create('slot');
    expect(el.dragMode).toBe('slot');
  });

  it('does not create placeholder without movement', () => {
    const el = create('slot');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.querySelector('.drag-placeholder')).toBeNull();
  });

  it('dispatches native:drop with insertBefore in slot mode', () => {
    const el = create('slot');
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.fromIndex).toBe(0);
    expect('insertBefore' in detail).toBe(true);
  });

  it('cleanup removes placeholder in slot mode', () => {
    const el = create('slot');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    // After cleanup
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(el.querySelector('.drag-placeholder')).toBeNull();
  });

  it('cleanup removes slot attributes', () => {
    const el = create('slot');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    for (const item of items(el)) {
      expect(item.hasAttribute('drag-slot-before')).toBe(false);
      expect(item.hasAttribute('drag-slot-after')).toBe(false);
    }
  });
});

// ── DragController standalone tests ──

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

describe('DragController', () => {
  it('attaches to a plain HTMLElement', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', axis: 'vertical', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(items(host)[0].hasAttribute('dragging')).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('dispatches native:drop on host element', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('respects disabled option', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', disabled: true });
    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('can be disabled after creation', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item' });
    ctrl.disabled = true;
    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item' });
    ctrl.detach();

    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('attach re-enables after detach', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item' });
    ctrl.detach();
    ctrl.attach();

    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('works in slot mode on plain element', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', axis: 'vertical', mode: 'slot' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect('insertBefore' in detail).toBe(true);
    expect(host.querySelector('.drag-placeholder')).toBeNull(); // cleaned up

    ctrl.destroy();
  });

  it('creates ghost on first pointermove (no callback)', () => {
    const host = createHost();
    const ctrl = new DragController(host, {
      selector: '.item',
      mode: 'drop',
    });

    const dragItem = items(host)[0];
    dragItem.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    // Ghost is created as a popover on document.body (not host)
    const ghost = document.body.querySelector('[popover][aria-hidden="true"]');
    expect(ghost).toBeInstanceOf(HTMLElement);
    // Ghost must NOT be inside host — it would pollute querySelectorAll(selector)
    expect(host.querySelector('[popover][aria-hidden="true"]')).toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('does not create ghost without movement', () => {
    const host = createHost();
    const ctrl = new DragController(host, {
      selector: '.item',
      mode: 'drop',
    });

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    const ghost = document.body.querySelector('[popover][aria-hidden="true"]');
    expect(ghost).toBeNull();
    ctrl.destroy();
  });
});

describe('Draggable — preview mode', () => {
  it('has dragMode preview when configured', () => {
    const el = create('preview');
    expect(el.dragMode).toBe('preview');
  });

  it('keeps item in DOM with [dragging] during drag', () => {
    const el = create('preview');
    const item0 = items(el)[0];
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(item0.hasAttribute('dragging')).toBe(true);
    expect(item0.isConnected).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(item0.hasAttribute('dragging')).toBe(false);
  });

  it('dispatches native:drop with fromIndex and toIndex', () => {
    const el = create('preview');
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);

    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.fromIndex).toBe(0);
    expect(typeof detail.toIndex).toBe('number');
  });

  it('restores item to original position on Escape', () => {
    const el = create('preview');
    const item0 = items(el)[0];
    const originalNext = item0.nextElementSibling;
    const originalParent = item0.parentElement;

    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(item0.parentElement).toBe(originalParent);
    expect(item0.nextElementSibling).toBe(originalNext);
  });

  it('dispatches native:drag-cancel on Escape', () => {
    const el = create('preview');
    const handler = vi.fn();
    el.addEventListener('native:drag-cancel', handler);

    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not create a .drag-placeholder element', () => {
    const el = create('preview');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(el.querySelector('.drag-placeholder')).toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('works as standalone DragController', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', mode: 'preview' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('ghost does not pollute host item query during drag', () => {
    const host = createHost(5);
    const ctrl = new DragController(host, { selector: '.item', mode: 'preview' });

    expect(host.querySelectorAll('.item').length).toBe(5);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    // Ghost clone must NOT appear inside host — it would corrupt querySelectorAll('.item')
    expect(host.querySelectorAll('.item').length).toBe(5);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });
});
