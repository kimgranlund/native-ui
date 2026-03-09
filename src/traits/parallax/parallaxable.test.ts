// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ParallaxController } from './parallax-controller.ts';

function createHost(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('ParallaxController', () => {
  it('creates with default options', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    expect(ctrl.maxTilt).toBe(15);
    expect(ctrl.perspective).toBe(1000);
    expect(ctrl.speed).toBe(300);
    expect(ctrl.scale).toBe(1.05);
    expect(ctrl.glare).toBe(false);
    expect(ctrl.glareOpacity).toBe(0.35);
    expect(ctrl.gyroscope).toBe(false);
    expect(ctrl.disabled).toBe(false);
    ctrl.destroy();
  });

  it('accepts custom options', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host, {
      maxTilt: 25,
      perspective: 800,
      speed: 200,
      scale: 1.1,
      glare: true,
      glareOpacity: 0.5,
      gyroscope: false,
      disabled: false,
    });
    expect(ctrl.maxTilt).toBe(25);
    expect(ctrl.perspective).toBe(800);
    expect(ctrl.speed).toBe(200);
    expect(ctrl.scale).toBe(1.1);
    expect(ctrl.glare).toBe(true);
    expect(ctrl.glareOpacity).toBe(0.5);
    ctrl.destroy();
  });

  it('sets parallax-active attribute on pointerenter', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('parallax-active')).toBe(true);
    ctrl.destroy();
  });

  it('sets will-change on pointerenter', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.style.willChange).toBe('transform');
    ctrl.destroy();
  });

  it('removes parallax-active on pointerleave', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('parallax-active')).toBe(true);
    host.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(host.hasAttribute('parallax-active')).toBe(false);
    ctrl.destroy();
  });

  it('sets CSS custom properties on pointermove', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);

    // happy-dom getBoundingClientRect returns zeros, so percentX/percentY will be 0
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 50, clientY: 50 }));

    // With zero-size rect, values clamp/default to 0
    expect(host.style.getPropertyValue('--parallax-tilt-x')).toBeDefined();
    expect(host.style.getPropertyValue('--parallax-tilt-y')).toBeDefined();
    expect(host.style.getPropertyValue('--parallax-percent-x')).toBeDefined();
    expect(host.style.getPropertyValue('--parallax-percent-y')).toBeDefined();
    ctrl.destroy();
  });

  it('applies transform on pointermove', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);

    // Mock getBoundingClientRect to have actual dimensions
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200,
      width: 200, height: 200, x: 0, y: 0, toJSON: () => {},
    });

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 50 }));

    // percentX = (150 - 100) / 100 = 0.5, percentY = (50 - 100) / 100 = -0.5
    // tiltX = -(-0.5) * 15 = 7.5, tiltY = 0.5 * 15 = 7.5
    expect(host.style.transform).toContain('perspective(1000px)');
    expect(host.style.transform).toContain('rotateX(7.5deg)');
    expect(host.style.transform).toContain('rotateY(7.5deg)');
    expect(host.style.transform).toContain('scale(1.05)');
    ctrl.destroy();
  });

  it('sets correct CSS custom property values on pointermove', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);

    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200,
      width: 200, height: 200, x: 0, y: 0, toJSON: () => {},
    });

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 50 }));

    expect(host.style.getPropertyValue('--parallax-tilt-x')).toBe('7.5');
    expect(host.style.getPropertyValue('--parallax-tilt-y')).toBe('7.5');
    expect(host.style.getPropertyValue('--parallax-percent-x')).toBe('0.5');
    expect(host.style.getPropertyValue('--parallax-percent-y')).toBe('-0.5');
    ctrl.destroy();
  });

  it('dispatches native:parallax-move on pointermove', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    const handler = vi.fn();
    host.addEventListener('native:parallax-move', handler);

    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200,
      width: 200, height: 200, x: 0, y: 0, toJSON: () => {},
    });

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 50 }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.tiltX).toBe(7.5);
    expect(detail.tiltY).toBe(7.5);
    expect(detail.percentX).toBe(0.5);
    expect(detail.percentY).toBe(-0.5);
    ctrl.destroy();
  });

  it('disabled prevents activation', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host, { disabled: true });
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('parallax-active')).toBe(false);
    ctrl.destroy();
  });

  it('disabled prevents pointermove processing', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host, { disabled: true });
    const handler = vi.fn();
    host.addEventListener('native:parallax-move', handler);

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 50, clientY: 50 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('glare option creates overlay element', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host, { glare: true });
    const glareEl = host.querySelector('.parallax-glare');
    expect(glareEl).not.toBeNull();
    expect(glareEl!.getAttribute('style')).toContain('pointer-events: none');
    ctrl.destroy();
  });

  it('destroy removes glare element', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host, { glare: true });
    expect(host.querySelector('.parallax-glare')).not.toBeNull();
    ctrl.destroy();
    expect(host.querySelector('.parallax-glare')).toBeNull();
  });

  it('destroy cleans up listeners — no event after destroy', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    ctrl.destroy();

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('parallax-active')).toBe(false);
  });

  it('destroy is safe to call multiple times', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    ctrl.destroy();
    ctrl.destroy(); // should not throw
  });

  it('reset() clears transform and attribute', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);

    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200,
      width: 200, height: 200, x: 0, y: 0, toJSON: () => {},
    });

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 50 }));
    expect(host.hasAttribute('parallax-active')).toBe(true);

    ctrl.reset();
    expect(host.hasAttribute('parallax-active')).toBe(false);
    expect(host.style.getPropertyValue('--parallax-tilt-x')).toBe('0');
    expect(host.style.getPropertyValue('--parallax-tilt-y')).toBe('0');
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);
    ctrl.detach();
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('parallax-active')).toBe(false);
    ctrl.destroy();
  });

  it('pointerleave resets transform back to flat', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);

    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200,
      width: 200, height: 200, x: 0, y: 0, toJSON: () => {},
    });

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 50 }));
    host.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

    // After leave, transform should animate to flat
    expect(host.style.transform).toContain('rotateX(0deg)');
    expect(host.style.transform).toContain('rotateY(0deg)');
    expect(host.style.transform).toContain('scale(1)');
    ctrl.destroy();
  });

  it('clamps percent values when pointer is outside element bounds', () => {
    const host = createHost();
    const ctrl = new ParallaxController(host);

    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 100, right: 300, bottom: 300,
      width: 200, height: 200, x: 100, y: 100, toJSON: () => {},
    });

    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    // Pointer far outside element
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 500, clientY: 500 }));

    // percentX and percentY should be clamped to 1
    expect(host.style.getPropertyValue('--parallax-percent-x')).toBe('1');
    expect(host.style.getPropertyValue('--parallax-percent-y')).toBe('1');
    ctrl.destroy();
  });
});

