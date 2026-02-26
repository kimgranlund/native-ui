// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { ResizeController } from '../resize-controller.ts';
import { define } from '../../core/define.ts';

class ResizeTestEl extends UIElement {
  disabled = false;
  #ctrl: ResizeController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new ResizeController(this, { handleSelector: this.#initialHandleSelector });
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  #initialHandleSelector = '';

  get resizeHandleSelector(): string { return this.#ctrl?.handleSelector ?? this.#initialHandleSelector; }
  set resizeHandleSelector(val: string) {
    this.#initialHandleSelector = val;
    if (this.#ctrl) this.#ctrl.handleSelector = val;
  }

  get resizeAxis() { return this.#ctrl?.axis ?? 'horizontal'; }
  set resizeAxis(val: 'horizontal' | 'vertical' | 'both') { if (this.#ctrl) this.#ctrl.axis = val; }

  get resizeMin() { return this.#ctrl?.min ?? 0; }
  set resizeMin(val: number) { if (this.#ctrl) this.#ctrl.min = val; }

  get resizeMax() { return this.#ctrl?.max ?? Infinity; }
  set resizeMax(val: number) { if (this.#ctrl) this.#ctrl.max = val; }

  get resizeDisabled() { return this.#ctrl?.disabled ?? false; }
  set resizeDisabled(val: boolean) { if (this.#ctrl) this.#ctrl.disabled = val; }
}

if (!customElements.get('resize-test')) {
  define('resize-test', ResizeTestEl);
}

function create(): ResizeTestEl {
  const el = document.createElement('resize-test') as ResizeTestEl;
  el.innerHTML = '<div class="handle"></div>';
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Resizable', () => {
  it('has default property values', () => {
    const el = create();
    expect(el.resizeHandleSelector).toBe('');
    expect(el.resizeAxis).toBe('horizontal');
    expect(el.resizeMin).toBe(0);
    expect(el.resizeMax).toBe(Infinity);
    expect(el.resizeDisabled).toBe(false);
  });

  it('does nothing when no handle selector is set', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-resize-start', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const el = create();
    el.resizeHandleSelector = '.handle';
    el.resizeDisabled = true;
    const handler = vi.fn();
    el.addEventListener('ui-resize-start', handler);
    const handle = el.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores non-primary button', () => {
    const el = create();
    el.resizeHandleSelector = '.handle';
    const handler = vi.fn();
    el.addEventListener('ui-resize-start', handler);
    const handle = el.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets resizing attribute during drag', () => {
    const el = create();
    el.resizeHandleSelector = '.handle';
    const handle = el.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('resizing')).toBe(true);

    // Simulate pointerup
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(el.hasAttribute('resizing')).toBe(false);
  });

  it('dispatches ui-resize-start on handle pointerdown', () => {
    const el = create();
    el.resizeHandleSelector = '.handle';
    const handler = vi.fn();
    el.addEventListener('ui-resize-start', handler);
    const handle = el.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches ui-resize-end on pointerup', () => {
    const el = create();
    el.resizeHandleSelector = '.handle';
    const handler = vi.fn();
    el.addEventListener('ui-resize-end', handler);
    const handle = el.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cleans up on teardown', () => {
    const el = create();
    el.resizeHandleSelector = '.handle';
    const handle = el.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    el.teardown();
    expect(el.hasAttribute('resizing')).toBe(false);
  });
});

// ── ResizeController standalone tests ──

function createHost(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<div class="handle"></div>';
  document.body.appendChild(el);
  return el;
}

describe('ResizeController', () => {
  it('attaches to a plain HTMLElement', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, { handleSelector: '.handle' });
    const handler = vi.fn();
    host.addEventListener('ui-resize-start', handler);

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(host.hasAttribute('resizing')).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('respects disabled option', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, { handleSelector: '.handle', disabled: true });
    const handler = vi.fn();
    host.addEventListener('ui-resize-start', handler);

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, { handleSelector: '.handle' });
    ctrl.detach();

    const handler = vi.fn();
    host.addEventListener('ui-resize-start', handler);

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('dispatches ui-resize-end on pointerup', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, { handleSelector: '.handle' });
    const handler = vi.fn();
    host.addEventListener('ui-resize-end', handler);

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });
});
