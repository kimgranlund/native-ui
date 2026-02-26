// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { SwipeController } from '../swipe-controller.ts';
import { define } from '../../core/define.ts';

// ── Trait tests ──

class SwipeTestEl extends UIElement {
  disabled = false;
  #ctrl: SwipeController | null = null;

  _pendingThreshold = 50;
  _pendingVelocity = 0.3;
  _pendingAxis: 'horizontal' | 'vertical' | 'both' = 'horizontal';
  _pendingDisabled = false;

  get swipeThreshold(): number { return this.#ctrl?.threshold ?? this._pendingThreshold; }
  set swipeThreshold(v: number) { if (this.#ctrl) this.#ctrl.threshold = v; else this._pendingThreshold = v; }

  get swipeVelocity(): number { return this.#ctrl?.velocityThreshold ?? this._pendingVelocity; }
  set swipeVelocity(v: number) { if (this.#ctrl) this.#ctrl.velocityThreshold = v; else this._pendingVelocity = v; }

  get swipeAxis(): 'horizontal' | 'vertical' | 'both' { return this.#ctrl?.axis ?? this._pendingAxis; }
  set swipeAxis(v: 'horizontal' | 'vertical' | 'both') { if (this.#ctrl) this.#ctrl.axis = v; else this._pendingAxis = v; }

  get swipeDisabled(): boolean { return this.#ctrl?.disabled ?? this._pendingDisabled; }
  set swipeDisabled(v: boolean) { if (this.#ctrl) this.#ctrl.disabled = v; else this._pendingDisabled = v; }

  setup() {
    super.setup();
    this.#ctrl = new SwipeController(this, {
      threshold: this._pendingThreshold,
      velocityThreshold: this._pendingVelocity,
      axis: this._pendingAxis,
      disabled: this._pendingDisabled,
    });
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('swipe-test')) {
  define('swipe-test', SwipeTestEl);
}

function create(): SwipeTestEl {
  const el = document.createElement('swipe-test') as SwipeTestEl;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Swipeable', () => {
  it('defaults swipeThreshold to 50', () => {
    const el = create();
    expect(el.swipeThreshold).toBe(50);
  });

  it('defaults swipeVelocity to 0.3', () => {
    const el = create();
    expect(el.swipeVelocity).toBe(0.3);
  });

  it('defaults swipeAxis to horizontal', () => {
    const el = create();
    expect(el.swipeAxis).toBe('horizontal');
  });

  it('sets swiping attribute on pointerdown', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(el.hasAttribute('swiping')).toBe(true);
  });

  it('does nothing when swipeDisabled', () => {
    const el = create();
    el.swipeDisabled = true;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('swiping')).toBe(false);
  });

  it('ignores non-primary button', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(el.hasAttribute('swiping')).toBe(false);
  });

  it('removes swiping on pointercancel', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(el.hasAttribute('swiping')).toBe(true);
    el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    expect(el.hasAttribute('swiping')).toBe(false);
  });

  it('teardown destroys controller', () => {
    const el = create();
    el.teardown();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('swiping')).toBe(false);
  });
});

// ── SwipeController standalone tests ──

function createHost(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('SwipeController', () => {
  it('sets swiping attribute on pointerdown', () => {
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 50, velocityThreshold: 0.3 });
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('swiping')).toBe(true);
    ctrl.destroy();
  });

  it('dispatches ui-swipe on successful right swipe', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 0.1 });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    // Mock Date.now for velocity calculation
    const startTime = 1000;
    vi.spyOn(Date, 'now').mockReturnValueOnce(startTime);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(startTime + 100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: 0 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.direction).toBe('right');
    expect(handler.mock.calls[0][0].detail.distance).toBe(100);

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('dispatches ui-swipe for left swipe', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 0.1 });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 0, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(1100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.direction).toBe('left');

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('does not dispatch when distance below threshold', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 100, velocityThreshold: 0.1 });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(1100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 50, clientY: 0 }));

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('does not dispatch when velocity below threshold', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 10 });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, isPrimary: true }));

    // Very slow swipe: 50px in 5000ms = 0.01 px/ms
    vi.spyOn(Date, 'now').mockReturnValueOnce(6000);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 50, clientY: 0 }));

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('detects vertical swipe when axis is vertical', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 0.1, axis: 'vertical' });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(1100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 100 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.direction).toBe('down');

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('detects up swipe when axis is vertical', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 0.1, axis: 'vertical' });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 100, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(1100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.direction).toBe('up');

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('auto-detects dominant axis when axis is both', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 0.1, axis: 'both' });
    const handler = vi.fn();
    host.addEventListener('ui-swipe', handler);

    // More vertical movement
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(1100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 20, clientY: 100 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.direction).toBe('down');

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('sets swipe-direction attribute briefly after swipe', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new SwipeController(host, { threshold: 30, velocityThreshold: 0.1 });

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, isPrimary: true }));

    vi.spyOn(Date, 'now').mockReturnValueOnce(1100);
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: 0 }));

    expect(host.hasAttribute('swipe-right')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(host.hasAttribute('swipe-right')).toBe(false);

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('disabled prevents any gesture', () => {
    const host = createHost();
    const ctrl = new SwipeController(host, { disabled: true });
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(host.hasAttribute('swiping')).toBe(false);
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new SwipeController(host);
    ctrl.detach();
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(host.hasAttribute('swiping')).toBe(false);
    ctrl.destroy();
  });
});
