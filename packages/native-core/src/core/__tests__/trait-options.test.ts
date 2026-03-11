// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { parseTraitAttribute, collectTraitOptions } from '../trait-options.ts';
import { registerTrait } from '../../registries/trait-registry.ts';
import type { TraitAdapter } from '../../registries/trait-registry.ts';

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
  it('parses a data-trait-* attribute', () => {
    ensureRegistered('draggable');
    const result = parseTraitAttribute('data-trait-draggable-axis');
    expect(result).toEqual({ trait: 'draggable', key: 'axis' });
  });

  it('parses multi-word keys', () => {
    ensureRegistered('draggable');
    const result = parseTraitAttribute('data-trait-draggable-drop-zone');
    expect(result).toEqual({ trait: 'draggable', key: 'drop-zone' });
  });

  it('returns null for non-trait attributes', () => {
    const result = parseTraitAttribute('class');
    expect(result).toBeNull();
  });

  it('returns null for bare trait-prefixed attributes (no data-trait-)', () => {
    ensureRegistered('draggable');
    const result = parseTraitAttribute('draggable-axis');
    expect(result).toBeNull();
  });

  it('returns null for partial prefix match', () => {
    ensureRegistered('press');
    const result = parseTraitAttribute('data-trait-pressable');
    expect(result).toBeNull();
  });

  it('returns null for data- attributes that are not data-trait-', () => {
    const result = parseTraitAttribute('data-custom-thing');
    expect(result).toBeNull();
  });
});

describe('collectTraitOptions', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('collects data-trait-* namespaced attributes', () => {
    el.setAttribute('data-trait-draggable-axis', 'vertical');
    el.setAttribute('data-trait-draggable-mode', 'slot');
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
    el.setAttribute('data-trait-draggable-axis', 'vertical');
    el.setAttribute('data-trait-sortable-handle', '.grip');

    const options = collectTraitOptions(el, 'draggable');
    expect(options).toEqual({ axis: 'vertical' });
  });

  it('handles hyphenated option keys', () => {
    el.setAttribute('data-trait-range-selectable-range-mode', 'click');

    const options = collectTraitOptions(el, 'range-selectable');
    expect(options).toEqual({ 'range-mode': 'click' });
  });

  it('ignores old-style bare trait attributes', () => {
    el.setAttribute('draggable-axis', 'vertical');

    const options = collectTraitOptions(el, 'draggable');
    expect(options).toEqual({});
  });
});
