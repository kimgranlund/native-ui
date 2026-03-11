import { getActiveNode, setActiveNode } from './graph.ts';

export function untrack<T>(fn: () => T): T {
  const prev = getActiveNode();
  setActiveNode(null);
  try {
    return fn();
  } finally {
    setActiveNode(prev);
  }
}
