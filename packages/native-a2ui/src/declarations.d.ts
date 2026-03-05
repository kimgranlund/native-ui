/**
 * Ambient type declarations for external workspace packages
 * that don't ship .d.ts files yet.
 */

declare module '@nonoun/native-codemirror' {
  export { EditorView, keymap, Decoration, StateField, StateEffect } from '@codemirror/view';
  export type { DecorationSet } from '@codemirror/view';
  export class NCodemirror extends HTMLElement {
    editorView: import('@codemirror/view').EditorView | null;
    extensions: import('@codemirror/state').Extension[];
    value: string;
    language: string;
    readonly: boolean;
    lineNumbers: boolean;
  }
}

declare module '@nonoun/native-codemirror/register' {}

declare module '@nonoun/native-ui/kernel' {
  import type { Dispose } from '@nonoun/native-ui';

  interface Command<T = unknown> {
    readonly type: string;
    readonly payload: T;
    readonly id: string;
    readonly timestamp: number;
    readonly source: 'human' | 'generated' | 'replay';
  }

  interface CommandFilter {
    (command: Command): boolean;
  }
  interface CommandHandler<T = unknown> {
    (command: Command<T>): void | Promise<void>;
  }

  interface KernelOptions {
    allowUnregistered?: boolean;
  }

  export class Kernel {
    readonly bus: {
      on(typeOrFilter: string | CommandFilter, handler: CommandHandler): Dispose;
    };
    readonly executor: {
      getElements(planId: string): Map<string, HTMLElement> | null;
    };
    constructor(options?: KernelOptions);
    executePlan(plan: unknown, container: HTMLElement): Map<string, HTMLElement>;
    patchPlan(patch: unknown): unknown;
    teardownPlan(planId: string): void;
  }

  export function resetKernel(): void;
}