// ── Adapter tests ──

describe('parallaxableAdapter', () => {
  it('creates and destroys via adapter', async () => {
    const { parallaxableAdapter } = await import('./parallaxable-adapter.ts');
    const host = createHost();
    const instance = parallaxableAdapter.create(host, {});
    expect(instance).toBeInstanceOf(ParallaxController);
    parallaxableAdapter.destroy(instance);
  });

  it('passes options through adapter', async () => {
    const { parallaxableAdapter } = await import('./parallaxable-adapter.ts');
    const host = createHost();
    const instance = parallaxableAdapter.create(host, {
      'max-tilt': '25',
      'perspective': '800',
      'speed': '200',
      'scale': '1.1',
      'glare': 'true',
      'glare-opacity': '0.5',
      'gyroscope': 'false',
      'disabled': 'false',
    });
    expect(instance.maxTilt).toBe(25);
    expect(instance.perspective).toBe(800);
    expect(instance.speed).toBe(200);
    expect(instance.scale).toBe(1.1);
    expect(instance.glare).toBe(true);
    expect(instance.glareOpacity).toBe(0.5);
    parallaxableAdapter.destroy(instance);
  });

  it('updates options via adapter', async () => {
    const { parallaxableAdapter } = await import('./parallaxable-adapter.ts');
    const host = createHost();
    const instance = parallaxableAdapter.create(host, {});

    parallaxableAdapter.update!(instance, { 'max-tilt': '20' });
    expect(instance.maxTilt).toBe(20);

    parallaxableAdapter.update!(instance, { 'perspective': '500' });
    expect(instance.perspective).toBe(500);

    parallaxableAdapter.update!(instance, { 'speed': '150' });
    expect(instance.speed).toBe(150);

    parallaxableAdapter.update!(instance, { 'scale': '1.2' });
    expect(instance.scale).toBe(1.2);

    parallaxableAdapter.update!(instance, { 'glare': 'true' });
    expect(instance.glare).toBe(true);

    parallaxableAdapter.update!(instance, { 'glare-opacity': '0.6' });
    expect(instance.glareOpacity).toBe(0.6);

    parallaxableAdapter.update!(instance, { 'gyroscope': 'true' });
    expect(instance.gyroscope).toBe(true);

    parallaxableAdapter.update!(instance, { 'disabled': 'true' });
    expect(instance.disabled).toBe(true);

    parallaxableAdapter.destroy(instance);
  });
});
