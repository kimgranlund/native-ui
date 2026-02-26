import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import { batch } from '../reactivity/batch.ts';
import { uid } from '../core/uid.ts';
import type { Signal, ReadonlySignal, Dispose } from '../reactivity/types.ts';
import type {
  Command,
  CommandSource,
  CommandMeta,
  CommandHandler,
  CommandMiddleware,
  CommandFilter,
} from './types.ts';

interface FilterEntry {
  readonly filter: CommandFilter;
  readonly handler: CommandHandler;
}

export class CommandBus {
  #handlers = new Map<string, Set<CommandHandler>>();
  #filters: FilterEntry[] = [];
  #middleware: CommandMiddleware[] = [];
  #lastCommand: Signal<Command | null> = signal(null);
  #dispatching: Signal<boolean> = signal(false);
  #errors: Signal<Error | null> = signal(null);
  #pendingAsync = 0;

  readonly lastCommand: ReadonlySignal<Command | null> = computed(() => this.#lastCommand.value);
  readonly dispatching: ReadonlySignal<boolean> = computed(() => this.#dispatching.value);
  readonly errors: ReadonlySignal<Error | null> = computed(() => this.#errors.value);

  on(typeOrFilter: string | CommandFilter, handler: CommandHandler): Dispose {
    if (typeof typeOrFilter === 'string') {
      const type = typeOrFilter;
      let set = this.#handlers.get(type);
      if (!set) {
        set = new Set();
        this.#handlers.set(type, set);
      }
      set.add(handler);
      return () => {
        set!.delete(handler);
        if (set!.size === 0) this.#handlers.delete(type);
      };
    }

    const entry: FilterEntry = { filter: typeOrFilter, handler };
    this.#filters.push(entry);
    return () => {
      const idx = this.#filters.indexOf(entry);
      if (idx !== -1) this.#filters.splice(idx, 1);
    };
  }

  use(middleware: CommandMiddleware): Dispose {
    this.#middleware.push(middleware);
    return () => {
      const idx = this.#middleware.indexOf(middleware);
      if (idx !== -1) this.#middleware.splice(idx, 1);
    };
  }

  dispatch(typeOrCommand: string | Command, payload?: unknown, meta?: Partial<CommandMeta>): Command {
    const command: Command = typeof typeOrCommand === 'string'
      ? Object.freeze({
          type: typeOrCommand,
          payload: payload ?? null,
          id: uid('cmd'),
          timestamp: Date.now(),
          source: 'human' as CommandSource,
          ...(meta ? { meta: Object.freeze(meta) as CommandMeta } : {}),
        })
      : typeOrCommand;

    // Run middleware chain
    const mw = this.#middleware;
    let idx = 0;

    const runNext = (): void | Promise<void> => {
      if (idx < mw.length) {
        const current = mw[idx++]!;
        return current(command, runNext);
      }
      // End of chain: route to handlers
      this.#route(command);
    };

    runNext();

    batch(() => {
      this.#lastCommand.value = command;
    });

    return command;
  }

  #route(command: Command): void {
    // Type-based handlers
    const set = this.#handlers.get(command.type);
    if (set) {
      for (const handler of set) {
        this.#invokeHandler(handler, command);
      }
    }

    // Filter-based handlers
    for (const entry of this.#filters) {
      if (entry.filter(command)) {
        this.#invokeHandler(entry.handler, command);
      }
    }
  }

  #invokeHandler(handler: CommandHandler, command: Command): void {
    try {
      const result = handler(command);
      if (result && typeof result.then === 'function') {
        this.#trackAsync(result);
      }
    } catch (err) {
      this.#errors.value = err instanceof Error ? err : new Error(String(err));
    }
  }

  #trackAsync(promise: Promise<void>): void {
    this.#pendingAsync++;
    if (this.#pendingAsync === 1) this.#dispatching.value = true;

    promise
      .catch((err: unknown) => {
        this.#errors.value = err instanceof Error ? err : new Error(String(err));
      })
      .finally(() => {
        this.#pendingAsync--;
        if (this.#pendingAsync === 0) this.#dispatching.value = false;
      });
  }
}

export function createCommandBus(): CommandBus {
  return new CommandBus();
}
