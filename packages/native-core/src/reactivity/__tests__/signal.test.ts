import { describe, it, expect } from 'vitest';
import { signal } from '../signal.ts';
import { effect } from '../effect.ts';
import { isSignal } from '../debug.ts';

describe('signal', () => {
  it('returns initial value', () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  it('updates value', () => {
    const s = signal(0);
    s.value = 10;
    expect(s.value).toBe(10);
  });

  it('peek returns value without tracking', () => {
    const s = signal('hello');
    expect(s.peek()).toBe('hello');
    s.value = 'world';
    expect(s.peek()).toBe('world');
  });

  it('uses Object.is for equality (NaN)', () => {
    const s = signal(NaN);
    const calls: number[] = [];
    const dispose = effect(() => { calls.push(s.value); });
    expect(calls).toEqual([NaN]);
    s.value = NaN; // Object.is(NaN, NaN) === true — should NOT notify
    expect(calls).toEqual([NaN]);
    dispose();
  });

  it('uses Object.is for equality (-0 vs +0)', () => {
    const s = signal(0);
    const calls: number[] = [];
    const dispose = effect(() => { calls.push(s.value); });
    expect(calls).toEqual([0]);
    s.value = -0; // Object.is(0, -0) === false — SHOULD notify
    expect(calls).toEqual([0, -0]);
    dispose();
  });

  it('has Symbol.toStringTag "Signal"', () => {
    const s = signal(1);
    expect(s[Symbol.toStringTag]).toBe('Signal');
  });

  it('isSignal returns true for signals', () => {
    expect(isSignal(signal(1))).toBe(true);
    expect(isSignal(42)).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal({ value: 1 })).toBe(false);
  });
});
