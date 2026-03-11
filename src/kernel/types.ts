import type { Dispose } from '@nonoun/native-core';

// ── Command System ──

export interface Command<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly id: string;
  readonly timestamp: number;
  readonly source: CommandSource;
  readonly meta?: CommandMeta;
}

export type CommandSource = 'human' | 'generated' | 'replay';

export interface CommandMeta {
  readonly undoType?: string;
  readonly undoPayload?: unknown;
  readonly capabilities?: readonly string[];
  readonly planId?: string;
}

export interface CommandHandler<T = unknown> {
  (command: Command<T>): void | Promise<void>;
}

export interface CommandMiddleware {
  (command: Command, next: () => void | Promise<void>): void | Promise<void>;
}

export type CommandFilter = (command: Command) => boolean;

// ── Overlay Manager ──

export type OverlayType = 'popover' | 'dialog' | 'drawer' | 'toast';

export interface OverlayEntry {
  readonly id: string;
  readonly type: OverlayType;
  readonly element: HTMLElement;
  readonly zIndex: number;
  readonly owner?: HTMLElement;
}

// ── Focus Router ──

export interface Shortcut {
  readonly key: string;
  readonly mod?: ShortcutMod;
  readonly handler: (e: KeyboardEvent) => void;
  readonly scope?: string;
  readonly description?: string;
}

export interface ShortcutMod {
  readonly ctrl?: boolean;
  readonly meta?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

// ── UI Schema ──

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

export interface UIPlan {
  readonly id: string;
  readonly version: number;
  readonly root: UINode;
  readonly source: CommandSource;
  readonly timestamp: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

// ── Kernel Registry ──

export interface ComponentRegistration {
  readonly tag: string;
  readonly elementClass: CustomElementConstructor;
  readonly formAssociated?: boolean;
}

export interface KernelOptions {
  readonly allowUnregistered?: boolean;
  readonly logCommands?: boolean;
}

// Re-export for convenience
export type { Dispose };
