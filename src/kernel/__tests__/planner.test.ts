// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createPlanner, Planner } from '../planner.ts';
import type { UIIntent, ElementIntent } from '../planner.ts';
import type { UINode, ComponentRegistration } from '../types.ts';

// ── Helpers ──

function makeRegistry(...tags: string[]): Map<string, ComponentRegistration> {
  const map = new Map<string, ComponentRegistration>();
  for (const tag of tags) {
    map.set(tag, { tag, elementClass: HTMLElement });
  }
  return map;
}

function simpleIntent(elements: readonly ElementIntent[], overrides?: Partial<UIIntent>): UIIntent {
  return {
    type: 'display',
    elements,
    ...overrides,
  };
}

/** Extract the label text from a ui-button node (which uses <span slot="label"> child). */
function getButtonLabel(node: UINode): string | undefined {
  const labelChild = node.children?.find(
    (c) => c.tag === 'span' && c.attributes?.['slot'] === 'label',
  );
  return labelChild?.textContent;
}

// ── Tests ──

describe('createPlanner factory', () => {
  it('creates a Planner instance', () => {
    const planner = createPlanner();
    expect(planner).toBeInstanceOf(Planner);
  });

  it('creates a Planner with a registry', () => {
    const registry = makeRegistry('ui-button');
    const planner = createPlanner(registry);
    expect(planner).toBeInstanceOf(Planner);
  });
});

describe('generate() basics', () => {
  it('produces a PlanResult with plan, validation, accessibility, warnings', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('validation');
    expect(result).toHaveProperty('accessibility');
    expect(result).toHaveProperty('warnings');
  });

  it('plan has source "generated" by default', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(result.plan.source).toBe('generated');
  });

  it('plan has custom source when provided', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]), 'human');
    expect(result.plan.source).toBe('human');
  });

  it('plan has version 1', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(result.plan.version).toBe(1);
  });

  it('plan has a generated id when intent.id is not provided', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(result.plan.id).toMatch(/^plan-/);
  });

  it('plan uses intent.id when provided', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }], { id: 'my-plan-42' }));
    expect(result.plan.id).toBe('my-plan-42');
  });

  it('plan has a timestamp', () => {
    const before = Date.now();
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    const after = Date.now();
    expect(result.plan.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.plan.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('single element intent', () => {
  it('generates a node with correct tag', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button', label: 'Click me' }]));
    // Single non-structural element is wrapped in a div
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    expect(root.children).toHaveLength(1);
    expect(root.children![0]!.tag).toBe('ui-button');
  });

  it('generates unique IDs for nodes', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', label: 'A' },
      { component: 'ui-button', label: 'B' },
    ]));
    const root = result.plan.root;
    const ids = new Set([root.id, ...root.children!.map((c) => c.id)]);
    // 3 nodes: wrapper div + 2 buttons
    expect(ids.size).toBe(3);
  });

  it('applies attributes from intent', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'div', attributes: { 'data-foo': 'bar', class: 'test' } },
    ]));
    // Single structural element (div) is used directly as root
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    expect(root.attributes!['data-foo']).toBe('bar');
    expect(root.attributes!['class']).toBe('test');
  });

  it('applies properties from intent', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-input', label: 'Name', properties: { value: 'hello' } },
    ]));
    const root = result.plan.root;
    const input = root.children![0]!;
    expect(input.properties).toEqual({ value: 'hello' });
  });

  it('applies events from intent', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', label: 'Save', events: { 'ui-press': 'save-item' } },
    ]));
    const root = result.plan.root;
    const button = root.children![0]!;
    expect(button.events).toEqual({ 'ui-press': 'save-item' });
  });
});

describe('multiple elements', () => {
  it('wraps in a div when multiple elements', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', label: 'A' },
      { component: 'ui-button', label: 'B' },
      { component: 'ui-button', label: 'C' },
    ]));
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    expect(root.attributes!['role']).toBe('region');
    expect(root.children).toHaveLength(3);
  });

  it('each child has a unique ID', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'span' },
      { component: 'span' },
      { component: 'span' },
    ]));
    const ids = result.plan.root.children!.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('preserves element order', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'h1', label: 'Title' },
      { component: 'p' },
      { component: 'ui-button', label: 'Go' },
    ]));
    const tags = result.plan.root.children!.map((c) => c.tag);
    expect(tags).toEqual(['h1', 'p', 'ui-button']);
  });
});

describe('structural root optimization', () => {
  it('uses structural element directly as root when it is the sole element', () => {
    for (const tag of ['div', 'form', 'section', 'main', 'nav', 'header', 'footer', 'article', 'aside']) {
      const planner = createPlanner();
      const result = planner.generate(simpleIntent([{ component: tag }]));
      expect(result.plan.root.tag).toBe(tag);
      // Should not have a wrapper; no children wrapping
      expect(result.plan.root.children).toBeUndefined();
    }
  });

  it('wraps a single non-structural element in a div', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button', label: 'Click' }]));
    expect(result.plan.root.tag).toBe('div');
    expect(result.plan.root.children).toHaveLength(1);
    expect(result.plan.root.children![0]!.tag).toBe('ui-button');
  });

  it('wraps a single <span> in a div', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'span' }]));
    expect(result.plan.root.tag).toBe('div');
    expect(result.plan.root.children).toHaveLength(1);
    expect(result.plan.root.children![0]!.tag).toBe('span');
  });

  it('applies intent title as aria-label on structural root', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent(
      [{ component: 'section' }],
      { title: 'My Section' },
    ));
    expect(result.plan.root.tag).toBe('section');
    expect(result.plan.root.attributes!['aria-label']).toBe('My Section');
  });

  it('does not overwrite existing aria-label on structural root', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent(
      [{ component: 'section', attributes: { 'aria-label': 'Already set' } }],
      { title: 'My Section' },
    ));
    expect(result.plan.root.attributes!['aria-label']).toBe('Already set');
  });
});

