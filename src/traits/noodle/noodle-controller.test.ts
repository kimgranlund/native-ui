// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NoodleController } from './noodle-controller.ts';

describe('NoodleController', () => {
  let host: HTMLElement;
  let ctrl: NoodleController;

  beforeEach(() => {
    host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = '400px';
    host.style.height = '300px';
    document.body.appendChild(host);

    // Add two connectable elements
    const a = document.createElement('div');
    a.id = 'node-a';
    a.setAttribute('data-noodle-port', 'right');
    a.style.cssText = 'position:absolute;left:10px;top:10px;width:50px;height:30px;';
    host.appendChild(a);

    const b = document.createElement('div');
    b.id = 'node-b';
    b.setAttribute('data-noodle-port', 'left');
    b.style.cssText = 'position:absolute;left:200px;top:100px;width:50px;height:30px;';
    host.appendChild(b);
  });

  afterEach(() => {
    ctrl?.destroy();
    document.body.innerHTML = '';
  });

  // ── Construction ──

  it('creates with default options', () => {
    ctrl = new NoodleController(host);
    expect(ctrl.host).toBe(host);
    expect(ctrl.selector).toBe('[data-noodle-port]');
    expect(ctrl.editable).toBe(false);
    expect(ctrl.color).toBe('var(--n-color-accent-500)');
    expect(ctrl.strokeWidth).toBe(2);
    expect(ctrl.tension).toBe(0.5);
    expect(ctrl.style).toBe('bezier');
    expect(ctrl.animated).toBe(false);
    expect(ctrl.disabled).toBe(false);
  });

  it('creates with custom options', () => {
    ctrl = new NoodleController(host, {
      editable: true,
      color: 'red',
      strokeWidth: 4,
      tension: 0.8,
      style: 'step',
      animated: true,
    });
    expect(ctrl.editable).toBe(true);
    expect(ctrl.color).toBe('red');
    expect(ctrl.strokeWidth).toBe(4);
    expect(ctrl.tension).toBe(0.8);
    expect(ctrl.style).toBe('step');
    expect(ctrl.animated).toBe(true);
  });

  it('creates SVG overlay on attach', () => {
    ctrl = new NoodleController(host);
    const svg = host.querySelector('[data-noodle-svg]');
    expect(svg).toBeTruthy();
    expect(svg?.tagName.toLowerCase()).toBe('svg');
  });

  // ── Connect / Disconnect ──

  it('connect creates a connection and returns an ID', () => {
    ctrl = new NoodleController(host);
    const id = ctrl.connect('node-a', 'node-b');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const conns = ctrl.getConnections();
    expect(conns).toHaveLength(1);
    expect(conns[0].from).toBe('node-a');
    expect(conns[0].to).toBe('node-b');
    expect(conns[0].fromPort).toBe('right');
    expect(conns[0].toPort).toBe('left');
  });

  it('connect dispatches native:noodle-connect', () => {
    ctrl = new NoodleController(host);
    const handler = vi.fn();
    host.addEventListener('native:noodle-connect', handler);

    const id = ctrl.connect('node-a', 'node-b');

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.id).toBe(id);
    expect(detail.from).toBe('node-a');
    expect(detail.to).toBe('node-b');
  });

  it('connect uses custom port sides', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b', 'bottom', 'top');

    const conns = ctrl.getConnections();
    expect(conns[0].fromPort).toBe('bottom');
    expect(conns[0].toPort).toBe('top');
  });

  it('disconnect removes a connection by ID', () => {
    ctrl = new NoodleController(host);
    const id = ctrl.connect('node-a', 'node-b');
    expect(ctrl.getConnections()).toHaveLength(1);

    const result = ctrl.disconnect(id);
    expect(result).toBe(true);
    expect(ctrl.getConnections()).toHaveLength(0);
  });

  it('disconnect returns false for unknown ID', () => {
    ctrl = new NoodleController(host);
    const result = ctrl.disconnect('nonexistent');
    expect(result).toBe(false);
  });

  it('disconnect dispatches native:noodle-disconnect', () => {
    ctrl = new NoodleController(host);
    const id = ctrl.connect('node-a', 'node-b');

    const handler = vi.fn();
    host.addEventListener('native:noodle-disconnect', handler);

    ctrl.disconnect(id);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.id).toBe(id);
    expect(detail.from).toBe('node-a');
    expect(detail.to).toBe('node-b');
  });

  // ── getConnections ──

  it('getConnections returns a copy of connections', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b');
    ctrl.connect('node-b', 'node-a', 'left', 'right');

    const conns = ctrl.getConnections();
    expect(conns).toHaveLength(2);

    // Should be a copy — mutating it should not affect the controller
    conns.pop();
    expect(ctrl.getConnections()).toHaveLength(2);
  });

  // ── setConnections ──

  it('setConnections replaces all connections', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b');
    expect(ctrl.getConnections()).toHaveLength(1);

    ctrl.setConnections([
      { id: 'c1', from: 'node-a', to: 'node-b', fromPort: 'right', toPort: 'left' },
      { id: 'c2', from: 'node-b', to: 'node-a', fromPort: 'left', toPort: 'right' },
    ]);

    expect(ctrl.getConnections()).toHaveLength(2);
    expect(ctrl.getConnections()[0].id).toBe('c1');
    expect(ctrl.getConnections()[1].id).toBe('c2');
  });

  // ── Clear ──

  it('clear removes all connections', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b');
    ctrl.connect('node-b', 'node-a', 'left', 'right');
    expect(ctrl.getConnections()).toHaveLength(2);

    ctrl.clear();
    expect(ctrl.getConnections()).toHaveLength(0);
  });

  it('clear dispatches disconnect events for each connection', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b');
    ctrl.connect('node-b', 'node-a', 'left', 'right');

    const handler = vi.fn();
    host.addEventListener('native:noodle-disconnect', handler);

    ctrl.clear();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  // ── Initial connections ──

  it('accepts initial connections via options', () => {
    ctrl = new NoodleController(host, {
      connections: [
        { id: 'init-1', from: 'node-a', to: 'node-b', fromPort: 'right', toPort: 'left' },
      ],
    });

    const conns = ctrl.getConnections();
    expect(conns).toHaveLength(1);
    expect(conns[0].id).toBe('init-1');
  });

  // ── Mutable options ──

  it('allows runtime changes to public options', () => {
    ctrl = new NoodleController(host);

    ctrl.editable = true;
    expect(ctrl.editable).toBe(true);

    ctrl.color = '#ff0000';
    expect(ctrl.color).toBe('#ff0000');

    ctrl.strokeWidth = 5;
    expect(ctrl.strokeWidth).toBe(5);

    ctrl.style = 'straight';
    expect(ctrl.style).toBe('straight');

    ctrl.animated = true;
    expect(ctrl.animated).toBe(true);

    ctrl.disabled = true;
    expect(ctrl.disabled).toBe(true);
  });

  // ── Detach / Destroy ──

  it('detach removes SVG overlay', () => {
    ctrl = new NoodleController(host);
    expect(host.querySelector('[data-noodle-svg]')).toBeTruthy();

    ctrl.detach();
    expect(host.querySelector('[data-noodle-svg]')).toBeNull();
  });

  it('destroy clears connections and detaches', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b');

    ctrl.destroy();
    expect(ctrl.getConnections()).toHaveLength(0);
    expect(host.querySelector('[data-noodle-svg]')).toBeNull();
  });

  it('destroy is safe to call multiple times', () => {
    ctrl = new NoodleController(host);
    expect(() => {
      ctrl.destroy();
      ctrl.destroy();
    }).not.toThrow();
  });

  // ── Update ──

  it('update does not throw when no connections exist', () => {
    ctrl = new NoodleController(host);
    expect(() => ctrl.update()).not.toThrow();
  });

  it('update does not throw with active connections', () => {
    ctrl = new NoodleController(host);
    ctrl.connect('node-a', 'node-b');
    expect(() => ctrl.update()).not.toThrow();
  });

  // ── Port indicators (editable mode) ──

  it('creates port indicator dots when editable + showPorts', () => {
    ctrl = new NoodleController(host, { editable: true, showPorts: true });
    const dots = host.querySelectorAll('[data-noodle-port-indicator]');
    // node-a has 'right', node-b has 'left' → 2 dots
    expect(dots.length).toBe(2);
  });

  it('port dots have correct data-noodle-target and data-noodle-side', () => {
    ctrl = new NoodleController(host, { editable: true, showPorts: true });
    const dots = host.querySelectorAll('[data-noodle-port-indicator]');
    const targets = [...dots].map(d => d.getAttribute('data-noodle-target'));
    const sides = [...dots].map(d => d.getAttribute('data-noodle-side'));
    expect(targets).toContain('node-a');
    expect(targets).toContain('node-b');
    expect(sides).toContain('right');
    expect(sides).toContain('left');
  });

  // ── Port interaction states ──

  describe('port interaction states', () => {
    let dotA: HTMLElement;
    let dotB: HTMLElement;

    beforeEach(() => {
      ctrl = new NoodleController(host, { editable: true, showPorts: true });
      const dots = host.querySelectorAll('[data-noodle-port-indicator]');
      dotA = [...dots].find(d => d.getAttribute('data-noodle-target') === 'node-a') as HTMLElement;
      dotB = [...dots].find(d => d.getAttribute('data-noodle-target') === 'node-b') as HTMLElement;
    });

    it('pointerdown sets data-noodle-dragging on source dot', () => {
      dotA.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1, button: 0, clientX: 10, clientY: 10, bubbles: true,
      }));
      expect(dotA.hasAttribute('data-noodle-dragging')).toBe(true);
    });

    it('pointerdown sets data-noodle-droppable on other port dots', () => {
      dotA.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1, button: 0, clientX: 10, clientY: 10, bubbles: true,
      }));
      expect(dotA.hasAttribute('data-noodle-droppable')).toBe(false);
      expect(dotB.hasAttribute('data-noodle-droppable')).toBe(true);
    });

    it('pointerup cleans up all state attributes', () => {
      dotA.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1, button: 0, clientX: 10, clientY: 10, bubbles: true,
      }));
      document.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 1, clientX: 300, clientY: 300, bubbles: true,
      }));
      expect(dotA.hasAttribute('data-noodle-dragging')).toBe(false);
      expect(dotB.hasAttribute('data-noodle-droppable')).toBe(false);
    });

    it('pointercancel cleans up all state attributes', () => {
      dotA.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1, button: 0, clientX: 10, clientY: 10, bubbles: true,
      }));
      document.dispatchEvent(new PointerEvent('pointercancel', {
        pointerId: 1, bubbles: true,
      }));
      expect(dotA.hasAttribute('data-noodle-dragging')).toBe(false);
      expect(dotB.hasAttribute('data-noodle-droppable')).toBe(false);
    });

    it('does not start drag when disabled', () => {
      ctrl.disabled = true;
      dotA.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1, button: 0, clientX: 10, clientY: 10, bubbles: true,
      }));
      expect(dotA.hasAttribute('data-noodle-dragging')).toBe(false);
    });
  });
});
