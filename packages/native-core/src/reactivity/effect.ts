import type { Dispose } from './types.ts';
import { EffectNode, cleanup, runEffect } from './graph.ts';

export function effect(fn: () => void): Dispose {
  const node = new EffectNode(fn);
  runEffect(node);
  return () => {
    if (node._disposed) return;
    node._disposed = true;
    cleanup(node);
  };
}
