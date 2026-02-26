// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { PolicyEngine, createPolicyEngine } from '../policy.ts';
import { CommandBus } from '../command-bus.ts';
import type { Command } from '../types.ts';

function makeCommand(overrides: Partial<Command> = {}): Command {
  return Object.freeze({
    type: 'test.action',
    payload: null,
    id: 'cmd-1',
    timestamp: Date.now(),
    source: 'human' as const,
    ...overrides,
  });
}

describe('PolicyEngine', () => {
  // ── Basics ──

  it('creates via factory', () => {
    const engine = createPolicyEngine();
    expect(engine).toBeInstanceOf(PolicyEngine);
  });

  it('starts with empty capabilities and rules', () => {
    const engine = new PolicyEngine();
    expect(engine.capabilities.value).toEqual([]);
    expect(engine.rules.value).toEqual([]);
    expect(engine.lastDecision.value).toBe(null);
    expect(engine.deniedCount.value).toBe(0);
  });

  // ── grant() ──

  it('grant adds a capability and returns an ID', () => {
    const engine = new PolicyEngine();
    const id = engine.grant({ name: 'admin', patterns: ['*'] });
    expect(id).toMatch(/^cap-/);
    expect(engine.capabilities.value).toHaveLength(1);
    expect(engine.capabilities.value[0]!.name).toBe('admin');
    expect(engine.capabilities.value[0]!.id).toBe(id);
  });

  // ── revoke() ──

  it('revoke removes a capability by ID', () => {
    const engine = new PolicyEngine();
    const id = engine.grant({ name: 'admin', patterns: ['*'] });
    engine.grant({ name: 'editor', patterns: ['doc.*'] });
    expect(engine.capabilities.value).toHaveLength(2);
    engine.revoke(id);
    expect(engine.capabilities.value).toHaveLength(1);
    expect(engine.capabilities.value[0]!.name).toBe('editor');
  });

  // ── revokeAll() ──

  it('revokeAll clears all capabilities', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'a', patterns: ['*'] });
    engine.grant({ name: 'b', patterns: ['*'] });
    engine.revokeAll();
    expect(engine.capabilities.value).toEqual([]);
  });

  // ── hasCapability() ──

  it('hasCapability returns true for active capability', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'admin', patterns: ['*'] });
    expect(engine.hasCapability('admin')).toBe(true);
    expect(engine.hasCapability('editor')).toBe(false);
  });

  it('hasCapability returns false for expired capability', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'temp', patterns: ['*'], expiresAt: Date.now() - 1000 });
    expect(engine.hasCapability('temp')).toBe(false);
  });

  // ── addRule() / removeRule() ──

  it('addRule adds a rule and returns an ID', () => {
    const engine = new PolicyEngine();
    const id = engine.addRule({ effect: 'deny', patterns: ['admin.*'], priority: 10 });
    expect(id).toMatch(/^rule-/);
    expect(engine.rules.value).toHaveLength(1);
    expect(engine.rules.value[0]!.effect).toBe('deny');
  });

  it('removeRule removes a rule by ID', () => {
    const engine = new PolicyEngine();
    const id = engine.addRule({ effect: 'deny', patterns: ['*'], priority: 1 });
    engine.addRule({ effect: 'allow', patterns: ['test.*'], priority: 2 });
    engine.removeRule(id);
    expect(engine.rules.value).toHaveLength(1);
    expect(engine.rules.value[0]!.effect).toBe('allow');
  });

  // ── evaluate() — default allow ──

  it('evaluate returns allow when no rules match', () => {
    const engine = new PolicyEngine();
    const decision = engine.evaluate(makeCommand());
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toContain('default allow');
  });

  // ── evaluate() — deny rule ──

  it('evaluate denies when a matching deny rule exists', () => {
    const engine = new PolicyEngine();
    engine.addRule({ effect: 'deny', patterns: ['test.*'], priority: 1, description: 'Block tests' });
    const decision = engine.evaluate(makeCommand({ type: 'test.action' }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('Block tests');
  });

  // ── evaluate() — allow rule ──

  it('evaluate allows when a matching allow rule exists', () => {
    const engine = new PolicyEngine();
    engine.addRule({ effect: 'allow', patterns: ['test.*'], priority: 1, description: 'Allow tests' });
    const decision = engine.evaluate(makeCommand({ type: 'test.action' }));
    expect(decision.allowed).toBe(true);
    expect(decision.matchedRule).toBeDefined();
  });

  // ── evaluate() — priority ──

  it('higher priority rule wins over lower priority', () => {
    const engine = new PolicyEngine();
    engine.addRule({ effect: 'deny', patterns: ['test.*'], priority: 1 });
    engine.addRule({ effect: 'allow', patterns: ['test.*'], priority: 10 });
    const decision = engine.evaluate(makeCommand({ type: 'test.action' }));
    expect(decision.allowed).toBe(true);
  });

  // ── evaluate() — conditions ──

  it('condition eq matches source', () => {
    const engine = new PolicyEngine();
    engine.addRule({
      effect: 'deny',
      patterns: ['*'],
      priority: 1,
      conditions: [{ field: 'source', op: 'eq', value: 'generated' }],
    });
    // human source should not be denied
    const humanDecision = engine.evaluate(makeCommand({ source: 'human' }));
    expect(humanDecision.allowed).toBe(true);
    // generated source should be denied
    const genDecision = engine.evaluate(makeCommand({ source: 'generated' }));
    expect(genDecision.allowed).toBe(false);
  });

  it('condition neq matches source', () => {
    const engine = new PolicyEngine();
    engine.addRule({
      effect: 'deny',
      patterns: ['*'],
      priority: 1,
      conditions: [{ field: 'source', op: 'neq', value: 'human' }],
    });
    const humanDecision = engine.evaluate(makeCommand({ source: 'human' }));
    expect(humanDecision.allowed).toBe(true);
    const genDecision = engine.evaluate(makeCommand({ source: 'generated' }));
    expect(genDecision.allowed).toBe(false);
  });

  it('condition in matches source from list', () => {
    const engine = new PolicyEngine();
    engine.addRule({
      effect: 'deny',
      patterns: ['*'],
      priority: 1,
      conditions: [{ field: 'source', op: 'in', value: ['generated', 'replay'] }],
    });
    const humanDecision = engine.evaluate(makeCommand({ source: 'human' }));
    expect(humanDecision.allowed).toBe(true);
    const replayDecision = engine.evaluate(makeCommand({ source: 'replay' }));
    expect(replayDecision.allowed).toBe(false);
  });

  it('condition matches uses pattern matching', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'admin', patterns: ['*'] });
    engine.addRule({
      effect: 'allow',
      patterns: ['*'],
      priority: 1,
      conditions: [{ field: 'capability', op: 'matches', value: '*' }],
    });
    const decision = engine.evaluate(makeCommand());
    expect(decision.allowed).toBe(true);
  });

  // ── evaluate() — capabilities check ──

  it('denies when command requires capabilities that are missing', () => {
    const engine = new PolicyEngine();
    const cmd = makeCommand({ meta: { capabilities: ['admin'] } });
    const decision = engine.evaluate(cmd);
    expect(decision.allowed).toBe(false);
    expect(decision.missingCapabilities).toContain('admin');
  });

  // ── evaluate() — capability pattern ──

  it('capability must cover the command type pattern', () => {
    const engine = new PolicyEngine();
    // Grant capability that only covers 'doc.*' commands
    engine.grant({ name: 'editor', patterns: ['doc.*'] });
    // Command requires 'editor' but type is 'test.action' — not covered by doc.*
    const cmd = makeCommand({ type: 'test.action', meta: { capabilities: ['editor'] } });
    const decision = engine.evaluate(cmd);
    expect(decision.allowed).toBe(false);
    expect(decision.missingCapabilities).toContain('editor');
  });

  it('capability that covers the command type passes', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'editor', patterns: ['test.*'] });
    const cmd = makeCommand({ type: 'test.action', meta: { capabilities: ['editor'] } });
    const decision = engine.evaluate(cmd);
    expect(decision.allowed).toBe(true);
  });

  // ── evaluate() — capability scope ──

  it('source scope restricts capability to matching source', () => {
    const engine = new PolicyEngine();
    engine.grant({
      name: 'scoped',
      patterns: ['*'],
      scopes: [{ type: 'source', value: 'human' }],
    });
    const humanCmd = makeCommand({ source: 'human', meta: { capabilities: ['scoped'] } });
    expect(engine.evaluate(humanCmd).allowed).toBe(true);

    const genCmd = makeCommand({ source: 'generated', meta: { capabilities: ['scoped'] } });
    expect(engine.evaluate(genCmd).allowed).toBe(false);
  });

  it('planId scope restricts capability to matching planId', () => {
    const engine = new PolicyEngine();
    engine.grant({
      name: 'plan-cap',
      patterns: ['*'],
      scopes: [{ type: 'planId', value: 'plan-1' }],
    });
    const matchCmd = makeCommand({ meta: { capabilities: ['plan-cap'], planId: 'plan-1' } });
    expect(engine.evaluate(matchCmd).allowed).toBe(true);

    const noMatchCmd = makeCommand({ meta: { capabilities: ['plan-cap'], planId: 'plan-999' } });
    expect(engine.evaluate(noMatchCmd).allowed).toBe(false);
  });

  // ── evaluate() — expired capability ──

  it('expired capability is treated as absent', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'temp', patterns: ['*'], expiresAt: Date.now() - 1000 });
    const cmd = makeCommand({ meta: { capabilities: ['temp'] } });
    const decision = engine.evaluate(cmd);
    expect(decision.allowed).toBe(false);
    expect(decision.missingCapabilities).toContain('temp');
  });

  // ── Rate Limiting ──

  it('addRateLimit enforces limit and denies when exceeded', () => {
    const engine = new PolicyEngine();
    engine.addRateLimit({ pattern: 'test.*', maxPerWindow: 2, windowMs: 60_000 });

    expect(engine.evaluate(makeCommand()).allowed).toBe(true);
    expect(engine.evaluate(makeCommand()).allowed).toBe(true);
    const third = engine.evaluate(makeCommand());
    expect(third.allowed).toBe(false);
    expect(third.reason).toContain('Rate limit exceeded');
  });

  it('rate limit timestamps expire after windowMs', () => {
    const engine = new PolicyEngine();
    engine.addRateLimit({ pattern: 'test.*', maxPerWindow: 1, windowMs: 100 });

    expect(engine.evaluate(makeCommand()).allowed).toBe(true);
    expect(engine.evaluate(makeCommand()).allowed).toBe(false);

    // Advance time past the window
    vi.useFakeTimers();
    vi.advanceTimersByTime(150);

    expect(engine.evaluate(makeCommand()).allowed).toBe(true);
    vi.useRealTimers();
  });

  // ── middleware() ──

  it('middleware allows commands through to handlers', () => {
    const engine = new PolicyEngine();
    const bus = new CommandBus();
    bus.use(engine.middleware());

    const handler = vi.fn();
    bus.on('test.action', handler);
    bus.dispatch('test.action', null);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('middleware blocks denied commands', () => {
    const engine = new PolicyEngine();
    engine.addRule({ effect: 'deny', patterns: ['*'], priority: 1 });

    const bus = new CommandBus();
    bus.use(engine.middleware());

    const handler = vi.fn();
    bus.on('test.action', handler);
    bus.dispatch('test.action', null);
    expect(handler).not.toHaveBeenCalled();
  });

  it('middleware updates lastDecision and deniedCount signals', () => {
    const engine = new PolicyEngine();
    engine.addRule({ effect: 'deny', patterns: ['blocked.*'], priority: 1 });

    const bus = new CommandBus();
    bus.use(engine.middleware());

    expect(engine.deniedCount.value).toBe(0);

    bus.dispatch('blocked.action', null);
    expect(engine.lastDecision.value).not.toBe(null);
    expect(engine.lastDecision.value!.allowed).toBe(false);
    expect(engine.deniedCount.value).toBe(1);

    bus.dispatch('blocked.other', null);
    expect(engine.deniedCount.value).toBe(2);

    // Allowed command should not increment deniedCount
    bus.dispatch('allowed.action', null);
    expect(engine.lastDecision.value!.allowed).toBe(true);
    expect(engine.deniedCount.value).toBe(2);
  });

  // ── destroy() ──

  it('destroy clears all state', () => {
    const engine = new PolicyEngine();
    engine.grant({ name: 'admin', patterns: ['*'] });
    engine.addRule({ effect: 'deny', patterns: ['*'], priority: 1 });
    engine.addRateLimit({ pattern: '*', maxPerWindow: 5, windowMs: 1000 });

    // Trigger a decision to populate lastDecision/deniedCount
    const bus = new CommandBus();
    bus.use(engine.middleware());
    bus.dispatch('test', null);

    engine.destroy();

    expect(engine.capabilities.value).toEqual([]);
    expect(engine.rules.value).toEqual([]);
    expect(engine.lastDecision.value).toBe(null);
    expect(engine.deniedCount.value).toBe(0);

    // Rate limits also cleared — should allow previously limited commands
    const decision = engine.evaluate(makeCommand());
    expect(decision.allowed).toBe(true);
  });
});
