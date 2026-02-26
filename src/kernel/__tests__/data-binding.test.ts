// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BindingManager, createBindingManager } from '../data-binding.ts';
import { signal } from '../../reactivity/signal.ts';
import type { NodeBinding } from '../data-binding.ts';
import type { DataStore, DataBinding } from '../data-runtime.ts';

// ── Mock DataStore ──

function createMockDataStore() {
  const signals = new Map<string, ReturnType<typeof signal>>();
  return {
    query: vi.fn((binding: DataBinding) => {
      const key = `${binding.method ?? 'GET'}:${binding.source}`;
      if (!signals.has(key)) signals.set(key, signal(null));
      return signals.get(key)!;
    }),
    invalidate: vi.fn(),
    // Helper: set data for a binding
    _setData(source: string, data: unknown, method = 'GET') {
      const key = `${method}:${source}`;
      if (!signals.has(key)) signals.set(key, signal(null));
      signals.get(key)!.value = data;
    },
    // Helper: get signal for inspection
    _getSignal(source: string, method = 'GET') {
      return signals.get(`${method}:${source}`);
    },
  };
}

type MockDataStore = ReturnType<typeof createMockDataStore>;

// ── Helpers ──

function makeElement(tag = 'div'): HTMLElement {
  return document.createElement(tag);
}

function textBinding(source: string, overrides?: Partial<NodeBinding>): NodeBinding {
  return { source, target: 'textContent', ...overrides };
}

function attrBinding(source: string, targetName: string, overrides?: Partial<NodeBinding>): NodeBinding {
  return { source, target: 'attribute', targetName, ...overrides };
}

function propBinding(source: string, targetName: string, overrides?: Partial<NodeBinding>): NodeBinding {
  return { source, target: 'property', targetName, ...overrides };
}

function childrenBinding(source: string, overrides?: Partial<NodeBinding>): NodeBinding {
  return { source, target: 'children', ...overrides };
}

// ── Tests ──

