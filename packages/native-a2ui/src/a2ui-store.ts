/**
 * A2UI Workbench Store
 *
 * Reactive signals store for the <native-a2ui> workbench element.
 * All UI state flows through this store: JSONL editor content,
 * playback cursor, layout mode, inspector state, diagnostics, and
 * surface snapshots from the preview iframe.
 */

import { signal, computed } from '@nonoun/native-ui';
import type { Signal, ReadonlySignal } from '@nonoun/native-ui';

// ── Interfaces ──

export interface LogEntry {
  readonly type: 'sent' | 'action' | 'validation' | 'error';
  readonly timestamp: number;
  readonly lineNumber?: number;   // for 'sent' entries
  readonly data: unknown;         // the envelope, action payload, or error
}

export interface DiagnosticEntry {
  readonly line: number;          // 0-indexed
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export interface SurfaceSnapshot {
  readonly surfaceId: string;
  readonly components: Array<{ id: string; component: string; children?: string[] }>;
  readonly dataModel: Record<string, unknown>;
}

// ── Store Factory ──

export function createA2UIStore() {
  // ── Primary signals ──

  const stream: Signal<string> = signal('');
  const cursor: Signal<number> = signal(0);
  const layout: Signal<'2/1' | '1+1+1'> = signal<'2/1' | '1+1+1'>('2/1');
  const inspectorTab: Signal<'tree' | 'log'> = signal<'tree' | 'log'>('tree');
  const logEntries: Signal<LogEntry[]> = signal<LogEntry[]>([]);
  const errors: Signal<DiagnosticEntry[]> = signal<DiagnosticEntry[]>([]);
  const surfaces: Signal<Map<string, SurfaceSnapshot>> = signal(new Map<string, SurfaceSnapshot>());

  // ── Computed signals ──

  const lines: ReadonlySignal<string[]> = computed(() =>
    stream.value.split('\n').filter(Boolean),
  );

  const totalLines: ReadonlySignal<number> = computed(() =>
    lines.value.length,
  );

  const hasUnsent: ReadonlySignal<boolean> = computed(() =>
    cursor.value < totalLines.value,
  );

  return {
    // Primary
    stream,
    cursor,
    layout,
    inspectorTab,
    logEntries,
    errors,
    surfaces,

    // Computed
    lines,
    totalLines,
    hasUnsent,
  };
}

// ── Store Type ──

export type A2UIStore = ReturnType<typeof createA2UIStore>;
