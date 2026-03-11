// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Kernel, resetKernel } from '../kernel.ts';
import { Planner } from '../planner.ts';
import { WorkflowEngine } from '../workflow.ts';
import { toggleFlow, formWizard } from '../workflow-templates.ts';
import type { Command } from '../types.ts';

describe('Kernel Integration', () => {
  let kernel: Kernel;
  let container: HTMLElement;

  beforeEach(() => {
    kernel = new Kernel({ allowUnregistered: true });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    kernel.destroy();
    resetKernel();
  });

  // ── 1. Plan -> Execute -> Observe ──

  describe('Plan -> Execute -> Observe', () => {
    it('generates a form plan, executes it, and records observability data', () => {
      // Generate a form plan via the Planner
      const result = Planner.form(
        [
          { name: 'email', type: 'email', placeholder: 'you@example.com', required: true },
          { name: 'password', type: 'password', required: true },
        ],
        { title: 'Login Form', submitLabel: 'Sign In', submitCommand: 'auth.login' },
      );

      expect(result.validation.valid).toBe(true);
      expect(result.plan.root.tag).toBe('form');

      // Execute the plan
      const elements = kernel.executePlan(result.plan, container);

      // Verify DOM was created
      expect(elements.size).toBeGreaterThan(0);
      const form = container.querySelector('form');
      expect(form).not.toBeNull();

      // Verify form contains expected child elements
      const inputs = container.querySelectorAll('n-input');
      expect(inputs.length).toBe(2);

      const button = container.querySelector('n-button');
      expect(button).not.toBeNull();
      expect(button!.textContent).toBe('Sign In');

      // Check observability: event log has plan execution entry
      const planLogs = kernel.log.query({ category: 'plan' });
      expect(planLogs.length).toBeGreaterThanOrEqual(1);
      expect(planLogs[0]!.planId).toBe(result.plan.id);

      // Check observability: perf metrics recorded execution timing
      const perfSummary = kernel.perf.getSummary('plan:execute');
      expect(perfSummary).not.toBeNull();
      expect(perfSummary!.count).toBe(1);
      expect(perfSummary!.min).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 2. Command dispatch -> History -> Undo ──

  describe('Command dispatch -> History -> Undo', () => {
    it('dispatches an undoable command, records it in history, and undoes it', () => {
      const handler = vi.fn();
      const undoHandler = vi.fn();

      kernel.bus.on('item.delete', handler);
      kernel.bus.on('item.restore', undoHandler);

      // Dispatch command with undo metadata
      kernel.bus.dispatch('item.delete', { id: 42 }, {
        undoType: 'item.restore',
        undoPayload: { id: 42 },
      });

      // Handler was called
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].payload).toEqual({ id: 42 });

      // Command appears in history
      expect(kernel.history.canUndo.value).toBe(true);
      expect(kernel.history.undoStack.value.length).toBe(1);
      expect(kernel.history.undoStack.value[0]!.type).toBe('item.delete');

      // Command was logged
      const cmdLogs = kernel.log.query({ category: 'command' });
      expect(cmdLogs.length).toBe(1);
      expect(cmdLogs[0]!.summary).toContain('item.delete');

      // Undo the command
      const undone = kernel.history.undo(kernel.bus);
      expect(undone).not.toBeNull();
      expect(undone!.type).toBe('item.delete');

      // Undo handler was called with the undo payload
      expect(undoHandler).toHaveBeenCalledOnce();
      expect(undoHandler.mock.calls[0]![0].payload).toEqual({ id: 42 });

      // History reflects the undo
      expect(kernel.history.canUndo.value).toBe(false);
      expect(kernel.history.canRedo.value).toBe(true);
    });

    it('redo re-dispatches the original command as replay', () => {
      const handler = vi.fn();
      kernel.bus.on('item.delete', handler);
      kernel.bus.on('item.restore', vi.fn());

      kernel.bus.dispatch('item.delete', { id: 7 }, {
        undoType: 'item.restore',
        undoPayload: { id: 7 },
      });

      kernel.history.undo(kernel.bus);

      // Redo
      const redone = kernel.history.redo(kernel.bus);
      expect(redone).not.toBeNull();

      // Handler was called twice: original + redo replay
      expect(handler).toHaveBeenCalledTimes(2);

      // History state is back to undoable
      expect(kernel.history.canUndo.value).toBe(true);
      expect(kernel.history.canRedo.value).toBe(false);
    });
  });

  // ── 3. Policy enforcement ──

  describe('Policy enforcement', () => {
    it('deny rule blocks command dispatch, remove rule re-enables it', () => {
      const handler = vi.fn();
      kernel.bus.on('admin.deleteUser', handler);

      // Add a deny rule for admin commands
      const ruleId = kernel.policy.addRule({
        effect: 'deny',
        patterns: ['admin.*'],
        priority: 100,
        description: 'Block admin commands',
      });

      // Dispatch the blocked command
      kernel.bus.dispatch('admin.deleteUser', { userId: 99 });

      // Handler was NOT called
      expect(handler).not.toHaveBeenCalled();

      // Denied count incremented
      expect(kernel.policy.deniedCount.value).toBe(1);

      // Last decision reflects denial
      expect(kernel.policy.lastDecision.value).not.toBeNull();
      expect(kernel.policy.lastDecision.value!.allowed).toBe(false);
      expect(kernel.policy.lastDecision.value!.reason).toBe('Block admin commands');

      // Remove the deny rule
      kernel.policy.removeRule(ruleId);

      // Dispatch again
      kernel.bus.dispatch('admin.deleteUser', { userId: 99 });

      // Handler WAS called this time
      expect(handler).toHaveBeenCalledOnce();

      // Last decision now reflects allow
      expect(kernel.policy.lastDecision.value!.allowed).toBe(true);
    });

    it('policy blocks commands before they reach history', () => {
      kernel.bus.on('blocked.action', vi.fn());

      kernel.policy.addRule({
        effect: 'deny',
        patterns: ['blocked.*'],
        priority: 100,
      });

      kernel.bus.dispatch('blocked.action', null, {
        undoType: 'blocked.undo',
      });

      // Command was blocked, so it should NOT appear in history
      expect(kernel.history.canUndo.value).toBe(false);
      expect(kernel.history.undoStack.value.length).toBe(0);
    });
  });

  // ── 4. Workflow + Command bus ──

  describe('Workflow + Command bus', () => {
    it('toggle workflow dispatches action commands through the bus', () => {
      const definition = toggleFlow({ id: 'dark-mode' });
      const engine = new WorkflowEngine(definition, kernel.bus);

      // Collect all commands dispatched through the bus
      const dispatched: Command[] = [];
      kernel.bus.on((cmd: Command) => cmd.type.startsWith('dark-mode.'), (cmd: Command) => {
        dispatched.push(cmd);
      });

      // Start the workflow
      engine.start();
      expect(engine.running.value).toBe(true);
      expect(engine.currentState.value).toBe('off');

      // Send TOGGLE event
      const record = engine.send('TOGGLE');
      expect(record).not.toBeNull();
      expect(record!.from).toBe('off');
      expect(record!.to).toBe('on');
      expect(engine.currentState.value).toBe('on');

      // Verify action command was dispatched through bus
      // toggleFlow dispatches: onEntry for 'off', onExit for 'off', action 'dark-mode.toggle', onEntry for 'on'
      const toggleCommands = dispatched.filter(c => c.type === 'dark-mode.toggle');
      expect(toggleCommands.length).toBeGreaterThanOrEqual(1);

      // Toggle back
      engine.send('TOGGLE');
      expect(engine.currentState.value).toBe('off');

      // History records transitions
      expect(engine.history.value.length).toBe(2);

      engine.destroy();
    });

    it('form wizard workflow navigates steps via bus commands', () => {
      const definition = formWizard({
        id: 'signup',
        steps: ['account', 'profile', 'confirm'],
      });
      const engine = new WorkflowEngine(definition, kernel.bus);

      const actions: string[] = [];
      kernel.bus.on((cmd: Command) => cmd.type.startsWith('signup.'), (cmd: Command) => {
        actions.push(cmd.type);
      });

      engine.start();
      expect(engine.currentState.value).toBe('account');

      // Navigate forward
      engine.send('NEXT');
      expect(engine.currentState.value).toBe('profile');

      engine.send('NEXT');
      expect(engine.currentState.value).toBe('confirm');

      // Navigate back
      engine.send('PREV');
      expect(engine.currentState.value).toBe('profile');

      // Navigate back to first step and submit path:
      engine.send('PREV');
      expect(engine.currentState.value).toBe('account');

      // Can check available events
      const events = engine.getAvailableEvents();
      expect(events).toContain('NEXT');
      expect(events).toContain('CANCEL');

      // Actions were dispatched through the bus
      expect(actions).toContain('signup.next');
      expect(actions).toContain('signup.prev');

      engine.destroy();
    });
  });

  // ── 5. Plan -> Patch -> Validate ──

  describe('Plan -> Patch -> Validate', () => {
    it('executes a plan, patches it to add a node, updates attributes, and validates accessibility', () => {
      const plan = {
        id: 'patch-integration',
        version: 1,
        root: {
          id: 'root',
          tag: 'div',
          attributes: { role: 'region', 'aria-label': 'Content area' },
          children: [
            { id: 'heading', tag: 'h2', textContent: 'Hello' },
          ],
        },
        source: 'generated' as const,
        timestamp: Date.now(),
      };

      const elements = kernel.executePlan(plan, container);
      expect(elements.get('heading')).toBeDefined();
      expect(container.querySelector('h2')!.textContent).toBe('Hello');

      // Patch: add a new paragraph node
      const addResult = kernel.patchPlan({
        planId: 'patch-integration',
        ops: [
          {
            type: 'add',
            parentId: 'root',
            node: {
              id: 'para',
              tag: 'p',
              textContent: 'World',
            },
          },
        ],
        source: 'generated',
        timestamp: Date.now(),
      });

      expect(addResult.applied).toBe(1);
      expect(addResult.errors.length).toBe(0);

      // Verify the new element appears in DOM
      const para = container.querySelector('p');
      expect(para).not.toBeNull();
      expect(para!.textContent).toBe('World');

      // Patch: update attribute on the heading
      const attrResult = kernel.patchPlan({
        planId: 'patch-integration',
        ops: [
          {
            type: 'set-attribute',
            targetId: 'heading',
            name: 'class',
            value: 'title',
          },
        ],
        source: 'generated',
        timestamp: Date.now(),
      });

      expect(attrResult.applied).toBe(1);
      expect(container.querySelector('h2')!.getAttribute('class')).toBe('title');

      // Patch: update text content
      const textResult = kernel.patchPlan({
        planId: 'patch-integration',
        ops: [
          { type: 'set-text', targetId: 'heading', text: 'Updated Title' },
        ],
        source: 'generated',
        timestamp: Date.now(),
      });

      expect(textResult.applied).toBe(1);
      expect(container.querySelector('h2')!.textContent).toBe('Updated Title');

      // Validate accessibility on the plan
      const a11y = kernel.validatePlanAccessibility(plan);
      // The plan root has aria-label and children have text content, so should be valid
      expect(a11y.valid).toBe(true);

      // Verify patch operations were logged
      const patchLogs = kernel.log.query({ category: 'patch' });
      expect(patchLogs.length).toBe(3);

      // Verify perf metrics recorded patch timings
      const patchPerf = kernel.perf.getSummary('plan:patch');
      expect(patchPerf).not.toBeNull();
      expect(patchPerf!.count).toBe(3);
    });

    it('patch to remove a node removes element from DOM', () => {
      const plan = {
        id: 'remove-patch',
        version: 1,
        root: {
          id: 'root',
          tag: 'div',
          children: [
            { id: 'child-a', tag: 'span', textContent: 'A' },
            { id: 'child-b', tag: 'span', textContent: 'B' },
          ],
        },
        source: 'generated' as const,
        timestamp: Date.now(),
      };

      kernel.executePlan(plan, container);
      expect(container.querySelectorAll('span').length).toBe(2);

      kernel.patchPlan({
        planId: 'remove-patch',
        ops: [{ type: 'remove', targetId: 'child-a' }],
        source: 'generated',
        timestamp: Date.now(),
      });

      expect(container.querySelectorAll('span').length).toBe(1);
      expect(container.querySelector('span')!.textContent).toBe('B');
    });
  });

  // ── 6. Overlay lifecycle ──

  describe('Overlay lifecycle', () => {
    it('manages overlay stack with correct z-index ordering', () => {
      const popover = document.createElement('div');
      const dialog = document.createElement('div');

      // Open first overlay
      const { id: id1 } = kernel.overlays.open({ type: 'popover', element: popover });
      expect(kernel.overlays.stack.value.length).toBe(1);
      expect(kernel.overlays.isOpen(id1)).toBe(true);

      const entry1 = kernel.overlays.getEntry(id1);
      expect(entry1).not.toBeNull();
      expect(entry1!.type).toBe('popover');

      // Open second overlay
      const { id: id2 } = kernel.overlays.open({ type: 'dialog', element: dialog });
      expect(kernel.overlays.stack.value.length).toBe(2);

      const entry2 = kernel.overlays.getEntry(id2);
      expect(entry2).not.toBeNull();

      // z-index ordering: second overlay has higher z-index
      expect(entry2!.zIndex).toBeGreaterThan(entry1!.zIndex);

      // Top overlay is the most recently opened
      expect(kernel.overlays.topOverlay.value).not.toBeNull();
      expect(kernel.overlays.topOverlay.value!.id).toBe(id2);

      // Close top overlay
      kernel.overlays.close(id2);
      expect(kernel.overlays.stack.value.length).toBe(1);
      expect(kernel.overlays.isOpen(id2)).toBe(false);
      expect(kernel.overlays.topOverlay.value!.id).toBe(id1);

      // Close remaining overlay
      kernel.overlays.close(id1);
      expect(kernel.overlays.stack.value.length).toBe(0);
      expect(kernel.overlays.topOverlay.value).toBeNull();
    });

    it('closeAll empties the entire stack', () => {
      kernel.overlays.open({ type: 'popover', element: document.createElement('div') });
      kernel.overlays.open({ type: 'dialog', element: document.createElement('div') });
      kernel.overlays.open({ type: 'toast', element: document.createElement('div') });

      expect(kernel.overlays.stack.value.length).toBe(3);

      kernel.overlays.closeAll();
      expect(kernel.overlays.stack.value.length).toBe(0);
    });
  });

  // ── 7. Focus router + scoping ──

  describe('Focus router + scoping', () => {
    it('shortcuts fire only in the matching scope', () => {
      const globalHandler = vi.fn();
      const modalHandler = vi.fn();

      // Register a global shortcut
      kernel.focus.register({
        key: 'k',
        mod: { meta: true },
        handler: globalHandler,
        scope: 'global',
        description: 'Open command palette',
      });

      // Register a modal-scoped shortcut
      kernel.focus.register({
        key: 'Escape',
        handler: modalHandler,
        scope: 'modal',
        description: 'Close modal',
      });

      // Currently in 'global' scope (default)
      expect(kernel.focus.activeScope.value).toBe('global');

      // Dispatch a keyboard event for the modal shortcut — should NOT fire
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }));
      expect(modalHandler).not.toHaveBeenCalled();

      // Push modal scope
      kernel.focus.pushScope('modal');
      expect(kernel.focus.activeScope.value).toBe('modal');

      // Now modal shortcut should fire
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }));
      expect(modalHandler).toHaveBeenCalledOnce();

      // Global shortcuts still fire in modal scope (global scope is always active)
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      }));
      expect(globalHandler).toHaveBeenCalledOnce();

      // Pop scope back to global
      kernel.focus.popScope();
      expect(kernel.focus.activeScope.value).toBe('global');

      // Modal shortcut should NOT fire in global scope
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }));
      expect(modalHandler).toHaveBeenCalledOnce(); // still 1, not 2
    });

    it('getShortcuts filters by scope', () => {
      kernel.focus.register({ key: 'a', handler: vi.fn(), scope: 'global' });
      kernel.focus.register({ key: 'b', handler: vi.fn(), scope: 'editor' });
      kernel.focus.register({ key: 'c', handler: vi.fn(), scope: 'editor' });

      const globalShortcuts = kernel.focus.getShortcuts('global');
      expect(globalShortcuts.length).toBe(1);

      const editorShortcuts = kernel.focus.getShortcuts('editor');
      expect(editorShortcuts.length).toBe(2);

      const allShortcuts = kernel.focus.getShortcuts();
      expect(allShortcuts.length).toBe(3);
    });
  });

  // ── 8. Full lifecycle: create -> interact -> teardown ──

  describe('Full lifecycle: create -> interact -> teardown', () => {
    it('creates kernel, generates and executes a plan, dispatches commands, then tears down', () => {
      // Step 1: Generate a plan with interactive elements
      const planner = new Planner();
      const result = planner.generate({
        type: 'action',
        title: 'Toolbar',
        elements: [
          {
            component: 'div',
            attributes: { role: 'toolbar', 'aria-label': 'Actions' },
            children: [
              {
                component: 'n-button',
                label: 'Save',
                events: { 'native:press': 'doc.save' },
              },
              {
                component: 'n-button',
                label: 'Delete',
                attributes: { intent: 'danger' },
                events: { 'native:press': 'doc.delete' },
              },
            ],
          },
        ],
      });

      expect(result.validation.valid).toBe(true);

      // Step 2: Execute the plan
      const elements = kernel.executePlan(result.plan, container);
      expect(elements.size).toBeGreaterThan(0);

      const buttons = container.querySelectorAll('n-button');
      expect(buttons.length).toBe(2);

      // Step 3: Wire command handlers and simulate interaction
      const saveHandler = vi.fn();
      const deleteHandler = vi.fn();
      kernel.bus.on('doc.save', saveHandler);
      kernel.bus.on('doc.delete', deleteHandler);

      // Simulate button press by dispatching the event on the DOM element
      const saveButton = buttons[0] as HTMLElement;
      saveButton.dispatchEvent(new CustomEvent('native:press', { bubbles: true }));
      expect(saveHandler).toHaveBeenCalledOnce();

      // Step 4: Dispatch an undoable command through the bus
      kernel.bus.dispatch('doc.save', { content: 'v1' }, {
        undoType: 'doc.revert',
        undoPayload: { content: 'v0' },
      });
      expect(kernel.history.canUndo.value).toBe(true);

      // Step 5: Verify observability across the full lifecycle
      const allLogs = kernel.log.entries.value;
      expect(allLogs.length).toBeGreaterThan(0);

      // Should have plan execution + command logs
      const planLogs = kernel.log.query({ category: 'plan' });
      expect(planLogs.length).toBeGreaterThanOrEqual(1);

      const cmdLogs = kernel.log.query({ category: 'command' });
      expect(cmdLogs.length).toBeGreaterThanOrEqual(1);

      // Step 6: Teardown the plan
      kernel.teardownPlan(result.plan.id);

      // Verify DOM was removed (elements removed from container)
      // After teardown, the root element should be removed
      const teardownLogs = kernel.log.query({ category: 'plan' }).filter(
        e => e.summary.includes('teardown'),
      );
      expect(teardownLogs.length).toBe(1);

      // Step 7: Destroy kernel
      kernel.destroy();

      // Verify cleanup
      expect(kernel.log.size.value).toBe(0);
      expect(kernel.history.canUndo.value).toBe(false);
      expect(kernel.perf.samples.value.length).toBe(0);
    });
  });

  // ── Cross-cutting: Plan events + Policy + History ──

  describe('Cross-cutting: Plan events + Policy + History', () => {
    it('plan event wiring integrates with policy enforcement and command history', () => {
      // Set up a plan with a button that dispatches a command
      const plan = {
        id: 'cross-cut',
        version: 1,
        root: {
          id: 'root',
          tag: 'div',
          children: [
            {
              id: 'save-btn',
              tag: 'button',
              textContent: 'Save',
              attributes: { 'aria-label': 'Save document' },
              events: { click: 'doc.save' },
            },
          ],
        },
        source: 'generated' as const,
        timestamp: Date.now(),
      };

      const handler = vi.fn();
      kernel.bus.on('doc.save', handler);

      kernel.executePlan(plan, container);

      // Click the button — triggers doc.save command through bus
      const btn = container.querySelector('button') as HTMLElement;
      btn.click();
      expect(handler).toHaveBeenCalledOnce();

      // Now add a policy that blocks doc.save
      const ruleId = kernel.policy.addRule({
        effect: 'deny',
        patterns: ['doc.save'],
        priority: 100,
      });

      // Click again — command should be blocked
      handler.mockClear();
      btn.click();
      expect(handler).not.toHaveBeenCalled();
      expect(kernel.policy.deniedCount.value).toBe(1);

      // Remove the rule, click again
      kernel.policy.removeRule(ruleId);
      btn.click();
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  // ── Cross-cutting: Workflow snapshot + restore ──

  describe('Workflow snapshot + restore', () => {
    it('saves and restores workflow state across engine instances', () => {
      const definition = formWizard({
        id: 'onboarding',
        steps: ['welcome', 'details', 'review'],
      });

      const engine1 = new WorkflowEngine(definition, kernel.bus);
      engine1.start();
      engine1.send('NEXT'); // welcome -> details
      engine1.setContext('userName', 'Alice');

      expect(engine1.currentState.value).toBe('details');
      expect(engine1.getContext('userName')).toBe('Alice');

      // Take snapshot
      const snapshot = engine1.snapshot();
      expect(snapshot.currentState).toBe('details');
      expect(snapshot.context).toEqual(expect.objectContaining({ userName: 'Alice' }));

      // Destroy first engine
      engine1.destroy();

      // Restore into a new engine connected to the same bus
      const engine2 = WorkflowEngine.restore(snapshot, definition, kernel.bus);
      expect(engine2.currentState.value).toBe('details');
      expect(engine2.getContext('userName')).toBe('Alice');
      expect(engine2.running.value).toBe(true);

      // Continue from restored state
      const record = engine2.send('NEXT');
      expect(record).not.toBeNull();
      expect(record!.to).toBe('review');
      expect(engine2.currentState.value).toBe('review');

      engine2.destroy();
    });
  });

  // ── Cross-cutting: Multiple plans with isolated patch operations ──

  describe('Multiple concurrent plans', () => {
    it('executes and patches multiple plans independently', () => {
      const planA = {
        id: 'plan-a',
        version: 1,
        root: { id: 'root-a', tag: 'div', textContent: 'Plan A' },
        source: 'generated' as const,
        timestamp: Date.now(),
      };

      const planB = {
        id: 'plan-b',
        version: 1,
        root: { id: 'root-b', tag: 'div', textContent: 'Plan B' },
        source: 'generated' as const,
        timestamp: Date.now(),
      };

      kernel.executePlan(planA, container);
      kernel.executePlan(planB, container);

      // Both plans rendered
      expect(container.children.length).toBe(2);

      // Patch plan A only
      kernel.patchPlan({
        planId: 'plan-a',
        ops: [{ type: 'set-text', targetId: 'root-a', text: 'Plan A Updated' }],
        source: 'generated',
        timestamp: Date.now(),
      });

      // Plan A updated, Plan B unchanged
      expect(container.children[0]!.textContent).toBe('Plan A Updated');
      expect(container.children[1]!.textContent).toBe('Plan B');

      // Teardown plan A — only plan A removed
      kernel.teardownPlan('plan-a');
      // Plan B remains
      expect(container.children.length).toBeGreaterThanOrEqual(1);
      expect(container.querySelector('div')!.textContent).toBe('Plan B');

      // Patching torn-down plan returns errors
      const errorResult = kernel.patchPlan({
        planId: 'plan-a',
        ops: [{ type: 'set-text', targetId: 'root-a', text: 'Should fail' }],
        source: 'generated',
        timestamp: Date.now(),
      });
      expect(errorResult.applied).toBe(0);
      expect(errorResult.errors.length).toBe(1);
    });
  });
});
