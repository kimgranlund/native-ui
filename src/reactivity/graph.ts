// WHY: Module-level singletons for reactive tracking — shared across all signals, computeds, effects
let activeNode: ReactiveNode | EffectNode | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectNode>();

// WHY: WeakMap allows debug introspection without preventing GC
export const nodeMap = new WeakMap<object, SourceNode | ReactiveNode>();

// WHY: Set detects circular computed dependencies during recompute
export const computeStack = new Set<ReactiveNode>();

export function getActiveNode(): ReactiveNode | EffectNode | null {
  return activeNode;
}

export function setActiveNode(node: ReactiveNode | EffectNode | null): void {
  activeNode = node;
}

export function getBatchDepth(): number {
  return batchDepth;
}

export function incrementBatchDepth(): void {
  batchDepth++;
}

export function decrementBatchDepth(): void {
  batchDepth--;
}

export function addPendingEffect(node: EffectNode): void {
  pendingEffects.add(node);
}

export class SourceNode {
  _value: unknown;
  _subs = new Set<ReactiveNode | EffectNode>();

  constructor(value: unknown) {
    this._value = value;
  }
}

export class ReactiveNode {
  _subs = new Set<ReactiveNode | EffectNode>();
  _deps = new Set<SourceNode | ReactiveNode>();
  _fn: () => unknown;
  _value: unknown = undefined;
  _dirty = true;

  constructor(fn: () => unknown) {
    this._fn = fn;
  }

  _notify(): void {
    if (this._dirty) return;
    this._dirty = true;
    // WHY: Snapshot to prevent mutation during iteration
    for (const sub of [...this._subs]) {
      if (sub instanceof ReactiveNode) {
        sub._notify();
      } else {
        if (batchDepth > 0) {
          pendingEffects.add(sub);
        } else {
          runEffect(sub);
        }
      }
    }
  }
}

export class EffectNode {
  _deps = new Set<SourceNode | ReactiveNode>();
  _fn: () => void;
  _disposed = false;
  _running = false;

  constructor(fn: () => void) {
    this._fn = fn;
  }
}

export function track(source: SourceNode | ReactiveNode): void {
  if (activeNode === null) return;
  source._subs.add(activeNode);
  activeNode._deps.add(source);
}

export function cleanup(node: ReactiveNode | EffectNode): void {
  for (const dep of node._deps) {
    dep._subs.delete(node);
  }
  node._deps.clear();
}

export function notify(source: SourceNode): void {
  // WHY: Snapshot to prevent mutation during iteration from cleanup + resubscribe
  for (const sub of [...source._subs]) {
    if (sub instanceof ReactiveNode) {
      sub._notify();
    } else {
      if (batchDepth > 0) {
        pendingEffects.add(sub);
      } else {
        runEffect(sub);
      }
    }
  }
}

export function runEffect(node: EffectNode): void {
  if (node._disposed || node._running) return;
  cleanup(node);
  const prev = activeNode;
  activeNode = node;
  node._running = true;
  try {
    node._fn();
  } finally {
    activeNode = prev;
    node._running = false;
  }
}

export function flushEffects(): void {
  let iterations = 0;
  while (pendingEffects.size > 0) {
    if (++iterations > 100) {
      throw new Error('Reactive flush limit exceeded (100 iterations). Possible infinite loop.');
    }
    const snapshot = [...pendingEffects];
    pendingEffects.clear();
    for (const node of snapshot) {
      runEffect(node);
    }
  }
}
