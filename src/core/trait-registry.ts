export interface TraitAdapter<T = unknown> {
  readonly name: string;
  create(host: HTMLElement, options: Record<string, string>): T;
  destroy(instance: T): void;
  update?(instance: T, options: Record<string, string>): void;
  conflicts?: readonly string[];
}

const registry = new Map<string, TraitAdapter>();
const listeners = new Set<(name: string) => void>();

export function registerTrait(adapter: TraitAdapter): void {
  if (registry.has(adapter.name)) {
    console.warn(`[native-ui] Trait "${adapter.name}" is already registered.`);
    return;
  }
  registry.set(adapter.name, adapter);
  // WHY: Notify waiting ui-controller elements that a trait they requested is now available
  for (const fn of listeners) fn(adapter.name);
}

/** Subscribe to trait registration events. Returns unsubscribe function. */
export function onTraitRegistered(fn: (name: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTrait(name: string): TraitAdapter | undefined {
  return registry.get(name);
}

export function getRegisteredTraitNames(): ReadonlySet<string> {
  return new Set(registry.keys());
}
