// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { HoverController } from '../hover-controller.ts';
import { define } from '../../core/define.ts';

class HoverTestEl extends UIElement {
  disabled = false;
  #ctrl: HoverController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new HoverController(this);
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  get hoverDisabled(): boolean { return this.#ctrl?.disabled ?? false; }
  set hoverDisabled(val: boolean) { if (this.#ctrl) this.#ctrl.disabled = val; }

  get hoverDelay(): number { return this.#ctrl?.delay ?? 0; }
  set hoverDelay(val: number) { if (this.#ctrl) this.#ctrl.delay = val; }

  get hoverLeaveDelay(): number { return this.#ctrl?.leaveDelay ?? 0; }
  set hoverLeaveDelay(val: number) { if (this.#ctrl) this.#ctrl.leaveDelay = val; }
}

if (!customElements.get('hover-test')) {
  define('hover-test', HoverTestEl);
}

function create(): HoverTestEl {
  const el = document.createElement('hover-test') as HoverTestEl;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('Hoverable — instant (no delay)', () => {
  it('sets hovered attribute on pointerenter', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(el.hasAttribute('hovered')).toBe(true);
  });

  it('removes hovered attribute on pointerleave', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(el.hasAttribute('hovered')).toBe(false);
  });

  it('dispatches ui-hover-enter event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-hover-enter', handler);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches ui-hover-leave event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-hover-leave', handler);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when hoverDisabled', () => {
    const el = create();
    el.hoverDisabled = true;
    const handler = vi.fn();
    el.addEventListener('ui-hover-enter', handler);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(el.hasAttribute('hovered')).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Hoverable — with delays', () => {
  it('delays hover activation by hoverDelay', () => {
    vi.useFakeTimers();
    const el = create();
    el.hoverDelay = 200;
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(el.hasAttribute('hovered')).toBe(false);
    vi.advanceTimersByTime(200);
    expect(el.hasAttribute('hovered')).toBe(true);
  });

  it('cancels enter timer if pointer leaves before delay', () => {
    vi.useFakeTimers();
    const el = create();
    el.hoverDelay = 200;
    const handler = vi.fn();
    el.addEventListener('ui-hover-enter', handler);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    vi.advanceTimersByTime(100);
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    vi.advanceTimersByTime(200);
    expect(el.hasAttribute('hovered')).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('delays hover deactivation by hoverLeaveDelay', () => {
    vi.useFakeTimers();
    const el = create();
    el.hoverLeaveDelay = 300;
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(el.hasAttribute('hovered')).toBe(true); // still hovered during delay
    vi.advanceTimersByTime(300);
    expect(el.hasAttribute('hovered')).toBe(false);
  });

  it('cancels leave timer if pointer re-enters before delay', () => {
    vi.useFakeTimers();
    const el = create();
    el.hoverLeaveDelay = 300;
    const handler = vi.fn();
    el.addEventListener('ui-hover-leave', handler);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    vi.advanceTimersByTime(100);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(el.hasAttribute('hovered')).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Hoverable — teardown', () => {
  it('removes hovered attribute on teardown', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(el.hasAttribute('hovered')).toBe(true);
    el.teardown();
    expect(el.hasAttribute('hovered')).toBe(false);
  });

  it('stops responding to events after teardown', () => {
    const el = create();
    el.teardown();
    const handler = vi.fn();
    el.addEventListener('ui-hover-enter', handler);
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
