// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { EventLog, createEventLog, PerfMetrics, createPerfMetrics } from '../observability.ts';
import type { Command } from '../types.ts';

describe('EventLog', () => {
  it('creates via factory', () => {
    const log = createEventLog();
    expect(log).toBeInstanceOf(EventLog);
    expect(log.size.value).toBe(0);
  });

  it('log adds entry with auto id and timestamp', () => {
    const log = new EventLog();
    const entry = log.log({
      category: 'command',
      source: 'human',
      summary: 'test',
    });
    expect(entry.id).toMatch(/^log-/);
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.summary).toBe('test');
    expect(log.size.value).toBe(1);
  });

  it('entries are newest-first', () => {
    const log = new EventLog();
    log.log({ category: 'command', source: 'human', summary: 'first' });
    log.log({ category: 'plan', source: 'generated', summary: 'second' });
    expect(log.entries.value[0]!.summary).toBe('second');
    expect(log.entries.value[1]!.summary).toBe('first');
  });

  it('respects maxSize', () => {
    const log = createEventLog(3);
    for (let i = 0; i < 5; i++) {
      log.log({ category: 'command', source: 'human', summary: `entry-${i}` });
    }
    expect(log.size.value).toBe(3);
    expect(log.entries.value[0]!.summary).toBe('entry-4');
  });

  it('query filters by category', () => {
    const log = new EventLog();
    log.log({ category: 'command', source: 'human', summary: 'cmd' });
    log.log({ category: 'plan', source: 'generated', summary: 'plan' });
    log.log({ category: 'error', source: 'generated', summary: 'err' });

    const cmds = log.query({ category: 'command' });
    expect(cmds.length).toBe(1);
    expect(cmds[0]!.summary).toBe('cmd');
  });

  it('query filters by source', () => {
    const log = new EventLog();
    log.log({ category: 'command', source: 'human', summary: 'h' });
    log.log({ category: 'command', source: 'generated', summary: 'g' });

    const result = log.query({ source: 'generated' });
    expect(result.length).toBe(1);
    expect(result[0]!.summary).toBe('g');
  });

  it('query filters by planId', () => {
    const log = new EventLog();
    log.log({ category: 'plan', source: 'generated', summary: 'a', planId: 'p1' });
    log.log({ category: 'plan', source: 'generated', summary: 'b', planId: 'p2' });

    const result = log.query({ planId: 'p1' });
    expect(result.length).toBe(1);
  });

  it('query with limit', () => {
    const log = new EventLog();
    for (let i = 0; i < 10; i++) {
      log.log({ category: 'command', source: 'human', summary: `${i}` });
    }
    const result = log.query({ limit: 3 });
    expect(result.length).toBe(3);
  });

  it('clear empties entries', () => {
    const log = new EventLog();
    log.log({ category: 'command', source: 'human', summary: 'test' });
    log.clear();
    expect(log.size.value).toBe(0);
  });

  it('logCommand extracts command fields', () => {
    const log = new EventLog();
    const cmd: Command = {
      type: 'counter.inc',
      payload: null,
      id: 'cmd-123',
      timestamp: Date.now(),
      source: 'human',
      meta: { planId: 'plan-1' },
    };
    const entry = log.logCommand(cmd);
    expect(entry.category).toBe('command');
    expect(entry.source).toBe('human');
    expect(entry.commandId).toBe('cmd-123');
    expect(entry.planId).toBe('plan-1');
    expect(entry.summary).toContain('counter.inc');
  });

  it('logPlan logs plan events', () => {
    const log = new EventLog();
    const entry = log.logPlan('p1', 'execute', 'generated');
    expect(entry.category).toBe('plan');
    expect(entry.planId).toBe('p1');
    expect(entry.summary).toContain('execute');
  });

  it('logPlan uses patch category for patch action', () => {
    const log = new EventLog();
    const entry = log.logPlan('p1', 'patch', 'generated');
    expect(entry.category).toBe('patch');
  });

  it('logError logs error with stack', () => {
    const log = new EventLog();
    const entry = log.logError(new Error('boom'), { planId: 'p1' });
    expect(entry.category).toBe('error');
    expect(entry.summary).toBe('boom');
    expect(entry.planId).toBe('p1');
    expect((entry.data as { name: string }).name).toBe('Error');
  });

  it('setMaxSize trims existing entries', () => {
    const log = new EventLog();
    for (let i = 0; i < 10; i++) {
      log.log({ category: 'command', source: 'human', summary: `${i}` });
    }
    log.setMaxSize(5);
    expect(log.size.value).toBe(5);
  });
});

describe('PerfMetrics', () => {
  it('creates via factory', () => {
    const m = createPerfMetrics();
    expect(m).toBeInstanceOf(PerfMetrics);
    expect(m.samples.value.length).toBe(0);
  });

  it('measure records duration', () => {
    const m = new PerfMetrics();
    const result = m.measure('test', () => 42);
    expect(result).toBe(42);
    expect(m.samples.value.length).toBe(1);
    expect(m.samples.value[0]!.label).toBe('test');
    expect(m.samples.value[0]!.duration).toBeGreaterThanOrEqual(0);
  });

  it('measure records even when fn throws', () => {
    const m = new PerfMetrics();
    expect(() => m.measure('fail', () => { throw new Error('oops'); })).toThrow('oops');
    expect(m.samples.value.length).toBe(1);
  });

  it('measureAsync records duration', async () => {
    const m = new PerfMetrics();
    const result = await m.measureAsync('async', () => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(m.samples.value.length).toBe(1);
  });

  it('measureAsync records even when fn rejects', async () => {
    const m = new PerfMetrics();
    await expect(m.measureAsync('fail', () => Promise.reject(new Error('nope')))).rejects.toThrow('nope');
    expect(m.samples.value.length).toBe(1);
  });

  it('getSummary computes stats', () => {
    const m = new PerfMetrics();
    // Record known durations by overriding with measure
    for (let i = 1; i <= 20; i++) {
      m.measure(`op`, () => {
        // Simulate some work (the actual measured duration will be tiny)
      });
    }
    const summary = m.getSummary('op');
    expect(summary).not.toBeNull();
    expect(summary!.count).toBe(20);
    expect(summary!.min).toBeGreaterThanOrEqual(0);
    expect(summary!.max).toBeGreaterThanOrEqual(summary!.min);
    expect(summary!.avg).toBeGreaterThanOrEqual(0);
    expect(summary!.p95).toBeGreaterThanOrEqual(0);
  });

  it('getSummary returns null for unknown label', () => {
    const m = new PerfMetrics();
    expect(m.getSummary('nope')).toBeNull();
  });

  it('clear empties samples', () => {
    const m = new PerfMetrics();
    m.measure('test', () => {});
    m.clear();
    expect(m.samples.value.length).toBe(0);
  });

  it('setMaxSamples trims', () => {
    const m = new PerfMetrics();
    for (let i = 0; i < 10; i++) {
      m.measure('op', () => {});
    }
    m.setMaxSamples(3);
    expect(m.samples.value.length).toBe(3);
  });

  it('respects maxSamples on record', () => {
    const m = createPerfMetrics(5);
    for (let i = 0; i < 10; i++) {
      m.measure('op', () => {});
    }
    expect(m.samples.value.length).toBe(5);
  });
});
