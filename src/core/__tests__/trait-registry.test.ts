// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTrait, getTrait, getRegisteredTraitNames } from '../trait-registry.ts';
import type { TraitAdapter } from '../trait-registry.ts';

function makeAdapter(name: string): TraitAdapter {
  return {
    name,
    create: () => ({}),
    destroy: () => {},
  };
}

describe('trait-registry', () => {
  // Note: registry is a module-level singleton, so tests share state.
  // We use unique names per test to avoid conflicts.

  it('registers and retrieves a trait', () => {
    const adapter = makeAdapter('test-register-get');
    registerTrait(adapter);
    expect(getTrait('test-register-get')).toBe(adapter);
  });

  it('returns undefined for unregistered trait', () => {
    expect(getTrait('nonexistent-trait-xyz')).toBeUndefined();
  });

  it('warns on duplicate registration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = makeAdapter('test-duplicate');
    registerTrait(adapter);
    registerTrait(adapter);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('test-duplicate'));
    warn.mockRestore();
  });

  it('does not overwrite on duplicate registration', () => {
    const first = makeAdapter('test-no-overwrite');
    const second = makeAdapter('test-no-overwrite');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerTrait(first);
    registerTrait(second);
    expect(getTrait('test-no-overwrite')).toBe(first);
    vi.restoreAllMocks();
  });

  it('getRegisteredTraitNames returns all registered names', () => {
    registerTrait(makeAdapter('test-names-a'));
    registerTrait(makeAdapter('test-names-b'));
    const names = getRegisteredTraitNames();
    expect(names.has('test-names-a')).toBe(true);
    expect(names.has('test-names-b')).toBe(true);
  });

  it('getRegisteredTraitNames returns a ReadonlySet', () => {
    const names = getRegisteredTraitNames();
    expect(names).toBeInstanceOf(Set);
    expect(typeof names.has).toBe('function');
  });
});
