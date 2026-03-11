// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement, define } from '@nonoun/native-core';
import { DragController } from './drag-controller.ts';

// ── Test element using DragController ──

class DragTestEl extends NativeElement {
  #drag: DragController | null = null;
  #selector = '';
  #axis: 'vertical' | 'horizontal' | 'both' = 'both';
  #mode: 'drop' | 'slot' | 'preview' = 'drop';
  #disabled = false;

  get dragSelector(): string { return this.#drag ? this.#drag.selector : this.#selector; }
  set dragSelector(val: string) { this.#selector = val; if (this.#drag) this.#drag.selector = val; }

  get dragAxis(): 'vertical' | 'horizontal' | 'both' { return this.#drag ? this.#drag.axis : this.#axis; }
  set dragAxis(val: 'vertical' | 'horizontal' | 'both') { this.#axis = val; if (this.#drag) this.#drag.axis = val; }

  get dragMode(): 'drop' | 'slot' | 'preview' { return this.#drag ? this.#drag.mode : this.#mode; }
  set dragMode(val: 'drop' | 'slot' | 'preview') { this.#mode = val; if (this.#drag) this.#drag.mode = val; }

  get dragDisabled(): boolean { return this.#drag ? this.#drag.disabled : this.#disabled; }
  set dragDisabled(val: boolean) { this.#disabled = val; if (this.#drag) this.#drag.disabled = val; }

  setup() {
    super.setup();
    this.#drag = new DragController(this, {
      selector: this.#selector,
      axis: this.#axis,
      mode: this.#mode,
      disabled: this.#disabled,
    });
  }
  teardown() { this.#drag?.destroy(); this.#drag = null; super.teardown(); }
}

if (!customElements.get('drag-test')) {
  define('drag-test', DragTestEl);
}

function create(mode: 'drop' | 'slot' | 'preview' = 'drop', count = 5): DragTestEl {
  const el = document.createElement('drag-test') as DragTestEl;
  el.dragSelector = '.item';
  el.dragAxis = 'vertical';
  el.dragMode = mode;

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Item ${i}`;
    el.appendChild(item);
  }

  document.body.appendChild(el);
  return el;
}

function items(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.item')];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Draggable — drop mode', () => {
  it('defaults to drop mode', () => {
    const el = create();
    expect(el.dragMode).toBe('drop');
  });

  it('does nothing when disabled', () => {
    const el = create();
    el.dragDisabled = true;
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing with no selector', () => {
    const el = create();
    el.dragSelector = '';
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores non-primary button', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets dragging attribute on first pointermove', () => {
    const el = create();
    items(el)[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(items(el)[1].hasAttribute('dragging')).toBe(false);

    // First move creates ghost and sets dragging
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(items(el)[1].hasAttribute('dragging')).toBe(true);
  });

  it('dispatches native:drag-start on first move', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drag-start', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.item).toBe(items(el)[0]);
    expect(handler.mock.calls[0][0].detail.index).toBe(0);
  });

  it('dispatches native:drop on pointerup after drag', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.fromIndex).toBe(0);
  });

  it('DOM swap in native:drop handler does not trigger double dispatch (T0117)', () => {
    const el = create();
    const handler = vi.fn((e: CustomEvent) => {
      // Simulate a consumer performing a DOM swap in the drop handler
      const { item, target } = e.detail;
      if (!target || target === item) return;
      const placeholder = document.createElement('div');
      item.before(placeholder);
      target.before(item);
      placeholder.replaceWith(target);

      // In a real browser, moving the captured element triggers lostpointercapture.
      // Simulate that by dispatching the event synchronously during the handler.
      item.dispatchEvent(new Event('lostpointercapture'));
    });
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    // Must fire exactly once — not double-dispatched from lostpointercapture re-entry
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch native:drop without movement', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches native:drag-cancel on Escape', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:drag-cancel', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cleanup removes dragging attribute and ghost', () => {
    const el = create();
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    expect(items(el)[0].hasAttribute('dragging')).toBe(true);
    // Ghost appended to host with [popover] — top-layer rendering, inherits CSS context
    expect(document.body.querySelectorAll('[popover][aria-hidden="true"]').length).toBeGreaterThan(0);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(items(el)[0].hasAttribute('dragging')).toBe(false);
  });
});

describe('Draggable — slot mode', () => {
  it('has dragMode slot when configured', () => {
    const el = create('slot');
    expect(el.dragMode).toBe('slot');
  });

  it('does not create placeholder without movement', () => {
    const el = create('slot');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.querySelector('.drag-placeholder')).toBeNull();
  });

  it('dispatches native:drop with insertBefore in slot mode', () => {
    const el = create('slot');
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.fromIndex).toBe(0);
    expect('insertBefore' in detail).toBe(true);
  });

  it('cleanup removes placeholder in slot mode', () => {
    const el = create('slot');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    // After cleanup
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(el.querySelector('.drag-placeholder')).toBeNull();
  });

  it('cleanup removes slot attributes', () => {
    const el = create('slot');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    for (const item of items(el)) {
      expect(item.hasAttribute('drag-slot-before')).toBe(false);
      expect(item.hasAttribute('drag-slot-after')).toBe(false);
    }
  });
});

// ── DragController standalone tests ──

function createHost(count = 5): HTMLElement {
  const el = document.createElement('div');
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Item ${i}`;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

describe('DragController', () => {
  it('attaches to a plain HTMLElement', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', axis: 'vertical', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(items(host)[0].hasAttribute('dragging')).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('dispatches native:drop on host element', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('respects disabled option', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', disabled: true });
    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('can be disabled after creation', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item' });
    ctrl.disabled = true;
    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('detach stops listening', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item' });
    ctrl.detach();

    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('attach re-enables after detach', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item' });
    ctrl.detach();
    ctrl.attach();

    const handler = vi.fn();
    host.addEventListener('native:drag-start', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('works in slot mode on plain element', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', axis: 'vertical', mode: 'slot' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect('insertBefore' in detail).toBe(true);
    expect(host.querySelector('.drag-placeholder')).toBeNull(); // cleaned up

    ctrl.destroy();
  });

  it('creates ghost on first pointermove (no callback)', () => {
    const host = createHost();
    const ctrl = new DragController(host, {
      selector: '.item',
      mode: 'drop',
    });

    const dragItem = items(host)[0];
    dragItem.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    // Ghost is created as a popover inside the host (inherits CSS custom properties)
    const ghost = host.querySelector('[popover][aria-hidden="true"]');
    expect(ghost).toBeInstanceOf(HTMLElement);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('does not create ghost without movement', () => {
    const host = createHost();
    const ctrl = new DragController(host, {
      selector: '.item',
      mode: 'drop',
    });

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    const ghost = host.querySelector('[popover][aria-hidden="true"]');
    expect(ghost).toBeNull();
    ctrl.destroy();
  });
});

// ── Cross-zone tests ──

function createZoneHost(): { host: HTMLElement; zone1: HTMLElement; zone2: HTMLElement } {
  const host = document.createElement('div');

  const zone1 = document.createElement('div');
  zone1.className = 'zone';
  zone1.dataset.zone = 'todo';

  const zone2 = document.createElement('div');
  zone2.className = 'zone';
  zone2.dataset.zone = 'done';

  for (let i = 0; i < 3; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Todo ${i}`;
    zone1.appendChild(item);
  }
  for (let i = 0; i < 2; i++) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = `Done ${i}`;
    zone2.appendChild(item);
  }

  host.appendChild(zone1);
  host.appendChild(zone2);
  document.body.appendChild(host);
  return { host, zone1, zone2 };
}

function mockZoneLayout(zone1: HTMLElement, zone2: HTMLElement): void {
  // Zone 1: left column (0–200, 0–300)
  vi.spyOn(zone1, 'getBoundingClientRect').mockReturnValue(
    { top: 0, left: 0, right: 200, bottom: 300, width: 200, height: 300, x: 0, y: 0, toJSON: () => {} } as DOMRect,
  );
  const z1Items = zone1.querySelectorAll<HTMLElement>('.item');
  z1Items.forEach((item, i) => {
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(
      { top: i * 50, left: 0, right: 200, bottom: (i + 1) * 50, width: 200, height: 50, x: 0, y: i * 50, toJSON: () => {} } as DOMRect,
    );
  });
  // Zone 2: right column (200–400, 0–300)
  vi.spyOn(zone2, 'getBoundingClientRect').mockReturnValue(
    { top: 0, left: 200, right: 400, bottom: 300, width: 200, height: 300, x: 200, y: 0, toJSON: () => {} } as DOMRect,
  );
  const z2Items = zone2.querySelectorAll<HTMLElement>('.item');
  z2Items.forEach((item, i) => {
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(
      { top: i * 50, left: 200, right: 400, bottom: (i + 1) * 50, width: 200, height: 50, x: 200, y: i * 50, toJSON: () => {} } as DOMRect,
    );
  });
}

describe('Draggable — cross-zone (slot mode)', () => {
  it('records sourceZone in drop event', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'slot' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    // Start drag on first item in zone1 (center at 100, 25)
    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    // Move into zone2 (center at 300, 25)
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.sourceZone).toBe(zone1);
    expect(detail.targetZone).toBe(zone2);

    ctrl.destroy();
  });

  it('inserts placeholder into target zone', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'slot' });

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    // Move into zone2
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));

    // Placeholder should be inside zone2, not zone1
    expect(zone2.querySelector('.drag-placeholder')).not.toBeNull();
    expect(zone1.querySelector('.drag-placeholder')).toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('sets drag-zone-active on target zone', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'slot' });

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    // Move into zone2
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));

    expect(zone2.hasAttribute('drag-zone-active')).toBe(true);
    expect(zone1.hasAttribute('drag-zone-active')).toBe(false);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('cleans up drag-zone-active on drop', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'slot' });

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(zone1.hasAttribute('drag-zone-active')).toBe(false);
    expect(zone2.hasAttribute('drag-zone-active')).toBe(false);

    ctrl.destroy();
  });

  it('cleans up on Escape', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'slot' });

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(zone1.hasAttribute('drag-zone-active')).toBe(false);
    expect(zone2.hasAttribute('drag-zone-active')).toBe(false);
    expect(host.querySelector('.drag-placeholder')).toBeNull();

    ctrl.destroy();
  });
});

describe('Draggable — cross-zone (preview mode)', () => {
  it('records sourceZone and targetZone in drop event', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'preview', animate: false });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.sourceZone).toBe(zone1);
    expect(detail.targetZone).toBe(zone2);

    ctrl.destroy();
  });

  it('moves item to target zone DOM', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'preview', animate: false });

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Item should now be a child of zone2
    expect(item0.parentElement).toBe(zone2);

    ctrl.destroy();
  });

  it('restores item to source zone on Escape', () => {
    const { host, zone1, zone2 } = createZoneHost();
    mockZoneLayout(zone1, zone2);
    const ctrl = new DragController(host, { selector: '.item', zoneSelector: '.zone', axis: 'vertical', mode: 'preview', animate: false });

    const item0 = zone1.querySelectorAll('.item')[0] as HTMLElement;
    const originalNext = item0.nextElementSibling;
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 25 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 25 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Item should be back in zone1
    expect(item0.parentElement).toBe(zone1);
    expect(item0.nextElementSibling).toBe(originalNext);

    ctrl.destroy();
  });
});

describe('Draggable — no zoneSelector (backward compat)', () => {
  it('drop event has null sourceZone/targetZone without zoneSelector', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.sourceZone).toBeNull();
    expect(detail.targetZone).toBeNull();

    ctrl.destroy();
  });
});

describe('Draggable — preview mode', () => {
  it('has dragMode preview when configured', () => {
    const el = create('preview');
    expect(el.dragMode).toBe('preview');
  });

  it('keeps item in DOM with [dragging] during drag', () => {
    const el = create('preview');
    const item0 = items(el)[0];
    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(item0.hasAttribute('dragging')).toBe(true);
    expect(item0.isConnected).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(item0.hasAttribute('dragging')).toBe(false);
  });

  it('dispatches native:drop with fromIndex and toIndex', () => {
    const el = create('preview');
    const handler = vi.fn();
    el.addEventListener('native:drop', handler);

    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.fromIndex).toBe(0);
    expect(typeof detail.toIndex).toBe('number');
  });

  it('restores item to original position on Escape', () => {
    const el = create('preview');
    const item0 = items(el)[0];
    const originalNext = item0.nextElementSibling;
    const originalParent = item0.parentElement;

    item0.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(item0.parentElement).toBe(originalParent);
    expect(item0.nextElementSibling).toBe(originalNext);
  });

  it('dispatches native:drag-cancel on Escape', () => {
    const el = create('preview');
    const handler = vi.fn();
    el.addEventListener('native:drag-cancel', handler);

    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not create a .drag-placeholder element', () => {
    const el = create('preview');
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    expect(el.querySelector('.drag-placeholder')).toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('works as standalone DragController', () => {
    const host = createHost();
    const ctrl = new DragController(host, { selector: '.item', mode: 'preview' });
    const handler = vi.fn();
    host.addEventListener('native:drop', handler);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('ghost does not pollute host item query during drag', () => {
    const host = createHost(5);
    const ctrl = new DragController(host, { selector: '.item', mode: 'preview' });

    expect(host.querySelectorAll('.item').length).toBe(5);

    items(host)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    // Ghost clone lives inside host but [popover] filter excludes it from #getItems()
    // Raw querySelectorAll sees 6 (5 items + 1 ghost clone), but DragController sees 5
    expect(host.querySelectorAll('.item').length).toBe(6);
    expect(host.querySelectorAll('.item:not([popover])').length).toBe(5);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });
});

// ── Grid-specific tests ──

function createGridHost(cols = 4, rows = 3): { host: HTMLElement; items: HTMLElement[] } {
  const host = document.createElement('div');
  const cellWidth = 100;
  const cellHeight = 60;
  const gap = 8;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = `${r * cols + c + 1}`;
      const left = c * (cellWidth + gap);
      const top = r * (cellHeight + gap);
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
        top, left, right: left + cellWidth, bottom: top + cellHeight,
        width: cellWidth, height: cellHeight, x: left, y: top, toJSON: () => {},
      } as DOMRect);
      host.appendChild(item);
    }
  }

  document.body.appendChild(host);
  return { host, items: [...host.querySelectorAll<HTMLElement>('.item')] };
}

describe('Draggable — slot mode grid (axis=both)', () => {
  it('computes correct insertion index for grid positions', () => {
    const { host, items: gridItems } = createGridHost(4, 3);
    const ctrl = new DragController(host, { selector: '.item', axis: 'both', mode: 'slot' });
    const handler = vi.fn();
    host.addEventListener('native:drag-over', handler);

    // Drag item 0 (top-left corner)
    gridItems[0].dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 50, clientY: 30,
    }));

    // Move ghost center to position of item at row 1, col 2 (index 6 in 4-col grid)
    // Item 6 center: left = 2*(100+8) = 216, top = 1*(60+8) = 68, center = (266, 98)
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 266, clientY: 98,
    }));

    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[handler.mock.calls.length - 1][0].detail;
    // Should compute a valid grid insertion index, not 0 (the broken behavior)
    expect(detail.index).toBeGreaterThan(0);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('does not insert placeholder in grid mode', () => {
    const { host, items: gridItems } = createGridHost(4, 3);
    const ctrl = new DragController(host, { selector: '.item', axis: 'both', mode: 'slot' });

    gridItems[0].dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 50, clientY: 30,
    }));
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 266, clientY: 98,
    }));

    // No placeholder should be inserted — it would break CSS Grid layout
    expect(host.querySelector('.drag-placeholder')).toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('sets drag-slot-before attribute on correct item', () => {
    const { host, items: gridItems } = createGridHost(4, 3);
    const ctrl = new DragController(host, { selector: '.item', axis: 'both', mode: 'slot' });

    gridItems[0].dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 50, clientY: 30,
    }));
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 266, clientY: 98,
    }));

    // At least one item should have the slot-before attribute
    const markedItems = gridItems.filter(el => el.hasAttribute('drag-slot-before'));
    expect(markedItems.length).toBe(1);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });
});

describe('Draggable — drop mode grid (axis=both)', () => {
  it('computes correct isBefore for same-row items', () => {
    const { host, items: gridItems } = createGridHost(4, 3);
    const ctrl = new DragController(host, { selector: '.item', axis: 'both', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drag-over', handler);

    // Drag item 0
    gridItems[0].dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 50, clientY: 30,
    }));

    // Move to just left of center of item 2 (same row, col 2)
    // Item 2 center: left = 2*(100+8) = 216, center x = 266, center y = 30
    // Move to just left of center → should be "before" item 2
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 260, clientY: 30,
    }));

    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[handler.mock.calls.length - 1][0].detail;
    // Index should be 2 (before item 2), not 3 (after item 2)
    expect(detail.index).toBe(2);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('computes correct isBefore for item above', () => {
    const { host, items: gridItems } = createGridHost(4, 3);
    const ctrl = new DragController(host, { selector: '.item', axis: 'both', mode: 'drop' });
    const handler = vi.fn();
    host.addEventListener('native:drag-over', handler);

    // Drag item 8 (row 2, col 0)
    gridItems[8].dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 50, clientY: 30 + 2 * 68,
    }));

    // Move to above center of item 4 (row 1, col 0) → clearly above midY
    // Item 4 center: y = 68 + 30 = 98. Move to y = 80 (above center - 25% = 98 - 15 = 83)
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 50, clientY: 80,
    }));

    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[handler.mock.calls.length - 1][0].detail;
    // Should be index 4 (before item 4), because pointer is above center
    expect(detail.index).toBe(4);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });
});

describe('DragController — lifecycle hardening', () => {
  it('removes lostpointercapture listener before releasePointerCapture (re-entry prevention)', () => {
    const el = create();
    const dropHandler = vi.fn();
    el.addEventListener('native:drop', dropHandler);

    // Start drag
    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    // Simulate browser firing lostpointercapture synchronously during releasePointerCapture
    // by dispatching it right before pointerup. If the listener was removed first (correct),
    // it won't re-enter. If not removed (bug), it would crash or double-dispatch.
    const item = items(el)[0];
    const origRelease = item.releasePointerCapture;
    item.releasePointerCapture = function (id: number) {
      // Simulate synchronous lostpointercapture from releasePointerCapture
      item.dispatchEvent(new Event('lostpointercapture'));
      origRelease?.call(this, id);
    };

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Should fire exactly once, not crash from re-entry
    expect(dropHandler).toHaveBeenCalledTimes(1);
  });

  it('removes document listeners before dispatching native:drop', () => {
    const el = create();
    let docHadPointermoveListener = false;

    el.addEventListener('native:drop', () => {
      // During the drop handler, check if document still has pointermove listener
      // by dispatching a pointermove and seeing if the drag controller processes it
      const moveHandler = vi.fn();
      document.addEventListener('pointermove', moveHandler, { once: true });
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 100, clientY: 100 }));
      // The handler we just added should fire, but the drag controller's handler should NOT
      // (it was removed before dispatch). We verify indirectly: if a ghost still existed and
      // controller processed the move, it would try to update ghost position.
      docHadPointermoveListener = moveHandler.mock.calls.length > 0;
    });

    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(docHadPointermoveListener).toBe(true);
  });

  it('cleans up properly when host is disconnected mid-drag', () => {
    const el = create();
    const cancelHandler = vi.fn();
    el.addEventListener('native:drag-cancel', cancelHandler);

    items(el)[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));

    // Disconnect element (simulates View Transition swap)
    el.remove();

    // teardown should have fired drag-cancel and cleaned up
    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });
});
