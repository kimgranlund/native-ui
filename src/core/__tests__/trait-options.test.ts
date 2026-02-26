// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { parseTraitAttribute, collectTraitOptions } from '../trait-options.ts';
import { registerTrait } from '../trait-registry.ts';
import type { TraitAdapter } from '../trait-registry.ts';

// Register test traits (registry is module-level singleton)
const registered = new Set<string>();
function ensureRegistered(name: string) {
  if (registered.has(name)) return;
  const adapter: TraitAdapter = {
    name,
    create: () => ({}),
    destroy: () => {},
  };
  registerTrait(adapter);
  registered.add(name);
}

describe('parseTraitAttribute', () => {
  it('parses a namespaced trait attribute', () => {
    ensureRegistered('draggable');
    const result = parseTraitAttribute('draggable-axis');
    expect(result).toEqual({ trait: 'draggable', key: 'axis' });
  });

  it('parses multi-word keys', () => {
    ensureRegistered('draggable');
    const result = parseTraitAttribute('draggable-drop-zone');
    expect(result).toEqual({ trait: 'draggable', key: 'drop-zone' });
  });

  it('returns null for non-trait attributes', () => {
    const result = parseTraitAttribute('class');
    expect(result).toBeNull();
  });

  it('returns null for partial prefix match', () => {
    ensureRegistered('press');
    // "pressable" is not "press-able" — the prefix must match exactly with a hyphen
    const result = parseTraitAttribute('pressable');
    // "pressable" doesn't start with "press-" unless "press" is registered
    // Actually "press" + "-" doesn't match "pressable" since "pressable" starts with "press" but not "press-"
    expect(result).toBeNull();
  });
});

describe('collectTraitOptions', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('collects namespaced attributes', () => {
    el.setAttribute('draggable-axis', 'vertical');
    el.setAttribute('draggable-mode', 'slot');
    el.setAttribute('class', 'test');

    const options = collectTraitOptions(el, 'draggable');
    expect(options).toEqual({ axis: 'vertical', mode: 'slot' });
  });

  it('returns empty object when no matching attributes', () => {
    el.setAttribute('class', 'test');
    el.setAttribute('id', 'foo');

    const options = collectTraitOptions(el, 'draggable');
    expect(options).toEqual({});
  });

  it('ignores attributes from other traits', () => {
    el.setAttribute('draggable-axis', 'vertical');
    el.setAttribute('sortable-handle', '.grip');

    const options = collectTraitOptions(el, 'draggable');
    expect(options).toEqual({ axis: 'vertical' });
  });

  it('handles hyphenated option keys', () => {
    el.setAttribute('range-selectable-range-mode', 'click');

    const options = collectTraitOptions(el, 'range-selectable');
    expect(options).toEqual({ 'range-mode': 'click' });
  });
});
