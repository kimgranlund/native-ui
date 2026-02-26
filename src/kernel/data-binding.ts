import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import { effect } from '../reactivity/effect.ts';
import { uid } from '../core/uid.ts';
import { createBinding } from './data-runtime.ts';
import type { ReadonlySignal } from '../reactivity/types.ts';
import type { DataStore, DataBinding } from './data-runtime.ts';
import type { CommandBus } from './command-bus.ts';

// ── Node Binding ──

export interface NodeBinding {
  readonly source: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly headers?: Readonly<Record<string, string>>;
  readonly target: 'textContent' | 'attribute' | 'property' | 'children';
  readonly targetName?: string;
  readonly transform?: string;
  readonly cacheTtl?: number;
  readonly refreshInterval?: number;
}

// ── Active Binding ──

export interface ActiveBinding {
  readonly id: string;
  readonly planId: string;
  readonly nodeId: string;
  readonly binding: NodeBinding;
  readonly dispose: () => void;
}

// ── Path Resolver ──

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ── Cache Key ──

function cacheKeyFor(binding: DataBinding): string {
  return binding.cacheKey ?? `${binding.method ?? 'GET'}:${binding.source}`;
}

// ── Internal Dispose Record ──

interface DisposeRecord {
  readonly effectDispose: () => void;
  readonly intervalId: ReturnType<typeof setInterval> | undefined;
}

// ── Binding Manager ──

export class BindingManager {
  #data: DataStore;
  #bindings = signal<readonly ActiveBinding[]>([]);
  #disposeRecords = new Map<string, DisposeRecord>();
  #planIndex = new Map<string, Set<string>>();

  readonly activeBindings: ReadonlySignal<readonly ActiveBinding[]> = computed(
    () => this.#bindings.value,
  );

  constructor(data: DataStore) {
    this.#data = data;
  }

  // ── Bind Single Element ──

  bind(
    planId: string,
    nodeId: string,
    element: HTMLElement,
    binding: NodeBinding,
    bus?: CommandBus,
  ): ActiveBinding {
    const dataBinding = createBinding(binding.source, {
      method: binding.method,
      headers: binding.headers,
      cacheTtl: binding.cacheTtl,
    });

    const dataSignal = this.#data.query(dataBinding);

    // Effect: sync data to element
    const disposeEffect = effect(() => {
      const raw = dataSignal.value;
      if (raw === null) return;

      const value = binding.transform
        ? resolvePath(raw, binding.transform)
        : raw;

      switch (binding.target) {
        case 'textContent':
          element.textContent = String(value ?? '');
          break;
        case 'attribute':
          if (binding.targetName && value != null) {
            element.setAttribute(binding.targetName, String(value));
          }
          break;
        case 'property':
          if (binding.targetName) {
            (element as unknown as Record<string, unknown>)[binding.targetName] = value;
          }
          break;
        case 'children':
          if (Array.isArray(value)) {
            this.#renderChildren(element, value, bus);
          }
          break;
      }
    });

    // Auto-refresh interval
    const bindingId = uid('dbind');
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (binding.refreshInterval && binding.refreshInterval > 0) {
      intervalId = setInterval(() => {
        this.#data.invalidate(cacheKeyFor(dataBinding));
        this.#data.query(dataBinding);
      }, binding.refreshInterval);
    }

    // Store dispose record
    this.#disposeRecords.set(bindingId, { effectDispose: disposeEffect, intervalId });

    // Public dispose tears down and removes from tracking
    const dispose = (): void => {
      this.#teardownBinding(bindingId);
      this.#bindings.value = this.#bindings.value.filter((b) => b.id !== bindingId);
      this.#removePlanEntry(planId, bindingId);
    };

    const active: ActiveBinding = Object.freeze({
      id: bindingId,
      planId,
      nodeId,
      binding,
      dispose,
    });

    // Track by plan
    let planSet = this.#planIndex.get(planId);
    if (!planSet) {
      planSet = new Set();
      this.#planIndex.set(planId, planSet);
    }
    planSet.add(bindingId);

    // Update signal
    this.#bindings.value = [...this.#bindings.value, active];

    return active;
  }

  // ── Bind All Plan Nodes ──

  bindPlan(
    planId: string,
    elements: Map<string, HTMLElement>,
    bindings: ReadonlyMap<string, NodeBinding>,
    bus?: CommandBus,
  ): readonly ActiveBinding[] {
    const results: ActiveBinding[] = [];

    for (const [nodeId, binding] of bindings) {
      const element = elements.get(nodeId);
      if (!element) continue;
      results.push(this.bind(planId, nodeId, element, binding, bus));
    }

    return Object.freeze(results);
  }

  // ── Unbind Plan ──

  unbindPlan(planId: string): void {
    const ids = this.#planIndex.get(planId);
    if (!ids) return;

    // Tear down effects and intervals
    for (const id of ids) {
      this.#teardownBinding(id);
    }

    // Batch-remove from signal
    this.#bindings.value = this.#bindings.value.filter((b) => !ids.has(b.id));
    this.#planIndex.delete(planId);
  }

  // ── Unbind Single ──

  unbind(bindingId: string): void {
    const active = this.#bindings.value.find((b) => b.id === bindingId);
    if (!active) return;
    active.dispose();
  }

  // ── Refresh ──

  refresh(planId: string): void {
    const current = this.#bindings.value;

    for (const active of current) {
      if (active.planId !== planId) continue;

      const dataBinding = createBinding(active.binding.source, {
        method: active.binding.method,
        headers: active.binding.headers,
        cacheTtl: active.binding.cacheTtl,
      });

      this.#data.invalidate(cacheKeyFor(dataBinding));
      this.#data.query(dataBinding);
    }
  }

  // ── Destroy ──

  destroy(): void {
    // Tear down all effects and intervals
    for (const id of this.#disposeRecords.keys()) {
      this.#teardownBinding(id);
    }

    this.#bindings.value = [];
    this.#planIndex.clear();
  }

  // ── Private: Tear Down a Single Binding ──

  #teardownBinding(bindingId: string): void {
    const record = this.#disposeRecords.get(bindingId);
    if (!record) return;

    record.effectDispose();
    if (record.intervalId !== undefined) {
      clearInterval(record.intervalId);
    }

    this.#disposeRecords.delete(bindingId);
  }

  // ── Private: Remove Plan Index Entry ──

  #removePlanEntry(planId: string, bindingId: string): void {
    const ids = this.#planIndex.get(planId);
    if (!ids) return;
    ids.delete(bindingId);
    if (ids.size === 0) this.#planIndex.delete(planId);
  }

  // ── Private: Render Children ──

  #renderChildren(
    parent: HTMLElement,
    items: unknown[],
    _bus?: CommandBus,
  ): void {
    parent.innerHTML = '';

    for (const item of items) {
      if (item == null) continue;

      const el = document.createElement('div');

      if (typeof item === 'string') {
        el.textContent = item;
      } else if (typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        el.textContent = String(
          obj.label ?? obj.name ?? obj.title ?? JSON.stringify(obj),
        );
        if (obj.value != null) {
          el.setAttribute('data-value', String(obj.value));
        }
      }

      parent.appendChild(el);
    }
  }
}

// ── Factory ──

export function createBindingManager(data: DataStore): BindingManager {
  return new BindingManager(data);
}
