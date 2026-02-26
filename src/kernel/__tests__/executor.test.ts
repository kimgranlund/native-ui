// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlanExecutor, createPlanExecutor } from '../executor.ts';
import { createCommandBus } from '../command-bus.ts';
import type { UIPlan, UINode, ComponentRegistration } from '../types.ts';

function makeRegistry(...tags: string[]): Map<string, ComponentRegistration> {
  const map = new Map<string, ComponentRegistration>();
  for (const tag of tags) {
    map.set(tag, { tag, elementClass: HTMLElement });
  }
  return map;
}

function makePlan(root: UINode, id = 'plan-test'): UIPlan {
  return { id, version: 1, root, source: 'generated', timestamp: Date.now() };
}

describe('PlanExecutor', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates via factory', () => {
    const executor = createPlanExecutor();
    expect(executor).toBeInstanceOf(PlanExecutor);
  });

  it('renders a simple tree', () => {
    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      children: [
        { id: 'heading', tag: 'h2', textContent: 'Hello' },
        { id: 'para', tag: 'p', textContent: 'World' },
      ],
    });

    const elements = executor.execute(plan, container, undefined, { allowUnregistered: true });
    expect(elements.size).toBe(3);
    expect(container.querySelector('h2')?.textContent).toBe('Hello');
    expect(container.querySelector('p')?.textContent).toBe('World');
  });

  it('sets attributes', () => {
    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      attributes: { 'data-testid': 'root', class: 'container' },
    });

    executor.execute(plan, container, undefined, { allowUnregistered: true });
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('root');
    expect(root.getAttribute('class')).toBe('container');
  });

  it('sets properties', () => {
    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      properties: { hidden: true },
    });

    executor.execute(plan, container, undefined, { allowUnregistered: true });
    const root = container.firstElementChild as HTMLElement;
    expect(root.hidden).toBe(true);
  });

  it('blocks dangerous properties', () => {
    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      properties: { innerHTML: '<script>alert(1)</script>' },
    });

    executor.execute(plan, container, undefined, { allowUnregistered: true });
    const root = container.firstElementChild as HTMLElement;
    expect(root.innerHTML).toBe('');
  });

  it('sets slot attribute', () => {
    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      children: [
        { id: 'label', tag: 'span', textContent: 'Label', slot: 'label' },
      ],
    });

    executor.execute(plan, container, undefined, { allowUnregistered: true });
    const span = container.querySelector('span')!;
    expect(span.getAttribute('slot')).toBe('label');
  });

  it('wires events to command bus', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('btn.click', handler);

    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      events: { click: 'btn.click' },
    });

    executor.execute(plan, container, bus, { allowUnregistered: true });
    const root = container.firstElementChild as HTMLElement;
    root.click();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].payload).toMatchObject({
      target: 'root',
      event: 'click',
    });
  });

  it('teardown removes elements and event listeners', () => {
    const bus = createCommandBus();
    const handler = vi.fn();
    bus.on('btn.click', handler);

    const executor = createPlanExecutor();
    const plan = makePlan({
      id: 'root',
      tag: 'div',
      events: { click: 'btn.click' },
    }, 'plan-teardown');

    executor.execute(plan, container, bus, { allowUnregistered: true });
    const root = container.firstElementChild as HTMLElement;

    executor.teardown('plan-teardown');
    expect(container.children.length).toBe(0);

    // Event listener should be removed via AbortController
    root.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws on invalid plan', () => {
    const executor = createPlanExecutor();
    const plan = makePlan({ id: 'root', tag: 'script' });

    expect(() => executor.execute(plan, container)).toThrow('Invalid plan');
  });

  it('renderNode renders a single node tree', () => {
    const executor = createPlanExecutor();
    const el = executor.renderNode({
      id: 'solo',
      tag: 'span',
      textContent: 'standalone',
      attributes: { class: 'highlight' },
    });
    expect(el.tagName).toBe('SPAN');
    expect(el.textContent).toBe('standalone');
    expect(el.getAttribute('class')).toBe('highlight');
  });

  it('textContent is not set when children are present', () => {
    const executor = createPlanExecutor();
    const el = executor.renderNode({
      id: 'parent',
      tag: 'div',
      textContent: 'should not appear',
      children: [
        { id: 'child', tag: 'span', textContent: 'child text' },
      ],
    });
    expect(el.textContent).toBe('child text');
  });

  it('validates against registry', () => {
    const registry = makeRegistry('ui-button');
    const executor = createPlanExecutor(registry);

    // Registered element — should work
    const plan1 = makePlan({ id: 'btn', tag: 'ui-button' }, 'p1');
    expect(() => executor.execute(plan1, container)).not.toThrow();

    // Unregistered element — should fail
    const plan2 = makePlan({ id: 'sel', tag: 'ui-select' }, 'p2');
    expect(() => executor.execute(plan2, container)).toThrow('Invalid plan');
  });
});
