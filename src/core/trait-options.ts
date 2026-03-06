import { getRegisteredTraitNames } from '../registries/trait-registry.ts';

/** Prefix for all trait option attributes: `data-trait-{name}-{key}` */
const ATTR_PREFIX = 'data-trait-';

/**
 * Parse a trait option attribute like "data-trait-draggable-axis" into
 * { trait: "draggable", key: "axis" }. Returns null if the attribute
 * doesn't match the `data-trait-{name}-*` pattern for any registered trait.
 */
export function parseTraitAttribute(
  attrName: string,
): { trait: string; key: string } | null {
  if (!attrName.startsWith(ATTR_PREFIX)) return null;
  const rest = attrName.slice(ATTR_PREFIX.length);
  const names = getRegisteredTraitNames();
  for (const name of names) {
    if (rest.startsWith(name + '-')) {
      return { trait: name, key: rest.slice(name.length + 1) };
    }
  }
  return null;
}

/**
 * Collect all `data-trait-{traitName}-*` attributes from an element for a
 * given trait. Returns a plain object mapping option keys to string values.
 *
 * Example: element has `data-trait-draggable-axis="x"` and `data-trait-draggable-mode="slot"`
 * → collectTraitOptions(el, 'draggable') returns { axis: 'x', mode: 'slot' }
 */
export function collectTraitOptions(
  el: HTMLElement,
  traitName: string,
): Record<string, string> {
  const prefix = ATTR_PREFIX + traitName + '-';
  const options: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith(prefix)) {
      options[attr.name.slice(prefix.length)] = attr.value;
    }
  }
  return options;
}
