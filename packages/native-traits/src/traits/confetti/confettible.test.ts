// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConfettiController } from './confetti-controller.ts';

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

describe('ConfettiController', () => {
  it('creates with default options', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host);
    expect(ctrl.count).toBe(30);
    expect(ctrl.spread).toBe(90);
    expect(ctrl.velocity).toBe(12);
    expect(ctrl.gravity).toBe(0.5);
    expect(ctrl.size).toEqual([6, 10]);
    expect(ctrl.colors).toHaveLength(8);
    expect(ctrl.duration).toBe(2000);
    expect(ctrl.trigger).toBe('click');
    expect(ctrl.shapes).toBe('mixed');
    expect(ctrl.disabled).toBe(false);
    ctrl.destroy();
  });

  it('accepts custom options', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, {
      count: 50,
      spread: 120,
      velocity: 20,
      gravity: 1,
      size: [4, 8],
      colors: ['red', 'blue'],
      duration: 3000,
      trigger: 'manual',
      shapes: 'circle',
    });
    expect(ctrl.count).toBe(50);
    expect(ctrl.spread).toBe(120);
    expect(ctrl.velocity).toBe(20);
    expect(ctrl.gravity).toBe(1);
    expect(ctrl.size).toEqual([4, 8]);
    expect(ctrl.colors).toEqual(['red', 'blue']);
    expect(ctrl.duration).toBe(3000);
    expect(ctrl.trigger).toBe('manual');
    expect(ctrl.shapes).toBe('circle');
    ctrl.destroy();
  });

  it('fire() creates particle container in document.body', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host);
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();

    // Container is the last child of body (after the host div)
    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(1);
    expect(ctrl.active).toBe(true);

    ctrl.destroy();
  });

  it('creates particles with correct count', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { count: 15 });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();

    const container = document.body.querySelector('[data-confetti-container]');
    expect(container).not.toBeNull();
    expect(container!.children.length).toBe(15);

    ctrl.destroy();
  });

  it('click trigger fires confetti', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { trigger: 'click' });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(1);

    ctrl.destroy();
  });

  it('manual trigger ignores clicks', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { trigger: 'manual' });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(0);

    ctrl.destroy();
  });

  it('custom colors applied to particles', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { count: 3, colors: ['red', 'green', 'blue'] });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();

    const container = document.body.querySelector('[data-confetti-container]');
    const particles = container!.querySelectorAll('div');
    expect((particles[0] as HTMLElement).style.background).toBe('red');
    expect((particles[1] as HTMLElement).style.background).toBe('green');
    expect((particles[2] as HTMLElement).style.background).toBe('blue');

    ctrl.destroy();
  });

  it('square shapes have no border-radius', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { count: 5, shapes: 'square' });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();

    const container = document.body.querySelector('[data-confetti-container]');
    const particles = container!.querySelectorAll('div');
    for (const p of particles) {
      expect((p as HTMLElement).style.borderRadius).toMatch(/^0(px)?$/);
    }

    ctrl.destroy();
  });

  it('circle shapes have 50% border-radius', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { count: 5, shapes: 'circle' });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();

    const container = document.body.querySelector('[data-confetti-container]');
    const particles = container!.querySelectorAll('div');
    for (const p of particles) {
      expect((p as HTMLElement).style.borderRadius).toBe('50%');
    }

    ctrl.destroy();
  });

  it('disabled prevents firing', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { disabled: true });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();

    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(0);

    ctrl.destroy();
  });

  it('destroy cleans up listeners and active containers', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host);
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();
    expect(ctrl.active).toBe(true);

    ctrl.destroy();
    expect(ctrl.active).toBe(false);

    // Container removed from DOM
    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(0);

    // Click after destroy should not create containers
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const afterContainers = document.body.querySelectorAll('[data-confetti-container]');
    expect(afterContainers.length).toBe(0);
  });

  it('dispatches native:confetti event with correct detail', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { count: 20 });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);
    const handler = vi.fn();
    host.addEventListener('native:confetti', handler);

    ctrl.fire();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.count).toBe(20);
    expect(detail.origin).toHaveProperty('x');
    expect(detail.origin).toHaveProperty('y');

    ctrl.destroy();
  });

  it('multiple concurrent bursts supported', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { count: 5 });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.fire();
    ctrl.fire();
    ctrl.fire();

    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(3);

    ctrl.destroy();
  });

  it('detach stops click listener', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host, { trigger: 'click' });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);

    ctrl.detach();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const containers = document.body.querySelectorAll('[data-confetti-container]');
    expect(containers.length).toBe(0);

    ctrl.destroy();
  });

  it('destroy is safe to call multiple times', () => {
    const host = createHost();
    const ctrl = new ConfettiController(host);
    ctrl.destroy();
    ctrl.destroy(); // double destroy should not throw
  });
});

// ── Adapter tests ──

describe('confettibleAdapter', () => {
  it('creates and destroys via adapter', async () => {
    const { confettibleAdapter } = await import('./confettible-adapter.ts');
    const host = createHost();
    const instance = confettibleAdapter.create(host, {});
    expect(instance).toBeInstanceOf(ConfettiController);
    confettibleAdapter.destroy(instance);
  });

  it('passes options through adapter', async () => {
    const { confettibleAdapter } = await import('./confettible-adapter.ts');
    const host = createHost();
    const instance = confettibleAdapter.create(host, {
      count: '50',
      spread: '120',
      velocity: '20',
      gravity: '1',
      duration: '3000',
      trigger: 'manual',
      shapes: 'circle',
      disabled: 'true',
    });
    expect(instance.count).toBe(50);
    expect(instance.spread).toBe(120);
    expect(instance.velocity).toBe(20);
    expect(instance.gravity).toBe(1);
    expect(instance.duration).toBe(3000);
    expect(instance.trigger).toBe('manual');
    expect(instance.shapes).toBe('circle');
    expect(instance.disabled).toBe(true);
    confettibleAdapter.destroy(instance);
  });

  it('updates options via adapter', async () => {
    const { confettibleAdapter } = await import('./confettible-adapter.ts');
    const host = createHost();
    const instance = confettibleAdapter.create(host, {});

    confettibleAdapter.update!(instance, { count: '50' });
    expect(instance.count).toBe(50);

    confettibleAdapter.update!(instance, { spread: '120' });
    expect(instance.spread).toBe(120);

    confettibleAdapter.update!(instance, { velocity: '20' });
    expect(instance.velocity).toBe(20);

    confettibleAdapter.update!(instance, { gravity: '1.5' });
    expect(instance.gravity).toBe(1.5);

    confettibleAdapter.update!(instance, { duration: '5000' });
    expect(instance.duration).toBe(5000);

    confettibleAdapter.update!(instance, { trigger: 'manual' });
    expect(instance.trigger).toBe('manual');

    confettibleAdapter.update!(instance, { shapes: 'square' });
    expect(instance.shapes).toBe('square');

    confettibleAdapter.update!(instance, { disabled: 'true' });
    expect(instance.disabled).toBe(true);

    confettibleAdapter.destroy(instance);
  });
});