describe('label handling', () => {
  it('ui-button gets label as <span slot="label"> child (not textContent)', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button', label: 'Submit' }]));
    const button = result.plan.root.children![0]!;
    // ui-button uses <span slot="label"> for its label text
    expect(getButtonLabel(button)).toBe('Submit');
    expect(button.textContent).toBeUndefined();
    // Should NOT have aria-label since it's self-labeling via slot
    expect(button.attributes?.['aria-label']).toBeUndefined();
  });

  it('other self-labeling tags get label as textContent', () => {
    for (const tag of ['h1', 'h2', 'p', 'span', 'li', 'label', 'ui-option', 'ui-command-item']) {
      const planner = createPlanner();
      const result = planner.generate(simpleIntent([{ component: tag, label: 'Test' }]));
      const child = result.plan.root.children![0]!;
      expect(child.textContent).toBe('Test');
    }
  });

  it('non-self-labeling components get label as aria-label attribute', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-input', label: 'Email' }]));
    const input = result.plan.root.children![0]!;
    expect(input.attributes!['aria-label']).toBe('Email');
    expect(input.textContent).toBeUndefined();
  });

  it('ui-select gets label as aria-label', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-select', label: 'Country' }]));
    const select = result.plan.root.children![0]!;
    expect(select.attributes!['aria-label']).toBe('Country');
  });

  it('intent title becomes aria-label on wrapper div', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent(
      [{ component: 'ui-button', label: 'A' }, { component: 'ui-button', label: 'B' }],
      { title: 'Action Bar' },
    ));
    expect(result.plan.root.tag).toBe('div');
    expect(result.plan.root.attributes!['aria-label']).toBe('Action Bar');
  });

  it('does not add aria-label when existing aria-label is present on non-self-labeling element', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-input', label: 'Name', attributes: { 'aria-label': 'Full name field' } },
    ]));
    const input = result.plan.root.children![0]!;
    expect(input.attributes!['aria-label']).toBe('Full name field');
  });
});

describe('auto-ARIA', () => {
  it('ui-icon elements get aria-hidden="true" when unlabeled', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-icon', attributes: { name: 'house' } },
    ]));
    const icon = result.plan.root.children![0]!;
    expect(icon.attributes!['aria-hidden']).toBe('true');
  });

  it('ui-icon elements do NOT get aria-hidden="true" when they have a label', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-icon', label: 'Home icon', attributes: { name: 'house' } },
    ]));
    const icon = result.plan.root.children![0]!;
    // The icon-specific code skips aria-hidden="true", but the schema's
    // requiredAttributes includes 'aria-hidden' so autoAria adds the
    // default value 'false'
    expect(icon.attributes!['aria-hidden']).not.toBe('true');
    expect(icon.attributes!['aria-hidden']).toBe('false');
  });

  it('ui-icon elements do NOT get aria-hidden="true" when they have aria-label attribute', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-icon', attributes: { name: 'house', 'aria-label': 'Home' } },
    ]));
    const icon = result.plan.root.children![0]!;
    // Same as above: schema requiredAttributes adds default 'false'
    expect(icon.attributes!['aria-hidden']).not.toBe('true');
    expect(icon.attributes!['aria-hidden']).toBe('false');
  });

  it('adds role from schema when not already set', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button', label: 'OK' }]));
    const button = result.plan.root.children![0]!;
    expect(button.attributes!['role']).toBe('button');
  });

  it('does not overwrite existing role', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', label: 'OK', attributes: { role: 'menuitem' } },
    ]));
    const button = result.plan.root.children![0]!;
    expect(button.attributes!['role']).toBe('menuitem');
  });

  it('adds required ARIA attributes with defaults', () => {
    const planner = createPlanner();
    // ui-input schema has requiredAttributes: ['aria-label'] — that gets filled by the label handling
    // ui-select schema has role: 'combobox' and requiredAttributes: ['aria-label']
    const result = planner.generate(simpleIntent([
      { component: 'ui-select', label: 'Pick one' },
    ]));
    const select = result.plan.root.children![0]!;
    expect(select.attributes!['role']).toBe('combobox');
    // aria-label already filled by the label
    expect(select.attributes!['aria-label']).toBe('Pick one');
  });
});

