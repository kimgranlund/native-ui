// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MagnetController } from '../magnet-controller.ts';

function createHost(): HTMLElement {
  const el = document.createElement('div');
  el.style.position = 'relative';
  document.body.appendChild(el);
  return el;
}

function addChild(host: HTMLElement, id?: string): HTMLElement {
  const child = document.createElement('div');
  child.style.position = 'absolute';
  if (id) child.id = id;
  host.appendChild(child);
  return child;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('MagnetController', () => {
  it('creates with default options', () => {
    const host = createHost();
    const ctrl = new MagnetController(host);
    expect(ctrl.selector).toBe(':scope > *');
    expect(ctrl.threshold).toBe(20);
    expect(ctrl.gridSize).toBe(0);
    expect(ctrl.strength).toBe(0.3);
    expect(ctrl.guides).toBe(true);
    expect(ctrl.guideColor).toBe('var(--n-color-accent-500)');
    expect(ctrl.snapToEdges).toBe(true);
    expect(ctrl.snapToSiblings).toBe(true);
    expect(ctrl.disabled).toBe(false);
    ctrl.destroy();
  });

  it('accepts custom options', () => {
    const host = createHost();
    const ctrl = new MagnetController(host, {
      selector: '.item',
      threshold: 30,
      gridSize: 50,
      strength: 0.8,
      guides: false,
      guideColor: 'red',
      snapToEdges: false,
      snapToSiblings: false,
      disabled: true,
    });
    expect(ctrl.selector).toBe('.item');
    expect(ctrl.threshold).toBe(30);
    expect(ctrl.gridSize).toBe(50);
    expect(ctrl.strength).toBe(0.8);
    expect(ctrl.guides).toBe(false);
    expect(ctrl.guideColor).toBe('red');
    expect(ctrl.snapToEdges).toBe(false);
    expect(ctrl.snapToSiblings).toBe(false);
    expect(ctrl.disabled).toBe(true);
    ctrl.destroy();
  });

  it('sets magnetized attribute on pointerdown over a child', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host);

    child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('magnetized')).toBe(true);
    ctrl.destroy();
  });

  it('does not set magnetized when clicking host background (no matching child)', () => {
    const host = createHost();
    const _ctrl = new MagnetController(host, { selector: '.item' });

    // Click on host itself, no matching child
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('magnetized')).toBe(false);
    _ctrl.destroy();
  });

  it('disabled prevents drag', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, { disabled: true });

    child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('magnetized')).toBe(false);
    ctrl.destroy();
  });

  it('ignores non-primary button', () => {
    const host = createHost();
    addChild(host);
    const ctrl = new MagnetController(host);

    host.firstElementChild!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(host.hasAttribute('magnetized')).toBe(false);
    ctrl.destroy();
  });

  it('moves child via translate on pointermove', () => {
    const host = createHost();
    const child = addChild(host);
    // Disable snapping so raw translate is set
    const ctrl = new MagnetController(host, { snapToEdges: false, snapToSiblings: false, gridSize: 0, guides: false });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 50, clientY: 50,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 100, clientY: 80,
    }));

    // With strength 0.3 and no snap targets, translate should be raw position
    expect(child.style.translate).toContain('px');
    ctrl.destroy();
  });

  it('removes magnetized on pointerup', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, { snapToEdges: false, snapToSiblings: false, guides: false });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));
    expect(host.hasAttribute('magnetized')).toBe(true);

    host.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, clientX: 10, clientY: 10,
    }));
    expect(host.hasAttribute('magnetized')).toBe(false);
    ctrl.destroy();
  });

  it('removes magnetized on pointercancel', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host);

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true,
    }));
    expect(host.hasAttribute('magnetized')).toBe(true);

    host.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    expect(host.hasAttribute('magnetized')).toBe(false);
    ctrl.destroy();
  });

  it('dispatches native:magnet-drop on pointerup', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, { snapToEdges: false, snapToSiblings: false, guides: false });
    const handler = vi.fn();
    host.addEventListener('native:magnet-drop', handler);

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, clientX: 10, clientY: 10,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.item).toBe(child);
    expect(typeof detail.x).toBe('number');
    expect(typeof detail.y).toBe('number');
    ctrl.destroy();
  });

  it('dispatches native:magnet-snap during snapping movement', () => {
    const host = createHost();
    const child1 = addChild(host, 'a');
    const child2 = addChild(host, 'b');
    // Position child2 at a known location via getBoundingClientRect mock
    // happy-dom returns zeros, so grid snap is the reliable way to test
    const ctrl = new MagnetController(host, {
      gridSize: 50,
      threshold: 30,
      snapToEdges: false,
      snapToSiblings: false,
      guides: false,
    });
    const handler = vi.fn();
    host.addEventListener('native:magnet-snap', handler);

    child1.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    // Move close to grid line at 50px — within threshold of 30
    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 40, clientY: 40,
    }));

    // With grid snap, 40 is within 30 of 50, so it should snap
    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.snappedTo).toBe('grid');
    expect(detail.item).toBe(child1);

    // Suppress unused variable warning
    void child2;

    ctrl.destroy();
  });

  it('grid snap rounds positions to nearest gridSize', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, {
      gridSize: 50,
      strength: 1, // full snap for easy testing
      threshold: 30,
      snapToEdges: false,
      snapToSiblings: false,
      guides: false,
    });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    // Move to 27,27 — within threshold of grid line at (50,50) since |27-50| = 23 < 30
    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 27, clientY: 27,
    }));

    // With strength 1, translate should snap fully to grid
    // 27 rounds to 50 (nearest 50), so translate should be "50px 50px"
    expect(child.style.translate).toBe('50px 50px');
    ctrl.destroy();
  });

  it('sets magnet-snapping attribute on item during snap', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, {
      gridSize: 50,
      threshold: 30,
      snapToEdges: false,
      snapToSiblings: false,
      guides: false,
    });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 40, clientY: 40,
    }));

    expect(child.hasAttribute('magnet-snapping')).toBe(true);
    ctrl.destroy();
  });

  it('creates guide elements when guides option is true', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, {
      gridSize: 50,
      threshold: 30,
      snapToEdges: false,
      snapToSiblings: false,
      guides: true,
    });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 40, clientY: 40,
    }));

    const guides = host.querySelectorAll('[data-magnet-guide]');
    expect(guides.length).toBeGreaterThan(0);
    ctrl.destroy();
  });

  it('does not create guides when guides option is false', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, {
      gridSize: 50,
      threshold: 30,
      snapToEdges: false,
      snapToSiblings: false,
      guides: false,
    });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 40, clientY: 40,
    }));

    const guides = host.querySelectorAll('[data-magnet-guide]');
    expect(guides.length).toBe(0);
    ctrl.destroy();
  });

  it('removes guides on pointerup', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, {
      gridSize: 50,
      threshold: 30,
      guides: true,
    });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));

    host.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 40, clientY: 40,
    }));

    // Guides should exist
    expect(host.querySelectorAll('[data-magnet-guide]').length).toBeGreaterThan(0);

    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 40, clientY: 40 }));

    // Guides should be removed
    expect(host.querySelectorAll('[data-magnet-guide]').length).toBe(0);
    ctrl.destroy();
  });

  it('selector filters which children are draggable', () => {
    const host = createHost();
    const item = document.createElement('div');
    item.className = 'item';
    host.appendChild(item);
    const nonItem = document.createElement('div');
    nonItem.className = 'other';
    host.appendChild(nonItem);

    const ctrl = new MagnetController(host, { selector: '.item' });

    // Click on non-matching child — should not start drag
    nonItem.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('magnetized')).toBe(false);

    // Click on matching child — should start drag
    item.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('magnetized')).toBe(true);

    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host);
    ctrl.detach();

    child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    expect(host.hasAttribute('magnetized')).toBe(false);
    ctrl.destroy();
  });

  it('destroy is safe to call multiple times', () => {
    const host = createHost();
    const ctrl = new MagnetController(host);
    ctrl.destroy();
    ctrl.destroy(); // double destroy should not throw
  });

  it('clears will-change on pointerup', () => {
    const host = createHost();
    const child = addChild(host);
    const ctrl = new MagnetController(host, { snapToEdges: false, snapToSiblings: false, guides: false });

    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, clientX: 0, clientY: 0,
    }));
    expect(child.style.willChange).toBe('transform');

    host.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, clientX: 0, clientY: 0,
    }));
    expect(child.style.willChange).toBe('');
    ctrl.destroy();
  });
});

