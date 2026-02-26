// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { WorkflowEngine, createWorkflowEngine } from '../workflow.ts';
import { CommandBus } from '../command-bus.ts';
import type { WorkflowDefinition } from '../workflow.ts';

// ── Fixtures ──

function simpleDef(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return {
    id: 'test-wf',
    initial: 'idle',
    states: [
      { id: 'idle', onEntry: 'state.entered', onExit: 'state.exited' },
      { id: 'active', onEntry: 'state.entered', onExit: 'state.exited' },
      { id: 'done', onEntry: 'state.entered', onExit: 'state.exited' },
    ],
    transitions: [
      { from: 'idle', event: 'START', to: 'active' },
      { from: 'active', event: 'FINISH', to: 'done' },
      { from: 'active', event: 'RESET', to: 'idle' },
    ],
    ...overrides,
  };
}

function compoundDef(): WorkflowDefinition {
  return {
    id: 'compound-wf',
    initial: 'parent',
    states: [
      {
        id: 'parent',
        initial: 'child-a',
        onEntry: 'parent.entered',
        onExit: 'parent.exited',
        children: [
          { id: 'child-a', onEntry: 'child-a.entered', onExit: 'child-a.exited' },
          { id: 'child-b', onEntry: 'child-b.entered', onExit: 'child-b.exited' },
        ],
      },
      { id: 'outside', onEntry: 'outside.entered' },
    ],
    transitions: [
      { from: 'child-a', event: 'NEXT', to: 'child-b' },
      { from: 'parent', event: 'LEAVE', to: 'outside' },
    ],
  };
}

// ── Tests ──

