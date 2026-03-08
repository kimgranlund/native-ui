// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  SCHEMA_CATALOG,
  getSchema,
  getSchemasForCategory,
  getSchemaAttribute,
} from '../schema-catalog.ts';
import type { ComponentSchema } from '../schema-catalog.ts';

// ── 1. SCHEMA_CATALOG ──

describe('SCHEMA_CATALOG', () => {
  it('is a ReadonlyMap', () => {
    expect(SCHEMA_CATALOG).toBeInstanceOf(Map);
    // ReadonlyMap has no `set` that compiles, but at runtime it's a Map.
    // Verify it exposes get/has/size and entries.
    expect(typeof SCHEMA_CATALOG.get).toBe('function');
    expect(typeof SCHEMA_CATALOG.has).toBe('function');
    expect(typeof SCHEMA_CATALOG.size).toBe('number');
  });

  it('has expected number of entries', () => {
    // 18 components: button, input, select, combobox, checkbox, switch, textarea,
    // range, listbox, option, badge, avatar, icon, tabs, tab-panels, dialog, card, field
    expect(SCHEMA_CATALOG.size).toBe(18);
  });

  it('all tags start with "n-" or are CSS class selectors', () => {
    for (const tag of SCHEMA_CATALOG.keys()) {
      expect(tag).toMatch(/^(n-|span\.|div\.)/);
    }
  });

  it('keys match each schema\'s tag property', () => {
    for (const [tag, schema] of SCHEMA_CATALOG) {
      expect(tag).toBe(schema.tag);
    }
  });
});

// ── 2. Individual Schemas ──

describe('individual schemas', () => {
  const requiredFields: (keyof ComponentSchema)[] = [
    'tag',
    'category',
    'description',
    'attributes',
    'properties',
    'slots',
    'events',
    'aria',
    'formAssociated',
  ];

  it('every schema has all required fields', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      for (const field of requiredFields) {
        expect(schema).toHaveProperty(field);
      }
    }
  });

  it('every schema object is frozen', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(Object.isFrozen(schema)).toBe(true);
    }
  });

  it('every schema attributes array is frozen', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(Object.isFrozen(schema.attributes)).toBe(true);
    }
  });

  it('every schema properties array is frozen', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(Object.isFrozen(schema.properties)).toBe(true);
    }
  });

  it('every schema slots array is frozen', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(Object.isFrozen(schema.slots)).toBe(true);
    }
  });

  it('every schema events array is frozen', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(Object.isFrozen(schema.events)).toBe(true);
    }
  });

  it('every schema aria object is frozen', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(Object.isFrozen(schema.aria)).toBe(true);
    }
  });

  it('every schema has a valid category', () => {
    const validCategories = ['form', 'display', 'navigation', 'overlay', 'container', 'layout'];
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(validCategories).toContain(schema.category);
    }
  });

  it('every schema has a non-empty description', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      expect(schema.description.length).toBeGreaterThan(0);
    }
  });
});

// ── 3. getSchema() ──

describe('getSchema', () => {
  it('finds known components', () => {
    expect(getSchema('n-button')).toBeDefined();
    expect(getSchema('n-input')).toBeDefined();
    expect(getSchema('n-select')).toBeDefined();
    expect(getSchema('n-listbox')).toBeDefined();
    expect(getSchema('n-icon')).toBeDefined();
    expect(getSchema('n-dialog')).toBeDefined();
  });

  it('returns the correct schema for a tag', () => {
    const schema = getSchema('n-button');
    expect(schema?.tag).toBe('n-button');
    expect(schema?.category).toBe('form');
  });

  it('returns undefined for unknown tags', () => {
    expect(getSchema('n-nonexistent')).toBeUndefined();
    expect(getSchema('div')).toBeUndefined();
    expect(getSchema('')).toBeUndefined();
    expect(getSchema('button')).toBeUndefined();
  });
});

// ── 4. getSchemasForCategory() ──

