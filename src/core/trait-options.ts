import { getRegisteredTraitNames } from './trait-registry.ts';

/**
 * Parse a namespaced trait attribute like "draggable-axis" into
 * { trait: "draggable", key: "axis" }. Returns null if the attribute
 * doesn't match any registered trait name prefix.
 */
export function parseTraitAttribute(
  attrName: string,
): { trait: string; key: string } | null {
  const names = getRegisteredTraitNames();
  for (const name of names) {
    if (attrName.startsWith(name + '-')) {
      return { trait: name, key: attrName.slice(name.length + 1) };
    }
  }
  return null;
}

/**
 * Collect all `{traitName}-*` attributes from an element for a given trait.
 * Returns a plain object mapping option keys to string values.
 *
 * Example: element has `draggable-axis="x"` and `draggable-mode="slot"`
 * → collectTraitOptions(el, 'draggable') returns { axis: 'x', mode: 'slot' }
 */
export function collectTraitOptions(
  el: HTMLElement,
  traitName: string,
): Record<string, string> {
  const prefix = traitName + '-';
  const options: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith(prefix)) {
      options[attr.name.slice(prefix.length)] = attr.value;
    }
  }
  return options;
}