describe('children / nesting', () => {
  it('recursive children are built correctly', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'div',
        children: [
          { component: 'h2', label: 'Title' },
          { component: 'p', label: 'Content' },
        ],
      },
    ]));
    // Single structural (div) becomes root
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    expect(root.children).toHaveLength(2);
    expect(root.children![0]!.tag).toBe('h2');
    expect(root.children![0]!.textContent).toBe('Title');
    expect(root.children![1]!.tag).toBe('p');
    expect(root.children![1]!.textContent).toBe('Content');
  });

  it('slot attribute is preserved on children', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'ui-button',
        label: 'Click',
        children: [
          { component: 'ui-icon', attributes: { name: 'arrow-right' }, slot: 'trailing' },
        ],
      },
    ]));
    const button = result.plan.root.children![0]!;
    // ui-button children: [<span slot="label">, <ui-icon slot="trailing">]
    expect(button.children).toHaveLength(2);
    expect(getButtonLabel(button)).toBe('Click');
    const icon = button.children!.find((c) => c.tag === 'ui-icon')!;
    expect(icon.slot).toBe('trailing');
  });

  it('deep nesting works', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'div',
        children: [{
          component: 'div',
          children: [{
            component: 'div',
            children: [{
              component: 'span', label: 'Deep leaf',
            }],
          }],
        }],
      },
    ]));
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    const level1 = root.children![0]!;
    expect(level1.tag).toBe('div');
    const level2 = level1.children![0]!;
    expect(level2.tag).toBe('div');
    const leaf = level2.children![0]!;
    expect(leaf.tag).toBe('span');
    expect(leaf.textContent).toBe('Deep leaf');
  });

  it('each nested child has a unique ID', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'div',
        children: [
          {
            component: 'div',
            children: [
              { component: 'span' },
              { component: 'span' },
            ],
          },
          { component: 'span' },
        ],
      },
    ]));
    const ids: string[] = [];
    function collectIds(node: UINode): void {
      ids.push(node.id);
      if (node.children) node.children.forEach(collectIds);
    }
    collectIds(result.plan.root);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validation', () => {
  it('result includes schema validation result', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(result.validation).toHaveProperty('valid');
    expect(result.validation).toHaveProperty('errors');
    expect(typeof result.validation.valid).toBe('boolean');
    expect(Array.isArray(result.validation.errors)).toBe(true);
  });

  it('result includes accessibility validation result', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(result.accessibility).toHaveProperty('valid');
    expect(result.accessibility).toHaveProperty('violations');
    expect(typeof result.accessibility.valid).toBe('boolean');
    expect(Array.isArray(result.accessibility.violations)).toBe(true);
  });

  it('validation passes for well-formed plan with HTML tags', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'div',
        children: [
          { component: 'h2', label: 'Hello' },
          { component: 'p', label: 'World' },
        ],
      },
    ]));
    expect(result.validation.valid).toBe(true);
  });

  it('forbidden tags are caught in validation', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'div',
        children: [{ component: 'script' }],
      },
    ]));
    expect(result.validation.valid).toBe(false);
    expect(result.validation.errors.some((e) => e.code === 'forbidden_tag')).toBe(true);
  });
});

describe('warnings', () => {
  it('warns about missing label on form elements', () => {
    const planner = createPlanner();
    const result = planner.generate({
      type: 'form',
      elements: [{ component: 'ui-input' }],
    });
    expect(result.warnings.some((w) => w.includes('missing a label'))).toBe(true);
  });

  it('warns about missing label on nested form elements in form intent', () => {
    const planner = createPlanner();
    const result = planner.generate({
      type: 'form',
      elements: [
        {
          component: 'div',
          children: [{ component: 'ui-select' }],
        },
      ],
    });
    expect(result.warnings.some((w) => w.includes('ui-select') && w.includes('missing a label'))).toBe(true);
  });

  it('does not warn about form elements with label', () => {
    const planner = createPlanner();
    const result = planner.generate({
      type: 'form',
      elements: [{ component: 'ui-input', label: 'Name' }],
    });
    expect(result.warnings.filter((w) => w.includes('missing a label'))).toHaveLength(0);
  });

  it('does not warn about form elements with aria-label attribute', () => {
    const planner = createPlanner();
    const result = planner.generate({
      type: 'form',
      elements: [{ component: 'ui-input', attributes: { 'aria-label': 'Name' } }],
    });
    expect(result.warnings.filter((w) => w.includes('missing a label'))).toHaveLength(0);
  });

  it('does not warn about form elements with aria-labelledby attribute', () => {
    const planner = createPlanner();
    const result = planner.generate({
      type: 'form',
      elements: [{ component: 'ui-input', attributes: { 'aria-labelledby': 'name-label' } }],
    });
    expect(result.warnings.filter((w) => w.includes('missing a label'))).toHaveLength(0);
  });

  it('does not warn about missing labels when intent type is not form', () => {
    const planner = createPlanner();
    const result = planner.generate({
      type: 'display',
      elements: [{ component: 'ui-input' }],
    });
    // Form element label warnings only fire for form intents
    expect(result.warnings.filter((w) => w.includes('Form element') && w.includes('missing a label'))).toHaveLength(0);
  });

  it('warns about unlabeled buttons', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button' }]));
    expect(result.warnings.some((w) => w.includes('Button') && w.includes('no text content'))).toBe(true);
  });

  it('warns about unlabeled native buttons', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'button' }]));
    expect(result.warnings.some((w) => w.includes('Button') && w.includes('no text content'))).toBe(true);
  });

  it('does not warn about buttons with label', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button', label: 'OK' }]));
    expect(result.warnings.filter((w) => w.includes('no text content'))).toHaveLength(0);
  });

  it('does not warn about buttons with aria-label', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', attributes: { 'aria-label': 'Close' } },
    ]));
    expect(result.warnings.filter((w) => w.includes('no text content'))).toHaveLength(0);
  });

  it('warns about deep nesting (>10 levels)', () => {
    // Build a deep chain via children
    function deepElement(depth: number): ElementIntent {
      if (depth === 0) return { component: 'span', label: 'leaf' };
      return { component: 'div', children: [deepElement(depth - 1)] };
    }

    const planner = createPlanner();
    const result = planner.generate(simpleIntent([deepElement(15)]));
    expect(result.warnings.some((w) => w.includes('nesting depth'))).toBe(true);
  });

  it('does not warn about nesting at exactly 10 levels', () => {
    // Build chain of exactly 10 levels deep
    function deepElement(depth: number): ElementIntent {
      if (depth === 0) return { component: 'span', label: 'leaf' };
      return { component: 'div', children: [deepElement(depth - 1)] };
    }

    const planner = createPlanner();
    // 10 levels of children inside a structural root (root is level 0)
    const result = planner.generate(simpleIntent([deepElement(10)]));
    expect(result.warnings.filter((w) => w.includes('nesting depth'))).toHaveLength(0);
  });

  it('warns about unknown custom elements', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-custom-unknown' }]));
    expect(result.warnings.some((w) => w.includes('not in the schema catalog'))).toBe(true);
  });

  it('does not warn about known custom elements', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'ui-button', label: 'OK' }]));
    expect(result.warnings.filter((w) => w.includes('not in the schema catalog'))).toHaveLength(0);
  });

  it('does not warn about standard HTML tags', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'div', children: [{ component: 'span' }, { component: 'p' }] },
    ]));
    expect(result.warnings.filter((w) => w.includes('not in the schema catalog'))).toHaveLength(0);
  });
});