describe('getSchemasForCategory', () => {
  it('returns correct count for form category', () => {
    const forms = getSchemasForCategory('form');
    // button, input, select, combobox, checkbox, switch, textarea, range, field
    expect(forms.length).toBe(9);
    for (const s of forms) {
      expect(s.category).toBe('form');
    }
  });

  it('returns correct count for display category', () => {
    const display = getSchemasForCategory('display');
    // listbox, option, badge, avatar, icon
    expect(display.length).toBe(5);
    for (const s of display) {
      expect(s.category).toBe('display');
    }
  });

  it('returns correct count for navigation category', () => {
    const navigation = getSchemasForCategory('navigation');
    // tabs, tab-panels
    expect(navigation.length).toBe(2);
    expect(navigation.map((s) => s.tag)).toContain('n-tabs');
    expect(navigation.map((s) => s.tag)).toContain('n-tab-panels');
  });

  it('returns correct count for overlay category', () => {
    const overlay = getSchemasForCategory('overlay');
    // dialog
    expect(overlay.length).toBe(1);
    expect(overlay[0]!.tag).toBe('n-dialog');
  });

  it('returns correct count for container category', () => {
    const container = getSchemasForCategory('container');
    // article
    expect(container.length).toBe(1);
    expect(container[0]!.tag).toBe('n-container');
  });

  it('returns empty array for unused categories', () => {
    const layout = getSchemasForCategory('layout');
    expect(layout.length).toBe(0);
  });

  it('all results match the requested category', () => {
    for (const cat of ['form', 'display', 'navigation', 'overlay', 'container'] as const) {
      const results = getSchemasForCategory(cat);
      for (const s of results) {
        expect(s.category).toBe(cat);
      }
    }
  });
});

// ── 5. getSchemaAttribute() ──

describe('getSchemaAttribute', () => {
  it('finds known attributes on known components', () => {
    const variant = getSchemaAttribute('n-button', 'variant');
    expect(variant).toBeDefined();
    expect(variant!.name).toBe('variant');
    expect(variant!.type).toBe('enum');
  });

  it('finds the "size" attribute on n-button', () => {
    const size = getSchemaAttribute('n-button', 'size');
    expect(size).toBeDefined();
    expect(size!.type).toBe('enum');
    expect(size!.values).toContain('md');
  });

  it('finds the "placeholder" attribute on n-input', () => {
    const ph = getSchemaAttribute('n-input', 'placeholder');
    expect(ph).toBeDefined();
    expect(ph!.type).toBe('string');
  });

  it('finds the "name" attribute on n-icon', () => {
    const name = getSchemaAttribute('n-icon', 'name');
    expect(name).toBeDefined();
    expect(name!.type).toBe('string');
  });

  it('returns undefined for unknown attributes on known tags', () => {
    expect(getSchemaAttribute('n-button', 'nonexistent')).toBeUndefined();
    expect(getSchemaAttribute('n-icon', 'variant')).toBeUndefined();
  });

  it('returns undefined for unknown tags', () => {
    expect(getSchemaAttribute('n-nonexistent', 'variant')).toBeUndefined();
    expect(getSchemaAttribute('div', 'class')).toBeUndefined();
  });
});

// ── 6. Shared Attributes ──

