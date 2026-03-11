// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { validatePlan, validateNode } from '../schema.ts';
import type { UIPlan, UINode, ComponentRegistration } from '../types.ts';

function makeRegistry(...tags: string[]): Map<string, ComponentRegistration> {
  const map = new Map<string, ComponentRegistration>();
  for (const tag of tags) {
    map.set(tag, { tag, elementClass: HTMLElement });
  }
  return map;
}

function makePlan(root: UINode): UIPlan {
  return {
    id: 'plan-test',
    version: 1,
    root,
    source: 'generated',
    timestamp: Date.now(),
  };
}

describe('validatePlan', () => {
  it('accepts valid plan with HTML tags', () => {
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      children: [
        { id: 'heading', tag: 'h2', textContent: 'Hello' },
        { id: 'para', tag: 'p', textContent: 'World' },
      ],
    });
    const result = validatePlan(plan, makeRegistry());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts valid plan with registered custom elements', () => {
    const registry = makeRegistry('n-button', 'n-select');
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      children: [
        { id: 'btn', tag: 'n-button', attributes: { variant: 'primary' } },
        { id: 'sel', tag: 'n-select', attributes: { placeholder: 'Pick' } },
      ],
    });
    const result = validatePlan(plan, registry);
    expect(result.valid).toBe(true);
  });

  it('rejects unregistered custom elements', () => {
    const result = validatePlan(
      makePlan({ id: 'root', tag: 'n-unknown' }),
      makeRegistry(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('unknown_tag');
  });

  it('allows unregistered when option set', () => {
    const result = validatePlan(
      makePlan({ id: 'root', tag: 'n-unknown' }),
      makeRegistry(),
      { allowUnregistered: true },
    );
    expect(result.valid).toBe(true);
  });

  it('rejects forbidden tags', () => {
    for (const tag of ['script', 'iframe', 'style', 'link', 'object', 'embed']) {
      const result = validatePlan(
        makePlan({ id: 'root', tag }),
        makeRegistry(),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'forbidden_tag')).toBe(true);
    }
  });

  it('rejects duplicate IDs', () => {
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      children: [
        { id: 'same', tag: 'div' },
        { id: 'same', tag: 'span' },
      ],
    });
    const result = validatePlan(plan, makeRegistry());
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('duplicate_id');
  });

  it('rejects excessive nesting depth', () => {
    // Build a chain of 25 levels
    let node: UINode = { id: 'leaf', tag: 'span', textContent: 'deep' };
    for (let i = 24; i >= 0; i--) {
      node = { id: `level-${i}`, tag: 'div', children: [node] };
    }
    const result = validatePlan(makePlan(node), makeRegistry());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'max_depth_exceeded')).toBe(true);
  });

  it('accepts exactly max depth', () => {
    // Build a chain of exactly 20 levels (depth 0..19, children at depth 20 triggers)
    let node: UINode = { id: 'leaf', tag: 'span' };
    for (let i = 19; i >= 0; i--) {
      node = { id: `level-${i}`, tag: 'div', children: [node] };
    }
    const result = validatePlan(makePlan(node), makeRegistry());
    expect(result.valid).toBe(true);
  });

  it('rejects non-string attribute values', () => {
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      attributes: { 'data-count': 42 as unknown as string },
    });
    const result = validatePlan(plan, makeRegistry());
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('invalid_attribute_type');
  });

  it('collects multiple errors', () => {
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      children: [
        { id: 'a', tag: 'script' },
        { id: 'a', tag: 'div' }, // duplicate ID
      ],
    });
    const result = validatePlan(plan, makeRegistry());
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateNode', () => {
  it('validates a single node', () => {
    const errors = validateNode(
      { id: 'btn', tag: 'n-button' },
      makeRegistry('n-button'),
    );
    expect(errors).toEqual([]);
  });

  it('returns errors for invalid node', () => {
    const errors = validateNode(
      { id: 'bad', tag: 'script' },
      makeRegistry(),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
