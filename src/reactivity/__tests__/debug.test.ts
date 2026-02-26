import { describe, it, expect } from 'vitest';
import { signal } from '../signal.ts';
import { computed } from '../computed.ts';
import { effect } from '../effect.ts';
import { debugReactive, isSignal, isComputed } from '../debug.ts';

describe('debugReactive', () => {
  it('returns signal info', () => {
    const s = signal(42);
    const info = debugReactive(s);
    expect(info.type).toBe('signal');
    expect(info.value).toBe(42);
    expect(info.dependencyCount).toBe(0);
  });

  it('returns computed info', () => {
    const s = signal(10);
    const c = computed(() => s.value * 2);
    // Access to ensure it computes
    c.value;
    const info = debugReactive(c);
    expect(info.type).toBe('computed');
    expect(info.value).toBe(20);
    expect(info.dependencyCount).toBeGreaterThan(0);
  });

  it('tracks subscriber count', () => {
    const s = signal(0);
    const info1 = debugReactive(s);
    expect(info1.subscriberCount).toBe(0);

    const dispose = effect(() => { s.value; });
    const info2 = debugReactive(s);
    expect(info2.subscriberCount).toBe(1);

    dispose();
  });

  it('returns unknown for non-reactive objects', () => {
    const info = debugReactive({});
    expect(info.type).toBe('unknown');
    expect(info.value).toBeUndefined();
    expect(info.subscriberCount).toBe(0);
  });
});

describe('isSignal', () => {
  it('returns true for signals', () => {
    expect(isSignal(signal(1))).toBe(true);
  });

  it('returns false for computed', () => {
    const s = signal(1);
    expect(isSignal(computed(() => s.value))).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isSignal(42)).toBe(false);
    expect(isSignal('hello')).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal(undefined)).toBe(false);
  });

  it('returns false for plain objects', () => {
    expect(isSignal({ value: 1 })).toBe(false);
    expect(isSignal({ [Symbol.toStringTag]: 'NotSignal' })).toBe(false);
  });
});

describe('isComputed', () => {
  it('returns true for computed', () => {
    const s = signal(1);
    expect(isComputed(computed(() => s.value))).toBe(true);
  });

  it('returns false for signals', () => {
    expect(isComputed(signal(1))).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isComputed(null)).toBe(false);
    expect(isComputed(42)).toBe(false);
  });
});