// ── Adapter tests ──

describe('magnetizableAdapter', () => {
  it('creates and destroys via adapter', async () => {
    const { magnetizableAdapter } = await import('../adapters/magnetizable-adapter.ts');
    const host = createHost();
    const instance = magnetizableAdapter.create(host, {});
    expect(instance).toBeInstanceOf(MagnetController);
    magnetizableAdapter.destroy(instance);
  });

  it('passes options through adapter', async () => {
    const { magnetizableAdapter } = await import('../adapters/magnetizable-adapter.ts');
    const host = createHost();
    const instance = magnetizableAdapter.create(host, {
      selector: '.box',
      threshold: '30',
      'grid-size': '50',
      strength: '0.8',
      guides: 'false',
      'guide-color': 'red',
      'snap-to-edges': 'false',
      'snap-to-siblings': 'false',
      disabled: 'true',
    });
    expect(instance.selector).toBe('.box');
    expect(instance.threshold).toBe(30);
    expect(instance.gridSize).toBe(50);
    expect(instance.strength).toBe(0.8);
    expect(instance.guides).toBe(false);
    expect(instance.guideColor).toBe('red');
    expect(instance.snapToEdges).toBe(false);
    expect(instance.snapToSiblings).toBe(false);
    expect(instance.disabled).toBe(true);
    magnetizableAdapter.destroy(instance);
  });

  it('updates options via adapter', async () => {
    const { magnetizableAdapter } = await import('../adapters/magnetizable-adapter.ts');
    const host = createHost();
    const instance = magnetizableAdapter.create(host, {});

    magnetizableAdapter.update!(instance, { selector: '.box' });
    expect(instance.selector).toBe('.box');

    magnetizableAdapter.update!(instance, { threshold: '30' });
    expect(instance.threshold).toBe(30);

    magnetizableAdapter.update!(instance, { 'grid-size': '50' });
    expect(instance.gridSize).toBe(50);

    magnetizableAdapter.update!(instance, { strength: '0.8' });
    expect(instance.strength).toBe(0.8);

    magnetizableAdapter.update!(instance, { guides: 'false' });
    expect(instance.guides).toBe(false);

    magnetizableAdapter.update!(instance, { 'guide-color': 'blue' });
    expect(instance.guideColor).toBe('blue');

    magnetizableAdapter.update!(instance, { 'snap-to-edges': 'false' });
    expect(instance.snapToEdges).toBe(false);

    magnetizableAdapter.update!(instance, { 'snap-to-siblings': 'false' });
    expect(instance.snapToSiblings).toBe(false);

    magnetizableAdapter.update!(instance, { disabled: 'true' });
    expect(instance.disabled).toBe(true);

    magnetizableAdapter.destroy(instance);
  });
});
