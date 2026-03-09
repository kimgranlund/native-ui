// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ShortcutController, parseCombo } from './shortcut-controller.ts';
import type { ShortcutBinding } from './shortcut-controller.ts';

// ── Helpers ──

function keydown(target: EventTarget, key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: mods.ctrlKey ?? false,
    metaKey: mods.metaKey ?? false,
    shiftKey: mods.shiftKey ?? false,
    altKey: mods.altKey ?? false,
  });
  target.dispatchEvent(e);
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── parseCombo unit tests ──

describe('parseCombo', () => {
  it('parses a simple key with no modifiers', () => {
    const result = parseCombo('escape');
    expect(result.key).toBe('escape');
    expect(result.ctrl).toBe(false);
    expect(result.meta).toBe(false);
    expect(result.shift).toBe(false);
    expect(result.alt).toBe(false);
  });

  it('parses explicit ctrl modifier', () => {
    const result = parseCombo('ctrl+k');
    expect(result.key).toBe('k');
    expect(result.ctrl).toBe(true);
    expect(result.meta).toBe(false);
  });

  it('parses explicit meta modifier', () => {
    const result = parseCombo('meta+k');
    expect(result.key).toBe('k');
    expect(result.ctrl).toBe(false);
    expect(result.meta).toBe(true);
  });

  it('parses shift+key', () => {
    const result = parseCombo('shift+?');
    expect(result.key).toBe('?');
    expect(result.shift).toBe(true);
  });

  it('parses multiple modifiers', () => {
    const result = parseCombo('ctrl+shift+s');
    expect(result.key).toBe('s');
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(true);
    expect(result.meta).toBe(false);
    expect(result.alt).toBe(false);
  });

  // NOTE: 'mod' resolves to ctrl on non-Mac (happy-dom is non-Mac)
  it('parses mod as ctrl on non-Mac', () => {
    const result = parseCombo('mod+k');
    expect(result.key).toBe('k');
    expect(result.ctrl).toBe(true);
    expect(result.meta).toBe(false);
  });
});

// ── ShortcutController tests ──

describe('ShortcutController', () => {
  it('fires native:shortcut event on matching keydown', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    const events: CustomEvent[] = [];
    host.addEventListener('native:shortcut', (e) => events.push(e as CustomEvent));

    keydown(host, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ id: 'test', combo: 'ctrl+k' });

    ctrl.destroy();
  });

  it('does not fire on non-matching key', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    keydown(host, 'j', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('requires exact modifier match — extra modifiers reject', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    // ctrl+shift+k should NOT match ctrl+k
    keydown(host, 'k', { ctrlKey: true, shiftKey: true });

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('requires exact modifier match — missing modifiers reject', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    // plain 'k' should NOT match ctrl+k
    keydown(host, 'k');

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('skips editable targets by default', () => {
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.appendChild(input);
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    keydown(input, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('fires on editable targets when allowEditable is true', () => {
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.appendChild(input);
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler, allowEditable: true }],
    });

    keydown(input, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);

    ctrl.destroy();
  });

  it('skips editable textarea targets', () => {
    const host = document.createElement('div');
    const textarea = document.createElement('textarea');
    host.appendChild(textarea);
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    keydown(textarea, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('respects when() guard', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let enabled = false;
    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler, when: () => enabled }],
    });

    keydown(host, 'k', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();

    enabled = true;
    keydown(host, 'k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);

    ctrl.destroy();
  });

  it('calls preventDefault by default', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k' }],
    });

    const e = keydown(host, 'k', { ctrlKey: true });

    expect(e.defaultPrevented).toBe(true);

    ctrl.destroy();
  });

  it('does not preventDefault when preventDefault: false', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', preventDefault: false }],
    });

    const e = keydown(host, 'k', { ctrlKey: true });

    expect(e.defaultPrevented).toBe(false);

    ctrl.destroy();
  });

  it('add() registers new shortcut at runtime', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const ctrl = new ShortcutController(host);
    const handler = vi.fn();

    ctrl.add({ id: 'dynamic', combo: 'escape', handler });
    keydown(host, 'escape');

    expect(handler).toHaveBeenCalledTimes(1);

    ctrl.destroy();
  });

  it('remove() unregisters shortcut by id', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    ctrl.remove('test');
    keydown(host, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('first match wins when multiple shortcuts match', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [
        { id: 'first', combo: 'ctrl+k', handler: handler1 },
        { id: 'second', combo: 'ctrl+k', handler: handler2 },
      ],
    });

    keydown(host, 'k', { ctrlKey: true });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    ctrl.destroy();
  });

  it('destroy() stops all event handling', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'test', combo: 'ctrl+k', handler }],
    });

    ctrl.destroy();
    keydown(host, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('global mode listens on document', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'global', combo: 'ctrl+k', handler }],
      global: true,
    });

    // Dispatch on a different element — global should still catch it
    const other = document.createElement('div');
    document.body.appendChild(other);
    keydown(other, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);

    ctrl.destroy();
  });

  it('non-global mode only listens on host', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'local', combo: 'ctrl+k', handler }],
    });

    // Dispatch on a different element — local should NOT catch it
    const other = document.createElement('div');
    document.body.appendChild(other);
    keydown(other, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();

    // But dispatching on host works
    keydown(host, 'k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);

    ctrl.destroy();
  });

  it('event fires with correct id and combo in detail', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'my-shortcut', combo: 'shift+?' }],
    });

    const events: CustomEvent[] = [];
    host.addEventListener('native:shortcut', (e) => events.push(e as CustomEvent));

    keydown(host, '?', { shiftKey: true });

    expect(events).toHaveLength(1);
    expect(events[0].detail.id).toBe('my-shortcut');
    expect(events[0].detail.combo).toBe('shift+?');

    ctrl.destroy();
  });

  it('matches escape with no modifiers', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const handler = vi.fn();
    const ctrl = new ShortcutController(host, {
      shortcuts: [{ id: 'dismiss', combo: 'escape', handler }],
    });

    keydown(host, 'Escape');

    // 'escape' (lowercase) vs 'Escape' (DOM key) — parseCombo lowercases
    // matchesCombo lowercases e.key, so 'Escape' → 'escape' matches
    expect(handler).toHaveBeenCalledTimes(1);

    ctrl.destroy();
  });
});
