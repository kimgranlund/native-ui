export interface Signal<T> {
  readonly [Symbol.toStringTag]: 'Signal';
  value: T;
  peek(): T;
}

export interface ReadonlySignal<T> {
  readonly [Symbol.toStringTag]: 'Computed';
  readonly value: T;
  peek(): T;
}

export type Dispose = () => void;

export interface ReactiveDebugInfo {
  type: 'signal' | 'computed' | 'unknown';
  value: unknown;
  subscriberCount: number;
  dependencyCount: number;
}
