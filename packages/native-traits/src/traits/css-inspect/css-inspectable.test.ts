// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { CSSInspectController } from './css-inspect-controller.ts';

function createHost(): HTMLElement {
  const el = document.createElement('div');
  el.appendChild(document.createElement('div'));
  el.appendChild(document.createElement('span'));
  el.appendChild(document.createElement('p'));
  document.body.appendChild(el);
  return el;
}

/** Click activates the 3D view */
function clickHost(host: HTMLElement): void {
  host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Hold Alt key (required for pre-inspection hover) */
function pressAlt(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', bubbles: true }));
}

function releaseAlt(): void {
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
}

/** Check if the pre-inspection hover overlay is visible */
function isHoverOverlayVisible(): boolean {
  const box = document.querySelector('[data-inspect-hl="hover"]') as HTMLElement | null;
  return box != null && box.style.display === 'block';
}

/** Check if the highlight popover overlay exists in the DOM */
function hasHighlightPopover(): boolean {
  return document.querySelector('[data-inspect-highlights]') != null;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('CSSInspectController', () => {
  it('creates with default options', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    expect(ctrl.depth).toBe(16);
    expect(ctrl.scale).toBe(0.85);
    expect(ctrl.maxTilt).toBe(60);
    expect(ctrl.tiltRadius).toBe(384);
    expect(ctrl.perspective).toBe(1200);
    expect(ctrl.labels).toBe(true);
    expect(ctrl.recursive).toBe(true);
    expect(ctrl.disabled).toBe(false);
    expect(ctrl.active).toBe(false);
    ctrl.destroy();
  });

  it('accepts custom options', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host, {
      depth: 100,
      scale: 0.7,
      maxTilt: 15,
      tiltRadius: 500,
      perspective: 800,
      labels: false,
    });
    expect(ctrl.depth).toBe(100);
    expect(ctrl.scale).toBe(0.7);
    expect(ctrl.maxTilt).toBe(15);
    expect(ctrl.tiltRadius).toBe(500);
    expect(ctrl.perspective).toBe(800);
    expect(ctrl.labels).toBe(false);
    ctrl.destroy();
  });

  // ── Hover preview ──

  it('sets inspect-ready on pointerenter when Alt held', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    pressAlt();
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('inspect-ready')).toBe(true);
    expect(ctrl.active).toBe(false);
    releaseAlt();
    ctrl.destroy();
  });

  it('does not set inspect-ready without Alt', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('inspect-ready')).toBe(false);
    ctrl.destroy();
  });

  it('Alt down while pointer inside sets inspect-ready', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(host.hasAttribute('inspect-ready')).toBe(false);
    pressAlt();
    expect(host.hasAttribute('inspect-ready')).toBe(true);
    releaseAlt();
    ctrl.destroy();
  });

  it('removes inspect-ready on pointerleave', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    pressAlt();
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    host.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(host.hasAttribute('inspect-ready')).toBe(false);
    releaseAlt();
    ctrl.destroy();
  });

  it('removes inspect-ready and hover on Alt release', () => {
    const host = createHost();
    const child = host.children[0] as HTMLElement;
    const ctrl = new CSSInspectController(host);
    pressAlt();
    host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    child.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(host.hasAttribute('inspect-ready')).toBe(true);
    expect(isHoverOverlayVisible()).toBe(true);
    releaseAlt();
    expect(host.hasAttribute('inspect-ready')).toBe(false);
    expect(hasHighlightPopover()).toBe(false);
    ctrl.destroy();
  });

  it('hover shows overlay with label on child (Alt held)', () => {
    const host = createHost();
    const child = host.children[0] as HTMLElement;
    const ctrl = new CSSInspectController(host);
    pressAlt();
    child.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(isHoverOverlayVisible()).toBe(true);
    // Label is rendered inside the overlay, not as data-inspect-label on the element
    const label = document.querySelector('[data-inspect-hl="hover"] span') as HTMLElement;
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('div');
    releaseAlt();
    ctrl.destroy();
  });

  it('hover does not highlight without Alt', () => {
    const host = createHost();
    const child = host.children[0] as HTMLElement;
    const ctrl = new CSSInspectController(host);
    child.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(child.hasAttribute('inspect-hover')).toBe(false);
    ctrl.destroy();
  });

  it('hover does not highlight host itself', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    pressAlt();
    host.dispatchEvent(new PointerEvent('pointermove', { bubbles: false }));
    expect(host.hasAttribute('inspect-hover')).toBe(false);
    releaseAlt();
    ctrl.destroy();
  });

  it('hover overlay moves when moving to new child', () => {
    const host = createHost();
    const child1 = host.children[0] as HTMLElement;
    const child2 = host.children[1] as HTMLElement;
    const ctrl = new CSSInspectController(host);
    pressAlt();
    child1.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(isHoverOverlayVisible()).toBe(true);
    child2.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    // Overlay is still visible (repositioned to child2)
    expect(isHoverOverlayVisible()).toBe(true);
    releaseAlt();
    ctrl.destroy();
  });

  // ── Click to activate ──

  it('click activates 3D view', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    expect(ctrl.active).toBe(true);
    expect(host.hasAttribute('inspecting')).toBe(true);
    ctrl.destroy();
  });

  it('disabled prevents activation on click', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host, { disabled: true });
    clickHost(host);
    expect(host.hasAttribute('inspecting')).toBe(false);
    expect(ctrl.active).toBe(false);
    ctrl.destroy();
  });

  it('sets transform-style preserve-3d on clone', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    expect(ctrl.inspectRoot.style.transformStyle).toBe('preserve-3d');
    ctrl.destroy();
  });

  it('sets perspective + scale + rotation transform on clone', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    const root = ctrl.inspectRoot;
    expect(root.style.transform).toContain('perspective(1200px)');
    expect(root.style.transform).toContain('scale(0.85)');
    expect(root.style.transform).toContain('rotateX(');
    expect(root.style.transform).toContain('rotateY(');
    ctrl.destroy();
  });

  it('hides host with visibility:hidden during inspection', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    expect(host.style.visibility).toBe('hidden');
    ctrl.destroy();
  });

  it('creates a popover clone in the document', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    const popover = document.querySelector('[popover="manual"]');
    expect(popover).not.toBeNull();
    expect(ctrl.inspectRoot).not.toBe(host);
    expect(ctrl.inspectRoot.parentElement).toBe(popover);
    ctrl.destroy();
  });

  // ── Z-depth ──

  it('each element gets incremental z-depth (non-recursive)', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host, { depth: 40, recursive: false });
    clickHost(host);

    const children = Array.from(ctrl.inspectRoot.children) as HTMLElement[];
    expect(children[0].style.transform).toBe('translateZ(40px)');
    expect(children[1].style.transform).toBe('translateZ(80px)');
    expect(children[2].style.transform).toBe('translateZ(120px)');
    ctrl.destroy();
  });

  it('recursive mode uses DOM depth for z-offset', () => {
    const host = document.createElement('div');
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    host.appendChild(parent);
    document.body.appendChild(host);

    const handler = vi.fn();
    host.addEventListener('native:inspect', handler);
    const ctrl = new CSSInspectController(host, { depth: 50, recursive: true });
    clickHost(host);

    // Clone has same structure: parent=depth 1, child=depth 2
    expect(handler.mock.calls[0][0].detail.layers).toBe(2);
    const cloneParent = ctrl.inspectRoot.children[0] as HTMLElement;
    const cloneChild = cloneParent.children[0] as HTMLElement;
    expect(cloneParent.style.transform).toBe('translateZ(50px)');
    expect(cloneChild.style.transform).toBe('translateZ(100px)');
    ctrl.destroy();
  });

  it('recursive siblings at same depth get same z-offset', () => {
    const host = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const nested = document.createElement('span');
    a.appendChild(nested);
    host.appendChild(a);
    host.appendChild(b);
    document.body.appendChild(host);

    const ctrl = new CSSInspectController(host, { depth: 30, recursive: true });
    clickHost(host);

    const root = ctrl.inspectRoot;
    const cloneA = root.children[0] as HTMLElement;
    const cloneNested = cloneA.children[0] as HTMLElement;
    const cloneB = root.children[1] as HTMLElement;
    expect(cloneA.style.transform).toBe('translateZ(30px)');
    expect(cloneNested.style.transform).toBe('translateZ(60px)');
    expect(cloneB.style.transform).toBe('translateZ(30px)');
    ctrl.destroy();
  });

  // ── Labels ──

  it('creates labels on children when labels enabled', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host, { labels: true });
    clickHost(host);

    const labels = ctrl.inspectRoot.querySelectorAll('[data-inspect-label]');
    const texts = Array.from(labels).map((l) => l.getAttribute('data-inspect-label'));
    expect(texts).toContain('div');
    expect(texts).toContain('span');
    expect(texts).toContain('p');
    ctrl.destroy();
  });

  it('does not create labels when labels disabled', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host, { labels: false });
    clickHost(host);

    const labels = ctrl.inspectRoot.querySelectorAll('[data-inspect-label]');
    expect(labels.length).toBe(0);
    ctrl.destroy();
  });

  it('includes className in label', () => {
    const host = document.createElement('div');
    const child = document.createElement('div');
    child.className = 'card-header fancy';
    host.appendChild(child);
    document.body.appendChild(host);

    const ctrl = new CSSInspectController(host);
    clickHost(host);
    const labels = ctrl.inspectRoot.querySelectorAll('[data-inspect-label]');
    const texts = Array.from(labels).map((l) => l.getAttribute('data-inspect-label'));
    expect(texts).toContain('div.card-header');
    ctrl.destroy();
  });

  // ── Events ──

  it('dispatches native:inspect on activate with active: true', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    const handler = vi.fn();
    host.addEventListener('native:inspect', handler);

    clickHost(host);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.active).toBe(true);
    expect(handler.mock.calls[0][0].detail.layers).toBe(3);
    ctrl.destroy();
  });

  it('dispatches native:inspect on deactivate with active: false', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    const handler = vi.fn();

    clickHost(host);
    host.addEventListener('native:inspect', handler);
    ctrl.dismiss();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.active).toBe(false);
    ctrl.destroy();
  });

  // ── Dismiss ──

  it('Escape key deactivates', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    expect(ctrl.active).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ctrl.active).toBe(false);
    expect(host.hasAttribute('inspecting')).toBe(false);
    ctrl.destroy();
  });

  it('click outside deactivates', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    expect(ctrl.active).toBe(true);

    // Click on document body (outside popover)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.active).toBe(false);
    ctrl.destroy();
  });

  it('cleans up on deactivate — host restored, popover removed', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);

    // During inspection, host is hidden and clone has transforms
    expect(host.style.visibility).toBe('hidden');
    expect(ctrl.inspectRoot.querySelectorAll('[data-inspect-label]').length).toBeGreaterThan(0);

    ctrl.dismiss();

    // Host restored
    expect(host.style.visibility).toBe('');
    expect(host.hasAttribute('inspecting')).toBe(false);
    // Popover removed
    expect(document.querySelector('[popover="manual"]')).toBeNull();
    // inspectRoot falls back to host
    expect(ctrl.inspectRoot).toBe(host);
    ctrl.destroy();
  });

  // ── Public API ──

  it('programmatic inspect() and dismiss()', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);

    ctrl.inspect();
    expect(ctrl.active).toBe(true);
    expect(host.hasAttribute('inspecting')).toBe(true);

    ctrl.dismiss();
    expect(ctrl.active).toBe(false);
    expect(host.hasAttribute('inspecting')).toBe(false);
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    ctrl.detach();
    clickHost(host);
    expect(host.hasAttribute('inspecting')).toBe(false);
    ctrl.destroy();
  });

  it('destroy is safe to call multiple times', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    ctrl.destroy();
    ctrl.destroy();
    clickHost(host);
    expect(host.hasAttribute('inspecting')).toBe(false);
  });

  it('destroy deactivates if active', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);
    expect(ctrl.active).toBe(true);
    ctrl.destroy();
    expect(host.hasAttribute('inspecting')).toBe(false);
  });

  it('sets transition on clone children during inspection', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host);
    clickHost(host);

    const child = ctrl.inspectRoot.children[0] as HTMLElement;
    expect(child.style.transition).toContain('transform');
    ctrl.destroy();
  });
});