describe('shared attributes', () => {
  it('SIZE_ATTR appears on n-button and n-input', () => {
    const btnSize = getSchemaAttribute('n-button', 'size');
    const inpSize = getSchemaAttribute('n-input', 'size');
    expect(btnSize).toBeDefined();
    expect(inpSize).toBeDefined();
    expect(btnSize!.values).toEqual(inpSize!.values);
    expect(btnSize!.default).toBe('md');
    expect(inpSize!.default).toBe('md');
  });

  it('INTENT_ATTR appears on n-button and n-input', () => {
    const btnIntent = getSchemaAttribute('n-button', 'intent');
    const inpIntent = getSchemaAttribute('n-input', 'intent');
    expect(btnIntent).toBeDefined();
    expect(inpIntent).toBeDefined();
    expect(btnIntent!.values).toEqual(inpIntent!.values);
    expect(btnIntent!.values).toContain('neutral');
    expect(btnIntent!.values).toContain('accent');
    expect(btnIntent!.values).toContain('danger');
  });

  it('DENSITY_ATTR appears on n-button and n-input', () => {
    const btnDensity = getSchemaAttribute('n-button', 'density');
    const inpDensity = getSchemaAttribute('n-input', 'density');
    expect(btnDensity).toBeDefined();
    expect(inpDensity).toBeDefined();
    expect(btnDensity!.values).toEqual(['compact', 'default', 'loose']);
  });

  it('RADIUS_ATTR appears on n-button and n-input', () => {
    const btnRadius = getSchemaAttribute('n-button', 'radius');
    const inpRadius = getSchemaAttribute('n-input', 'radius');
    expect(btnRadius).toBeDefined();
    expect(inpRadius).toBeDefined();
    expect(btnRadius!.values).toEqual(['none', 'sm', 'round']);
  });

  it('DISABLED_ATTR appears on multiple form components', () => {
    const tags = ['n-button', 'n-input', 'n-select', 'n-combobox', 'n-checkbox', 'n-switch'];
    for (const tag of tags) {
      const disabled = getSchemaAttribute(tag, 'disabled');
      expect(disabled).toBeDefined();
      expect(disabled!.type).toBe('boolean');
    }
  });

  it('PLACEHOLDER_ATTR appears on n-input and n-select', () => {
    const inpPh = getSchemaAttribute('n-input', 'placeholder');
    const selPh = getSchemaAttribute('n-select', 'placeholder');
    expect(inpPh).toBeDefined();
    expect(selPh).toBeDefined();
    expect(inpPh!.type).toBe('string');
    expect(selPh!.type).toBe('string');
  });

  it('shared attributes reference the same frozen values array', () => {
    // SIZE_ATTR is the same object, so values arrays should be identical references
    const btnSize = getSchemaAttribute('n-button', 'size');
    const inpSize = getSchemaAttribute('n-input', 'size');
    expect(btnSize!.values).toBe(inpSize!.values);
    expect(Object.isFrozen(btnSize!.values!)).toBe(true);
  });
});

// ── 7. Specific Component Schemas ──

describe('n-button schema', () => {
  const schema = getSchema('n-button')!;

  it('has variant attribute with correct enum values', () => {
    const variant = schema.attributes.find((a) => a.name === 'variant')!;
    expect(variant.type).toBe('enum');
    expect(variant.values).toContain('primary');
    expect(variant.values).toContain('secondary');
    expect(variant.values).toContain('default');
    expect(variant.values).toContain('outline');
    expect(variant.values).toContain('ghost');
    expect(variant.default).toBe('default');
  });

  it('has native:press event', () => {
    const press = schema.events.find((e) => e.name === 'native:press');
    expect(press).toBeDefined();
  });

  it('is formAssociated', () => {
    expect(schema.formAssociated).toBe(true);
  });

  it('has default, leading, and trailing slots', () => {
    const slotNames = schema.slots.map((s) => s.name);
    expect(slotNames).toContain('');       // default slot
    expect(slotNames).toContain('leading');
    expect(slotNames).toContain('trailing');
  });

  it('has justify attribute', () => {
    const justify = schema.attributes.find((a) => a.name === 'justify');
    expect(justify).toBeDefined();
    expect(justify!.values).toContain('spread');
  });

  it('has role=button', () => {
    expect(schema.aria.role).toBe('button');
  });
});

describe('n-input schema', () => {
  const schema = getSchema('n-input')!;

  it('has placeholder attribute', () => {
    const ph = schema.attributes.find((a) => a.name === 'placeholder');
    expect(ph).toBeDefined();
    expect(ph!.type).toBe('string');
  });

  it('has native:input and native:change events', () => {
    const eventNames = schema.events.map((e) => e.name);
    expect(eventNames).toContain('native:input');
    expect(eventNames).toContain('native:change');
  });

  it('is formAssociated', () => {
    expect(schema.formAssociated).toBe(true);
  });

  it('has value property', () => {
    const value = schema.properties.find((p) => p.name === 'value');
    expect(value).toBeDefined();
    expect(value!.type).toBe('string');
  });

  it('has variant with outline and ghost', () => {
    const variant = schema.attributes.find((a) => a.name === 'variant')!;
    expect(variant.values).toContain('outline');
    expect(variant.values).toContain('ghost');
    expect(variant.default).toBe('outline');
  });

  it('has leading and trailing slots but no default slot', () => {
    const slotNames = schema.slots.map((s) => s.name);
    expect(slotNames).toContain('leading');
    expect(slotNames).toContain('trailing');
    expect(slotNames).not.toContain('');
  });
});

