import type { CommandBus } from './command-bus.ts';
import type { PlanExecutor } from './executor.ts';
import type { UINode, CommandSource } from './types.ts';

// ── Blocked Properties ──

const BLOCKED_PROPERTIES = new Set([
  'innerHTML', 'outerHTML', 'innerText', 'textContent',
  'style', 'className',
]);

// ── Patch Operations ──

export type PatchOp =
  | { readonly type: 'add'; readonly parentId: string; readonly node: UINode; readonly index?: number }
  | { readonly type: 'remove'; readonly targetId: string }
  | { readonly type: 'replace'; readonly targetId: string; readonly node: UINode }
  | { readonly type: 'set-attribute'; readonly targetId: string; readonly name: string; readonly value: string }
  | { readonly type: 'remove-attribute'; readonly targetId: string; readonly name: string }
  | { readonly type: 'set-property'; readonly targetId: string; readonly name: string; readonly value: unknown }
  | { readonly type: 'set-text'; readonly targetId: string; readonly text: string }
  | { readonly type: 'set-event'; readonly targetId: string; readonly event: string; readonly commandType: string }
  | { readonly type: 'remove-event'; readonly targetId: string; readonly event: string };

// ── UIPatch ──

export interface UIPatch {
  readonly planId: string;
  readonly ops: readonly PatchOp[];
  readonly source: CommandSource;
  readonly timestamp: number;
}

// ── Result Types ──

export interface PatchResult {
  readonly applied: number;
  readonly errors: readonly PatchError[];
}

export interface PatchError {
  readonly op: PatchOp;
  readonly message: string;
}

// ── Event Listener Registry ──
// Tracks AbortControllers for event listeners added via set-event ops.
// Keyed by "elementId::eventName" so remove-event can abort individual listeners.
// Each child controller is linked to the plan's parent signal for automatic cleanup.

type ListenerKey = string;

function listenerKey(elementId: string, event: string): ListenerKey {
  return `${elementId}::${event}`;
}

const patchListeners = new Map<string, Map<ListenerKey, AbortController>>();

function getListenerMap(planId: string): Map<ListenerKey, AbortController> {
  let map = patchListeners.get(planId);
  if (!map) {
    map = new Map();
    patchListeners.set(planId, map);
  }
  return map;
}

// ── Apply ──

export function applyPatch(
  patch: UIPatch,
  executor: PlanExecutor,
  bus?: CommandBus,
): PatchResult {
  const elements = executor.getElements(patch.planId);
  const signal = executor.getSignal(patch.planId);

  if (!elements || !signal) {
    return {
      applied: 0,
      errors: patch.ops.map((op) => ({
        op,
        message: `Plan "${patch.planId}" not found`,
      })),
    };
  }

  const listeners = getListenerMap(patch.planId);

  let applied = 0;
  const errors: PatchError[] = [];

  for (const op of patch.ops) {
    const error = applyOp(op, elements, signal, listeners, executor, patch.planId, bus);
    if (error) {
      errors.push({ op, message: error });
    } else {
      applied++;
    }
  }

  return { applied, errors };
}

// ── Per-Op Dispatch ──

function applyOp(
  op: PatchOp,
  elements: Map<string, HTMLElement>,
  signal: AbortSignal,
  listeners: Map<ListenerKey, AbortController>,
  executor: PlanExecutor,
  planId: string,
  bus: CommandBus | undefined,
): string | null {
  switch (op.type) {
    case 'add':
      return applyAdd(op, elements, executor, planId, bus);
    case 'remove':
      return applyRemove(op, elements, listeners);
    case 'replace':
      return applyReplace(op, elements, listeners, executor, planId, bus);
    case 'set-attribute':
      return applySetAttribute(op, elements);
    case 'remove-attribute':
      return applyRemoveAttribute(op, elements);
    case 'set-property':
      return applySetProperty(op, elements);
    case 'set-text':
      return applySetText(op, elements);
    case 'set-event':
      return applySetEvent(op, elements, signal, listeners, bus);
    case 'remove-event':
      return applyRemoveEvent(op, elements, listeners);
    default:
      return `Unknown patch op type: "${(op as PatchOp).type}"`;
  }
}

// ── Add ──

function applyAdd(
  op: Extract<PatchOp, { readonly type: 'add' }>,
  elements: Map<string, HTMLElement>,
  executor: PlanExecutor,
  planId: string,
  bus: CommandBus | undefined,
): string | null {
  const parent = elements.get(op.parentId);
  if (!parent) return `Parent element "${op.parentId}" not found`;

  const newEl = executor.renderNodeForPlan(planId, op.node, bus);
  if (!newEl) return `Failed to render node for plan "${planId}"`;

  if (op.index !== undefined && op.index < parent.children.length) {
    const ref = parent.children[op.index];
    if (ref) {
      parent.insertBefore(newEl, ref);
    } else {
      parent.appendChild(newEl);
    }
  } else {
    parent.appendChild(newEl);
  }

  return null;
}

