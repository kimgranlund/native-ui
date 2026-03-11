// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Kernel, getKernel, resetKernel } from '../kernel.ts';
import { CommandBus } from '../command-bus.ts';
import { CommandHistory } from '../command-history.ts';
import { OverlayManager } from '../overlay-manager.ts';
import { FocusRouter } from '../focus-router.ts';
import { PlanExecutor } from '../executor.ts';
import { EventLog, PerfMetrics } from '../observability.ts';
import { DataStore } from '../data-runtime.ts';
import type { UIPlan } from '../types.ts';

describe('Kernel', () => {
  afterEach(() => {
    resetKernel();
  });

  it('creates directly', () => {
    const k = new Kernel();
    expect(k.bus).toBeInstanceOf(CommandBus);
    expect(k.history).toBeInstanceOf(CommandHistory);
    expect(k.overlays).toBeInstanceOf(OverlayManager);
    expect(k.focus).toBeInstanceOf(FocusRouter);
    expect(k.executor).toBeInstanceOf(PlanExecutor);
    expect(k.log).toBeInstanceOf(EventLog);
    expect(k.perf).toBeInstanceOf(PerfMetrics);
    expect(k.data).toBeInstanceOf(DataStore);
  });

  it('getKernel returns singleton', () => {
    const a = getKernel();
    const b = getKernel();
    expect(a).toBe(b);
  });

  it('resetKernel creates fresh instance', () => {
    const a = getKernel();
    resetKernel();
    const b = getKernel();
    expect(a).not.toBe(b);
  });

  it('registry starts empty', () => {
    const k = new Kernel();
    expect(k.registry.value.size).toBe(0);
  });

  it('register adds to registry', () => {
    const k = new Kernel();
    k.register('n-button', HTMLElement);
    expect(k.registry.value.has('n-button')).toBe(true);
    expect(k.registry.value.get('n-button')!.elementClass).toBe(HTMLElement);
  });

  it('register lowercases tag', () => {
    const k = new Kernel();
    k.register('N-Button', HTMLElement);
    expect(k.registry.value.has('n-button')).toBe(true);
  });

  it('register with formAssociated', () => {
    const k = new Kernel();
    k.register('n-input', HTMLElement, { formAssociated: true });
    expect(k.registry.value.get('n-input')!.formAssociated).toBe(true);
  });

  it('registerAndDefine calls customElements.define', () => {
    const k = new Kernel();
    // Create a minimal custom element class
    class TestEl extends HTMLElement {}
    const tag = `n-test-${Math.random().toString(36).slice(2, 6)}`;
    k.registerAndDefine(tag, TestEl);

    expect(k.registry.value.has(tag)).toBe(true);
    expect(customElements.get(tag)).toBe(TestEl);
  });

  it('history middleware auto-records undoable commands', () => {
    const k = new Kernel();
    k.bus.dispatch('test.action', 'data', { undoType: 'test.undo' });
    expect(k.history.canUndo.value).toBe(true);
    expect(k.history.undoStack.value.length).toBe(1);
  });

  it('history does not record non-undoable commands', () => {
    const k = new Kernel();
    k.bus.dispatch('test.fire', 'data');
    expect(k.history.canUndo.value).toBe(false);
  });

  it('executePlan renders to container', () => {
    const k = new Kernel({ allowUnregistered: true });
    const container = document.createElement('div');
    document.body.appendChild(container);

    const plan: UIPlan = {
      id: 'plan-1',
      version: 1,
      root: { id: 'root', tag: 'div', textContent: 'Hello Kernel' },
      source: 'generated',
      timestamp: Date.now(),
    };

    const elements = k.executePlan(plan, container);
    expect(elements.size).toBe(1);
    expect(container.firstElementChild!.textContent).toBe('Hello Kernel');

    container.remove();
  });

  it('executePlan wires events to kernel bus', () => {
    const k = new Kernel({ allowUnregistered: true });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handler = vi.fn();
    k.bus.on('btn.pressed', handler);

    const plan: UIPlan = {
      id: 'plan-2',
      version: 1,
      root: {
        id: 'root',
        tag: 'div',
        events: { click: 'btn.pressed' },
      },
      source: 'generated',
      timestamp: Date.now(),
    };

    k.executePlan(plan, container);
    (container.firstElementChild as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();

    container.remove();
  });

  it('executePlan rejects invalid plan without allowUnregistered', () => {
    const k = new Kernel();
    const container = document.createElement('div');

    const plan: UIPlan = {
      id: 'plan-3',
      version: 1,
      root: { id: 'root', tag: 'n-not-registered' },
      source: 'generated',
      timestamp: Date.now(),
    };

    expect(() => k.executePlan(plan, container)).toThrow('Invalid plan');
  });

  it('executePlan logs to EventLog', () => {
    const k = new Kernel({ allowUnregistered: true });
    const container = document.createElement('div');
    document.body.appendChild(container);

    const plan: UIPlan = {
      id: 'plan-log',
      version: 1,
      root: { id: 'root', tag: 'div', textContent: 'Logged' },
      source: 'generated',
      timestamp: Date.now(),
    };

    k.executePlan(plan, container);
    const planLogs = k.log.query({ category: 'plan' });
    expect(planLogs.length).toBe(1);
    expect(planLogs[0]!.planId).toBe('plan-log');

    container.remove();
  });

  it('executePlan records perf metrics', () => {
    const k = new Kernel({ allowUnregistered: true });
    const container = document.createElement('div');
    document.body.appendChild(container);

    const plan: UIPlan = {
      id: 'plan-perf',
      version: 1,
      root: { id: 'root', tag: 'div', textContent: 'Timed' },
      source: 'generated',
      timestamp: Date.now(),
    };

    k.executePlan(plan, container);
    const summary = k.perf.getSummary('plan:execute');
    expect(summary).not.toBeNull();
    expect(summary!.count).toBe(1);

    container.remove();
  });

  it('commands auto-log to EventLog', () => {
    const k = new Kernel();
    k.bus.dispatch('test.logged', 'payload');
    const cmdLogs = k.log.query({ category: 'command' });
    expect(cmdLogs.length).toBe(1);
    expect(cmdLogs[0]!.summary).toContain('test.logged');
  });

  it('validatePlanAccessibility checks a11y', () => {
    const k = new Kernel();
    const plan: UIPlan = {
      id: 'a11y-test',
      version: 1,
      root: { id: 'btn', tag: 'button' },
      source: 'generated',
      timestamp: Date.now(),
    };
    const result = k.validatePlanAccessibility(plan);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.rule === 'interactive-needs-name')).toBe(true);
  });

  it('patchPlan applies patch and logs', () => {
    const k = new Kernel({ allowUnregistered: true });
    const container = document.createElement('div');
    document.body.appendChild(container);

    const plan: UIPlan = {
      id: 'patch-test',
      version: 1,
      root: { id: 'root', tag: 'div', textContent: 'Original' },
      source: 'generated',
      timestamp: Date.now(),
    };

    k.executePlan(plan, container);

    const result = k.patchPlan({
      planId: 'patch-test',
      ops: [{ type: 'set-text', targetId: 'root', text: 'Patched' }],
      source: 'generated',
      timestamp: Date.now(),
    });

    expect(result.applied).toBe(1);
    expect(container.firstElementChild!.textContent).toBe('Patched');

    const patchLogs = k.log.query({ category: 'patch' });
    expect(patchLogs.length).toBe(1);

    container.remove();
  });

  it('teardownPlan logs teardown', () => {
    const k = new Kernel({ allowUnregistered: true });
    const container = document.createElement('div');
    document.body.appendChild(container);

    const plan: UIPlan = {
      id: 'teardown-test',
      version: 1,
      root: { id: 'root', tag: 'div', textContent: 'Bye' },
      source: 'generated',
      timestamp: Date.now(),
    };

    k.executePlan(plan, container);
    k.teardownPlan('teardown-test');

    const planLogs = k.log.query({ category: 'plan' });
    const teardownLog = planLogs.find(e => e.summary.includes('teardown'));
    expect(teardownLog).toBeDefined();

    container.remove();
  });

  it('destroy cleans up subsystems', () => {
    const k = new Kernel();
    k.bus.dispatch('test', null, { undoType: 'undo' });
    expect(k.history.canUndo.value).toBe(true);
    k.destroy();
    expect(k.history.canUndo.value).toBe(false);
    expect(k.log.size.value).toBe(0);
  });
});