describe('n-select schema', () => {
  const schema = getSchema('n-select')!;

  it('has allowedChildren including n-button and n-listbox', () => {
    expect(schema.allowedChildren).toBeDefined();
    expect(schema.allowedChildren).toContain('n-button');
    expect(schema.allowedChildren).toContain('n-listbox');
  });

  it('is formAssociated', () => {
    expect(schema.formAssociated).toBe(true);
  });

  it('has options and src attributes for data-driven mode', () => {
    const options = schema.attributes.find((a) => a.name === 'options');
    const src = schema.attributes.find((a) => a.name === 'src');
    expect(options).toBeDefined();
    expect(src).toBeDefined();
  });

  it('has native:change event with detail', () => {
    const change = schema.events.find((e) => e.name === 'native:change');
    expect(change).toBeDefined();
    expect(change!.detail).toBeDefined();
  });

  it('has value property', () => {
    const value = schema.properties.find((p) => p.name === 'value');
    expect(value).toBeDefined();
  });

  it('has options property (array type)', () => {
    const options = schema.properties.find((p) => p.name === 'options');
    expect(options).toBeDefined();
    expect(options!.type).toBe('array');
  });
});

describe('n-listbox schema', () => {
  const schema = getSchema('n-listbox')!;

  it('has allowedChildren including n-option', () => {
    expect(schema.allowedChildren).toBeDefined();
    expect(schema.allowedChildren).toContain('n-option');
    expect(schema.allowedChildren).toContain('n-option-group');
  });

  it('is display category', () => {
    expect(schema.category).toBe('display');
  });

  it('is not formAssociated', () => {
    expect(schema.formAssociated).toBe(false);
  });

  it('has native:select event', () => {
    const select = schema.events.find((e) => e.name === 'native:select');
    expect(select).toBeDefined();
  });

  it('has variant attribute with secondary and ghost', () => {
    const variant = schema.attributes.find((a) => a.name === 'variant')!;
    expect(variant.values).toContain('secondary');
    expect(variant.values).toContain('ghost');
    expect(variant.default).toBe('secondary');
  });
});

