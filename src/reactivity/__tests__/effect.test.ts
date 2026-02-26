import { describe, it, expect } from 'vitest';
import { signal } from '../signal.ts';
import { computed } from '../computed.ts';
import { effect } from '../effect.ts';
import { batch } from '../batch.ts';

describe('effect', () => {
  it('runs immediately', () => {
    let ran = false;
    const dispose = effect(() => { ran = true; });
    expect(ran).toBe(true);
    dispose();
  });

  it('re-runs when dependency changes', () => {
    const s = signal(0);
    const values: number[] = [];
    const dispose = effect(() => { values.push(s.value); });
    expect(values).toEqual([0]);
    s.value = 1;
    expect(values).toEqual([0, 1]);
    s.value = 2;
    expect(values).toEqual([0, 1, 2]);
    dispose();
  });

  it('stops tracking after dispose', () => {
    const s = signal(0);
    const values: number[] = [];
    const dispose = effect(() => { values.push(s.value); });
    expect(values).toEqual([0]);
    dispose();
    s.value = 99;
    expect(values).toEqual([0]);
  });

  it('multiple dispose calls are safe', () => {
    const dispose = effect(() => {});
    dispose();
    dispose(); // should not throw
  });

  it('tracks computed dependencies', () => {
    const s = signal(2);
    const c = computed(() => s.value * 3);
    const results: number[] = [];
    const dispose = effect(() => { results.push(c.value); });
    expect(results).toEqual([6]);
    s.value = 4;
    expect(results).toEqual([6, 12]);
    dispose();
  });

  it('re-subscribes on re-run (dynamic deps)', () => {
    const toggle = signal(true);
    const a = signal('A');
    const b = signal('B');
    const values: string[] = [];

    const dispose = effect(() => {
      values.push(toggle.value ? a.value : b.value);
    });
    expect(values).toEqual(['A']);

    a.value = 'A2';
    expect(values).toEqual(['A', 'A2']);

    // Switch to b — a should no longer trigger
    toggle.value = false;
    expect(values).toEqual(['A', 'A2', 'B']);

    a.value = 'A3'; // should NOT trigger
    expect(values).toEqual(['A', 'A2', 'B']);

    b.value = 'B2'; // should trigger
    expect(values).toEqual(['A', 'A2', 'B', 'B2']);

    dispose();
  });

  it('self-write does not cause infinite loop (reentrancy guard)', () => {
    const s = signal(0);
    let runs = 0;
    const dispose = effect(() => {
      runs++;
      s.value; // read
      if (runs === 1) s.value = 99; // self-write on first run
    });
    // WHY: Self-write succeeds (signal holds 99) but effect doesn't re-run
    expect(runs).toBe(1);
    expect(s.value).toBe(99);
    dispose();
  });

  it('diamond dependency fires once with batch', () => {
    const source = signal(1);
    const left = computed(() => source.value * 2);
    const right = computed(() => source.value * 3);
    let runs = 0;
    const dispose = effect(() => {
      left.value;
      right.value;
      runs++;
    });
    expect(runs).toBe(1);

    batch(() => { source.value = 2; });
    expect(runs).toBe(2); // exactly one re-run
    dispose();
  });
});
