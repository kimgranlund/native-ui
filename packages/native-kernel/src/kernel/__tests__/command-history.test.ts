// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { CommandHistory, createCommandHistory } from '../command-history.ts';
import { createCommandBus } from '../command-bus.ts';
import type { Command } from '../types.ts';

function makeCommand(type: string, undoType?: string, undoPayload?: unknown): Command {
  return Object.freeze({
    type,
    payload: null,
    id: `cmd-test-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    source: 'human' as const,
    ...(undoType ? { meta: Object.freeze({ undoType, undoPayload }) } : {}),
  });
}

describe('CommandHistory', () => {
  it('creates via factory', () => {
    const h = createCommandHistory();
    expect(h).toBeInstanceOf(CommandHistory);
  });

  it('starts empty', () => {
    const h = createCommandHistory();
    expect(h.canUndo.value).toBe(false);
    expect(h.canRedo.value).toBe(false);
    expect(h.undoStack.value).toEqual([]);
    expect(h.redoStack.value).toEqual([]);
  });

  it('push adds undoable command', () => {
    const h = createCommandHistory();
    h.push(makeCommand('set.color', 'set.color', 'old-red'));
    expect(h.canUndo.value).toBe(true);
    expect(h.undoStack.value.length).toBe(1);
  });

  it('push ignores commands without undo meta', () => {
    const h = createCommandHistory();
    h.push(makeCommand('no.undo'));
    expect(h.canUndo.value).toBe(false);
  });

  it('push clears redo stack', () => {
    const bus = createCommandBus();
    const h = createCommandHistory();

    // Set up handler so undo dispatch doesn't fail
    bus.on('set.color', () => {});

    h.push(makeCommand('set.color', 'set.color', 'old'));
    h.undo(bus);
    expect(h.canRedo.value).toBe(true);

    h.push(makeCommand('set.size', 'set.size', 'old'));
    expect(h.canRedo.value).toBe(false);
  });

  it('undo dispatches undo command through bus', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('color.restore', handler);

    const h = createCommandHistory();
    h.push(makeCommand('color.set', 'color.restore', 'blue'));
    h.undo(bus);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].payload).toBe('blue');
  });

  it('undo returns the undone command', () => {
    const bus = createCommandBus();
    bus.on('undo.test', () => {});
    const h = createCommandHistory();
    const cmd = makeCommand('test', 'undo.test');
    h.push(cmd);
    const undone = h.undo(bus);
    expect(undone).toBe(cmd);
  });

  it('undo on empty returns null', () => {
    const bus = createCommandBus();
    const h = createCommandHistory();
    expect(h.undo(bus)).toBeNull();
  });

  it('redo re-dispatches original command as replay', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('color.set', handler);
    bus.on('color.undo', () => {});

    const h = createCommandHistory();
    h.push(makeCommand('color.set', 'color.undo'));
    h.undo(bus);
    handler.mockClear();

    h.redo(bus);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].source).toBe('replay');
  });

  it('redo on empty returns null', () => {
    const bus = createCommandBus();
    const h = createCommandHistory();
    expect(h.redo(bus)).toBeNull();
  });

  it('undo + redo cycle preserves stacks', () => {
    const bus = createCommandBus();
    bus.on('a', () => {});
    bus.on('a.undo', () => {});

    const h = createCommandHistory();
    h.push(makeCommand('a', 'a.undo'));
    h.push(makeCommand('a', 'a.undo'));

    expect(h.undoStack.value.length).toBe(2);
    h.undo(bus);
    expect(h.undoStack.value.length).toBe(1);
    expect(h.redoStack.value.length).toBe(1);
    h.redo(bus);
    expect(h.undoStack.value.length).toBe(2);
    expect(h.redoStack.value.length).toBe(0);
  });

  it('respects max size', () => {
    const h = createCommandHistory(3);
    for (let i = 0; i < 5; i++) {
      h.push(makeCommand(`cmd-${i}`, `undo-${i}`));
    }
    expect(h.undoStack.value.length).toBe(3);
    expect(h.undoStack.value[0]!.type).toBe('cmd-2');
  });

  it('setMaxSize trims existing stack', () => {
    const h = createCommandHistory();
    for (let i = 0; i < 10; i++) {
      h.push(makeCommand(`cmd-${i}`, `undo-${i}`));
    }
    h.setMaxSize(3);
    expect(h.undoStack.value.length).toBe(3);
    expect(h.undoStack.value[0]!.type).toBe('cmd-7');
  });

  it('clear resets both stacks', () => {
    const bus = createCommandBus();
    bus.on('undo', () => {});
    const h = createCommandHistory();
    h.push(makeCommand('a', 'undo'));
    h.undo(bus);
    h.clear();
    expect(h.canUndo.value).toBe(false);
    expect(h.canRedo.value).toBe(false);
  });

  it('getLog returns undo stack', () => {
    const h = createCommandHistory();
    h.push(makeCommand('a', 'undo.a'));
    h.push(makeCommand('b', 'undo.b'));
    const log = h.getLog();
    expect(log.length).toBe(2);
    expect(log[0]!.type).toBe('a');
    expect(log[1]!.type).toBe('b');
  });
});
