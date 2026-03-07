/**
 * Kernel Bridge Interface
 *
 * Decouples A2UI protocol from the concrete Kernel class.
 * The real Kernel satisfies this via TypeScript structural typing — no `implements` needed.
 *
 * Only the subset of Kernel/types/patch that A2UI actually accesses is duplicated here.
 */

import type { Dispose } from '@nonoun/native-ui';

// ── UINode (from kernel/types.ts) ──

export interface UINode {
  readonly id: string;
  readonly tag: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly UINode[];
  readonly textContent?: string;
  readonly events?: Readonly<Record<string, string>>;
  readonly slot?: string;
}

// ── UIPlan (from kernel/types.ts) ──

export type CommandSource = 'human' | 'generated' | 'replay';

export interface UIPlan {
  readonly id: string;
  readonly version: number;
  readonly root: UINode;
  readonly source: CommandSource;
  readonly timestamp: number;
}

// ── PatchOp (from kernel/patch.ts) ──

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

// ── UIPatch (from kernel/patch.ts) ──

export interface UIPatch {
  readonly planId: string;
  readonly ops: readonly PatchOp[];
  readonly source: CommandSource;
  readonly timestamp: number;
}

// ── PlanResult (from kernel/planner.ts) ──

export interface PlanResult {
  readonly plan: UIPlan;
  readonly validation: { readonly valid: boolean; readonly errors: readonly { readonly path: string; readonly code: string; readonly message: string }[] };
  readonly accessibility: { readonly violations: readonly unknown[]; readonly passes: number };
  readonly warnings: readonly string[];
}

// ── Command (from kernel/types.ts, minimal) ──

export interface Command<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly id: string;
  readonly timestamp: number;
  readonly source: CommandSource;
}

export type CommandFilter = (command: Command) => boolean;
export type CommandHandler<T = unknown> = (command: Command<T>) => void | Promise<void>;

// ── Bridge Interface ──

/**
 * The subset of the Kernel API that A2UI needs.
 * Real `Kernel` from `@nonoun/native-ui/kernel` satisfies this structurally.
 */
export interface A2UIKernelBridge {
  readonly bus: {
    on(typeOrFilter: string | CommandFilter, handler: CommandHandler): Dispose;
  };
  readonly executor: {
    getElements(planId: string): Map<string, HTMLElement> | null;
  };
  executePlan(plan: UIPlan, container: HTMLElement): Map<string, HTMLElement>;
  patchPlan(patch: UIPatch): unknown;
  teardownPlan(planId: string): void;
}
