export interface TraitAdapter<T = unknown> {
  readonly name: string;
  create(host: HTMLElement, options: Record<string, string>): T;
  destroy(instance: T): void;
  update?(instance: T, options: Record<string, string>): void;
  conflicts?: readonly string[];
}

const registry = new Map<string, TraitAdapter>();

export function registerTrait(adapter: TraitAdapter): void {
  if (registry.has(adapter.name)) {
    console.warn(`[native-ui] Trait "${adapter.name}" is already registered.`);
    return;
  }
  registry.set(adapter.name, adapter);
}

export function getTrait(name: string): TraitAdapter | undefined {
  return registry.get(name);
}

export function getRegisteredTraitNames(): ReadonlySet<string> {
  return new Set(registry.keys());
}
