// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { FlipController } from './flip-controller.ts';

function createHost(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('FlipController', () => {
  it('creates with default options', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    expect(ctrl.axis).toBe('y');
    expect(ctrl.duration).toBe(600);
    expect(ctrl.perspective).toBe(1000);
    expect(ctrl.trigger).toBe('click');
    expect(ctrl.disabled).toBe(false);
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('accepts custom options', () => {
    const host = createHost();
    const ctrl = new FlipController(host, {
      axis: 'x',
      duration: 400,
      perspective: 800,
      trigger: 'hover',
      disabled: true,
    });
    expect(ctrl.axis).toBe('x');
    expect(ctrl.duration).toBe(400);
    expect(ctrl.perspective).toBe(800);
    expect(ctrl.trigger).toBe('hover');
    expect(ctrl.disabled).toBe(true);
    ctrl.destroy();
  });

  it('applies host styles on construction', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { perspective: 1200, duration: 500 });
    expect(host.style.perspective).toBe('1200px');
    expect(host.style.transformStyle).toBe('preserve-3d');
    expect(host.style.transition).toBe('transform 500ms ease-in-out');
    ctrl.destroy();
  });

  it('clears host styles on destroy', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    ctrl.destroy();
    expect(host.style.perspective).toBe('');
    expect(host.style.transformStyle).toBe('');
    expect(host.style.transition).toBe('');
  });

  it('flip() sets [flipped] attribute', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    ctrl.flip();
    expect(host.hasAttribute('flipped')).toBe(true);
    expect(ctrl.flipped).toBe(true);
    ctrl.destroy();
  });

  it('flip() is no-op when already flipped', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    const handler = vi.fn();
    host.addEventListener('native:flip', handler);
    ctrl.flip();
    ctrl.flip(); // should be no-op
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('unflip() removes [flipped] attribute', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    ctrl.flip();
    expect(ctrl.flipped).toBe(true);
    ctrl.unflip();
    expect(host.hasAttribute('flipped')).toBe(false);
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('unflip() is no-op when not flipped', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    const handler = vi.fn();
    host.addEventListener('native:flip', handler);
    ctrl.unflip(); // should be no-op
    expect(handler).toHaveBeenCalledTimes(0);
    ctrl.destroy();
  });

  it('toggle() toggles state', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    expect(ctrl.flipped).toBe(false);
    ctrl.toggle();
    expect(ctrl.flipped).toBe(true);
    ctrl.toggle();
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('click trigger toggles flip', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { trigger: 'click' });
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.flipped).toBe(true);
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('hover trigger flips on enter, unflips on leave', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { trigger: 'hover' });
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(ctrl.flipped).toBe(true);
    host.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('manual trigger ignores clicks', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { trigger: 'manual' });
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.flipped).toBe(false);
    // But programmatic flip still works
    ctrl.flip();
    expect(ctrl.flipped).toBe(true);
    ctrl.destroy();
  });

  it('custom axis option applies correct rotation', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { axis: 'x' });
    ctrl.flip();
    expect(host.style.transform).toBe('rotateX(180deg)');
    ctrl.unflip();
    expect(host.style.transform).toBe('rotateX(0deg)');
    ctrl.destroy();
  });

  it('y-axis applies rotateY transform', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { axis: 'y' });
    ctrl.flip();
    expect(host.style.transform).toBe('rotateY(180deg)');
    ctrl.unflip();
    expect(host.style.transform).toBe('rotateY(0deg)');
    ctrl.destroy();
  });

  it('disabled prevents flip', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { disabled: true });
    ctrl.flip();
    expect(ctrl.flipped).toBe(false);
    expect(host.hasAttribute('flipped')).toBe(false);
    ctrl.destroy();
  });

  it('disabled prevents toggle', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { disabled: true });
    ctrl.toggle();
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('disabled prevents click trigger', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { disabled: true, trigger: 'click' });
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('disabled prevents hover trigger', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { disabled: true, trigger: 'hover' });
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('destroy cleans up listeners', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { trigger: 'click' });
    ctrl.destroy();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.hasAttribute('flipped')).toBe(false);
  });

  it('destroy cleans up hover listeners', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { trigger: 'hover' });
    ctrl.destroy();
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('flipped')).toBe(false);
  });

  it('dispatches native:flip event with correct detail', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    const handler = vi.fn();
    host.addEventListener('native:flip', handler);

    ctrl.flip();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ flipped: true, axis: 'y' });

    ctrl.unflip();
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].detail).toEqual({ flipped: false, axis: 'y' });

    ctrl.destroy();
  });

  it('dispatches native:flip with axis in detail', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { axis: 'x' });
    const handler = vi.fn();
    host.addEventListener('native:flip', handler);

    ctrl.flip();
    expect(handler.mock.calls[0][0].detail).toEqual({ flipped: true, axis: 'x' });
    ctrl.destroy();
  });

  it('native:flip event bubbles and is composed', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    const handler = vi.fn();
    document.body.addEventListener('native:flip', handler);

    ctrl.flip();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].bubbles).toBe(true);
    expect(handler.mock.calls[0][0].composed).toBe(true);

    document.body.removeEventListener('native:flip', handler);
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new FlipController(host, { trigger: 'click' });
    ctrl.detach();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.flipped).toBe(false);
    ctrl.destroy();
  });

  it('destroy is safe to call multiple times', () => {
    const host = createHost();
    const ctrl = new FlipController(host);
    ctrl.destroy();
    ctrl.destroy(); // should not throw
  });

  it('sets will-change during flip and clears after', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new FlipController(host, { duration: 300 });

    ctrl.flip();
    expect(host.style.willChange).toBe('transform');

    // Simulate transitionend
    host.dispatchEvent(new Event('transitionend'));
    expect(host.style.willChange).toBe('');

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('clears will-change via timeout fallback', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new FlipController(host, { duration: 300 });

    ctrl.flip();
    expect(host.style.willChange).toBe('transform');

    // No transitionend — timeout fallback
    vi.advanceTimersByTime(500);
    expect(host.style.willChange).toBe('');

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('applies backface-visibility to children', () => {
    const host = createHost();
    const front = document.createElement('div');
    const back = document.createElement('div');
    back.setAttribute('data-flip-back', '');
    host.appendChild(front);
    host.appendChild(back);

    const ctrl = new FlipController(host);
    expect(front.style.backfaceVisibility).toBe('hidden');
    expect(back.style.backfaceVisibility).toBe('hidden');
    expect(back.style.transform).toBe('rotateY(180deg)');
    ctrl.destroy();
  });

  it('applies correct back rotation for x-axis', () => {
    const host = createHost();
    const back = document.createElement('div');
    back.setAttribute('slot', 'back');
    host.appendChild(back);

    const ctrl = new FlipController(host, { axis: 'x' });
    expect(back.style.transform).toBe('rotateX(180deg)');
    ctrl.destroy();
  });
});

