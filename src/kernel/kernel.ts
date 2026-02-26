import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import { define } from '../core/define.ts';
import type { Signal, ReadonlySignal } from '../reactivity/types.ts';
import type {
  Command,
  ComponentRegistration,
  KernelOptions,
  UIPlan,
} from './types.ts';
import { CommandBus } from './command-bus.ts';
import { CommandHistory } from './command-history.ts';
import { OverlayManager } from './overlay-manager.ts';
import { FocusRouter } from './focus-router.ts';
import { PlanExecutor } from './executor.ts';
import { EventLog } from './observability.ts';
import { PerfMetrics } from './observability.ts';
import { DataStore } from './data-runtime.ts';
import { validateAccessibility } from './accessibility.ts';
import { applyPatch } from './patch.ts';
import { PolicyEngine } from './policy.ts';
import { A2UIAdapter } from '../a2ui/a2ui-adapter.ts';
import type { UIPatch, PatchResult } from './patch.ts';
import type { A11yResult } from './accessibility.ts';

export class Kernel {
  readonly bus: CommandBus;
  readonly history: CommandHistory;
  readonly overlays: OverlayManager;
  readonly focus: FocusRouter;
  readonly executor: PlanExecutor;
  readonly log: EventLog;
  readonly perf: PerfMetrics;
  readonly data: DataStore;
  readonly policy: PolicyEngine;

  #registry: Signal<Map<string, ComponentRegistration>> = signal(new Map());
  #options: KernelOptions;
  #a2ui: A2UIAdapter | null = null;

  readonly registry: ReadonlySignal<Map<string, ComponentRegistration>> = computed(
    () => this.#registry.value,
  );

  /** Lazy-initialized A2UI protocol adapter. Only created on first access. */
  get a2ui(): A2UIAdapter {
    if (!this.#a2ui) {
      this.#a2ui = new A2UIAdapter(this);
    }
    return this.#a2ui;
  }

  constructor(options?: KernelOptions) {
    this.#options = options ?? {};
    this.bus = new CommandBus();
    this.history = new CommandHistory();
    this.overlays = new OverlayManager();
    this.focus = new FocusRouter();
    this.executor = new PlanExecutor(this.#registry.peek());
    this.log = new EventLog();
    this.perf = new PerfMetrics();
    this.data = new DataStore();
    this.policy = new PolicyEngine();

    // Wire policy enforcement as bus middleware (first — blocks before logging)
    this.bus.use(this.policy.middleware());

    // Wire history + observability as bus middleware
    if (this.#options.logCommands !== false) {
      this.bus.use((command: Command, next: () => void) => {
        next();
        this.history.push(command);
        this.log.logCommand(command);
      });
    }
  }

  register(
    tag: string,
    elementClass: CustomElementConstructor,
    options?: { formAssociated?: boolean },
  ): void {
    const entry: ComponentRegistration = Object.freeze({
      tag: tag.toLowerCase(),
      elementClass,
      ...(options?.formAssociated ? { formAssociated: true } : {}),
    });

    const map = new Map(this.#registry.peek());
    map.set(entry.tag, entry);
    this.#registry.value = map;
  }

  registerAndDefine(
    tag: string,
    elementClass: CustomElementConstructor,
    options?: { formAssociated?: boolean },
  ): void {
    this.register(tag, elementClass, options);
    define(tag, elementClass);
  }

  executePlan(plan: UIPlan, container: HTMLElement): Map<string, HTMLElement> {
    const elements = this.perf.measure('plan:execute', () =>
      this.executor.execute(plan, container, this.bus, {
        allowUnregistered: this.#options.allowUnregistered,
      }),
    );
    this.log.logPlan(plan.id, 'execute', plan.source);
    return elements;
  }

  validatePlanAccessibility(plan: UIPlan): A11yResult {
    return validateAccessibility(plan.root);
  }

  patchPlan(patch: UIPatch): PatchResult {
    const result = this.perf.measure('plan:patch', () =>
      applyPatch(patch, this.executor, this.bus),
    );
    this.log.logPlan(patch.planId, 'patch', patch.source, {
      applied: result.applied,
      errors: result.errors.length,
    });
    return result;
  }

  teardownPlan(planId: string): void {
    this.executor.teardown(planId);
    this.log.logPlan(planId, 'teardown', 'human');
  }

  destroy(): void {
    this.#a2ui?.destroy();
    this.overlays.destroy();
    this.focus.destroy();
    this.history.clear();
    this.data.destroy();
    this.policy.destroy();
    this.log.clear();
    this.perf.clear();
  }
}

// Module-level singleton
let instance: Kernel | null = null;

export function getKernel(options?: KernelOptions): Kernel {
  if (!instance) {
    instance = new Kernel(options);
  }
  return instance;
}

export function resetKernel(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
