/**
 * NCatalog — Per-Session Component Catalog
 *
 * Scoped component catalog for security enforcement.
 * Agents can only render components granted in their session's catalog.
 * Reads from the existing COMPONENT_MAP in a2ui-component-map.ts.
 */

import type { A2UIComponent } from '../protocol/a2ui-types.ts';
import { COMPONENT_MAP } from '../protocol/a2ui-component-map.ts';
import type { ComponentMapping } from '../protocol/a2ui-component-map.ts';

// ── Catalog Entry ──

export interface NCatalogEntry {
  readonly a2uiType: string;
  readonly tagName: string;
  readonly properties: readonly string[];
  readonly events: readonly string[];
}

// ── NCatalog ──

export class NCatalog {
  readonly #entries: ReadonlyMap<string, NCatalogEntry>;

  constructor(entries: readonly NCatalogEntry[]) {
    const map = new Map<string, NCatalogEntry>();
    for (const e of entries) map.set(e.a2uiType, e);
    this.#entries = map;
  }

  /** All catalog entries. */
  get entries(): readonly NCatalogEntry[] {
    return Array.from(this.#entries.values());
  }

  /** Check if a component type is in this catalog. */
  has(a2uiType: string): boolean {
    return this.#entries.has(a2uiType);
  }

  /** Get entry for a component type. */
  get(a2uiType: string): NCatalogEntry | undefined {
    return this.#entries.get(a2uiType);
  }

  /**
   * Serialize to A2UI catalog format for AgentCard / negotiation.
   */
  toManifest(): object {
    return {
      version: '1.0',
      renderer: '@nonoun/native-ui',
      components: this.entries.map(e => ({
        type: e.a2uiType,
        tagName: e.tagName,
        properties: e.properties,
        events: e.events,
      })),
    };
  }

  /**
   * Filter an A2UI component array against this catalog.
   * Returns only components whose type is allowed.
   */
  filterComponents(
    components: readonly A2UIComponent[],
    onViolation?: (type: string, id: string) => void,
  ): A2UIComponent[] {
    return components.filter(c => {
      if (this.has(c.component)) return true;
      onViolation?.(c.component, c.id);
      return false;
    });
  }
}

// ── Factory ──

function mappingToEntry(mapping: ComponentMapping): NCatalogEntry {
  return {
    a2uiType: mapping.a2uiType,
    tagName: mapping.nativeTag,
    properties: mapping.propertyMap ? Object.keys(mapping.propertyMap) : [],
    events: mapping.actionEvent ? [mapping.actionEvent] : [],
  };
}

/**
 * Build a catalog from the existing COMPONENT_MAP.
 * - `'core-only'`: excludes `native-app-*` elements (recommended default)
 * - `'full'`: all registered component types
 */
export function buildCatalogFromRegistry(scope: 'full' | 'core-only' = 'core-only'): NCatalog {
  const entries: NCatalogEntry[] = [];
  for (const [_type, mapping] of COMPONENT_MAP) {
    if (scope === 'core-only' && mapping.nativeTag.startsWith('native-app-')) continue;
    entries.push(mappingToEntry(mapping));
  }
  return new NCatalog(entries);
}
