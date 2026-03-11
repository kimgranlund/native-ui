// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FocusRouter, createFocusRouter } from '../focus-router.ts';

describe('FocusRouter', () => {
  let router: FocusRouter;

  beforeEach(() => {
    router = createFocusRouter();
  });

  it('creates via factory', () => {
    expect(router).toBeInstanceOf(FocusRouter);
  });

  it('starts with global scope', () => {
    expect(router.activeScope.value).toBe('global');
  });

  it('register returns dispose', () => {
    const dispose = router.register({
      key: 'k',
      mod: { meta: true },
      handler: () => {},
    });
    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('getShortcuts returns all registered', () => {
    router.register({ key: 'k', mod: { meta: true }, handler: () => {} });
    router.register({ key: '/', handler: () => {} });
    expect(router.getShortcuts().length).toBe(2);
  });

  it('getShortcuts filters by scope', () => {
    router.register({ key: 'k', handler: () => {}, scope: 'modal' });
    router.register({ key: '/', handler: () => {} }); // default 'global'
    expect(router.getShortcuts('global').length).toBe(1);
    expect(router.getShortcuts('modal').length).toBe(1);
  });

  it('dispose removes shortcut', () => {
    const dispose = router.register({ key: 'k', handler: () => {} });
    expect(router.getShortcuts().length).toBe(1);
    dispose();
    expect(router.getShortcuts().length).toBe(0);
  });

  it('pushScope / popScope manages scope stack', () => {
    router.pushScope('dialog-1');
    expect(router.activeScope.value).toBe('dialog-1');
    router.pushScope('dialog-2');
    expect(router.activeScope.value).toBe('dialog-2');
    router.popScope();
    expect(router.activeScope.value).toBe('dialog-1');
    router.popScope();
    expect(router.activeScope.value).toBe('global');
  });

  it('popScope never pops the global base', () => {
    router.popScope();
    router.popScope();
    expect(router.activeScope.value).toBe('global');
  });

  it('handles keydown for matching shortcut', () => {
    const handler = vi.fn();
    router.register({ key: '/', handler });

    const e = new KeyboardEvent('keydown', { key: '/', bubbles: true });
    document.dispatchEvent(e);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire handler for non-matching key', () => {
    const handler = vi.fn();
    router.register({ key: '/', handler });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('matches modifier keys', () => {
    const handler = vi.fn();
    router.register({ key: 'k', mod: { meta: true }, handler });

    // Without meta — no match
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    // With meta — match
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('scoped shortcuts only fire in correct scope', () => {
    const modalHandler = vi.fn();
    const globalHandler = vi.fn();

    router.register({ key: 'Escape', handler: modalHandler, scope: 'modal' });
    router.register({ key: 'k', handler: globalHandler });

    // In global scope, modal shortcut should not fire
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modalHandler).not.toHaveBeenCalled();

    // Push modal scope — now modal shortcuts fire, global still fires
    router.pushScope('modal');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modalHandler).toHaveBeenCalledOnce();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    expect(globalHandler).toHaveBeenCalledOnce();
  });

  it('destroy cleans up', () => {
    const handler = vi.fn();
    router.register({ key: 'k', handler });
    router.pushScope('test');
    router.destroy();

    expect(router.getShortcuts().length).toBe(0);
    expect(router.activeScope.value).toBe('global');

    // Handler should not fire after destroy
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
