import { signal } from '@nonoun/native-core';
import { computed } from '@nonoun/native-core';
import { batch } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';
import type { Signal, ReadonlySignal } from '@nonoun/native-core';
import type { CommandBus } from './command-bus.ts';

// ── Types ──

export interface WorkflowState {
  readonly id: string;
  readonly onEntry?: string;
  readonly onExit?: string;
  readonly initial?: string;
  readonly children?: readonly WorkflowState[];
}

export interface WorkflowTransition {
  readonly from: string;
  readonly event: string;
  readonly to: string;
  readonly guard?: (context: WorkflowContext) => boolean;
  readonly action?: string;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly initial: string;
  readonly states: readonly WorkflowState[];
  readonly transitions: readonly WorkflowTransition[];
  readonly context?: Record<string, unknown>;
}

export interface WorkflowContext {
  readonly [key: string]: unknown;
}

export interface TransitionRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly event: string;
  readonly from: string;
  readonly to: string;
  readonly guardsPassed: readonly string[];
  readonly guardsBlocked: readonly string[];
  readonly action?: string;
}

export interface WorkflowSnapshot {
  readonly definitionId: string;
  readonly currentState: string;
  readonly context: WorkflowContext;
  readonly history: readonly TransitionRecord[];
  readonly timestamp: number;
}

export interface TransitionExplanation {
  readonly would: boolean;
  readonly from: string;
  readonly to: string | null;
  readonly blockedGuards: readonly string[];
}

// ── Constants ──

const MAX_HISTORY = 200;

// ── Engine ──

export class WorkflowEngine {
  #definition: WorkflowDefinition;
  #bus: CommandBus | undefined;
  #stateMap: Map<string, WorkflowState>;
  #parentMap: Map<string, string>;

  #currentState: Signal<string>;
  #context: Signal<WorkflowContext>;
  #history: Signal<readonly TransitionRecord[]>;
  #running: Signal<boolean>;

  readonly currentState: ReadonlySignal<string>;
  readonly context: ReadonlySignal<WorkflowContext>;
  readonly history: ReadonlySignal<readonly TransitionRecord[]>;
  readonly running: ReadonlySignal<boolean>;

  constructor(definition: WorkflowDefinition, bus?: CommandBus) {
    this.#definition = definition;
    this.#bus = bus;
    this.#stateMap = new Map();
    this.#parentMap = new Map();
    this.#indexStates(definition.states, undefined);

    this.#currentState = signal(definition.initial);
    this.#context = signal<WorkflowContext>(
      definition.context ? Object.freeze({ ...definition.context }) : Object.freeze({}),
    );
    this.#history = signal<readonly TransitionRecord[]>(Object.freeze([]));
    this.#running = signal(false);

