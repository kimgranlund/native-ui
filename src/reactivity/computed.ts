import type { ReadonlySignal } from './types.ts';
import {
  ReactiveNode, track, cleanup,
  getActiveNode, setActiveNode,
  computeStack, nodeMap,
} from './graph.ts';

class ComputedImpl<T> implements ReadonlySignal<T> {
  readonly [Symbol.toStringTag] = 'Computed' as const;
  #node: ReactiveNode;

  constructor(node: ReactiveNode) {
    this.#node = node;
  }

  get value(): T {
    track(this.#node);
    if (this.#node._dirty) this.#recompute();
    return this.#node._value as T;
  }

  peek(): T {
    if (this.#node._dirty) this.#recompute();
    return this.#node._value as T;
  }

  #recompute(): void {
    const node = this.#node;
    if (computeStack.has(node)) {
      throw new Error('Circular computed dependency detected.');
    }
    cleanup(node);
    computeStack.add(node);
    const prev = getActiveNode();
    setActiveNode(node);
    try {
      node._value = node._fn();
    } finally {
      setActiveNode(prev);
      computeStack.delete(node);
      node._dirty = false;
    }
  }
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  const node = new ReactiveNode(fn);
  const comp = new ComputedImpl<T>(node);
  nodeMap.set(comp, node);
  return comp;
}
