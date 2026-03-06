// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { NCatalog, buildCatalogFromRegistry } from '../session/catalog.ts';
import type { NCatalogEntry } from '../session/catalog.ts';
import type { A2UIComponent } from '../protocol/a2ui-types.ts';

const entry = (a2uiType: string, tagName: string): NCatalogEntry => ({
  a2uiType,
  tagName,
  properties: [],
  events: [],
});

describe('NCatalog', () => {
  it('stores and retrieves entries', () => {
    const catalog = new NCatalog([
      entry('Button', 'n-button'),
      entry('Text', 'n-text'),
    ]);

    expect(catalog.entries).toHaveLength(2);
    expect(catalog.has('Button')).toBe(true);
    expect(catalog.has('Unknown')).toBe(false);
    expect(catalog.get('Button')?.tagName).toBe('n-button');
  });

  it('filterComponents allows known types', () => {
    const catalog = new NCatalog([entry('Button', 'n-button')]);
    const components: A2UIComponent[] = [
      { id: '1', component: 'Button' },
      { id: '2', component: 'Unknown' },
    ];

    const filtered = catalog.filterComponents(components);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('filterComponents calls onViolation for rejected types', () => {
    const catalog = new NCatalog([entry('Button', 'n-button')]);
    const violations: string[] = [];
    const components: A2UIComponent[] = [
      { id: '1', component: 'Button' },
      { id: '2', component: 'Unknown' },
    ];

    catalog.filterComponents(components, (type, id) => violations.push(`${type}:${id}`));
    expect(violations).toEqual(['Unknown:2']);
  });

  it('toManifest produces A2UI catalog format', () => {
    const catalog = new NCatalog([
      { a2uiType: 'Button', tagName: 'n-button', properties: ['variant'], events: ['native:press'] },
    ]);

    const manifest = catalog.toManifest() as Record<string, unknown>;
    expect(manifest.version).toBe('1.0');
    expect(manifest.renderer).toBe('@nonoun/native-ui');
    expect(manifest.components).toHaveLength(1);
  });
});

describe('buildCatalogFromRegistry', () => {
  it('builds a catalog with all mapped types (core-only)', () => {
    const catalog = buildCatalogFromRegistry('core-only');
    expect(catalog.has('Button')).toBe(true);
    expect(catalog.has('Text')).toBe(true);
    expect(catalog.has('TextField')).toBe(true);
    expect(catalog.entries.length).toBeGreaterThan(20);
  });

  it('builds a full catalog', () => {
    const catalog = buildCatalogFromRegistry('full');
    expect(catalog.has('Button')).toBe(true);
    expect(catalog.entries.length).toBeGreaterThan(20);
  });

  it('default scope is core-only', () => {
    const catalog = buildCatalogFromRegistry();
    expect(catalog.has('Button')).toBe(true);
  });
});
