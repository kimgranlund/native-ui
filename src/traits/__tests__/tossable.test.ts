// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { TossController } from '../toss-controller.ts';

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

describe('TossController', () => {
  it('creates with default options', () => {
    const host = createHost();
    const ctrl = new TossController(host);
    expect(ctrl.friction).toBe(0.95);
    expect(ctrl.bounce).toBe(true);
    expect(ctrl.bounceDamping).toBe(0.6);
    expect(ctrl.gravity).toBe(0);
    expect(ctrl.spin).toBe(false);
    expect(ctrl.returnOnEnd).toBe(false);
    expect(ctrl.disabled).toBe(false);
    ctrl.destroy();
  });

  it('sets tossing attribute on pointerdown', () => {
    const host = createHost();
    const ctrl = new TossController(host);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('tossing')).toBe(true);
    ctrl.destroy();
  });

  it('disabled prevents tracking', () => {
    const host = createHost();
    const ctrl = new TossController(host, { disabled: true });
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('tossing')).toBe(false);
    ctrl.destroy();
  });

  it('ignores non-primary button', () => {
    const host = createHost();
    const ctrl = new TossController(host);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(host.hasAttribute('tossing')).toBe(false);
    ctrl.destroy();
  });

  it('removes tossing on pointercancel', () => {
    const host = createHost();
    const ctrl = new TossController(host);
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('tossing')).toBe(true);
    host.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    expect(host.hasAttribute('tossing')).toBe(false);
    ctrl.destroy();
  });

  it('moves element via translate on pointermove', () => {
    const host = createHost();
    const ctrl = new TossController(host);

    host.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 50, clientY: 50,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 100, clientY: 80,
    }));

    expect(host.style.translate).toBe('50px 30px');
    ctrl.destroy();
  });

  it('dispatches native:toss after momentum (no velocity → immediate)', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new TossController(host);
    const handler = vi.fn();
    host.addEventListener('native:toss', handler);

    // Mock Date.now so velocity calc sees zero elapsed → zero velocity
    vi.spyOn(Date, 'now').mockReturnValue(1000);

    host.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 50, clientY: 50,
    }));
    host.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, clientX: 50, clientY: 50,
    }));

    // With zero velocity, toss finishes immediately (no RAF needed)
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.bounces).toBe(0);
    expect(handler.mock.calls[0][0].detail.rotation).toBe(0);

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('starts momentum animation on fast fling', () => {
    vi.useFakeTimers();
    const host = createHost();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);
    const ctrl = new TossController(host);

    // Start at time 1000
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // pointerdown
      .mockReturnValueOnce(1010) // pointermove sample push
      .mockReturnValueOnce(1020) // pointerup velocity calc
      .mockReturnValueOnce(1020); // pointerup velocity calc (second call)

    host.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 200, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, clientX: 200, clientY: 0,
    }));

    // Momentum should have started via requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
    expect(ctrl.animating).toBe(true);

    ctrl.destroy();
    vi.useRealTimers();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new TossController(host);
    ctrl.detach();
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('tossing')).toBe(false);
    ctrl.destroy();
  });

  it('destroy is safe to call multiple times', () => {
    const host = createHost();
    const ctrl = new TossController(host);
    ctrl.destroy();
    ctrl.destroy(); // double destroy should not throw
    // After destroy, pointerdown should not track
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('tossing')).toBe(false);
  });

  it('accepts custom options', () => {
    const host = createHost();
    const ctrl = new TossController(host, {
      friction: 0.9,
      bounce: false,
      bounceDamping: 0.3,
      gravity: 1.5,
      spin: true,
      returnOnEnd: true,
    });
    expect(ctrl.friction).toBe(0.9);
    expect(ctrl.bounce).toBe(false);
    expect(ctrl.bounceDamping).toBe(0.3);
    expect(ctrl.gravity).toBe(1.5);
    expect(ctrl.spin).toBe(true);
    expect(ctrl.returnOnEnd).toBe(true);
    ctrl.destroy();
  });

  it('exposes rotation getter', () => {
    const host = createHost();
    const ctrl = new TossController(host, { spin: true });
    expect(ctrl.rotation).toBe(0);
    ctrl.destroy();
  });

  it('sets will-change on pointerdown and clears after toss', () => {
    vi.useFakeTimers();
    const host = createHost();
    const ctrl = new TossController(host);

    vi.spyOn(Date, 'now').mockReturnValue(1000);

    host.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));
    expect(host.style.willChange).toBe('transform');

    // Release with no velocity → immediate finish
    host.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, clientX: 0, clientY: 0,
    }));
    expect(host.style.willChange).toBe('');

    ctrl.destroy();
    vi.useRealTimers();
  });
});

// ── Adapter tests ──

describe('tossableAdapter', () => {
  it('creates and destroys via adapter', async () => {
    const { tossableAdapter } = await import('../adapters/tossable-adapter.ts');
    const host = createHost();
    const instance = tossableAdapter.create(host, {});
    expect(instance).toBeInstanceOf(TossController);
    tossableAdapter.destroy(instance);
  });

  it('passes options through adapter', async () => {
    const { tossableAdapter } = await import('../adapters/tossable-adapter.ts');
    const host = createHost();
    const instance = tossableAdapter.create(host, {
      friction: '0.9',
      bounce: 'false',
      'bounce-damping': '0.4',
      gravity: '1.2',
      spin: 'true',
      'return-on-end': 'true',
    });
    expect(instance.friction).toBe(0.9);
    expect(instance.bounce).toBe(false);
    expect(instance.bounceDamping).toBe(0.4);
    expect(instance.gravity).toBe(1.2);
    expect(instance.spin).toBe(true);
    expect(instance.returnOnEnd).toBe(true);
    tossableAdapter.destroy(instance);
  });

  it('updates options via adapter', async () => {
    const { tossableAdapter } = await import('../adapters/tossable-adapter.ts');
    const host = createHost();
    const instance = tossableAdapter.create(host, {});

    tossableAdapter.update!(instance, { friction: '0.88' });
    expect(instance.friction).toBe(0.88);

    tossableAdapter.update!(instance, { bounce: 'false' });
    expect(instance.bounce).toBe(false);

    tossableAdapter.update!(instance, { 'bounce-damping': '0.5' });
    expect(instance.bounceDamping).toBe(0.5);

    tossableAdapter.update!(instance, { gravity: '0.8' });
    expect(instance.gravity).toBe(0.8);

    tossableAdapter.update!(instance, { spin: 'true' });
    expect(instance.spin).toBe(true);

    tossableAdapter.update!(instance, { 'return-on-end': 'true' });
    expect(instance.returnOnEnd).toBe(true);

    tossableAdapter.destroy(instance);
  });
});