// ── Pick mode ──

describe('CSSInspectController pick mode', () => {
  function createContainer(): HTMLElement {
    const container = document.createElement('div');
    const cardA = document.createElement('div');
    cardA.className = 'card-a';
    cardA.appendChild(document.createElement('span'));
    cardA.appendChild(document.createElement('p'));
    const cardB = document.createElement('div');
    cardB.className = 'card-b';
    cardB.appendChild(document.createElement('span'));
    container.appendChild(cardA);
    container.appendChild(cardB);
    document.body.appendChild(container);
    return container;
  }

  it('regular click does not activate in pick mode', () => {
    const container = createContainer();
    const ctrl = new CSSInspectController(container, { pick: true });
    clickHost(container);
    expect(ctrl.active).toBe(false);
    ctrl.destroy();
  });

  it('Alt+click on hovered child activates with that child as target', () => {
    const container = createContainer();
    const cardA = container.children[0] as HTMLElement;
    const ctrl = new CSSInspectController(container, { pick: true });

    pressAlt();
    // Hover over cardA — overlay shows instead of attribute
    cardA.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(isHoverOverlayVisible()).toBe(true);

    // Alt+click picks cardA
    cardA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.active).toBe(true);

    // The picked element is hidden, not the container
    expect(cardA.style.visibility).toBe('hidden');
    expect(container.style.visibility).not.toBe('hidden');

    // Clone is cardA, not the container
    const root = ctrl.inspectRoot;
    expect(root.className).toBe('card-a');

    releaseAlt();
    ctrl.destroy();
  });

  it('dismiss restores the picked element', () => {
    const container = createContainer();
    const cardA = container.children[0] as HTMLElement;
    const ctrl = new CSSInspectController(container, { pick: true });

    pressAlt();
    cardA.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    cardA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(cardA.style.visibility).toBe('hidden');

    ctrl.dismiss();
    expect(cardA.style.visibility).toBe('');
    expect(cardA.hasAttribute('inspecting')).toBe(false);
    expect(ctrl.active).toBe(false);

    releaseAlt();
    ctrl.destroy();
  });

  it('programmatic inspect(target) works in pick mode', () => {
    const container = createContainer();
    const cardB = container.children[1] as HTMLElement;
    const ctrl = new CSSInspectController(container, { pick: true });

    ctrl.inspect(cardB);
    expect(ctrl.active).toBe(true);
    expect(cardB.style.visibility).toBe('hidden');
    expect(ctrl.inspectRoot.className).toBe('card-b');

    ctrl.destroy();
  });

  it('pick mode clone gets base z-distance that scales with depth multiplier', () => {
    const container = createContainer();
    const cardA = container.children[0] as HTMLElement;
    const ctrl = new CSSInspectController(container, { pick: true, depth: 20 });

    pressAlt();
    cardA.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    cardA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctrl.active).toBe(true);

    // Clone root has translateZ with base = depth * 2 = 40
    const root = ctrl.inspectRoot;
    expect(root.style.transform).toContain('translateZ(40px)');

    releaseAlt();
    ctrl.destroy();
  });

  it('fixed mode clone has no base z-distance', () => {
    const host = createHost();
    const ctrl = new CSSInspectController(host, { depth: 20 });
    clickHost(host);
    expect(ctrl.active).toBe(true);

    // Clone root has translateZ(0px) in fixed mode
    const root = ctrl.inspectRoot;
    expect(root.style.transform).toContain('translateZ(0px)');

    ctrl.destroy();
  });
});