describe('Planner.form() static builder', () => {
  it('creates correct form structure with fields', () => {
    const result = Planner.form([
      { name: 'Username' },
      { name: 'Email', type: 'email' },
    ]);
    const root = result.plan.root;
    // Root should be a <form> (structural, single element)
    expect(root.tag).toBe('form');
    expect(root.attributes!['novalidate']).toBe('');
  });

  it('generates ui-field + ui-input for text fields', () => {
    const result = Planner.form([{ name: 'Username', placeholder: 'Enter name' }]);
    const root = result.plan.root;
    // form > [ui-field, ui-button(submit)]
    const fields = root.children!.filter((c) => c.tag === 'ui-field');
    expect(fields).toHaveLength(1);
    const field = fields[0]!;
    // Field contains a label and a ui-input
    const label = field.children!.find((c) => c.tag === 'label');
    const input = field.children!.find((c) => c.tag === 'ui-input');
    expect(label).toBeDefined();
    expect(label!.textContent).toBe('Username');
    expect(label!.slot).toBe('label');
    expect(input).toBeDefined();
    expect(input!.attributes!['type']).toBe('text');
    expect(input!.attributes!['placeholder']).toBe('Enter name');
  });

  it('generates ui-field + ui-textarea for textarea type', () => {
    const result = Planner.form([{ name: 'Bio', type: 'textarea' }]);
    const root = result.plan.root;
    const field = root.children!.find((c) => c.tag === 'ui-field')!;
    const textarea = field.children!.find((c) => c.tag === 'ui-textarea');
    expect(textarea).toBeDefined();
  });

  it('generates ui-field + ui-select (data-driven) for select type with options', () => {
    const result = Planner.form([
      {
        name: 'Country',
        type: 'select',
        options: [
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' },
        ],
      },
    ]);
    const root = result.plan.root;
    const field = root.children!.find((c) => c.tag === 'ui-field')!;
    const select = field.children!.find((c) => c.tag === 'ui-select');
    expect(select).toBeDefined();
    // Data-driven mode: options are set as JSON attribute, no ui-option children
    const optionsAttr = select!.attributes!['options'];
    expect(optionsAttr).toBeDefined();
    const parsed = JSON.parse(optionsAttr);
    expect(parsed).toEqual([
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
    ]);
    // No children (data-driven mode stamps its own DOM)
    expect(select!.children).toBeUndefined();
  });

  it('adds submit button with correct variant and intent', () => {
    const result = Planner.form([{ name: 'Name' }]);
    const root = result.plan.root;
    const submitBtn = root.children!.find((c) => c.tag === 'ui-button');
    expect(submitBtn).toBeDefined();
    expect(getButtonLabel(submitBtn!)).toBe('Submit');
    expect(submitBtn!.attributes!['variant']).toBe('primary');
    expect(submitBtn!.attributes!['intent']).toBe('accent');
  });

  it('adds submit button with custom command', () => {
    const result = Planner.form([{ name: 'Name' }], { submitCommand: 'save-form' });
    const root = result.plan.root;
    const submitBtn = root.children!.find((c) => c.tag === 'ui-button');
    expect(submitBtn!.events!['ui-press']).toBe('save-form');
  });

  it('respects title option', () => {
    const result = Planner.form([{ name: 'Name' }], { title: 'Registration' });
    const root = result.plan.root;
    expect(root.attributes!['aria-label']).toBe('Registration');
  });

  it('respects submitLabel option', () => {
    const result = Planner.form([{ name: 'Name' }], { submitLabel: 'Register' });
    const root = result.plan.root;
    const submitBtn = root.children!.find((c) => c.tag === 'ui-button');
    expect(getButtonLabel(submitBtn!)).toBe('Register');
  });

  it('adds required attribute when field.required is true', () => {
    const result = Planner.form([{ name: 'Email', type: 'email', required: true }]);
    const root = result.plan.root;
    const field = root.children!.find((c) => c.tag === 'ui-field')!;
    const input = field.children!.find((c) => c.tag === 'ui-input');
    expect(input!.attributes!['required']).toBe('');
  });

  it('uses default text type when type is not specified', () => {
    const result = Planner.form([{ name: 'Name' }]);
    const root = result.plan.root;
    const field = root.children!.find((c) => c.tag === 'ui-field')!;
    const input = field.children!.find((c) => c.tag === 'ui-input');
    expect(input!.attributes!['type']).toBe('text');
  });
});

