import { validatePlan } from './schema.ts';
import type { CommandBus } from './command-bus.ts';
import type { UINode, UIPlan, ComponentRegistration } from './types.ts';

const BLOCKED_PROPERTIES = new Set([
  'innerHTML', 'outerHTML', 'innerText', 'textContent',
  'style', 'className',
]);

interface PlanRecord {
  readonly container: HTMLElement;
  readonly elements: Map<string, HTMLElement>;
  readonly abort: AbortController;
}

export class PlanExecutor {
  #registry: Map<string, ComponentRegistration>;
  #plans = new Map<string, PlanRecord>();

  constructor(registry?: Map<string, ComponentRegistration>) {
    this.#registry = registry ?? new Map();
  }

  execute(
    plan: UIPlan,
    container: HTMLElement,
    bus?: CommandBus,
    options?: { allowUnregistered?: boolean },
  ): Map<string, HTMLElement> {
    const result = validatePlan(plan, this.#registry, options);
    if (!result.valid) {
      const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
      throw new Error(`Invalid plan: ${messages}`);
    }

    const abort = new AbortController();
    const elements = new Map<string, HTMLElement>();

    this.#renderRecursive(plan.root, elements, bus, abort.signal);

    const rootEl = elements.get(plan.root.id);
    if (rootEl) container.appendChild(rootEl);

    this.#plans.set(plan.id, { container, elements, abort });
    return elements;
  }

  renderNode(node: UINode, bus?: CommandBus): HTMLElement {
    const elements = new Map<string, HTMLElement>();
    const abort = new AbortController();
    this.#renderRecursive(node, elements, bus, abort.signal);
    return elements.get(node.id)!;
  }

  getElements(planId: string): Map<string, HTMLElement> | null {
    return this.#plans.get(planId)?.elements ?? null;
  }

  getSignal(planId: string): AbortSignal | null {
    return this.#plans.get(planId)?.abort.signal ?? null;
  }

  renderNodeForPlan(
    planId: string,
    node: UINode,
    bus?: CommandBus,
  ): HTMLElement | null {
    const record = this.#plans.get(planId);
    if (!record) return null;
    return this.#renderRecursive(node, record.elements, bus, record.abort.signal);
  }

  teardown(planId: string): void {
    const record = this.#plans.get(planId);
    if (!record) return;

    // Abort all event listeners
    record.abort.abort();

    // Remove root element from container
    for (const el of record.elements.values()) {
      el.remove();
    }

    this.#plans.delete(planId);
  }

  #renderRecursive(
    node: UINode,
    elements: Map<string, HTMLElement>,
    bus: CommandBus | undefined,
    signal: AbortSignal,
  ): HTMLElement {
    const el = document.createElement(node.tag);
    elements.set(node.id, el);

    // Set attributes
    if (node.attributes) {
      for (const [key, val] of Object.entries(node.attributes)) {
        el.setAttribute(key, val);
      }
    }

    // Set properties (with blocklist)
    if (node.properties) {
      for (const [key, val] of Object.entries(node.properties)) {
        if (BLOCKED_PROPERTIES.has(key)) continue;
        (el as unknown as Record<string, unknown>)[key] = val;
      }
    }

    // Set slot
    if (node.slot) {
      el.setAttribute('slot', node.slot);
    }

    // Wire events to command bus
    if (node.events && bus) {
      for (const [eventName, commandType] of Object.entries(node.events)) {
        el.addEventListener(eventName, (e: Event) => {
          const detail = e instanceof CustomEvent ? e.detail : undefined;
          bus.dispatch(commandType, {
            target: node.id,
            event: e.type,
            ...(detail !== undefined ? { detail } : {}),
          });
        }, { signal });
      }
    }

    // Text content (only if no children)
    if (node.textContent && (!node.children || node.children.length === 0)) {
      el.textContent = node.textContent;
    }

    // Recurse children
    if (node.children) {
      for (const child of node.children) {
        const childEl = this.#renderRecursive(child, elements, bus, signal);
        el.appendChild(childEl);
      }
    }

    return el;
  }
}

export function createPlanExecutor(registry?: Map<string, ComponentRegistration>): PlanExecutor {
  return new PlanExecutor(registry);
}