// ── Remove ──

function applyRemove(
  op: Extract<PatchOp, { readonly type: 'remove' }>,
  elements: Map<string, HTMLElement>,
  listeners: Map<ListenerKey, AbortController>,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  el.remove();
  removeFromMap(el, elements, listeners);

  return null;
}

/**
 * Removes an element and all its tracked descendants from the elements map.
 * Also aborts any patch-added event listeners for removed elements.
 */
function removeFromMap(
  el: HTMLElement,
  elements: Map<string, HTMLElement>,
  listeners: Map<ListenerKey, AbortController>,
): void {
  for (const [id, mapped] of elements) {
    if (mapped === el) {
      elements.delete(id);
      // Abort all patch listeners for this element
      abortListenersForElement(id, listeners);
      break;
    }
  }

  for (const child of Array.from(el.children)) {
    if (child instanceof HTMLElement) {
      removeFromMap(child, elements, listeners);
    }
  }
}

function abortListenersForElement(
  elementId: string,
  listeners: Map<ListenerKey, AbortController>,
): void {
  const prefix = `${elementId}::`;
  for (const [key, controller] of listeners) {
    if (key.startsWith(prefix)) {
      controller.abort();
      listeners.delete(key);
    }
  }
}

// ── Replace ──

function applyReplace(
  op: Extract<PatchOp, { readonly type: 'replace' }>,
  elements: Map<string, HTMLElement>,
  listeners: Map<ListenerKey, AbortController>,
  executor: PlanExecutor,
  planId: string,
  bus: CommandBus | undefined,
): string | null {
  const oldEl = elements.get(op.targetId);
  if (!oldEl) return `Element "${op.targetId}" not found`;

  const parent = oldEl.parentElement;
  if (!parent) return `Element "${op.targetId}" has no parent`;

  const newEl = executor.renderNodeForPlan(planId, op.node, bus);
  if (!newEl) return `Failed to render replacement node for plan "${planId}"`;

  removeFromMap(oldEl, elements, listeners);
  parent.replaceChild(newEl, oldEl);

  return null;
}

// ── Set Attribute ──

function applySetAttribute(
  op: Extract<PatchOp, { readonly type: 'set-attribute' }>,
  elements: Map<string, HTMLElement>,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  el.setAttribute(op.name, op.value);
  return null;
}

// ── Remove Attribute ──

function applyRemoveAttribute(
  op: Extract<PatchOp, { readonly type: 'remove-attribute' }>,
  elements: Map<string, HTMLElement>,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  el.removeAttribute(op.name);
  return null;
}

// ── Set Property ──

function applySetProperty(
  op: Extract<PatchOp, { readonly type: 'set-property' }>,
  elements: Map<string, HTMLElement>,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  if (BLOCKED_PROPERTIES.has(op.name)) {
    return `Property "${op.name}" is blocked`;
  }

  (el as unknown as Record<string, unknown>)[op.name] = op.value;
  return null;
}

// ── Set Text ──

function applySetText(
  op: Extract<PatchOp, { readonly type: 'set-text' }>,
  elements: Map<string, HTMLElement>,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  el.textContent = op.text;
  return null;
}

// ── Set Event ──

function applySetEvent(
  op: Extract<PatchOp, { readonly type: 'set-event' }>,
  elements: Map<string, HTMLElement>,
  signal: AbortSignal,
  listeners: Map<ListenerKey, AbortController>,
  bus: CommandBus | undefined,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  if (!bus) return `No CommandBus provided — cannot wire event "${op.event}"`;

  const key = listenerKey(op.targetId, op.event);

  // Abort any previous listener for this element+event pair
  const existing = listeners.get(key);
  if (existing) existing.abort();

  // Create a child AbortController linked to the plan's signal.
  // When the plan tears down (parent signal aborts), this listener is also removed.
  const child = new AbortController();
  signal.addEventListener('abort', () => child.abort(), { once: true });
  listeners.set(key, child);

  el.addEventListener(op.event, (e: Event) => {
    const detail = e instanceof CustomEvent ? e.detail : undefined;
    bus.dispatch(op.commandType, {
      target: op.targetId,
      event: e.type,
      ...(detail !== undefined ? { detail } : {}),
    });
  }, { signal: child.signal });

  return null;
}

// ── Remove Event ──

function applyRemoveEvent(
  op: Extract<PatchOp, { readonly type: 'remove-event' }>,
  elements: Map<string, HTMLElement>,
  listeners: Map<ListenerKey, AbortController>,
): string | null {
  const el = elements.get(op.targetId);
  if (!el) return `Element "${op.targetId}" not found`;

  const key = listenerKey(op.targetId, op.event);
  const controller = listeners.get(key);

  if (!controller) {
    return `No patch-added listener for event "${op.event}" on element "${op.targetId}"`;
  }

  controller.abort();
  listeners.delete(key);

  return null;
}
