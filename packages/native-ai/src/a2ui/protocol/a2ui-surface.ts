/**
 * A2UI Surface Manager
 *
 * Manages A2UI surface lifecycle: create → updateComponents → updateDataModel → delete.
 * Each surface maps to one UIPlan in the kernel.
 */

import { signal, computed, effect, uid } from '@nonoun/native-core';
import type { Signal, ReadonlySignal, Dispose } from '@nonoun/native-core';
import type {
  A2UIServerMessage,
  A2UIActionMessage,
  A2UIComponent,
  A2UICreateSurface,
  A2UIUpdateComponents,
  A2UIUpdateDataModel,
  A2UIDeleteSurface,
} from './a2ui-types.ts';
import {
  isCreateSurface,
  isUpdateComponents,
  isUpdateDataModel,
  isDeleteSurface,
} from './a2ui-types.ts';
import type { DataBindingEntry } from './a2ui-converter.ts';
import { a2uiToUINode, conversionToPlan } from './a2ui-converter.ts';
import type { ComponentRegistry } from './a2ui-component-map.ts';
import type { A2UIKernelBridge as Kernel } from './kernel-bridge.ts';
import type { PatchOp } from './kernel-bridge.ts';

// ── Surface State ──

export interface SurfaceState {
  readonly surfaceId: string;
  readonly planId: string;
  readonly catalogId?: string;
  readonly theme?: Readonly<Record<string, string>>;
  readonly container: HTMLElement;
  readonly rendered: boolean;
}

interface SurfaceRecord {
  surfaceId: string;
  planId: string;
  catalogId?: string;
  theme?: Readonly<Record<string, string>>;
  container: HTMLElement;
  components: A2UIComponent[];
  dataModel: Signal<Record<string, unknown>>;
  bindings: Map<string, readonly DataBindingEntry[]>;
  bindingDisposers: Dispose[];
  actionDisposer: Dispose | null;
  rendered: boolean;
}

// ── JSON Pointer (RFC 6901) ──

