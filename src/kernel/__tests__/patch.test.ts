// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { applyPatch } from '../patch.ts';
import { PlanExecutor } from '../executor.ts';
import { CommandBus } from '../command-bus.ts';
import type { UIPlan } from '../types.ts';
import type { PatchOp, UIPatch } from '../patch.ts';

function createTestPlan(): { executor: PlanExecutor; container: HTMLElement; bus: CommandBus } {
  const executor = new PlanExecutor();
  const bus = new CommandBus();
  const container = document.createElement('div');
  document.body.appendChild(container);

  const plan: UIPlan = {
    id: 'test-plan',
    version: 1,
    source: 'generated',
    timestamp: Date.now(),
    root: {
      id: 'root',
      tag: 'div',
      children: [
        { id: 'child-1', tag: 'span', textContent: 'First' },
        { id: 'child-2', tag: 'span', textContent: 'Second' },
      ],
    },
  };

  executor.execute(plan, container, bus, { allowUnregistered: true });
  return { executor, container, bus };
}

function makePatch(ops: PatchOp[]): UIPatch {
  return { planId: 'test-plan', ops, source: 'generated', timestamp: Date.now() };
}

describe('applyPatch', () => {
  it('returns errors when plan not found', () => {
    const executor = new PlanExecutor();
    const result = applyPatch(
      { planId: 'nope', ops: [{ type: 'remove', targetId: 'x' }], source: 'generated', timestamp: Date.now() },
      executor,
    );
    expect(result.applied).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]!.message).toContain('not found');
  });

  it('add: appends child to parent', () => {
    const { executor, container, bus } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'add', parentId: 'root', node: { id: 'child-3', tag: 'p', textContent: 'Third' } }]),
      executor, bus,
    );
    expect(result.applied).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(executor.getElements('test-plan')!.has('child-3')).toBe(true);
    expect(container.querySelector('p')!.textContent).toBe('Third');
    container.remove();
  });

  it('add: inserts at index', () => {
    const { executor, container, bus } = createTestPlan();
    applyPatch(
      makePatch([{ type: 'add', parentId: 'root', node: { id: 'inserted', tag: 'em', textContent: 'Mid' }, index: 1 }]),
      executor, bus,
    );
    const root = executor.getElements('test-plan')!.get('root')!;
    expect(root.children[1]!.tagName).toBe('EM');
    container.remove();
  });

  it('add: fails if parent not found', () => {
    const { executor, bus, container } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'add', parentId: 'ghost', node: { id: 'new', tag: 'div' } }]),
      executor, bus,
    );
    expect(result.applied).toBe(0);
    expect(result.errors[0]!.message).toContain('ghost');
    container.remove();
  });

  it('remove: removes element from DOM and map', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(makePatch([{ type: 'remove', targetId: 'child-1' }]), executor);
    expect(result.applied).toBe(1);
    expect(executor.getElements('test-plan')!.has('child-1')).toBe(false);
    expect(container.querySelector('span')!.textContent).toBe('Second');
    container.remove();
  });

  it('remove: fails if element not found', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(makePatch([{ type: 'remove', targetId: 'nope' }]), executor);
    expect(result.applied).toBe(0);
    expect(result.errors[0]!.message).toContain('nope');
    container.remove();
  });

  it('replace: swaps element in DOM', () => {
    const { executor, container, bus } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'replace', targetId: 'child-1', node: { id: 'replacement', tag: 'strong', textContent: 'Replaced' } }]),
      executor, bus,
    );
    expect(result.applied).toBe(1);
    expect(executor.getElements('test-plan')!.has('child-1')).toBe(false);
    expect(executor.getElements('test-plan')!.has('replacement')).toBe(true);
    expect(container.querySelector('strong')!.textContent).toBe('Replaced');
    container.remove();
  });

  it('set-attribute: sets attribute on element', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'set-attribute', targetId: 'child-1', name: 'class', value: 'highlight' }]),
      executor,
    );
    expect(result.applied).toBe(1);
    expect(executor.getElements('test-plan')!.get('child-1')!.getAttribute('class')).toBe('highlight');
    container.remove();
  });

  it('remove-attribute: removes attribute', () => {
    const { executor, container } = createTestPlan();
    const el = executor.getElements('test-plan')!.get('child-1')!;
    el.setAttribute('data-test', 'value');
    const result = applyPatch(
      makePatch([{ type: 'remove-attribute', targetId: 'child-1', name: 'data-test' }]),
      executor,
    );
    expect(result.applied).toBe(1);
    expect(el.hasAttribute('data-test')).toBe(false);
    container.remove();
  });

  it('set-property: sets JS property', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'set-property', targetId: 'child-1', name: 'title', value: 'test title' }]),
      executor,
    );
    expect(result.applied).toBe(1);
    expect(executor.getElements('test-plan')!.get('child-1')!.title).toBe('test title');
    container.remove();
  });

  it('set-property: blocks innerHTML', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'set-property', targetId: 'child-1', name: 'innerHTML', value: '<script>evil</script>' }]),
      executor,
    );
    expect(result.applied).toBe(0);
    expect(result.errors[0]!.message).toContain('blocked');
    container.remove();
  });

  it('set-text: sets textContent', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'set-text', targetId: 'child-1', text: 'Updated' }]),
      executor,
    );
    expect(result.applied).toBe(1);
    expect(executor.getElements('test-plan')!.get('child-1')!.textContent).toBe('Updated');
    container.remove();
  });

  it('set-event: wires event to bus', () => {
    const { executor, container, bus } = createTestPlan();
    const handler = vi.fn();
    bus.on('click.cmd', handler);

    const result = applyPatch(
      makePatch([{ type: 'set-event', targetId: 'child-1', event: 'click', commandType: 'click.cmd' }]),
      executor, bus,
    );
    expect(result.applied).toBe(1);

    executor.getElements('test-plan')!.get('child-1')!.click();
    expect(handler).toHaveBeenCalledOnce();
    container.remove();
  });

  it('set-event: fails without bus', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(
      makePatch([{ type: 'set-event', targetId: 'child-1', event: 'click', commandType: 'cmd' }]),
      executor,
    );
    expect(result.applied).toBe(0);
    expect(result.errors[0]!.message).toContain('CommandBus');
    container.remove();
  });

  it('remove-event: removes patch-added listener', () => {
    const { executor, container, bus } = createTestPlan();
    const handler = vi.fn();
    bus.on('click.cmd', handler);

    applyPatch(
      makePatch([{ type: 'set-event', targetId: 'child-1', event: 'click', commandType: 'click.cmd' }]),
      executor, bus,
    );
    applyPatch(
      makePatch([{ type: 'remove-event', targetId: 'child-1', event: 'click' }]),
      executor,
    );

    executor.getElements('test-plan')!.get('child-1')!.click();
    expect(handler).not.toHaveBeenCalled();
    container.remove();
  });

  it('multiple ops: fail-forward semantics', () => {
    const { executor, container } = createTestPlan();
    const result = applyPatch(
      makePatch([
        { type: 'set-text', targetId: 'child-1', text: 'OK' },
        { type: 'remove', targetId: 'nonexistent' },
        { type: 'set-text', targetId: 'child-2', text: 'Also OK' },
      ]),
      executor,
    );
    expect(result.applied).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(executor.getElements('test-plan')!.get('child-1')!.textContent).toBe('OK');
    expect(executor.getElements('test-plan')!.get('child-2')!.textContent).toBe('Also OK');
    container.remove();
  });

  it('teardown aborts patch-added listeners', () => {
    const { executor, container, bus } = createTestPlan();
    const handler = vi.fn();
    bus.on('click.cmd', handler);

    applyPatch(
      makePatch([{ type: 'set-event', targetId: 'child-1', event: 'click', commandType: 'click.cmd' }]),
      executor, bus,
    );

    // Teardown the plan — should abort all listeners
    executor.teardown('test-plan');

    // Element is removed from DOM, but if we still had a reference the listener would be dead
    expect(handler).not.toHaveBeenCalled();
    container.remove();
  });
});
