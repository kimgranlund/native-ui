import { describe, it, expect } from 'vitest';
import { signal } from '../signal.ts';
import { effect } from '../effect.ts';
import { untrack } from '../untrack.ts';

describe('untrack', () => {
  it('returns the value of the function', () => {
    const result = untrack(() => 42);
    expect(result).toBe(42);
  });

  it('does not track signal reads inside untrack', () => {
    const s = signal(0);
    let runs = 0;

    const dispose = effect(() => {
      runs++;
      untrack(() => s.value);
    });

    expect(runs).toBe(1);
    s.value = 1;
    // Effect should NOT re-run because signal was read inside untrack
    expect(runs).toBe(1);
    dispose();
  });

  it('does not affect tracking outside untrack', () => {
    const tracked = signal(0);
    const untracked = signal(0);
    let runs = 0;

    const dispose = effect(() => {
      runs++;
      tracked.value;
      untrack(() => untracked.value);
    });

    expect(runs).toBe(1);

    // Tracked signal change should trigger re-run
    tracked.value = 1;
    expect(runs).toBe(2);

    // Untracked signal change should NOT trigger re-run
    untracked.value = 1;
    expect(runs).toBe(2);
    dispose();
  });

  it('restores tracking context after nested untrack', () => {
    const outer = signal('a');
    const inner = signal('b');
    let runs = 0;

    const dispose = effect(() => {
      runs++;
      outer.value;
      untrack(() => inner.value);
      // After untrack, outer context should be restored
      // so further reads in this scope are still tracked
    });

    expect(runs).toBe(1);
    outer.value = 'changed';
    expect(runs).toBe(2);
    dispose();
  });

  it('handles thrown exceptions without breaking tracking', () => {
    const s = signal(0);
    expect(() => {
      untrack(() => { throw new Error('test'); });
    }).toThrow('test');

    // Tracking should still work after the exception
    let runs = 0;
    const dispose = effect(() => { runs++; s.value; });
    expect(runs).toBe(1);
    s.value = 1;
    expect(runs).toBe(2);
    dispose();
  });
});