// ── Adapter tests ──

describe('cssInspectableAdapter', () => {
  it('creates and destroys via adapter', async () => {
    const { cssInspectableAdapter } = await import('./css-inspectable-adapter.ts');
    const host = createHost();
    const instance = cssInspectableAdapter.create(host, {});
    expect(instance).toBeInstanceOf(CSSInspectController);
    cssInspectableAdapter.destroy(instance);
  });

  it('passes options through adapter', async () => {
    const { cssInspectableAdapter } = await import('./css-inspectable-adapter.ts');
    const host = createHost();
    const instance = cssInspectableAdapter.create(host, {
      'depth': '80',
      'scale': '0.7',
      'max-tilt': '15',
      'tilt-radius': '500',
      'perspective': '900',
      'labels': 'false',
    });
    expect(instance.depth).toBe(80);
    expect(instance.scale).toBe(0.7);
    expect(instance.maxTilt).toBe(15);
    expect(instance.tiltRadius).toBe(500);
    expect(instance.perspective).toBe(900);
    expect(instance.labels).toBe(false);
    cssInspectableAdapter.destroy(instance);
  });

  it('updates options via adapter', async () => {
    const { cssInspectableAdapter } = await import('./css-inspectable-adapter.ts');
    const host = createHost();
    const instance = cssInspectableAdapter.create(host, {});

    cssInspectableAdapter.update!(instance, { 'depth': '100' });
    expect(instance.depth).toBe(100);

    cssInspectableAdapter.update!(instance, { 'scale': '0.6' });
    expect(instance.scale).toBe(0.6);

    cssInspectableAdapter.update!(instance, { 'max-tilt': '20' });
    expect(instance.maxTilt).toBe(20);

    cssInspectableAdapter.update!(instance, { 'tilt-radius': '600' });
    expect(instance.tiltRadius).toBe(600);

    cssInspectableAdapter.update!(instance, { 'perspective': '2000' });
    expect(instance.perspective).toBe(2000);

    cssInspectableAdapter.update!(instance, { 'labels': 'false' });
    expect(instance.labels).toBe(false);

    cssInspectableAdapter.destroy(instance);
  });
});
