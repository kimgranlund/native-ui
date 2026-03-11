import {
  incrementBatchDepth, decrementBatchDepth,
  getBatchDepth, flushEffects,
} from './graph.ts';

export function batch(fn: () => void): void {
  incrementBatchDepth();
  try {
    fn();
  } finally {
    decrementBatchDepth();
    if (getBatchDepth() === 0) flushEffects();
  }
}