export function resolveJsonPointer(data: unknown, pointer: string): unknown {
  if (!pointer || pointer === '/') return data;
  const parts = pointer.replace(/^\//, '').split('/').map(unescapePointer);
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function setJsonPointer(data: Record<string, unknown>, pointer: string, value: unknown): void {
  if (!pointer || pointer === '/') return;
  const parts = pointer.replace(/^\//, '').split('/').map(unescapePointer);
  let current: Record<string, unknown> = data;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] == null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1];
  if (value === undefined) {
    delete current[lastPart];
  } else {
    current[lastPart] = value;
  }
}

function unescapePointer(s: string): string {
  return s.replace(/~1/g, '/').replace(/~0/g, '~');
}

// ── Surface Manager ──

export class SurfaceManager {
  #kernel: Kernel;
  #onAction: (msg: A2UIActionMessage) => void;
  #onRender: ((surfaceId: string, container: HTMLElement) => void) | null;
  #registry: ComponentRegistry | undefined;
  #surfaces = new Map<string, SurfaceRecord>();
  #surfaceCount: Signal<number> = signal(0);

  readonly surfaceCount: ReadonlySignal<number> = computed(() => this.#surfaceCount.value);

  constructor(
    kernel: Kernel,
    onAction: (msg: A2UIActionMessage) => void,
    onRender?: (surfaceId: string, container: HTMLElement) => void,
    registry?: ComponentRegistry,
  ) {
    this.#kernel = kernel;
    this.#onAction = onAction;
    this.#onRender = onRender ?? null;
    this.#registry = registry;
  }

  // ── Message Dispatch ──

  handleMessage(msg: A2UIServerMessage, container?: HTMLElement): void {
    if (isCreateSurface(msg)) {
      this.#handleCreateSurface(msg, container);
    } else if (isUpdateComponents(msg)) {
      this.#handleUpdateComponents(msg, container);
    } else if (isUpdateDataModel(msg)) {
      this.#handleUpdateDataModel(msg);
    } else if (isDeleteSurface(msg)) {
      this.#handleDeleteSurface(msg);
    }
  }

  // ── Create Surface ──

  #handleCreateSurface(msg: A2UICreateSurface, container?: HTMLElement): void {
    const { surfaceId, catalogId, theme } = msg.createSurface;

    // If surface already exists with components, just update metadata
    const existing = this.#surfaces.get(surfaceId);
    if (existing) {
      existing.catalogId = catalogId;
      existing.theme = theme;
      return;
    }

    // Create surface record (components will come via updateComponents)
    const record: SurfaceRecord = {
      surfaceId,
      planId: uid('a2ui-plan'),
      catalogId,
      theme,
      container: container ?? document.createElement('div'),
      components: [],
      dataModel: signal({}),
      bindings: new Map(),
      bindingDisposers: [],
      actionDisposer: null,
      rendered: false,
    };

    this.#surfaces.set(surfaceId, record);
    this.#surfaceCount.value = this.#surfaces.size;
  }

  // ── Update Components ──

  #handleUpdateComponents(msg: A2UIUpdateComponents, container?: HTMLElement): void {
    const { surfaceId, components } = msg.updateComponents;

    let record = this.#surfaces.get(surfaceId);

    // Auto-create surface if not yet created (A2UI allows components before createSurface)
    if (!record) {
      record = {
        surfaceId,
        planId: uid('a2ui-plan'),
        container: container ?? document.createElement('div'),
        components: [],
        dataModel: signal({}),
        bindings: new Map(),
        bindingDisposers: [],
        actionDisposer: null,
        rendered: false,
      };
      this.#surfaces.set(surfaceId, record);
      this.#surfaceCount.value = this.#surfaces.size;
    } else if (container) {
      record.container = container;
    }

    if (!record.rendered) {
      // First render: convert and execute
      record.components = [...components];
      this.#renderSurface(record);
    } else {
      // Incremental update: diff and patch
      this.#patchSurface(record, components);
      record.components = [...components];
    }

    if (record.rendered) {
      this.#onRender?.(record.surfaceId, record.container);
    }
  }

  #renderSurface(record: SurfaceRecord): void {
    const conversion = a2uiToUINode(record.components, {
      surfaceId: record.surfaceId,
      registry: this.#registry,
    });

    // Store bindings
    record.bindings = new Map(conversion.bindings);

    // Build and execute plan
    const plan = conversionToPlan(conversion);
    record.planId = plan.id;

    try {
      const elements = this.#kernel.executePlan(plan, record.container);
      record.rendered = true;

      // Wire data bindings
      this.#wireDataBindings(record, elements);

      // Wire action routing
      this.#wireActionRouting(record);
    } catch (_e) {
      // Plan validation failed — surface stays unrendered
    }
  }

  #patchSurface(record: SurfaceRecord, newComponents: readonly A2UIComponent[]): void {
    const ops = diffComponents(record.components, newComponents, record.surfaceId, this.#registry);
    if (ops.length === 0) return;

    this.#kernel.patchPlan({
      planId: record.planId,
      ops,
      source: 'generated',
      timestamp: Date.now(),
    });

    // Re-convert to update bindings
    const conversion = a2uiToUINode(newComponents, {
      surfaceId: record.surfaceId,
      registry: this.#registry,
    });
    record.bindings = new Map(conversion.bindings);

    // Re-wire data bindings
    for (const d of record.bindingDisposers) d();
    record.bindingDisposers = [];
    const elements = this.#kernel.executor.getElements(record.planId);
    if (elements) this.#wireDataBindings(record, elements);
  }

  // ── Update Data Model ──

  #handleUpdateDataModel(msg: A2UIUpdateDataModel): void {
    const { surfaceId, path, value } = msg.updateDataModel;
    const record = this.#surfaces.get(surfaceId);
    if (!record) return;

    const current = { ...record.dataModel.value };

    if (!path || path === '/') {
      // Replace entire data model
      record.dataModel.value = (value as Record<string, unknown>) ?? {};
    } else {
      // Set at path
      setJsonPointer(current, path, value);
      record.dataModel.value = current;
    }
  }

  // ── Delete Surface ──

  #handleDeleteSurface(msg: A2UIDeleteSurface): void {
    const { surfaceId } = msg.deleteSurface;
    const record = this.#surfaces.get(surfaceId);
    if (!record) return;

    // Teardown plan
    if (record.rendered) {
      this.#kernel.teardownPlan(record.planId);
    }

    // Dispose bindings
    for (const d of record.bindingDisposers) d();
    record.bindingDisposers = [];

    // Dispose action routing
    record.actionDisposer?.();

    this.#surfaces.delete(surfaceId);
    this.#surfaceCount.value = this.#surfaces.size;
  }

  // ── Data Binding Wiring ──

  #wireDataBindings(
    record: SurfaceRecord,
    elements: Map<string, HTMLElement>,
  ): void {
    for (const [nodeId, entries] of record.bindings) {
      const el = elements.get(nodeId);
      if (!el) continue;

      for (const entry of entries) {
        const dispose = effect(() => {
          const data = record.dataModel.value;
          const resolved = resolveJsonPointer(data, entry.path);
          if (resolved === undefined) return;

          if (entry.property === 'textContent') {
            el.textContent = String(resolved);
          } else if (entry.property === 'src' || entry.property === 'alt' || entry.property.startsWith('aria-')) {
            el.setAttribute(entry.property, String(resolved));
          } else {
            (el as unknown as Record<string, unknown>)[entry.property] = resolved;
          }
        });
        record.bindingDisposers.push(dispose);
      }
    }
  }

  // ── Action Routing ──

  #wireActionRouting(record: SurfaceRecord): void {
    const prefix = `a2ui:${record.surfaceId}:`;

    record.actionDisposer = this.#kernel.bus.on(
      (cmd) => cmd.type.startsWith(prefix),
      (cmd) => {
        const parts = cmd.type.split(':');
        if (parts.length < 4) return;
        const componentId = parts[2];
        const eventName = parts[3];

        // Resolve action context from the original component's action definition
        const comp = record.components.find((c) => c.id === componentId);
        const contextDef = comp?.action?.event?.context;
        const resolvedContext = contextDef
          ? resolveActionContext(contextDef, record.dataModel.value)
          : undefined;

        this.#onAction({
          action: {
            surfaceId: record.surfaceId,
            sourceComponentId: componentId,
            name: eventName,
            timestamp: new Date().toISOString(),
            ...(resolvedContext ? { context: resolvedContext } : {}),
          },
        });
      },
    );
  }

  // ── Getters ──

  getSurface(surfaceId: string): SurfaceState | null {
    const record = this.#surfaces.get(surfaceId);
    if (!record) return null;
    return {
      surfaceId: record.surfaceId,
      planId: record.planId,
      catalogId: record.catalogId,
      theme: record.theme,
      container: record.container,
      rendered: record.rendered,
    };
  }

  getSurfaceIds(): readonly string[] {
    return Array.from(this.#surfaces.keys());
  }

  getDataModel(surfaceId: string): Record<string, unknown> | null {
    return this.#surfaces.get(surfaceId)?.dataModel.value ?? null;
  }

  // ── Lifecycle ──

  destroy(): void {
    for (const surfaceId of this.#surfaces.keys()) {
      this.#handleDeleteSurface({ deleteSurface: { surfaceId } });
    }
  }
}