describe('Planner.actions() static builder', () => {
  it('creates button toolbar', () => {
    const result = Planner.actions([
      { label: 'Save', command: 'save' },
      { label: 'Cancel', command: 'cancel' },
    ]);
    const root = result.plan.root;
    // Single structural div becomes root
    expect(root.tag).toBe('div');
    expect(root.attributes!['role']).toBe('toolbar');
    expect(root.attributes!['style']).toContain('display: flex');
    expect(root.children).toHaveLength(2);
  });

  it('each button has correct label, command event, variant, and intent', () => {
    const result = Planner.actions([
      { label: 'Save', command: 'save-item', variant: 'primary', intent: 'accent' },
      { label: 'Delete', command: 'delete-item', variant: 'outline', intent: 'danger' },
    ]);
    const buttons = result.plan.root.children!;

    expect(getButtonLabel(buttons[0]!)).toBe('Save');
    expect(buttons[0]!.events!['ui-press']).toBe('save-item');
    expect(buttons[0]!.attributes!['variant']).toBe('primary');
    expect(buttons[0]!.attributes!['intent']).toBe('accent');

    expect(getButtonLabel(buttons[1]!)).toBe('Delete');
    expect(buttons[1]!.events!['ui-press']).toBe('delete-item');
    expect(buttons[1]!.attributes!['variant']).toBe('outline');
    expect(buttons[1]!.attributes!['intent']).toBe('danger');
  });

  it('uses default variant when not specified', () => {
    const result = Planner.actions([{ label: 'OK', command: 'ok' }]);
    const button = result.plan.root.children![0]!;
    expect(button.attributes!['variant']).toBe('default');
  });

  it('omits intent attribute when not specified', () => {
    const result = Planner.actions([{ label: 'OK', command: 'ok' }]);
    const button = result.plan.root.children![0]!;
    expect(button.attributes!['intent']).toBeUndefined();
  });

  it('buttons are wrapped in a container div with toolbar role', () => {
    const result = Planner.actions([
      { label: 'A', command: 'a' },
      { label: 'B', command: 'b' },
    ]);
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    expect(root.attributes!['role']).toBe('toolbar');
  });
});

describe('deep freeze', () => {
  it('PlanResult itself is frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('plan object is frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(Object.isFrozen(result.plan)).toBe(true);
  });

  it('plan root node is frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(Object.isFrozen(result.plan.root)).toBe(true);
  });

  it('plan root attributes are frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    if (result.plan.root.attributes) {
      expect(Object.isFrozen(result.plan.root.attributes)).toBe(true);
    }
  });

  it('child nodes are frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', label: 'A' },
      { component: 'ui-button', label: 'B' },
    ]));
    for (const child of result.plan.root.children!) {
      expect(Object.isFrozen(child)).toBe(true);
      if (child.attributes) {
        expect(Object.isFrozen(child.attributes)).toBe(true);
      }
    }
  });

  it('warnings array is frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });

  it('validation result is frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(Object.isFrozen(result.validation)).toBe(true);
  });

  it('accessibility result is frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    expect(Object.isFrozen(result.accessibility)).toBe(true);
  });

  it('deeply nested child nodes are frozen', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      {
        component: 'div',
        children: [
          {
            component: 'div',
            children: [{ component: 'span', label: 'text' }],
          },
        ],
      },
    ]));
    const inner = result.plan.root.children![0]!;
    expect(Object.isFrozen(inner)).toBe(true);
    const leaf = inner.children![0]!;
    expect(Object.isFrozen(leaf)).toBe(true);
  });
});

describe('ID generation', () => {
  it('IDs are based on tag names', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'ui-button', label: 'A' },
      { component: 'ui-input', label: 'B' },
    ]));
    const ids = result.plan.root.children!.map((c) => c.id);
    expect(ids[0]).toMatch(/^ui-button-/);
    expect(ids[1]).toMatch(/^ui-input-/);
  });

  it('ID counter resets between generate calls', () => {
    const planner = createPlanner();
    const result1 = planner.generate(simpleIntent([{ component: 'div' }]));
    const result2 = planner.generate(simpleIntent([{ component: 'div' }]));
    // Both should have the same ID pattern since counter resets
    expect(result1.plan.root.id).toBe(result2.plan.root.id);
  });

  it('IDs include sequential counter', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'span' },
      { component: 'span' },
      { component: 'span' },
    ]));
    const ids = result.plan.root.children!.map((c) => c.id);
    // First child should be span-0, second span-1, third span-2
    // (wrapper div takes the first ID from its position in the generation)
    expect(ids[0]).toMatch(/^span-\d+$/);
    expect(ids[1]).toMatch(/^span-\d+$/);
    expect(ids[2]).toMatch(/^span-\d+$/);
  });
});

describe('edge cases', () => {
  it('handles elements with no attributes, no properties, no events, no children', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([{ component: 'div' }]));
    const root = result.plan.root;
    expect(root.tag).toBe('div');
    expect(root.properties).toBeUndefined();
    expect(root.events).toBeUndefined();
    expect(root.textContent).toBeUndefined();
    expect(root.children).toBeUndefined();
  });

  it('handles empty children array by not including children key', () => {
    const planner = createPlanner();
    const result = planner.generate(simpleIntent([
      { component: 'div', children: [] },
    ]));
    const root = result.plan.root;
    // Empty children array is treated as no children
    expect(root.children).toBeUndefined();
  });

  it('handles Planner.form with empty fields array', () => {
    const result = Planner.form([]);
    const root = result.plan.root;
    expect(root.tag).toBe('form');
    // Should only have the submit button
    const buttons = root.children!.filter((c) => c.tag === 'ui-button');
    expect(buttons).toHaveLength(1);
  });

  it('handles Planner.actions with single button', () => {
    const result = Planner.actions([{ label: 'Done', command: 'done' }]);
    const root = result.plan.root;
    expect(root.children).toHaveLength(1);
    expect(getButtonLabel(root.children![0]!)).toBe('Done');
  });

  it('generates valid plan from Planner.form()', () => {
    const result = Planner.form([
      { name: 'Email', type: 'email', required: true },
    ]);
    expect(result.validation.valid).toBe(true);
  });

  it('generates valid plan from Planner.actions()', () => {
    const result = Planner.actions([
      { label: 'OK', command: 'confirm' },
    ]);
    expect(result.validation.valid).toBe(true);
  });
});