describe('WorkflowEngine', () => {
  // ── Basics ──

  describe('basics', () => {
    it('constructor sets initial state', () => {
      const engine = new WorkflowEngine(simpleDef());
      expect(engine.currentState.value).toBe('idle');
    });

    it('running is false until start()', () => {
      const engine = new WorkflowEngine(simpleDef());
      expect(engine.running.value).toBe(false);
    });

    it('currentState is a reactive signal', () => {
      const engine = new WorkflowEngine(simpleDef());
      expect(engine.currentState.value).toBe('idle');
      engine.start();
      engine.send('START');
      expect(engine.currentState.value).toBe('active');
    });

    it('creates via factory', () => {
      const engine = createWorkflowEngine(simpleDef());
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });
  });

  // ── start() ──

  describe('start()', () => {
    it('sets running to true', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      expect(engine.running.value).toBe(true);
    });

    it('dispatches onEntry command for initial state', () => {
      const bus = new CommandBus();
      const handler = vi.fn();
      bus.on('state.entered', handler);

      const engine = new WorkflowEngine(simpleDef(), bus);
      engine.start();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].payload).toEqual({ state: 'idle' });
    });

    it('is idempotent when already running', () => {
      const bus = new CommandBus();
      const handler = vi.fn();
      bus.on('state.entered', handler);

      const engine = new WorkflowEngine(simpleDef(), bus);
      engine.start();
      engine.start();
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  // ── send() ──

  describe('send()', () => {
    it('triggers transition and updates currentState', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.send('START');
      expect(engine.currentState.value).toBe('active');
    });

    it('returns TransitionRecord on success', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      const record = engine.send('START');
      expect(record).not.toBeNull();
      expect(record!.event).toBe('START');
      expect(record!.from).toBe('idle');
      expect(record!.to).toBe('active');
      expect(record!.id).toMatch(/^wf-/);
      expect(record!.timestamp).toBeGreaterThan(0);
    });

    it('returns null when not running', () => {
      const engine = new WorkflowEngine(simpleDef());
      const record = engine.send('START');
      expect(record).toBeNull();
    });

    it('returns null for unknown event', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      const record = engine.send('NONEXISTENT');
      expect(record).toBeNull();
    });
  });

  // ── send() with guards ──

  describe('send() with guards', () => {
    it('guard blocks transition when returning false', () => {
      const def = simpleDef({
        transitions: [
          { from: 'idle', event: 'START', to: 'active', guard: function blockAll() { return false; } },
        ],
      });
      const engine = new WorkflowEngine(def);
      engine.start();
      const record = engine.send('START');
      expect(record).toBeNull();
      expect(engine.currentState.value).toBe('idle');
    });

    it('guard passes when returning true', () => {
      const def = simpleDef({
        transitions: [
          { from: 'idle', event: 'START', to: 'active', guard: function allowAll() { return true; } },
          { from: 'active', event: 'FINISH', to: 'done' },
        ],
      });
      const engine = new WorkflowEngine(def);
      engine.start();
      const record = engine.send('START');
      expect(record).not.toBeNull();
      expect(engine.currentState.value).toBe('active');
    });

    it('evaluates multiple guard candidates', () => {
      const def: WorkflowDefinition = {
        id: 'multi-guard',
        initial: 'idle',
        states: [
          { id: 'idle' },
          { id: 'route-a' },
          { id: 'route-b' },
        ],
        transitions: [
          { from: 'idle', event: 'GO', to: 'route-a', guard: function blockedRoute() { return false; } },
          { from: 'idle', event: 'GO', to: 'route-b', guard: function openRoute() { return true; } },
        ],
      };
      const engine = new WorkflowEngine(def);
      engine.start();
      const record = engine.send('GO');
      expect(record).not.toBeNull();
      expect(record!.to).toBe('route-b');
      expect(record!.guardsBlocked).toContain('blockedRoute');
      expect(record!.guardsPassed).toContain('openRoute');
    });
  });

  // ── send() return value ──

  describe('send() return value', () => {
    it('includes event, from, to, guardsPassed, guardsBlocked', () => {
      const def: WorkflowDefinition = {
        id: 'record-test',
        initial: 'idle',
        states: [
          { id: 'idle' },
          { id: 'a' },
          { id: 'b' },
        ],
        transitions: [
          { from: 'idle', event: 'GO', to: 'a', guard: function failGuard() { return false; } },
          { from: 'idle', event: 'GO', to: 'b', guard: function passGuard() { return true; }, action: 'go.action' },
        ],
      };
      const engine = new WorkflowEngine(def);
      engine.start();
      const record = engine.send('GO');
      expect(record!.event).toBe('GO');
      expect(record!.from).toBe('idle');
      expect(record!.to).toBe('b');
      expect(record!.guardsPassed).toEqual(['passGuard']);
      expect(record!.guardsBlocked).toEqual(['failGuard']);
      expect(record!.action).toBe('go.action');
    });
  });

  // ── onEntry / onExit ──

  describe('onEntry / onExit', () => {
    it('dispatches exit then enter on transition', () => {
      const bus = new CommandBus();
      const order: string[] = [];
      bus.on('state.exited', (cmd) => { order.push(`exit:${(cmd.payload as Record<string, unknown>).state}`); });
      bus.on('state.entered', (cmd) => { order.push(`enter:${(cmd.payload as Record<string, unknown>).state}`); });

      const engine = new WorkflowEngine(simpleDef(), bus);
      engine.start();
      order.length = 0; // clear initial entry

      engine.send('START');
      expect(order).toEqual(['exit:idle', 'enter:active']);
    });
  });

  // ── Transition actions ──

  describe('transition actions', () => {
    it('dispatches action command through bus', () => {
      const def = simpleDef({
        transitions: [
          { from: 'idle', event: 'START', to: 'active', action: 'activate.thing' },
          { from: 'active', event: 'FINISH', to: 'done' },
        ],
      });
      const bus = new CommandBus();
      const handler = vi.fn();
      bus.on('activate.thing', handler);

      const engine = new WorkflowEngine(def, bus);
      engine.start();
      engine.send('START');
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].payload).toEqual({ event: 'START', data: undefined });
    });

    it('dispatches action between exit and enter', () => {
      const def = simpleDef({
        transitions: [
          { from: 'idle', event: 'START', to: 'active', action: 'mid.action' },
          { from: 'active', event: 'FINISH', to: 'done' },
        ],
      });
      const bus = new CommandBus();
      const order: string[] = [];
      bus.on('state.exited', () => { order.push('exit'); });
      bus.on('mid.action', () => { order.push('action'); });
      bus.on('state.entered', () => { order.push('enter'); });

      const engine = new WorkflowEngine(def, bus);
      engine.start();
      order.length = 0;

      engine.send('START');
      expect(order).toEqual(['exit', 'action', 'enter']);
    });
  });

  // ── History ──

  describe('history', () => {
    it('logs transitions', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.send('START');
      expect(engine.history.value).toHaveLength(1);
      expect(engine.history.value[0]!.event).toBe('START');
    });

    it('caps at 200 entries', () => {
      const states = [{ id: 'a' }, { id: 'b' }];
      const transitions = [
        { from: 'a', event: 'FLIP', to: 'b' },
        { from: 'b', event: 'FLIP', to: 'a' },
      ];
      const def: WorkflowDefinition = { id: 'flip', initial: 'a', states, transitions };
      const engine = new WorkflowEngine(def);
      engine.start();

      for (let i = 0; i < 250; i++) {
        engine.send('FLIP');
      }
      expect(engine.history.value.length).toBe(200);
    });

    it('latest transition is at end of history', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.send('START');
      engine.send('FINISH');
      const h = engine.history.value;
      expect(h[h.length - 1]!.event).toBe('FINISH');
    });
  });

  // ── Context ──

  describe('context', () => {
    it('setContext / getContext roundtrip', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.setContext('role', 'admin');
      expect(engine.getContext('role')).toBe('admin');
    });

    it('context is frozen', () => {
      const engine = new WorkflowEngine(simpleDef({ context: { count: 0 } }));
      expect(Object.isFrozen(engine.context.value)).toBe(true);
      engine.setContext('count', 1);
      expect(Object.isFrozen(engine.context.value)).toBe(true);
    });

    it('guard receives context', () => {
      const guardFn = vi.fn(function isAdmin(ctx: { role?: string }) { return ctx.role === 'admin'; });
      const def: WorkflowDefinition = {
        id: 'ctx-guard',
        initial: 'idle',
        states: [{ id: 'idle' }, { id: 'restricted' }],
        transitions: [
          { from: 'idle', event: 'ENTER', to: 'restricted', guard: guardFn },
        ],
      };
      const engine = new WorkflowEngine(def);
      engine.start();

      engine.send('ENTER');
      expect(engine.currentState.value).toBe('idle'); // blocked

      engine.setContext('role', 'admin');
      engine.send('ENTER');
      expect(engine.currentState.value).toBe('restricted'); // passed
      expect(guardFn).toHaveBeenCalledTimes(2);
    });
  });

  // ── getAvailableEvents() ──

  describe('getAvailableEvents()', () => {
    it('returns events possible from current state', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      const events = engine.getAvailableEvents();
      expect(events).toContain('START');
      expect(events).not.toContain('FINISH');
    });

    it('updates after transition', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.send('START');
      const events = engine.getAvailableEvents();
      expect(events).toContain('FINISH');
      expect(events).toContain('RESET');
      expect(events).not.toContain('START');
    });
  });

  // ── canSend() ──

  describe('canSend()', () => {
    it('returns true when transition would fire', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      expect(engine.canSend('START')).toBe(true);
    });

    it('returns false when guard blocks', () => {
      const def: WorkflowDefinition = {
        id: 'guard-block',
        initial: 'idle',
        states: [{ id: 'idle' }, { id: 'locked' }],
        transitions: [
          { from: 'idle', event: 'GO', to: 'locked', guard: function deny() { return false; } },
        ],
      };
      const engine = new WorkflowEngine(def);
      engine.start();
      expect(engine.canSend('GO')).toBe(false);
    });

    it('returns false when not running', () => {
      const engine = new WorkflowEngine(simpleDef());
      expect(engine.canSend('START')).toBe(false);
    });
  });

  // ── explain() ──

  describe('explain()', () => {
    it('returns correct explanation for valid transition', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      const ex = engine.explain('START');
      expect(ex.would).toBe(true);
      expect(ex.from).toBe('idle');
      expect(ex.to).toBe('active');
      expect(ex.blockedGuards).toEqual([]);
    });

    it('returns correct explanation when guard blocks', () => {
      const def: WorkflowDefinition = {
        id: 'explain-block',
        initial: 'idle',
        states: [{ id: 'idle' }, { id: 'nope' }],
        transitions: [
          { from: 'idle', event: 'TRY', to: 'nope', guard: function noWay() { return false; } },
        ],
      };
      const engine = new WorkflowEngine(def);
      engine.start();
      const ex = engine.explain('TRY');
      expect(ex.would).toBe(false);
      expect(ex.to).toBeNull();
      expect(ex.blockedGuards).toContain('noWay');
    });

    it('does not cause side effects', () => {
      const bus = new CommandBus();
      const handler = vi.fn();
      bus.on('state.entered', handler);
      bus.on('state.exited', handler);

      const engine = new WorkflowEngine(simpleDef(), bus);
      engine.start();
      handler.mockClear();

      engine.explain('START');
      expect(handler).not.toHaveBeenCalled();
      expect(engine.currentState.value).toBe('idle');
    });
  });

  // ── stop() ──

  describe('stop()', () => {
    it('dispatches onExit for current state', () => {
      const bus = new CommandBus();
      const handler = vi.fn();
      bus.on('state.exited', handler);

      const engine = new WorkflowEngine(simpleDef(), bus);
      engine.start();
      engine.stop();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].payload).toEqual({ state: 'idle' });
    });

    it('sets running to false', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.stop();
      expect(engine.running.value).toBe(false);
    });
  });

  // ── snapshot() / restore() ──

  describe('snapshot() / restore()', () => {
    it('serializes current state', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.send('START');
      engine.setContext('user', 'Kim');

      const snap = engine.snapshot();
      expect(snap.definitionId).toBe('test-wf');
      expect(snap.currentState).toBe('active');
      expect(snap.context).toEqual({ user: 'Kim' });
      expect(snap.history).toHaveLength(1);
      expect(snap.timestamp).toBeGreaterThan(0);
    });

    it('restores engine from snapshot', () => {
      const def = simpleDef();
      const engine = new WorkflowEngine(def);
      engine.start();
      engine.send('START');
      engine.setContext('user', 'Kim');

      const snap = engine.snapshot();
      const restored = WorkflowEngine.restore(snap, def);

      expect(restored.currentState.value).toBe('active');
      expect(restored.running.value).toBe(true);
      expect(restored.getContext('user')).toBe('Kim');
      expect(restored.history.value).toHaveLength(1);
    });

    it('restored engine can continue transitions', () => {
      const def = simpleDef();
      const engine = new WorkflowEngine(def);
      engine.start();
      engine.send('START');

      const snap = engine.snapshot();
      const restored = WorkflowEngine.restore(snap, def);
      const record = restored.send('FINISH');
      expect(record).not.toBeNull();
      expect(restored.currentState.value).toBe('done');
    });
  });

  // ── Compound states ──

  describe('compound states', () => {
    it('entering compound state auto-enters initial child', () => {
      const bus = new CommandBus();
      const entered: string[] = [];
      bus.on('parent.entered', () => { entered.push('parent'); });
      bus.on('child-a.entered', () => { entered.push('child-a'); });

      const engine = new WorkflowEngine(compoundDef(), bus);
      engine.start();

      expect(entered).toEqual(['parent', 'child-a']);
      expect(engine.currentState.value).toBe('child-a');
    });

    it('supports transitions between children', () => {
      const engine = new WorkflowEngine(compoundDef());
      engine.start();
      expect(engine.currentState.value).toBe('child-a');
      engine.send('NEXT');
      expect(engine.currentState.value).toBe('child-b');
    });

    it('parent-level events fire from child state', () => {
      const engine = new WorkflowEngine(compoundDef());
      engine.start();
      expect(engine.currentState.value).toBe('child-a');

      const record = engine.send('LEAVE');
      expect(record).not.toBeNull();
      expect(engine.currentState.value).toBe('outside');
    });
  });

  // ── destroy() ──

  describe('destroy()', () => {
    it('sets running to false and clears history', () => {
      const engine = new WorkflowEngine(simpleDef());
      engine.start();
      engine.send('START');
      expect(engine.history.value.length).toBeGreaterThan(0);

      engine.destroy();
      expect(engine.running.value).toBe(false);
      expect(engine.history.value).toHaveLength(0);
    });

    it('dispatches onExit if running', () => {
      const bus = new CommandBus();
      const handler = vi.fn();
      bus.on('state.exited', handler);

      const engine = new WorkflowEngine(simpleDef(), bus);
      engine.start();
      engine.destroy();
      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
