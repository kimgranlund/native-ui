export interface PluginFactory<T = unknown> {
  (): T;
}

export class PluginRegistry {
  #entries = new Map<string, { factory: PluginFactory; instance: unknown }>();

  use<T>(name: string, factory: PluginFactory<T>): void {
    this.#entries.set(name, { factory, instance: null });
  }

  get<T>(name: string): T {
    const entry = this.#entries.get(name);
    if (!entry) throw new Error(`Plugin "${name}" not registered. Did you forget to install it?`);
    entry.instance ??= entry.factory();
    return entry.instance as T;
  }

  has(name: string): boolean {
    return this.#entries.has(name);
  }

  destroy(): void {
    for (const entry of this.#entries.values()) {
      if (entry.instance && typeof (entry.instance as { destroy?: () => void }).destroy === 'function') {
        (entry.instance as { destroy: () => void }).destroy();
      }
    }
    this.#entries.clear();
  }
}