// ── New Quick Builder Tests ──

describe('Planner.card() static builder', () => {
  it('creates a ui-card root with body content', () => {
    const result = Planner.card({ body: 'Hello world' });
    const root = result.plan.root;
    // Single non-structural element (ui-card) is wrapped in a div
    expect(root.children).toHaveLength(1);
    const card = root.children![0]!;
    expect(card.tag).toBe('ui-card');
    // Body is a <p> child
    const body = card.children!.find((c) => c.tag === 'p');
    expect(body).toBeDefined();
    expect(body!.textContent).toBe('Hello world');
  });

  it('adds header slot when heading is provided', () => {
    const result = Planner.card({ heading: 'My Card', body: 'Content' });
    const card = result.plan.root.children![0]!;
    const header = card.children!.find((c) => c.slot === 'header');
    expect(header).toBeDefined();
    expect(header!.tag).toBe('div');
    // Header contains a span with heading text
    expect(header!.children![0]!.textContent).toBe('My Card');
  });

  it('adds media slot when media is provided', () => {
    const result = Planner.card({
      body: 'Content',
      media: { src: '/photo.jpg', alt: 'A photo', height: '12rem' },
    });
    const card = result.plan.root.children![0]!;
    const media = card.children!.find((c) => c.slot === 'media');
    expect(media).toBeDefined();
    expect(media!.tag).toBe('img');
    expect(media!.attributes!['src']).toBe('/photo.jpg');
    expect(media!.attributes!['alt']).toBe('A photo');
    expect(media!.attributes!['style']).toContain('12rem');
  });

  it('adds footer slot with action buttons', () => {
    const result = Planner.card({
      body: 'Content',
      footer: [
        { label: 'Cancel', command: 'cancel' },
        { label: 'Save', command: 'save', variant: 'primary', intent: 'accent' },
      ],
    });
    const card = result.plan.root.children![0]!;
    const footer = card.children!.find((c) => c.slot === 'footer');
    expect(footer).toBeDefined();
    expect(footer!.children).toHaveLength(2);
    expect(getButtonLabel(footer!.children![0]!)).toBe('Cancel');
    expect(getButtonLabel(footer!.children![1]!)).toBe('Save');
    expect(footer!.children![1]!.attributes!['variant']).toBe('primary');
  });

  it('sets interactive attribute when interactive is true', () => {
    const result = Planner.card({ body: 'Click me', interactive: true });
    const card = result.plan.root.children![0]!;
    expect(card.attributes!['interactive']).toBe('');
  });

  it('sets href and interactive attributes when href is provided', () => {
    const result = Planner.card({ body: 'Click me', href: '/details' });
    const card = result.plan.root.children![0]!;
    expect(card.attributes!['href']).toBe('/details');
    expect(card.attributes!['interactive']).toBe('');
  });

  it('generates a valid plan', () => {
    const result = Planner.card({
      heading: 'Title',
      body: 'Body text',
      footer: [{ label: 'OK', command: 'ok' }],
    });
    expect(result.validation.valid).toBe(true);
  });
});

describe('Planner.dialog() static builder', () => {
  it('creates a ui-dialog root with panel structure', () => {
    const result = Planner.dialog({
      title: 'Confirm Action',
      body: 'Are you sure?',
      confirmCommand: 'confirm',
    });
    const root = result.plan.root;
    // composite intent wraps in div
    const dialog = root.children![0]!;
    expect(dialog.tag).toBe('ui-dialog');
    // Dialog contains a styled panel div
    const panel = dialog.children![0]!;
    expect(panel.tag).toBe('div');
    expect(panel.attributes!['style']).toContain('background');
  });

  it('panel contains title, body, and action buttons', () => {
    const result = Planner.dialog({
      title: 'Delete Item',
      body: 'This cannot be undone.',
      confirmCommand: 'delete',
      cancelCommand: 'cancel',
    });
    const dialog = result.plan.root.children![0]!;
    const panel = dialog.children![0]!;
    const children = panel.children!;

    // h3 title
    const title = children.find((c) => c.tag === 'h3');
    expect(title).toBeDefined();
    expect(title!.textContent).toBe('Delete Item');

    // p body
    const body = children.find((c) => c.tag === 'p');
    expect(body).toBeDefined();
    expect(body!.textContent).toBe('This cannot be undone.');

    // button row
    const btnRow = children.find((c) => c.tag === 'div' && c.attributes?.['style']?.includes('flex-end'));
    expect(btnRow).toBeDefined();
    expect(btnRow!.children).toHaveLength(2);
  });

  it('confirm button has correct variant and intent', () => {
    const result = Planner.dialog({
      title: 'Confirm',
      body: 'Sure?',
      confirmCommand: 'confirm',
      intent: 'danger',
    });
    const dialog = result.plan.root.children![0]!;
    const panel = dialog.children![0]!;
    const btnRow = panel.children!.find((c) => c.tag === 'div' && c.attributes?.['style']?.includes('flex-end'));
    const confirmBtn = btnRow!.children![btnRow!.children!.length - 1]!;
    expect(confirmBtn.attributes!['variant']).toBe('primary');
    expect(confirmBtn.attributes!['intent']).toBe('danger');
    expect(confirmBtn.events!['ui-press']).toBe('confirm');
  });

  it('omits cancel button when cancelLabel and cancelCommand are not provided', () => {
    const result = Planner.dialog({
      title: 'Alert',
      body: 'Noted.',
      confirmCommand: 'ok',
    });
    const dialog = result.plan.root.children![0]!;
    const panel = dialog.children![0]!;
    const btnRow = panel.children!.find((c) => c.tag === 'div' && c.attributes?.['style']?.includes('flex-end'));
    // Only the confirm button
    expect(btnRow!.children).toHaveLength(1);
  });

  it('uses custom confirm and cancel labels', () => {
    const result = Planner.dialog({
      title: 'Confirm',
      body: 'Sure?',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'No, keep',
      confirmCommand: 'delete',
      cancelCommand: 'keep',
    });
    const dialog = result.plan.root.children![0]!;
    const panel = dialog.children![0]!;
    const btnRow = panel.children!.find((c) => c.tag === 'div' && c.attributes?.['style']?.includes('flex-end'));
    expect(getButtonLabel(btnRow!.children![0]!)).toBe('No, keep');
    expect(getButtonLabel(btnRow!.children![1]!)).toBe('Yes, delete');
  });

  it('generates a valid plan', () => {
    const result = Planner.dialog({
      title: 'Test',
      body: 'Testing',
      confirmCommand: 'confirm',
    });
    expect(result.validation.valid).toBe(true);
  });
});

