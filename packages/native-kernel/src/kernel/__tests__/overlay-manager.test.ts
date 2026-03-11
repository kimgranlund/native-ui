// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { OverlayManager, createOverlayManager } from '../overlay-manager.ts';

describe('OverlayManager', () => {
  let mgr: OverlayManager;

  beforeEach(() => {
    mgr = createOverlayManager();
  });

  function div(): HTMLElement {
    return document.createElement('div');
  }

  it('creates via factory', () => {
    expect(mgr).toBeInstanceOf(OverlayManager);
  });

  it('starts with empty stack', () => {
    expect(mgr.stack.value).toEqual([]);
    expect(mgr.topOverlay.value).toBeNull();
  });

  it('open adds entry to stack', () => {
    const el = div();
    const { id } = mgr.open({ type: 'popover', element: el });
    expect(id).toMatch(/^overlay-/);
    expect(mgr.stack.value.length).toBe(1);
    expect(mgr.stack.value[0]!.element).toBe(el);
    expect(mgr.stack.value[0]!.type).toBe('popover');
  });

  it('topOverlay returns the most recently opened', () => {
    const a = div();
    const b = div();
    mgr.open({ type: 'popover', element: a });
    mgr.open({ type: 'dialog', element: b });
    expect(mgr.topOverlay.value!.element).toBe(b);
  });

  it('close removes by id', () => {
    const el = div();
    const { id } = mgr.open({ type: 'popover', element: el });
    mgr.close(id);
    expect(mgr.stack.value.length).toBe(0);
    expect(mgr.topOverlay.value).toBeNull();
  });

  it('close with unknown id is a no-op', () => {
    mgr.open({ type: 'popover', element: div() });
    mgr.close('unknown-id');
    expect(mgr.stack.value.length).toBe(1);
  });

  it('closeAll empties stack', () => {
    mgr.open({ type: 'popover', element: div() });
    mgr.open({ type: 'dialog', element: div() });
    mgr.closeAll();
    expect(mgr.stack.value.length).toBe(0);
  });

  it('closeType removes only matching type', () => {
    mgr.open({ type: 'popover', element: div() });
    mgr.open({ type: 'dialog', element: div() });
    mgr.open({ type: 'popover', element: div() });
    mgr.closeType('popover');
    expect(mgr.stack.value.length).toBe(1);
    expect(mgr.stack.value[0]!.type).toBe('dialog');
  });

  it('isOpen returns correct state', () => {
    const { id } = mgr.open({ type: 'popover', element: div() });
    expect(mgr.isOpen(id)).toBe(true);
    mgr.close(id);
    expect(mgr.isOpen(id)).toBe(false);
  });

  it('getEntry returns entry or null', () => {
    const el = div();
    const { id } = mgr.open({ type: 'drawer', element: el });
    const entry = mgr.getEntry(id);
    expect(entry).not.toBeNull();
    expect(entry!.element).toBe(el);
    expect(mgr.getEntry('nonexistent')).toBeNull();
  });

  it('assigns incrementing z-index', () => {
    const { id: id1 } = mgr.open({ type: 'popover', element: div() });
    const { id: id2 } = mgr.open({ type: 'dialog', element: div() });
    const e1 = mgr.getEntry(id1)!;
    const e2 = mgr.getEntry(id2)!;
    expect(e2.zIndex).toBeGreaterThan(e1.zIndex);
  });

  it('records owner element', () => {
    const el = div();
    const trigger = div();
    const { id } = mgr.open({ type: 'popover', element: el, owner: trigger });
    expect(mgr.getEntry(id)!.owner).toBe(trigger);
  });

  it('destroy empties everything', () => {
    mgr.open({ type: 'popover', element: div() });
    mgr.open({ type: 'dialog', element: div() });
    mgr.destroy();
    expect(mgr.stack.value.length).toBe(0);
  });

  it('entries are frozen', () => {
    const { id } = mgr.open({ type: 'popover', element: div() });
    const entry = mgr.getEntry(id)!;
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('closed promise resolves when overlay is closed', async () => {
    const { id, closed } = mgr.open({ type: 'popover', element: div() });
    let resolved = false;
    closed.then(() => { resolved = true; });
    expect(resolved).toBe(false);
    mgr.close(id);
    await closed;
    expect(resolved).toBe(true);
  });

  it('closed promise resolves on closeAll', async () => {
    const { closed } = mgr.open({ type: 'popover', element: div() });
    mgr.closeAll();
    await closed;
  });

  it('closed promise resolves on destroy', async () => {
    const { closed } = mgr.open({ type: 'dialog', element: div() });
    mgr.destroy();
    await closed;
  });
});