// ── Action Context Resolution ──

function resolveActionContext(
  context: Readonly<Record<string, unknown>>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(context)) {
    if (val !== null && typeof val === 'object' && 'path' in val) {
      resolved[key] = resolveJsonPointer(data, (val as { path: string }).path);
    } else {
      resolved[key] = val;
    }
  }
  return resolved;
}

// ── Diffable Properties ──

/** A2UI properties that map to HTML attributes on the rendered element. */
const DIFFABLE_ATTRIBUTES: readonly string[] = [
  'variant', 'placeholder', 'name', 'min', 'max', 'step',
  'src', 'alt', 'poster', 'fit', 'style', 'intent',
];

/** A2UI properties that map to JS properties (not attributes) on the rendered element. */
const DIFFABLE_PROPERTIES: readonly string[] = [
  'value',
];

// ── Component Diffing ──

export function diffComponents(
  oldComponents: readonly A2UIComponent[],
  newComponents: readonly A2UIComponent[],
  surfaceId: string,
  registry?: ComponentRegistry,
): readonly PatchOp[] {
  const oldIndex = new Map<string, A2UIComponent>();
  for (const c of oldComponents) oldIndex.set(c.id, c);

  const newIndex = new Map<string, A2UIComponent>();
  for (const c of newComponents) newIndex.set(c.id, c);

  const ops: PatchOp[] = [];

  // Removed components
  for (const [id] of oldIndex) {
    if (!newIndex.has(id)) {
      ops.push({ type: 'remove', targetId: id });
    }
  }

  // Added components — find their parent in the new component list
  for (const [id, comp] of newIndex) {
    if (!oldIndex.has(id)) {
      const parent = findParent(id, newComponents);
      if (parent) {
        const conversion = a2uiToUINode([comp], { surfaceId, rootId: id, registry });
        ops.push({ type: 'add', parentId: parent, node: conversion.root });
      }
    }
  }

  // Changed components
  for (const [id, newComp] of newIndex) {
    const oldComp = oldIndex.get(id);
    if (!oldComp) continue;

    // Component type changed — full replace needed
    if (newComp.component !== oldComp.component) {
      const relevantComponents = collectSubtree(id, newComponents);
      const conversion = a2uiToUINode(relevantComponents, { surfaceId, rootId: id, registry });
      ops.push({ type: 'replace', targetId: id, node: conversion.root });
      continue;
    }

    // Check children changes — if the children list itself changed, replace the subtree
    const oldChildren = JSON.stringify(oldComp.children ?? oldComp.child ?? []);
    const newChildren = JSON.stringify(newComp.children ?? newComp.child ?? []);
    if (oldChildren !== newChildren) {
      const relevantComponents = collectSubtree(id, newComponents);
      const conversion = a2uiToUINode(relevantComponents, { surfaceId, rootId: id, registry });
      ops.push({ type: 'replace', targetId: id, node: conversion.root });
      continue;
    }

    // Text changes (string textContent)
    if (newComp.text !== oldComp.text && typeof newComp.text === 'string') {
      ops.push({ type: 'set-text', targetId: id, text: newComp.text });
    }

    // Label changes (for textContent components)
    if (newComp.label !== oldComp.label && typeof newComp.label === 'string') {
      ops.push({ type: 'set-text', targetId: id, text: newComp.label });
    }

    // Disabled changes
    if (newComp.disabled !== oldComp.disabled) {
      if (newComp.disabled) {
        ops.push({ type: 'set-attribute', targetId: id, name: 'disabled', value: '' });
      } else {
        ops.push({ type: 'remove-attribute', targetId: id, name: 'disabled' });
      }
    }

    // Attribute-mapped properties
    for (const attr of DIFFABLE_ATTRIBUTES) {
      const oldVal = oldComp[attr];
      const newVal = newComp[attr];
      if (newVal !== oldVal) {
        if (newVal === undefined || newVal === null || newVal === false) {
          ops.push({ type: 'remove-attribute', targetId: id, name: attr });
        } else {
          ops.push({ type: 'set-attribute', targetId: id, name: attr, value: String(newVal) });
        }
      }
    }

    // Property-mapped properties (set via JS property, not attribute)
    for (const prop of DIFFABLE_PROPERTIES) {
      const oldVal = oldComp[prop];
      const newVal = newComp[prop];
      if (newVal !== oldVal && newVal !== undefined) {
        ops.push({ type: 'set-property', targetId: id, name: prop, value: newVal });
      }
    }
  }

  return ops;
}

function findParent(childId: string, components: readonly A2UIComponent[]): string | null {
  for (const c of components) {
    if (c.children?.includes(childId)) return c.id;
    if (c.child === childId) return c.id;
  }
  return null;
}

function collectSubtree(rootId: string, components: readonly A2UIComponent[]): A2UIComponent[] {
  const index = new Map<string, A2UIComponent>();
  for (const c of components) index.set(c.id, c);

  const result: A2UIComponent[] = [];
  const visited = new Set<string>();

  function walk(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    const comp = index.get(id);
    if (!comp) return;
    result.push(comp);
    const childIds = comp.children ?? (comp.child ? [comp.child] : []);
    for (const cid of childIds) walk(cid);
  }

  walk(rootId);
  return result;
}

export function createSurfaceManager(
  kernel: Kernel,
  onAction: (msg: A2UIActionMessage) => void,
  registry?: ComponentRegistry,
): SurfaceManager {
  return new SurfaceManager(kernel, onAction, undefined, registry);
}
