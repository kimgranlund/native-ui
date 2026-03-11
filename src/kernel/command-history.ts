import { signal } from '@nonoun/native-core';
import { computed } from '@nonoun/native-core';
import { batch } from '@nonoun/native-core';
import type { Signal, ReadonlySignal } from '@nonoun/native-core';
import type { Command } from './types.ts';
import type { CommandBus } from './command-bus.ts';

export class CommandHistory {
  #undoStack: Signal<Command[]> = signal([]);
  #redoStack: Signal<Command[]> = signal([]);
  #maxSize = 100;

  readonly undoStack: ReadonlySignal<Command[]> = computed(() => this.#undoStack.value);
  readonly redoStack: ReadonlySignal<Command[]> = computed(() => this.#redoStack.value);
  readonly canUndo: ReadonlySignal<boolean> = computed(() => this.#undoStack.value.length > 0);
  readonly canRedo: ReadonlySignal<boolean> = computed(() => this.#redoStack.value.length > 0);

  push(command: Command): void {
    // Only track commands with undo metadata
    if (!command.meta?.undoType) return;

    batch(() => {
      const stack = [...this.#undoStack.value, command];
      if (stack.length > this.#maxSize) stack.shift();
      this.#undoStack.value = stack;
      this.#redoStack.value = [];
    });
  }

  undo(bus: CommandBus): Command | null {
    const stack = this.#undoStack.value;
    if (stack.length === 0) return null;

    const command = stack[stack.length - 1]!;
    batch(() => {
      this.#undoStack.value = stack.slice(0, -1);
      this.#redoStack.value = [...this.#redoStack.value, command];
    });

    bus.dispatch(command.meta!.undoType!, command.meta!.undoPayload ?? null, {
      planId: command.meta?.planId,
    });

    return command;
  }

  redo(bus: CommandBus): Command | null {
    const redoStack = this.#redoStack.value;
    if (redoStack.length === 0) return null;

    const command = redoStack[redoStack.length - 1]!;
    batch(() => {
      this.#redoStack.value = redoStack.slice(0, -1);
      const stack = [...this.#undoStack.value, command];
      if (stack.length > this.#maxSize) stack.shift();
      this.#undoStack.value = stack;
    });

    // Re-dispatch the original command (as replay)
    const replay: Command = Object.freeze({
      ...command,
      source: 'replay' as const,
    });
    bus.dispatch(replay);

    return command;
  }

  getLog(): readonly Command[] {
    return this.#undoStack.value;
  }

  setMaxSize(n: number): void {
    this.#maxSize = n;
    const stack = this.#undoStack.value;
    if (stack.length > n) {
      this.#undoStack.value = stack.slice(stack.length - n);
    }
  }

  clear(): void {
    batch(() => {
      this.#undoStack.value = [];
      this.#redoStack.value = [];
    });
  }
}

export function createCommandHistory(maxSize?: number): CommandHistory {
  const history = new CommandHistory();
  if (maxSize !== undefined) history.setMaxSize(maxSize);
  return history;
}
