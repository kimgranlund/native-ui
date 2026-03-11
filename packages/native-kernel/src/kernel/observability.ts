import { signal } from '@nonoun/native-core';
import { computed } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';
import type { Signal, ReadonlySignal } from '@nonoun/native-core';
import type { Command, CommandSource } from './types.ts';

// ── Log Entry ──

export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly category: 'command' | 'plan' | 'patch' | 'overlay' | 'focus' | 'error';
  readonly source: CommandSource;
  readonly summary: string;
  readonly data?: unknown;
  readonly planId?: string;
  readonly commandId?: string;
  readonly duration?: number;
}

export interface LogFilter {
  readonly category?: LogEntry['category'];
  readonly source?: CommandSource;
  readonly planId?: string;
  readonly since?: number;
  readonly limit?: number;
}

// ── EventLog ──

export class EventLog {
  #entries: Signal<readonly LogEntry[]> = signal<readonly LogEntry[]>([]);
  #maxSize = 1000;

  readonly entries: ReadonlySignal<readonly LogEntry[]> = computed(() => this.#entries.value);
  readonly size: ReadonlySignal<number> = computed(() => this.#entries.value.length);

  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const full: LogEntry = Object.freeze({
      id: uid('log'),
      timestamp: Date.now(),
      ...entry,
    });

    const current = this.#entries.value;
    const next = [full, ...current];
    if (next.length > this.#maxSize) next.length = this.#maxSize;
    this.#entries.value = next;

    return full;
  }

  query(filter: LogFilter): readonly LogEntry[] {
    let result = this.#entries.value;

    if (filter.category !== undefined) {
      result = result.filter(e => e.category === filter.category);
    }
    if (filter.source !== undefined) {
      result = result.filter(e => e.source === filter.source);
    }
    if (filter.planId !== undefined) {
      result = result.filter(e => e.planId === filter.planId);
    }
    if (filter.since !== undefined) {
      const since = filter.since;
      result = result.filter(e => e.timestamp >= since);
    }
    if (filter.limit !== undefined) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  clear(): void {
    this.#entries.value = [];
  }

  setMaxSize(n: number): void {
    this.#maxSize = n;
    const current = this.#entries.value;
    if (current.length > n) {
      this.#entries.value = current.slice(0, n);
    }
  }

  // ── Convenience Methods ──

  logCommand(command: Command): LogEntry {
    return this.log({
      category: 'command',
      source: command.source,
      summary: `${command.source}:${command.type}`,
      data: command.payload,
      commandId: command.id,
      planId: command.meta?.planId,
    });
  }

  logPlan(
    planId: string,
    action: 'execute' | 'teardown' | 'patch',
    source: CommandSource,
    data?: unknown,
  ): LogEntry {
    return this.log({
      category: action === 'patch' ? 'patch' : 'plan',
      source,
      summary: `plan:${action}:${planId}`,
      planId,
      ...(data !== undefined ? { data } : {}),
    });
  }

  logError(error: Error, context?: { readonly planId?: string; readonly commandId?: string }): LogEntry {
    return this.log({
      category: 'error',
      source: 'generated',
      summary: error.message,
      data: { name: error.name, stack: error.stack },
      ...context,
    });
  }
}

export function createEventLog(maxSize?: number): EventLog {
  const log = new EventLog();
  if (maxSize !== undefined) log.setMaxSize(maxSize);
  return log;
}

// ── Performance Metrics ──

export interface PerfSample {
  readonly label: string;
  readonly duration: number;
  readonly timestamp: number;
}

export class PerfMetrics {
  #samples: Signal<readonly PerfSample[]> = signal<readonly PerfSample[]>([]);
  #maxSamples = 500;

  readonly samples: ReadonlySignal<readonly PerfSample[]> = computed(() => this.#samples.value);

  measure<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      this.#record(label, performance.now() - start);
    }
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.#record(label, performance.now() - start);
    }
  }

  getSummary(label: string): { count: number; min: number; max: number; avg: number; p95: number } | null {
    const matching = this.#samples.value.filter(s => s.label === label);
    if (matching.length === 0) return null;

    const durations = matching.map(s => s.duration).sort((a, b) => a - b);
    const count = durations.length;
    const min = durations[0]!;
    const max = durations[count - 1]!;
    const avg = durations.reduce((sum, d) => sum + d, 0) / count;
    const p95Index = Math.min(Math.ceil(count * 0.95) - 1, count - 1);
    const p95 = durations[p95Index]!;

    return { count, min, max, avg, p95 };
  }

  clear(): void {
    this.#samples.value = [];
  }

  setMaxSamples(n: number): void {
    this.#maxSamples = n;
    const current = this.#samples.value;
    if (current.length > n) {
      this.#samples.value = current.slice(0, n);
    }
  }

  #record(label: string, duration: number): void {
    const sample: PerfSample = Object.freeze({
      label,
      duration,
      timestamp: Date.now(),
    });

    const current = this.#samples.value;
    const next = [sample, ...current];
    if (next.length > this.#maxSamples) next.length = this.#maxSamples;
    this.#samples.value = next;
  }
}

export function createPerfMetrics(maxSamples?: number): PerfMetrics {
  const metrics = new PerfMetrics();
  if (maxSamples !== undefined) metrics.setMaxSamples(maxSamples);
  return metrics;
}