describe('Planner.settings() static builder', () => {
  it('creates a vertical list of ui-switch elements', () => {
    const result = Planner.settings([
      { label: 'Notifications', name: 'notifications' },
      { label: 'Dark mode', name: 'dark-mode', checked: true },
    ]);
    const root = result.plan.root;
    // Single structural div as root
    const container = root.tag === 'div' && root.children ? root : root.children![0]!;
    expect(container.attributes!['style']).toContain('flex-direction: column');

    const switches = container.children!.filter((c) => c.tag === 'ui-switch');
    expect(switches).toHaveLength(2);
    expect(switches[0]!.textContent).toBe('Notifications');
    expect(switches[0]!.attributes!['name']).toBe('notifications');
    expect(switches[1]!.attributes!['checked']).toBe('');
  });

  it('wraps switches with description in a div', () => {
    const result = Planner.settings([
      { label: 'WiFi', name: 'wifi', description: 'Connect to wireless networks' },
    ]);
    const root = result.plan.root;
    const container = root.tag === 'div' && root.children ? root : root.children![0]!;
    // The switch is wrapped in a div with a description p
    const wrapper = container.children![0]!;
    expect(wrapper.tag).toBe('div');
    const switchEl = wrapper.children!.find((c) => c.tag === 'ui-switch');
    const desc = wrapper.children!.find((c) => c.tag === 'p');
    expect(switchEl).toBeDefined();
    expect(switchEl!.textContent).toBe('WiFi');
    expect(desc).toBeDefined();
    expect(desc!.textContent).toBe('Connect to wireless networks');
  });

  it('wires command events on switches', () => {
    const result = Planner.settings([
      { label: 'Sync', name: 'sync', command: 'toggle-sync' },
    ]);
    const root = result.plan.root;
    const container = root.tag === 'div' && root.children ? root : root.children![0]!;
    const switchEl = container.children![0]!;
    expect(switchEl.events!['ui-change']).toBe('toggle-sync');
  });

  it('respects title option', () => {
    const result = Planner.settings(
      [{ label: 'Opt', name: 'opt' }],
      { title: 'Preferences' },
    );
    // Title is applied as aria-label on the wrapper
    const root = result.plan.root;
    expect(root.attributes!['aria-label']).toBe('Preferences');
  });

  it('generates a valid plan', () => {
    const result = Planner.settings([
      { label: 'Test', name: 'test' },
    ]);
    expect(result.validation.valid).toBe(true);
  });
});

describe('Planner.tabs() static builder', () => {
  it('creates ui-tabs with ui-tab and ui-tab-panel children', () => {
    const result = Planner.tabs([
      { label: 'Overview', value: 'overview', content: 'Overview content' },
      { label: 'Details', value: 'details', content: 'Details content' },
    ]);
    const root = result.plan.root;
    // ui-tabs is not structural, so it's wrapped
    const tabs = root.tag === 'ui-tabs' ? root : root.children![0]!;
    expect(tabs.tag).toBe('ui-tabs');

    // Tab triggers
    const tabEls = tabs.children!.filter((c) => c.tag === 'ui-tab');
    expect(tabEls).toHaveLength(2);
    expect(tabEls[0]!.textContent).toBe('Overview');
    expect(tabEls[0]!.attributes!['value']).toBe('overview');
    expect(tabEls[1]!.textContent).toBe('Details');
    expect(tabEls[1]!.attributes!['value']).toBe('details');

    // Tab panels wrapped in ui-tab-panels container
    const panelsContainer = tabs.children!.find((c) => c.tag === 'ui-tab-panels');
    expect(panelsContainer).toBeDefined();
    const panelEls = panelsContainer!.children!.filter((c) => c.tag === 'ui-tab-panel');
    expect(panelEls).toHaveLength(2);
    expect(panelEls[0]!.attributes!['value']).toBe('overview');
    expect(panelEls[1]!.attributes!['value']).toBe('details');
  });

  it('defaults to first tab value', () => {
    const result = Planner.tabs([
      { label: 'A', value: 'a', content: 'A content' },
      { label: 'B', value: 'b', content: 'B content' },
    ]);
    const tabs = result.plan.root.tag === 'ui-tabs' ? result.plan.root : result.plan.root.children![0]!;
    expect(tabs.attributes!['value']).toBe('a');
  });

  it('respects defaultValue option', () => {
    const result = Planner.tabs(
      [
        { label: 'A', value: 'a', content: 'A' },
        { label: 'B', value: 'b', content: 'B' },
      ],
      { defaultValue: 'b' },
    );
    const tabs = result.plan.root.tag === 'ui-tabs' ? result.plan.root : result.plan.root.children![0]!;
    expect(tabs.attributes!['value']).toBe('b');
  });

  it('sets orientation attribute', () => {
    const result = Planner.tabs(
      [{ label: 'A', value: 'a', content: 'A' }],
      { orientation: 'vertical' },
    );
    const tabs = result.plan.root.tag === 'ui-tabs' ? result.plan.root : result.plan.root.children![0]!;
    expect(tabs.attributes!['orientation']).toBe('vertical');
  });

  it('marks disabled tabs', () => {
    const result = Planner.tabs([
      { label: 'Active', value: 'active', content: 'Content' },
      { label: 'Disabled', value: 'disabled', content: 'No access', disabled: true },
    ]);
    const tabs = result.plan.root.tag === 'ui-tabs' ? result.plan.root : result.plan.root.children![0]!;
    const tabEls = tabs.children!.filter((c) => c.tag === 'ui-tab');
    expect(tabEls[1]!.attributes!['disabled']).toBe('');
  });

  it('generates a valid plan', () => {
    const result = Planner.tabs([
      { label: 'Tab 1', value: 'tab1', content: 'Content 1' },
    ]);
    expect(result.validation.valid).toBe(true);
  });
});

