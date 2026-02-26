import { describe, it, expect } from 'vitest';
import {
  SourceNode,
  ReactiveNode,
  EffectNode,
  getActiveNode,
  setActiveNode,
  getBatchDepth,
  incrementBatchDepth,
  decrementBatchDepth,
  addPendingEffect,
  track,
  cleanup,
  notify,
  runEffect,
  flushEffects,
  nodeMap,
  computeStack,
} from '../graph.ts';

describe('graph — node classes', () => {
  it('SourceNode stores value and has empty subs', () => {
    const node = new SourceNode(42);
    expect(node._value).toBe(42);
    expect(node._subs.size).toBe(0);
  });

  it('ReactiveNode starts dirty with no deps', () => {
    const node = new ReactiveNode(() => 1);
    expect(node._dirty).toBe(true);
    expect(node._deps.size).toBe(0);
    expect(node._subs.size).toBe(0);
  });

  it('EffectNode starts not disposed and not running', () => {
    const node = new EffectNode(() => {});
    expect(node._disposed).toBe(false);
    expect(node._running).toBe(false);
    expect(node._deps.size).toBe(0);
  });
});

describe('graph — activeNode', () => {
  it('starts as null', () => {
    expect(getActiveNode()).toBeNull();
  });

  it('set and get active node', () => {
    const node = new EffectNode(() => {});
    setActiveNode(node);
    expect(getActiveNode()).toBe(node);
    setActiveNode(null);
    expect(getActiveNode()).toBeNull();
  });
});

describe('graph — batch depth', () => {
  it('starts at 0', () => {
    expect(getBatchDepth()).toBe(0);
  });

  it('increment and decrement', () => {
    incrementBatchDepth();
    expect(getBatchDepth()).toBe(1);
    incrementBatchDepth();
    expect(getBatchDepth()).toBe(2);
    decrementBatchDepth();
    expect(getBatchDepth()).toBe(1);
    decrementBatchDepth();
    expect(getBatchDepth()).toBe(0);
  });
});

describe('graph — track', () => {
  it('adds bidirectional link between source and active node', () => {
    const source = new SourceNode(1);
    const eff = new EffectNode(() => {});
    setActiveNode(eff);
    track(source);
    setActiveNode(null);

    expect(source._subs.has(eff)).toBe(true);
    expect(eff._deps.has(source)).toBe(true);
  });

  it('is no-op when no active node', () => {
    const source = new SourceNode(1);
    setActiveNode(null);
    track(source);
    expect(source._subs.size).toBe(0);
  });
});

describe('graph — cleanup', () => {
  it('removes node from all dependency subscriber lists', () => {
    const s1 = new SourceNode(1);
    const s2 = new SourceNode(2);
    const eff = new EffectNode(() => {});

    // Simulate tracking
    setActiveNode(eff);
    track(s1);
    track(s2);
    setActiveNode(null);

    expect(s1._subs.has(eff)).toBe(true);
    expect(s2._subs.has(eff)).toBe(true);

    cleanup(eff);
    expect(s1._subs.has(eff)).toBe(false);
    expect(s2._subs.has(eff)).toBe(false);
    expect(eff._deps.size).toBe(0);
  });
});

describe('graph — notify', () => {
  it('runs effects immediately when not batched', () => {
    let ran = false;
    const eff = new EffectNode(() => { ran = true; });
    const source = new SourceNode(1);

    // Manually wire subscription
    source._subs.add(eff);
    eff._deps.add(source);

    notify(source);
    expect(ran).toBe(true);
  });

  it('queues effects when batched', () => {
    let ran = false;
    const eff = new EffectNode(() => { ran = true; });
    const source = new SourceNode(1);
    source._subs.add(eff);

    incrementBatchDepth();
    notify(source);
    expect(ran).toBe(false); // Not yet

    decrementBatchDepth();
    flushEffects();
    expect(ran).toBe(true);
  });

  it('marks ReactiveNode as dirty', () => {
    const computed = new ReactiveNode(() => 1);
    computed._dirty = false;
    const source = new SourceNode(1);
    source._subs.add(computed);

    notify(source);
    expect(computed._dirty).toBe(true);
  });
});

describe('graph — runEffect', () => {
  it('runs effect function and sets running flag', () => {
    let wasRunning = false;
    const eff = new EffectNode(() => {
      wasRunning = eff._running;
    });
    runEffect(eff);
    expect(wasRunning).toBe(true);
    expect(eff._running).toBe(false);
  });

  it('skips disposed effects', () => {
    let ran = false;
    const eff = new EffectNode(() => { ran = true; });
    eff._disposed = true;
    runEffect(eff);
    expect(ran).toBe(false);
  });

  it('skips already-running effects (prevents recursion)', () => {
    let count = 0;
    const eff = new EffectNode(() => {
      count++;
      if (count === 1) runEffect(eff); // re-entrant call
    });
    runEffect(eff);
    expect(count).toBe(1); // Only ran once
  });

  it('cleans up old deps before running', () => {
    const source = new SourceNode(1);
    const eff = new EffectNode(() => {});

    // Simulate existing tracking
    source._subs.add(eff);
    eff._deps.add(source);

    runEffect(eff);
    // After run, old deps should be cleaned
    expect(source._subs.has(eff)).toBe(false);
    expect(eff._deps.size).toBe(0);
  });

  it('restores active node after run', () => {
    const prev = new EffectNode(() => {});
    setActiveNode(prev);

    const eff = new EffectNode(() => {
      expect(getActiveNode()).toBe(eff);
    });
    runEffect(eff);

    expect(getActiveNode()).toBe(prev);
    setActiveNode(null);
  });
});

describe('graph — flushEffects', () => {
  it('runs all pending effects', () => {
    const results: number[] = [];
    const e1 = new EffectNode(() => { results.push(1); });
    const e2 = new EffectNode(() => { results.push(2); });

    addPendingEffect(e1);
    addPendingEffect(e2);
    flushEffects();

    expect(results).toEqual([1, 2]);
  });

  it('throws on infinite loop (>100 iterations)', () => {
    const eff = new EffectNode(() => {
      addPendingEffect(eff);
    });
    addPendingEffect(eff);
    expect(() => flushEffects()).toThrow('flush limit exceeded');
  });
});

describe('graph — exports', () => {
  it('nodeMap is a WeakMap', () => {
    expect(nodeMap).toBeInstanceOf(WeakMap);
  });

  it('computeStack is a Set', () => {
    expect(computeStack).toBeInstanceOf(Set);
  });
});