describe('n-icon schema', () => {
  const schema = getSchema('n-icon')!;

  it('has autoLabeled = false', () => {
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('has "name" attribute', () => {
    const name = schema.attributes.find((a) => a.name === 'name');
    expect(name).toBeDefined();
    expect(name!.type).toBe('string');
  });

  it('has aria-hidden in required attributes', () => {
    expect(schema.aria.requiredAttributes).toContain('aria-hidden');
  });

  it('is display category', () => {
    expect(schema.category).toBe('display');
  });

  it('is not formAssociated', () => {
    expect(schema.formAssociated).toBe(false);
  });

  it('has no events', () => {
    expect(schema.events.length).toBe(0);
  });

  it('has no slots', () => {
    expect(schema.slots.length).toBe(0);
  });
});

describe('n-dialog schema', () => {
  const schema = getSchema('n-dialog')!;

  it('has close and native:dismiss events', () => {
    const eventNames = schema.events.map((e) => e.name);
    expect(eventNames).toContain('close');
    expect(eventNames).toContain('native:dismiss');
  });

  it('is overlay category', () => {
    expect(schema.category).toBe('overlay');
  });

  it('is not formAssociated', () => {
    expect(schema.formAssociated).toBe(false);
  });

  it('has no-close-on-escape and no-close-on-backdrop attributes', () => {
    const escape = schema.attributes.find((a) => a.name === 'no-close-on-escape');
    const backdrop = schema.attributes.find((a) => a.name === 'no-close-on-backdrop');
    expect(escape).toBeDefined();
    expect(escape!.type).toBe('boolean');
    expect(backdrop).toBeDefined();
    expect(backdrop!.type).toBe('boolean');
  });

  it('has role=dialog', () => {
    expect(schema.aria.role).toBe('dialog');
  });
});

describe('n-combobox schema', () => {
  const schema = getSchema('n-combobox')!;

  it('has allowedChildren including n-input and n-listbox', () => {
    expect(schema.allowedChildren).toContain('n-input');
    expect(schema.allowedChildren).toContain('n-listbox');
  });

  it('has native:change and native:input events', () => {
    const eventNames = schema.events.map((e) => e.name);
    expect(eventNames).toContain('native:change');
    expect(eventNames).toContain('native:input');
  });
});

describe('n-option schema', () => {
  const schema = getSchema('n-option')!;

  it('has value attribute', () => {
    const value = schema.attributes.find((a) => a.name === 'value');
    expect(value).toBeDefined();
    expect(value!.type).toBe('string');
  });

  it('has role=option', () => {
    expect(schema.aria.role).toBe('option');
  });

  it('is autoLabeled', () => {
    expect(schema.aria.autoLabeled).toBe(true);
  });
});

describe('n-container schema', () => {
  const schema = getSchema('n-container')!;

  it('is container category', () => {
    expect(schema.category).toBe('container');
  });

  it('has default slot and allowed children', () => {
    const slotNames = schema.slots.map((s) => s.name);
    expect(slotNames).toContain(''); // default slot
    expect(schema.allowedChildren).toContain('n-header');
    expect(schema.allowedChildren).toContain('n-body');
    expect(schema.allowedChildren).toContain('n-footer');
  });

  it('has no events', () => {
    expect(schema.events.length).toBe(0);
  });
});

describe('n-tabs schema', () => {
  const schema = getSchema('n-tabs')!;

  it('is navigation category', () => {
    expect(schema.category).toBe('navigation');
  });

  it('has allowedChildren including n-tab and n-tab-panels', () => {
    expect(schema.allowedChildren).toContain('n-tab');
    expect(schema.allowedChildren).toContain('n-tab-panels');
  });

  it('has role=tablist', () => {
    expect(schema.aria.role).toBe('tablist');
  });
});

describe('span.badge schema', () => {
  const schema = getSchema('span.badge')!;

  it('is display category', () => {
    expect(schema.category).toBe('display');
  });

  it('has variant with primary, secondary, outline', () => {
    const variant = schema.attributes.find((a) => a.name === 'variant')!;
    expect(variant.values).toContain('primary');
    expect(variant.values).toContain('secondary');
    expect(variant.values).toContain('outline');
  });

  it('is not formAssociated', () => {
    expect(schema.formAssociated).toBe(false);
  });
});

describe('n-field schema', () => {
  const schema = getSchema('n-field')!;

  it('is form category', () => {
    expect(schema.category).toBe('form');
  });

  it('has allowedChildren for form controls', () => {
    expect(schema.allowedChildren).toContain('n-input');
    expect(schema.allowedChildren).toContain('n-select');
    expect(schema.allowedChildren).toContain('n-combobox');
    expect(schema.allowedChildren).toContain('label');
  });

  it('is not formAssociated', () => {
    expect(schema.formAssociated).toBe(false);
  });
});

describe('n-checkbox schema', () => {
  const schema = getSchema('n-checkbox')!;

  it('has role=checkbox', () => {
    expect(schema.aria.role).toBe('checkbox');
  });

  it('has checked property', () => {
    const checked = schema.properties.find((p) => p.name === 'checked');
    expect(checked).toBeDefined();
    expect(checked!.type).toBe('boolean');
  });

  it('is formAssociated', () => {
    expect(schema.formAssociated).toBe(true);
  });
});

describe('n-switch schema', () => {
  const schema = getSchema('n-switch')!;

  it('has role=switch', () => {
    expect(schema.aria.role).toBe('switch');
  });

  it('has checked property', () => {
    const checked = schema.properties.find((p) => p.name === 'checked');
    expect(checked).toBeDefined();
    expect(checked!.type).toBe('boolean');
  });

  it('is formAssociated', () => {
    expect(schema.formAssociated).toBe(true);
  });
});

describe('n-range schema', () => {
  const schema = getSchema('n-range')!;

  it('has min, max, step attributes', () => {
    const min = schema.attributes.find((a) => a.name === 'min');
    const max = schema.attributes.find((a) => a.name === 'max');
    const step = schema.attributes.find((a) => a.name === 'step');
    expect(min).toBeDefined();
    expect(max).toBeDefined();
    expect(step).toBeDefined();
    expect(min!.default).toBe('0');
    expect(max!.default).toBe('100');
    expect(step!.default).toBe('1');
  });

  it('has role=slider', () => {
    expect(schema.aria.role).toBe('slider');
  });

  it('has value property of type number', () => {
    const value = schema.properties.find((p) => p.name === 'value');
    expect(value).toBeDefined();
    expect(value!.type).toBe('number');
  });
});

describe('span.avatar schema', () => {
  const schema = getSchema('span.avatar')!;

  it('has src and alt attributes', () => {
    const src = schema.attributes.find((a) => a.name === 'src');
    const alt = schema.attributes.find((a) => a.name === 'alt');
    expect(src).toBeDefined();
    expect(alt).toBeDefined();
  });

  it('has role=img', () => {
    expect(schema.aria.role).toBe('img');
  });

  it('requires aria-label', () => {
    expect(schema.aria.requiredAttributes).toContain('aria-label');
  });
});

describe('n-textarea schema', () => {
  const schema = getSchema('n-textarea')!;

  it('has role=textbox', () => {
    expect(schema.aria.role).toBe('textbox');
  });

  it('has no slots', () => {
    expect(schema.slots.length).toBe(0);
  });

  it('has native:input and native:change events', () => {
    const eventNames = schema.events.map((e) => e.name);
    expect(eventNames).toContain('native:input');
    expect(eventNames).toContain('native:change');
  });
});

// ── 8. Aria Requirements ──

describe('aria requirements', () => {
  it('n-input requires aria-label', () => {
    const schema = getSchema('n-input')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('n-select requires aria-label', () => {
    const schema = getSchema('n-select')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('n-combobox requires aria-label', () => {
    const schema = getSchema('n-combobox')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('n-dialog requires aria-label', () => {
    const schema = getSchema('n-dialog')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('n-textarea requires aria-label', () => {
    const schema = getSchema('n-textarea')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('n-range requires aria-label', () => {
    const schema = getSchema('n-range')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
    expect(schema.aria.autoLabeled).toBe(false);
  });

  it('n-button is autoLabeled', () => {
    const schema = getSchema('n-button')!;
    expect(schema.aria.autoLabeled).toBe(true);
  });

  it('n-checkbox is autoLabeled', () => {
    const schema = getSchema('n-checkbox')!;
    expect(schema.aria.autoLabeled).toBe(true);
  });

  it('n-switch is autoLabeled', () => {
    const schema = getSchema('n-switch')!;
    expect(schema.aria.autoLabeled).toBe(true);
  });

  it('n-option is autoLabeled', () => {
    const schema = getSchema('n-option')!;
    expect(schema.aria.autoLabeled).toBe(true);
  });

  it('span.badge is autoLabeled', () => {
    const schema = getSchema('span.badge')!;
    expect(schema.aria.autoLabeled).toBe(true);
  });

  it('n-icon is NOT autoLabeled (requires aria-hidden)', () => {
    const schema = getSchema('n-icon')!;
    expect(schema.aria.autoLabeled).toBe(false);
    expect(schema.aria.requiredAttributes).toContain('aria-hidden');
  });

  it('span.avatar requires aria-label', () => {
    const schema = getSchema('span.avatar')!;
    expect(schema.aria.requiredAttributes).toContain('aria-label');
  });

  it('components with requiredAttributes have them as frozen arrays', () => {
    for (const [_tag, schema] of SCHEMA_CATALOG) {
      if (schema.aria.requiredAttributes) {
        expect(Object.isFrozen(schema.aria.requiredAttributes)).toBe(true);
      }
    }
  });
});
