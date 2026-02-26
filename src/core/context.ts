import type { Constructor } from './types.ts';

export class ContextRequestEvent extends Event {
  readonly context: string;
  readonly callback: (value: unknown) => void;

  constructor(context: string, callback: (value: unknown) => void) {
    super('context-request', { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
  }
}

export function ContextProvider<T extends Constructor>(Base: T) {
  return class extends Base {
    #contexts = new Map<string, unknown>();

    provideContext(key: string, value: unknown): void {
      this.#contexts.set(key, value);
    }

    connectedCallback(): void {
      super.connectedCallback?.();
      this.addEventListener('context-request', this.#onRequest as EventListener);
    }

    disconnectedCallback(): void {
      super.disconnectedCallback?.();
      this.removeEventListener('context-request', this.#onRequest as EventListener);
    }

    // WHY: Arrow property to preserve `this` binding
    #onRequest = (e: Event): void => {
      if (!(e instanceof ContextRequestEvent)) return;
      const value = this.#contexts.get(e.context);
      if (value !== undefined) {
        e.stopPropagation();
        e.callback(value);
      }
    };
  };
}

export function ContextConsumer<T extends Constructor>(Base: T) {
  return class extends Base {
    #resolved = new Map<string, unknown>();

    requestContext<V>(key: string, callback?: (value: V) => void): void {
      this.dispatchEvent(new ContextRequestEvent(key, (value: unknown) => {
        this.#resolved.set(key, value);
        callback?.(value as V);
      }));
    }

    getContext<V>(key: string): V | null {
      return (this.#resolved.get(key) as V) ?? null;
    }
  };
}
