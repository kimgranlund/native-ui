import type { ReactiveDebugInfo } from './types.ts';
import { nodeMap, SourceNode } from './graph.ts';

export function debugReactive(sig: object): ReactiveDebugInfo {
  const node = nodeMap.get(sig);
  if (!node) {
    return { type: 'unknown', value: undefined, subscriberCount: 0, dependencyCount: 0 };
  }
  if (node instanceof SourceNode) {
    return {
      type: 'signal',
      value: node._value,
      subscriberCount: node._subs.size,
      dependencyCount: 0,
    };
  }
  return {
    type: 'computed',
    value: node._value,
    subscriberCount: node._subs.size,
    dependencyCount: node._deps.size,
  };
}

export function isSignal(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    Symbol.toStringTag in value &&
    (value as { [Symbol.toStringTag]: unknown })[Symbol.toStringTag] === 'Signal'
  );
}

export function isComputed(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    Symbol.toStringTag in value &&
    (value as { [Symbol.toStringTag]: unknown })[Symbol.toStringTag] === 'Computed'
  );
}