describe('BindingManager', () => {
  let mockStore: MockDataStore;
  let manager: BindingManager;

  beforeEach(() => {
    mockStore = createMockDataStore();
    manager = new BindingManager(mockStore as unknown as DataStore);
  });

  afterEach(() => {
    manager.destroy();
  });

  // ── Factory ──

  describe('createBindingManager', () => {
    it('creates a BindingManager instance', () => {
      const m = createBindingManager(mockStore as unknown as DataStore);
      expect(m).toBeInstanceOf(BindingManager);
      m.destroy();
    });
  });

  // ── bind() ──

  describe('bind()', () => {
    it('returns a frozen ActiveBinding', () => {
      const el = makeElement();
      const binding = textBinding('/api/name');
      const active = manager.bind('plan-1', 'node-1', el, binding);

      expect(active.id).toMatch(/^dbind-/);
      expect(active.planId).toBe('plan-1');
      expect(active.nodeId).toBe('node-1');
      expect(active.binding).toBe(binding);
      expect(typeof active.dispose).toBe('function');
      expect(Object.isFrozen(active)).toBe(true);
    });

    it('calls DataStore.query with correct binding', () => {
      const el = makeElement();
      const binding = textBinding('/api/users', { method: 'POST', headers: { 'X-Key': 'abc' }, cacheTtl: 5000 });
      manager.bind('plan-1', 'node-1', el, binding);

      expect(mockStore.query).toHaveBeenCalledOnce();
      const dataBinding = mockStore.query.mock.calls[0]![0] as DataBinding;
      expect(dataBinding.source).toBe('/api/users');
      expect(dataBinding.method).toBe('POST');
      expect(dataBinding.headers).toEqual({ 'X-Key': 'abc' });
      expect(dataBinding.cacheTtl).toBe(5000);
    });

    it('updates element textContent when signal changes', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/name'));

      expect(el.textContent).toBe('');
      mockStore._setData('/api/name', 'Alice');
      expect(el.textContent).toBe('Alice');
    });

    it('converts non-string values to string for textContent', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/count'));

      mockStore._setData('/api/count', 42);
      expect(el.textContent).toBe('42');
    });

    it('uses empty string for null/undefined textContent after transform', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/data', { transform: 'missing.path' }));

      mockStore._setData('/api/data', { other: 'value' });
      expect(el.textContent).toBe('');
    });

    it('updates element attribute when signal changes', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, attrBinding('/api/color', 'data-color'));

      mockStore._setData('/api/color', 'red');
      expect(el.getAttribute('data-color')).toBe('red');
    });

    it('does not set attribute when targetName is missing', () => {
      const el = makeElement();
      const binding: NodeBinding = { source: '/api/data', target: 'attribute' };
      manager.bind('plan-1', 'node-1', el, binding);

      mockStore._setData('/api/data', 'value');
      expect(el.attributes.length).toBe(0);
    });

    it('does not set attribute when value is null', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, attrBinding('/api/data', 'data-val', { transform: 'missing' }));

      mockStore._setData('/api/data', { other: 'x' });
      expect(el.hasAttribute('data-val')).toBe(false);
    });

    it('updates element property when signal changes', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, propBinding('/api/flag', 'hidden'));

      mockStore._setData('/api/flag', true);
      expect((el as unknown as Record<string, unknown>).hidden).toBe(true);
    });

    it('does not set property when targetName is missing', () => {
      const el = makeElement();
      const binding: NodeBinding = { source: '/api/data', target: 'property' };
      manager.bind('plan-1', 'node-1', el, binding);

      // Should not throw
      mockStore._setData('/api/data', 'value');
    });

    it('renders children from array of strings', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/items'));

      mockStore._setData('/api/items', ['Apple', 'Banana', 'Cherry']);
      expect(el.children.length).toBe(3);
      expect(el.children[0]!.textContent).toBe('Apple');
      expect(el.children[1]!.textContent).toBe('Banana');
      expect(el.children[2]!.textContent).toBe('Cherry');
    });

    it('renders children from array of objects with label', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/options'));

      mockStore._setData('/api/options', [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
      ]);

      expect(el.children.length).toBe(2);
      expect(el.children[0]!.textContent).toBe('One');
      expect(el.children[0]!.getAttribute('data-value')).toBe('1');
      expect(el.children[1]!.textContent).toBe('Two');
      expect(el.children[1]!.getAttribute('data-value')).toBe('2');
    });

    it('renders children preferring label > name > title > JSON', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/items'));

      mockStore._setData('/api/items', [
        { label: 'Label' },
        { name: 'Name' },
        { title: 'Title' },
        { x: 1, y: 2 },
      ]);

      expect(el.children[0]!.textContent).toBe('Label');
      expect(el.children[1]!.textContent).toBe('Name');
      expect(el.children[2]!.textContent).toBe('Title');
      expect(el.children[3]!.textContent).toBe(JSON.stringify({ x: 1, y: 2 }));
    });

    it('skips null items in children array', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/items'));

      mockStore._setData('/api/items', ['a', null, 'b', undefined, 'c']);
      expect(el.children.length).toBe(3);
    });

    it('clears existing children before rendering new ones', () => {
      const el = makeElement();
      el.innerHTML = '<span>old</span>';
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/items'));

      mockStore._setData('/api/items', ['new']);
      expect(el.children.length).toBe(1);
      expect(el.children[0]!.tagName).toBe('DIV');
      expect(el.children[0]!.textContent).toBe('new');
    });

    it('does not render children when value is not an array', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/data'));

      mockStore._setData('/api/data', 'not-an-array');
      expect(el.children.length).toBe(0);
    });

    it('does nothing when signal value is null (initial state)', () => {
      const el = makeElement();
      el.textContent = 'unchanged';
      manager.bind('plan-1', 'node-1', el, textBinding('/api/pending'));

      // Signal value is null by default — the effect should early-return
      expect(el.textContent).toBe('unchanged');
    });

    it('adds binding to activeBindings signal', () => {
      expect(manager.activeBindings.value).toEqual([]);

      const el = makeElement();
      const active = manager.bind('plan-1', 'node-1', el, textBinding('/api/name'));

      expect(manager.activeBindings.value).toHaveLength(1);
      expect(manager.activeBindings.value[0]).toBe(active);
    });

    it('accumulates multiple bindings in activeBindings', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('plan-1', 'node-1', el1, textBinding('/api/a'));
      manager.bind('plan-1', 'node-2', el2, textBinding('/api/b'));

      expect(manager.activeBindings.value).toHaveLength(2);
    });
  });

  // ── transform (path resolution) ──

  describe('transform (path resolution)', () => {
    it('resolves a simple property path', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/user', { transform: 'name' }));

      mockStore._setData('/api/user', { name: 'Alice', age: 30 });
      expect(el.textContent).toBe('Alice');
    });

    it('resolves nested property paths', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/user', { transform: 'address.city' }));

      mockStore._setData('/api/user', { address: { city: 'Berlin', zip: '10115' } });
      expect(el.textContent).toBe('Berlin');
    });

    it('resolves array indices with bracket notation', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/data', { transform: 'items[0].title' }));

      mockStore._setData('/api/data', { items: [{ title: 'First' }, { title: 'Second' }] });
      expect(el.textContent).toBe('First');
    });

    it('resolves deep nested array access', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/data', { transform: 'a[1].b[0].c' }));

      mockStore._setData('/api/data', { a: [null, { b: [{ c: 'deep' }] }] });
      expect(el.textContent).toBe('deep');
    });

    it('returns undefined for missing paths', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/data', { transform: 'x.y.z' }));

      mockStore._setData('/api/data', { a: 1 });
      expect(el.textContent).toBe('');
    });

    it('returns undefined when traversing through a primitive', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, textBinding('/api/data', { transform: 'name.first' }));

      mockStore._setData('/api/data', { name: 'Alice' });
      expect(el.textContent).toBe('');
    });

    it('applies transform to children binding', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, childrenBinding('/api/data', { transform: 'results' }));

      mockStore._setData('/api/data', { results: ['a', 'b', 'c'], count: 3 });
      expect(el.children.length).toBe(3);
    });

    it('applies transform to attribute binding', () => {
      const el = makeElement();
      manager.bind('plan-1', 'node-1', el, attrBinding('/api/data', 'title', { transform: 'meta.tooltip' }));

      mockStore._setData('/api/data', { meta: { tooltip: 'Hello' } });
      expect(el.getAttribute('title')).toBe('Hello');
    });
  });

  // ── bindPlan() ──

  describe('bindPlan()', () => {
    it('binds all elements with matching nodeIds', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      const elements = new Map([
        ['node-a', el1],
        ['node-b', el2],
      ]);
      const bindings = new Map<string, NodeBinding>([
        ['node-a', textBinding('/api/title')],
        ['node-b', textBinding('/api/subtitle')],
      ]);

      const actives = manager.bindPlan('plan-1', elements, bindings);

      expect(actives).toHaveLength(2);
      expect(Object.isFrozen(actives)).toBe(true);
      expect(manager.activeBindings.value).toHaveLength(2);
    });

    it('skips bindings with no matching element', () => {
      const el = makeElement();
      const elements = new Map([['node-a', el]]);
      const bindings = new Map<string, NodeBinding>([
        ['node-a', textBinding('/api/title')],
        ['node-missing', textBinding('/api/subtitle')],
      ]);

      const actives = manager.bindPlan('plan-1', elements, bindings);

      expect(actives).toHaveLength(1);
      expect(actives[0]!.nodeId).toBe('node-a');
    });

    it('returns empty array when no elements match', () => {
      const elements = new Map<string, HTMLElement>();
      const bindings = new Map<string, NodeBinding>([
        ['node-a', textBinding('/api/title')],
      ]);

      const actives = manager.bindPlan('plan-1', elements, bindings);
      expect(actives).toHaveLength(0);
    });

    it('all plan bindings share the same planId', () => {
      const elements = new Map([
        ['n1', makeElement()],
        ['n2', makeElement()],
      ]);
      const bindings = new Map<string, NodeBinding>([
        ['n1', textBinding('/api/a')],
        ['n2', textBinding('/api/b')],
      ]);

      const actives = manager.bindPlan('my-plan', elements, bindings);
      for (const a of actives) {
        expect(a.planId).toBe('my-plan');
      }
    });
  });

  // ── unbindPlan() ──

  describe('unbindPlan()', () => {
    it('removes all bindings for a plan', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('plan-1', 'n1', el1, textBinding('/api/a'));
      manager.bind('plan-1', 'n2', el2, textBinding('/api/b'));

      expect(manager.activeBindings.value).toHaveLength(2);

      manager.unbindPlan('plan-1');
      expect(manager.activeBindings.value).toHaveLength(0);
    });

    it('does not affect bindings from other plans', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('plan-A', 'n1', el1, textBinding('/api/a'));
      manager.bind('plan-B', 'n2', el2, textBinding('/api/b'));

      manager.unbindPlan('plan-A');
      expect(manager.activeBindings.value).toHaveLength(1);
      expect(manager.activeBindings.value[0]!.planId).toBe('plan-B');
    });

    it('is safe to call with unknown planId', () => {
      expect(() => manager.unbindPlan('nonexistent')).not.toThrow();
    });

    it('stops updating element after unbind', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/name'));

      mockStore._setData('/api/name', 'before');
      expect(el.textContent).toBe('before');

      manager.unbindPlan('plan-1');

      // Update the signal again — should NOT reach the element
      mockStore._setData('/api/name', 'after');
      expect(el.textContent).toBe('before');
    });
  });

  // ── unbind() (single) ──

  describe('unbind()', () => {
    it('removes a single binding by id', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      const a1 = manager.bind('plan-1', 'n1', el1, textBinding('/api/a'));
      manager.bind('plan-1', 'n2', el2, textBinding('/api/b'));

      expect(manager.activeBindings.value).toHaveLength(2);

      manager.unbind(a1.id);
      expect(manager.activeBindings.value).toHaveLength(1);
      expect(manager.activeBindings.value[0]!.nodeId).toBe('n2');
    });

    it('is safe to call with unknown bindingId', () => {
      expect(() => manager.unbind('nonexistent')).not.toThrow();
    });

    it('stops updating element after unbind', () => {
      const el = makeElement();
      const active = manager.bind('plan-1', 'n1', el, textBinding('/api/val'));

      mockStore._setData('/api/val', 'first');
      expect(el.textContent).toBe('first');

      manager.unbind(active.id);

      mockStore._setData('/api/val', 'second');
      expect(el.textContent).toBe('first');
    });

    it('removes plan index entry when last binding is removed', () => {
      const el = makeElement();
      const active = manager.bind('plan-1', 'n1', el, textBinding('/api/a'));

      manager.unbind(active.id);

      // Calling unbindPlan should be safe (plan is already gone)
      expect(() => manager.unbindPlan('plan-1')).not.toThrow();
      expect(manager.activeBindings.value).toHaveLength(0);
    });
  });

  // ── dispose() on ActiveBinding ──

  describe('ActiveBinding.dispose()', () => {
    it('removes the binding from active list', () => {
      const el = makeElement();
      const active = manager.bind('plan-1', 'n1', el, textBinding('/api/a'));

      active.dispose();
      expect(manager.activeBindings.value).toHaveLength(0);
    });

    it('stops updating the element', () => {
      const el = makeElement();
      const active = manager.bind('plan-1', 'n1', el, textBinding('/api/a'));

      mockStore._setData('/api/a', 'live');
      expect(el.textContent).toBe('live');

      active.dispose();

      mockStore._setData('/api/a', 'dead');
      expect(el.textContent).toBe('live');
    });
  });

  // ── refresh() ──

  describe('refresh()', () => {
    it('calls invalidate and re-queries for all bindings in a plan', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('plan-1', 'n1', el1, textBinding('/api/a'));
      manager.bind('plan-1', 'n2', el2, textBinding('/api/b'));

      // query was called twice during bind
      expect(mockStore.query).toHaveBeenCalledTimes(2);

      manager.refresh('plan-1');

      expect(mockStore.invalidate).toHaveBeenCalledTimes(2);
      // query called 2 more times during refresh
      expect(mockStore.query).toHaveBeenCalledTimes(4);
    });

    it('does not affect bindings from other plans', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('plan-A', 'n1', el1, textBinding('/api/a'));
      manager.bind('plan-B', 'n2', el2, textBinding('/api/b'));

      manager.refresh('plan-A');

      // Only plan-A's binding should be invalidated (1 invalidate call)
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);
    });

    it('is safe to call with unknown planId', () => {
      expect(() => manager.refresh('nonexistent')).not.toThrow();
    });

    it('invalidates with the correct cache key', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/items', { method: 'POST' }));

      manager.refresh('plan-1');

      expect(mockStore.invalidate).toHaveBeenCalledWith('POST:/api/items');
    });
  });

  // ── activeBindings signal ──

  describe('activeBindings signal', () => {
    it('starts empty', () => {
      expect(manager.activeBindings.value).toEqual([]);
    });

    it('grows as bindings are added', () => {
      const el = makeElement();
      manager.bind('p', 'n1', el, textBinding('/api/a'));
      expect(manager.activeBindings.value).toHaveLength(1);

      manager.bind('p', 'n2', makeElement(), textBinding('/api/b'));
      expect(manager.activeBindings.value).toHaveLength(2);
    });

    it('shrinks as bindings are removed', () => {
      const el = makeElement();
      const a1 = manager.bind('p', 'n1', el, textBinding('/api/a'));
      manager.bind('p', 'n2', makeElement(), textBinding('/api/b'));

      a1.dispose();
      expect(manager.activeBindings.value).toHaveLength(1);
    });

    it('is empty after destroy()', () => {
      manager.bind('p', 'n1', makeElement(), textBinding('/api/a'));
      manager.bind('p', 'n2', makeElement(), textBinding('/api/b'));

      manager.destroy();
      expect(manager.activeBindings.value).toEqual([]);
    });
  });

  // ── destroy() ──

  describe('destroy()', () => {
    it('removes all bindings', () => {
      manager.bind('p1', 'n1', makeElement(), textBinding('/api/a'));
      manager.bind('p2', 'n2', makeElement(), textBinding('/api/b'));

      manager.destroy();
      expect(manager.activeBindings.value).toEqual([]);
    });

    it('stops all effects', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('p1', 'n1', el1, textBinding('/api/a'));
      manager.bind('p2', 'n2', el2, textBinding('/api/b'));

      mockStore._setData('/api/a', 'alive');
      mockStore._setData('/api/b', 'alive');
      expect(el1.textContent).toBe('alive');
      expect(el2.textContent).toBe('alive');

      manager.destroy();

      mockStore._setData('/api/a', 'dead');
      mockStore._setData('/api/b', 'dead');
      expect(el1.textContent).toBe('alive');
      expect(el2.textContent).toBe('alive');
    });

    it('is safe to call multiple times', () => {
      manager.bind('p', 'n1', makeElement(), textBinding('/api/a'));
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  // ── refreshInterval ──

  describe('refreshInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-refreshes at the specified interval', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/poll', { refreshInterval: 1000 }));

      // Initial query during bind
      expect(mockStore.query).toHaveBeenCalledTimes(1);
      expect(mockStore.invalidate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);
      expect(mockStore.query).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(1000);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(2);
      expect(mockStore.query).toHaveBeenCalledTimes(3);
    });

    it('stops auto-refresh after dispose', () => {
      const el = makeElement();
      const active = manager.bind('plan-1', 'n1', el, textBinding('/api/poll', { refreshInterval: 500 }));

      vi.advanceTimersByTime(500);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);

      active.dispose();

      vi.advanceTimersByTime(5000);
      // Should still be 1 — no more calls after dispose
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);
    });

    it('stops auto-refresh after unbindPlan', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/poll', { refreshInterval: 300 }));

      vi.advanceTimersByTime(300);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);

      manager.unbindPlan('plan-1');

      vi.advanceTimersByTime(3000);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);
    });

    it('stops auto-refresh after destroy', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/poll', { refreshInterval: 200 }));

      vi.advanceTimersByTime(200);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);

      manager.destroy();

      vi.advanceTimersByTime(2000);
      expect(mockStore.invalidate).toHaveBeenCalledTimes(1);
    });

    it('does not set interval when refreshInterval is 0', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/data', { refreshInterval: 0 }));

      vi.advanceTimersByTime(10000);
      expect(mockStore.invalidate).not.toHaveBeenCalled();
    });

    it('does not set interval when refreshInterval is undefined', () => {
      const el = makeElement();
      manager.bind('plan-1', 'n1', el, textBinding('/api/data'));

      vi.advanceTimersByTime(10000);
      expect(mockStore.invalidate).not.toHaveBeenCalled();
    });
  });

  // ── HTTP method forwarding ──

  describe('HTTP method forwarding', () => {
    it('forwards GET method (default)', () => {
      const el = makeElement();
      manager.bind('p', 'n', el, textBinding('/api/data'));

      const dataBinding = mockStore.query.mock.calls[0]![0] as DataBinding;
      expect(dataBinding.method).toBeUndefined();
    });

    it('forwards explicit method', () => {
      const el = makeElement();
      manager.bind('p', 'n', el, textBinding('/api/data', { method: 'PUT' }));

      const dataBinding = mockStore.query.mock.calls[0]![0] as DataBinding;
      expect(dataBinding.method).toBe('PUT');
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('multiple bindings to the same source share signals', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('p', 'n1', el1, textBinding('/api/shared'));
      manager.bind('p', 'n2', el2, textBinding('/api/shared'));

      mockStore._setData('/api/shared', 'hello');
      expect(el1.textContent).toBe('hello');
      expect(el2.textContent).toBe('hello');
    });

    it('bindings to different methods create different signals', () => {
      const el1 = makeElement();
      const el2 = makeElement();
      manager.bind('p', 'n1', el1, textBinding('/api/data'));
      manager.bind('p', 'n2', el2, textBinding('/api/data', { method: 'POST' }));

      mockStore._setData('/api/data', 'get-data');
      expect(el1.textContent).toBe('get-data');
      expect(el2.textContent).toBe(''); // POST signal is separate

      mockStore._setData('/api/data', 'post-data', 'POST');
      expect(el2.textContent).toBe('post-data');
    });

    it('handles data update from object to new object', () => {
      const el = makeElement();
      manager.bind('p', 'n', el, textBinding('/api/name', { transform: 'name' }));

      mockStore._setData('/api/name', { name: 'Alice' });
      expect(el.textContent).toBe('Alice');

      mockStore._setData('/api/name', { name: 'Bob' });
      expect(el.textContent).toBe('Bob');
    });

    it('children rendering replaces on subsequent updates', () => {
      const el = makeElement();
      manager.bind('p', 'n', el, childrenBinding('/api/items'));

      mockStore._setData('/api/items', ['a', 'b']);
      expect(el.children.length).toBe(2);

      mockStore._setData('/api/items', ['x', 'y', 'z']);
      expect(el.children.length).toBe(3);
      expect(el.children[0]!.textContent).toBe('x');
    });

    it('objects without value do not get data-value attribute', () => {
      const el = makeElement();
      manager.bind('p', 'n', el, childrenBinding('/api/items'));

      mockStore._setData('/api/items', [{ label: 'No Value' }]);
      expect(el.children[0]!.textContent).toBe('No Value');
      expect(el.children[0]!.hasAttribute('data-value')).toBe(false);
    });
  });
});