    this.currentState = computed(() => this.#currentState.value);
    this.context = computed(() => this.#context.value);
    this.history = computed(() => this.#history.value);
    this.running = computed(() => this.#running.value);
  }

  // ── Index ──

  #indexStates(states: readonly WorkflowState[], parentId: string | undefined): void {
    for (const state of states) {
      this.#stateMap.set(state.id, state);
      if (parentId !== undefined) this.#parentMap.set(state.id, parentId);
      if (state.children) this.#indexStates(state.children, state.id);
    }
  }

  // ── Core API ──

  start(): void {
    if (this.#running.peek()) return;

    batch(() => {
      this.#running.value = true;
      this.#enterState(this.#definition.initial);
    });
  }

  send(event: string, data?: unknown): TransitionRecord | null {
    if (!this.#running.peek()) return null;

    const current = this.#currentState.peek();
    const ctx = this.#context.peek();
    const candidates = this.#getCandidateTransitions(current, event);

    const guardsPassed: string[] = [];
    const guardsBlocked: string[] = [];
    let matched: WorkflowTransition | null = null;

    for (const t of candidates) {
      if (t.guard) {
        const name = t.guard.name || `${t.from}->${t.to}`;
        if (t.guard(ctx)) {
          guardsPassed.push(name);
          if (!matched) matched = t;
        } else {
          guardsBlocked.push(name);
        }
      } else {
        if (!matched) matched = t;
      }
    }

    if (!matched) return null;

    const record: TransitionRecord = Object.freeze({
      id: uid('wf'),
      timestamp: Date.now(),
      event,
      from: current,
      to: matched.to,
      guardsPassed: Object.freeze(guardsPassed),
      guardsBlocked: Object.freeze(guardsBlocked),
      action: matched.action,
    });

    batch(() => {
      this.#exitState(current);
      if (matched!.action) this.#dispatch(matched!.action, { event, data });
      this.#appendHistory(record);
      this.#currentState.value = matched!.to;
      this.#enterState(matched!.to);
    });

    return record;
  }

  stop(): void {
    if (!this.#running.peek()) return;

    batch(() => {
      this.#exitState(this.#currentState.peek());
      this.#running.value = false;
    });
  }

  // ── Context ──

  setContext(key: string, value: unknown): void {
    const prev = this.#context.peek();
    this.#context.value = Object.freeze({ ...prev, [key]: value });
  }

  getContext<T = unknown>(key: string): T | undefined {
    return this.#context.peek()[key] as T | undefined;
  }

  // ── Transition Query ──

  getAvailableEvents(): readonly string[] {
    const current = this.#currentState.peek();
    const stateIds = this.#getActiveStateIds(current);
    const events = new Set<string>();

    for (const t of this.#definition.transitions) {
      if (stateIds.has(t.from)) events.add(t.event);
    }

    return Object.freeze([...events]);
  }

  canSend(event: string): boolean {
    if (!this.#running.peek()) return false;

    const current = this.#currentState.peek();
    const ctx = this.#context.peek();
    const candidates = this.#getCandidateTransitions(current, event);

    for (const t of candidates) {
      if (!t.guard || t.guard(ctx)) return true;
    }

    return false;
  }

  explain(event: string): TransitionExplanation {
    const current = this.#currentState.peek();
    const ctx = this.#context.peek();
    const candidates = this.#getCandidateTransitions(current, event);
    const blockedGuards: string[] = [];
    let matched: WorkflowTransition | null = null;

    for (const t of candidates) {
      if (t.guard) {
        const name = t.guard.name || `${t.from}->${t.to}`;
        if (t.guard(ctx)) {
          if (!matched) matched = t;
        } else {
          blockedGuards.push(name);
        }
      } else {
        if (!matched) matched = t;
      }
    }

    return Object.freeze({
      would: matched !== null,
      from: current,
      to: matched?.to ?? null,
      blockedGuards: Object.freeze(blockedGuards),
    });
  }

  // ── Session Persistence ──

  snapshot(): WorkflowSnapshot {
    return Object.freeze({
      definitionId: this.#definition.id,
      currentState: this.#currentState.peek(),
      context: this.#context.peek(),
      history: this.#history.peek(),
      timestamp: Date.now(),
    });
  }

  static restore(
    snapshot: WorkflowSnapshot,
    definition: WorkflowDefinition,
    bus?: CommandBus,
  ): WorkflowEngine {
    const engine = new WorkflowEngine(definition, bus);

    batch(() => {
      engine.#currentState.value = snapshot.currentState;
      engine.#context.value = Object.freeze({ ...snapshot.context });
      engine.#history.value = Object.freeze([...snapshot.history]);
      engine.#running.value = true;
    });

    return engine;
  }

  // ── Cleanup ──

  destroy(): void {
    batch(() => {
      if (this.#running.peek()) this.#exitState(this.#currentState.peek());
      this.#running.value = false;
      this.#history.value = Object.freeze([]);
      this.#stateMap.clear();
      this.#parentMap.clear();
    });
  }

  // ── Private: State Lifecycle ──

  #enterState(stateId: string): void {
    const state = this.#stateMap.get(stateId);
    if (!state) return;

    if (state.onEntry) this.#dispatch(state.onEntry, { state: stateId });

    // Compound state: auto-enter initial child
    if (state.children && state.initial) {
      this.#currentState.value = state.initial;
      this.#enterState(state.initial);
    }
  }

  #exitState(stateId: string): void {
    const state = this.#stateMap.get(stateId);
    if (!state) return;

    // If inside a compound state, exit from deepest child up
    if (state.children) {
      const current = this.#currentState.peek();
      if (current !== stateId && this.#isDescendant(current, stateId)) {
        this.#exitState(current);
      }
    }

    if (state.onExit) this.#dispatch(state.onExit, { state: stateId });
  }

  // ── Private: Hierarchy Helpers ──

  #isDescendant(childId: string, ancestorId: string): boolean {
    let id: string | undefined = childId;
    while (id !== undefined) {
      if (id === ancestorId) return true;
      id = this.#parentMap.get(id);
    }
    return false;
  }

  #getActiveStateIds(stateId: string): Set<string> {
    const ids = new Set<string>();
    ids.add(stateId);
    // Walk up to ancestors
    let id: string | undefined = this.#parentMap.get(stateId);
    while (id !== undefined) {
      ids.add(id);
      id = this.#parentMap.get(id);
    }
    return ids;
  }

  #getCandidateTransitions(currentState: string, event: string): WorkflowTransition[] {
    const activeIds = this.#getActiveStateIds(currentState);
    const candidates: WorkflowTransition[] = [];

    // Collect matching transitions, most-specific (deepest) state first
    for (const t of this.#definition.transitions) {
      if (t.event === event && activeIds.has(t.from)) {
        candidates.push(t);
      }
    }

    // Sort: transitions from the current (deepest) state come first,
    // then parent states. This gives inner states priority.
    const depth = (fromId: string): number => {
      let d = 0;
      let id: string | undefined = fromId;
      while (id !== undefined) {
        d++;
        id = this.#parentMap.get(id);
      }
      return d;
    };

    candidates.sort((a, b) => depth(b.from) - depth(a.from));

    return candidates;
  }

  // ── Private: Dispatch ──

  #dispatch(type: string, payload: unknown): void {
    if (this.#bus) this.#bus.dispatch(type, payload);
  }

  // ── Private: History ──

  #appendHistory(record: TransitionRecord): void {
    const prev = this.#history.peek();
    const next = prev.length >= MAX_HISTORY
      ? [...prev.slice(prev.length - MAX_HISTORY + 1), record]
      : [...prev, record];
    this.#history.value = Object.freeze(next);
  }
}

// ── Factory ──

export function createWorkflowEngine(
  definition: WorkflowDefinition,
  bus?: CommandBus,
): WorkflowEngine {
  return new WorkflowEngine(definition, bus);
}
