const icons = new Map<string, string>();
const subscribers = new Set<(name: string) => void>();

export function registerIcon(name: string, svg: string): void {
  icons.set(name, svg);
  subscribers.forEach((fn) => fn(name));
}

export function getIcon(name: string): string | undefined {
  return icons.get(name);
}

export function getIconNames(): string[] {
  return Array.from(icons.keys());
}

export function onIconRegistered(fn: (name: string) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
