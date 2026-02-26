import { describe, it, expect } from 'vitest';
import { signal } from '../signal.ts';
import { computed } from '../computed.ts';
import { effect } from '../effect.ts';
import { isComputed } from '../debug.ts';

describe('computed', () => {
  it('derives value from signal', () => {
    const s = signal(2);
    const c = computed(() => s.value * 3);
    expect(c.value).toBe(6);
  });

  it('is lazy — fn not called until .value read', () => {
    let calls = 0;
    const s = signal(1);
    const c = computed(() => { calls++; return s.value; });
    expect(calls).toBe(0);
    c.value;
    expect(calls).toBe(1);
  });

  it('caches value — no recompute if deps unchanged', () => {
    let calls = 0;
    const s = signal(1);
    const c = computed(() => { calls++; return s.value; });
    c.value;
    c.value;
    c.value;
    expect(calls).toBe(1);
  });

  it('recomputes when dependency changes', () => {
    const s = signal(5);
    const c = computed(() => s.value + 1);
    expect(c.value).toBe(6);
    s.value = 10;
    expect(c.value).toBe(11);
  });

  it('chains computed values', () => {
    const a = signal(1);
    const b = computed(() => a.value * 2);
    const c = computed(() => b.value + 10);
    expect(c.value).toBe(12);
    a.value = 5;
    expect(c.value).toBe(20);
  });

  it('peek returns value without tracking', () => {
    const s = signal(3);
    const c = computed(() => s.value * 2);
    expect(c.peek()).toBe(6);
  });

  it('peek recomputes if dirty', () => {
    const s = signal(1);
    const c = computed(() => s.value * 2);
    c.value; // initial compute
    s.value = 5; // mark dirty
    expect(c.peek()).toBe(10); // recomputes
  });

  it('throws on circular dependency', () => {
    const a: ReturnType<typeof computed> = computed(() => (b as { value: number }).value);
    const b = computed(() => a.value);
    expect(() => a.value).toThrow('Circular computed dependency detected.');
  });

  it('has Symbol.toStringTag "Computed"', () => {
    const c = computed(() => 1);
    expect(c[Symbol.toStringTag]).toBe('Computed');
  });

  it('isComputed returns true for computed', () => {
    expect(isComputed(computed(() => 1))).toBe(true);
    expect(isComputed(signal(1))).toBe(false);
    expect(isComputed(42)).toBe(false);
  });

  it('works with effect', () => {
    const s = signal(1);
    const c = computed(() => s.value * 10);
    const results: number[] = [];
    const dispose = effect(() => { results.push(c.value); });
    expect(results).toEqual([10]);
    s.value = 2;
    expect(results).toEqual([10, 20]);
    dispose();
  });
});
