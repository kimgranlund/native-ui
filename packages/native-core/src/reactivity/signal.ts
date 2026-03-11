import type { Signal } from './types.ts';
import { SourceNode, track, notify, nodeMap } from './graph.ts';

class SignalImpl<T> implements Signal<T> {
  readonly [Symbol.toStringTag] = 'Signal' as const;
  #node: SourceNode;

  constructor(node: SourceNode) {
    this.#node = node;
  }

  get value(): T {
    track(this.#node);
    return this.#node._value as T;
  }

  set value(next: T) {
    if (Object.is(this.#node._value, next)) return;
    this.#node._value = next;
    notify(this.#node);
  }

  peek(): T {
    return this.#node._value as T;
  }
}

export function signal<T>(initial: T): Signal<T> {
  const node = new SourceNode(initial);
  const sig = new SignalImpl<T>(node);
  nodeMap.set(sig, node);
  return sig;
}