// ── Adapter tests ──

describe('flippableAdapter', () => {
  it('creates and destroys via adapter', async () => {
    const { flippableAdapter } = await import('./flippable-adapter.ts');
    const host = createHost();
    const instance = flippableAdapter.create(host, {});
    expect(instance).toBeInstanceOf(FlipController);
    flippableAdapter.destroy(instance);
  });

  it('passes options through adapter', async () => {
    const { flippableAdapter } = await import('./flippable-adapter.ts');
    const host = createHost();
    const instance = flippableAdapter.create(host, {
      axis: 'x',
      duration: '400',
      perspective: '800',
      trigger: 'hover',
      disabled: 'true',
    });
    expect(instance.axis).toBe('x');
    expect(instance.duration).toBe(400);
    expect(instance.perspective).toBe(800);
    expect(instance.trigger).toBe('hover');
    expect(instance.disabled).toBe(true);
    flippableAdapter.destroy(instance);
  });

  it('updates options via adapter', async () => {
    const { flippableAdapter } = await import('./flippable-adapter.ts');
    const host = createHost();
    const instance = flippableAdapter.create(host, {});

    flippableAdapter.update!(instance, { axis: 'x' });
    expect(instance.axis).toBe('x');

    flippableAdapter.update!(instance, { duration: '400' });
    expect(instance.duration).toBe(400);

    flippableAdapter.update!(instance, { perspective: '800' });
    expect(instance.perspective).toBe(800);

    flippableAdapter.update!(instance, { trigger: 'manual' });
    expect(instance.trigger).toBe('manual');

    flippableAdapter.update!(instance, { disabled: 'true' });
    expect(instance.disabled).toBe(true);

    flippableAdapter.destroy(instance);
  });
});