describe('Planner.nav() static builder', () => {
  it('creates a ui-listbox with ui-option children', () => {
    const result = Planner.nav([
      { label: 'Home', value: 'home' },
      { label: 'Settings', value: 'settings' },
    ]);
    const root = result.plan.root;
    // ui-listbox is not structural → wrapped in div
    const listbox = root.tag === 'ui-listbox' ? root : root.children![0]!;
    expect(listbox.tag).toBe('ui-listbox');

    const options = listbox.children!.filter((c) => c.tag === 'ui-option');
    expect(options).toHaveLength(2);
    expect(options[0]!.textContent).toBe('Home');
    expect(options[0]!.attributes!['value']).toBe('home');
    expect(options[1]!.textContent).toBe('Settings');
  });

  it('groups items by group field using ui-option-group', () => {
    const result = Planner.nav([
      { label: 'Dashboard', value: 'dashboard', group: 'Main' },
      { label: 'Analytics', value: 'analytics', group: 'Main' },
      { label: 'Profile', value: 'profile', group: 'Account' },
    ]);
    const root = result.plan.root;
    const listbox = root.tag === 'ui-listbox' ? root : root.children![0]!;

    const groups = listbox.children!.filter((c) => c.tag === 'ui-option-group');
    expect(groups).toHaveLength(2);

    // First group: "Main"
    const mainGroup = groups[0]!;
    const mainHeading = mainGroup.children!.find((c) => c.slot === 'heading');
    expect(mainHeading).toBeDefined();
    expect(mainHeading!.textContent).toBe('Main');
    const mainOptions = mainGroup.children!.filter((c) => c.tag === 'ui-option');
    expect(mainOptions).toHaveLength(2);

    // Second group: "Account"
    const accountGroup = groups[1]!;
    const accountHeading = accountGroup.children!.find((c) => c.slot === 'heading');
    expect(accountHeading!.textContent).toBe('Account');
    const accountOptions = accountGroup.children!.filter((c) => c.tag === 'ui-option');
    expect(accountOptions).toHaveLength(1);
  });

  it('adds icons to options when icon is provided', () => {
    const result = Planner.nav([
      { label: 'Home', value: 'home', icon: 'house' },
    ]);
    const root = result.plan.root;
    const listbox = root.tag === 'ui-listbox' ? root : root.children![0]!;
    const option = listbox.children![0]!;
    expect(option.children).toBeDefined();
    const icon = option.children!.find((c) => c.tag === 'ui-icon');
    expect(icon).toBeDefined();
    expect(icon!.attributes!['name']).toBe('house');
    expect(icon!.attributes!['slot']).toBe('leading');
  });

  it('mixes grouped and ungrouped items', () => {
    const result = Planner.nav([
      { label: 'Home', value: 'home' },
      { label: 'Dashboard', value: 'dashboard', group: 'Main' },
    ]);
    const root = result.plan.root;
    const listbox = root.tag === 'ui-listbox' ? root : root.children![0]!;

    // First child: ungrouped ui-option
    const firstChild = listbox.children![0]!;
    expect(firstChild.tag).toBe('ui-option');
    expect(firstChild.textContent).toBe('Home');

    // Second child: grouped in ui-option-group
    const secondChild = listbox.children![1]!;
    expect(secondChild.tag).toBe('ui-option-group');
  });

  it('sets aria-label on listbox', () => {
    const result = Planner.nav(
      [{ label: 'Home', value: 'home' }],
      { title: 'Site Navigation' },
    );
    const root = result.plan.root;
    const listbox = root.tag === 'ui-listbox' ? root : root.children![0]!;
    expect(listbox.attributes!['aria-label']).toBe('Site Navigation');
  });

  it('uses default "Navigation" aria-label when no title', () => {
    const result = Planner.nav([{ label: 'Home', value: 'home' }]);
    const root = result.plan.root;
    const listbox = root.tag === 'ui-listbox' ? root : root.children![0]!;
    expect(listbox.attributes!['aria-label']).toBe('Navigation');
  });

  it('generates a valid plan', () => {
    const result = Planner.nav([
      { label: 'Home', value: 'home' },
    ]);
    expect(result.validation.valid).toBe(true);
  });
});
