// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { formWizard, confirmFlow, crudLifecycle, authFlow, toggleFlow } from '../workflow-templates.ts';
import type { WorkflowDefinition, WorkflowTransition } from '../workflow.ts';

// ── Helpers ──

function stateIds(def: WorkflowDefinition): string[] {
  return def.states.map((s) => s.id);
}

function findTransition(
  def: WorkflowDefinition,
  from: string,
  event: string,
): WorkflowTransition | undefined {
  return def.transitions.find((t) => t.from === from && t.event === event);
}

// ── formWizard ──

describe('formWizard', () => {
  const steps = ['info', 'address', 'payment'];

  it('creates correct states for given steps + complete + cancelled', () => {
    const def = formWizard({ steps });
    expect(stateIds(def)).toEqual(['info', 'address', 'payment', 'complete', 'cancelled']);
  });

  it('creates NEXT transitions between consecutive steps', () => {
    const def = formWizard({ steps });

    const infoNext = findTransition(def, 'info', 'NEXT');
    expect(infoNext).toBeDefined();
    expect(infoNext!.to).toBe('address');
    expect(infoNext!.action).toBe('form-wizard.next');

    const addressNext = findTransition(def, 'address', 'NEXT');
    expect(addressNext).toBeDefined();
    expect(addressNext!.to).toBe('payment');
    expect(addressNext!.action).toBe('form-wizard.next');
  });

  it('last step has SUBMIT → complete instead of NEXT', () => {
    const def = formWizard({ steps });

    const paymentNext = findTransition(def, 'payment', 'NEXT');
    expect(paymentNext).toBeUndefined();

    const paymentSubmit = findTransition(def, 'payment', 'SUBMIT');
    expect(paymentSubmit).toBeDefined();
    expect(paymentSubmit!.to).toBe('complete');
    expect(paymentSubmit!.action).toBe('form-wizard.submitted');
  });

  it('creates PREV transitions (not on first step)', () => {
    const def = formWizard({ steps });

    // First step should NOT have PREV
    const infoPrev = findTransition(def, 'info', 'PREV');
    expect(infoPrev).toBeUndefined();

    // Second step PREV goes back to first
    const addressPrev = findTransition(def, 'address', 'PREV');
    expect(addressPrev).toBeDefined();
    expect(addressPrev!.to).toBe('info');
    expect(addressPrev!.action).toBe('form-wizard.prev');

    // Third step PREV goes back to second
    const paymentPrev = findTransition(def, 'payment', 'PREV');
    expect(paymentPrev).toBeDefined();
    expect(paymentPrev!.to).toBe('address');
    expect(paymentPrev!.action).toBe('form-wizard.prev');
  });

  it('creates CANCEL from every step', () => {
    const def = formWizard({ steps });

    for (const step of steps) {
      const cancel = findTransition(def, step, 'CANCEL');
      expect(cancel).toBeDefined();
      expect(cancel!.to).toBe('cancelled');
      expect(cancel!.action).toBe('form-wizard.cancelled');
    }
  });

  it('uses custom id when provided', () => {
    const def = formWizard({ id: 'signup', steps: ['name', 'email'] });
    expect(def.id).toBe('signup');

    // onEntry/onExit use custom id prefix
    const nameState = def.states.find((s) => s.id === 'name')!;
    expect(nameState.onEntry).toBe('signup.name.entered');
    expect(nameState.onExit).toBe('signup.name.exited');

    // Transitions use custom id prefix
    const nameNext = findTransition(def, 'name', 'NEXT');
    expect(nameNext!.action).toBe('signup.next');
  });

  it('default id is form-wizard', () => {
    const def = formWizard({ steps: ['a'] });
    expect(def.id).toBe('form-wizard');
  });

  it('context has currentStep and totalSteps', () => {
    const def = formWizard({ steps });
    expect(def.context).toBeDefined();
    expect(def.context!.currentStep).toBe(0);
    expect(def.context!.totalSteps).toBe(3);
  });

  it('initial state is the first step', () => {
    const def = formWizard({ steps });
    expect(def.initial).toBe('info');
  });

  it('states have correct onEntry/onExit commands', () => {
    const def = formWizard({ steps });

    for (const state of def.states) {
      expect(state.onEntry).toBe(`form-wizard.${state.id}.entered`);
      expect(state.onExit).toBe(`form-wizard.${state.id}.exited`);
    }
  });

  it('result is frozen', () => {
    const def = formWizard({ steps });
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);
    expect(Object.isFrozen(def.context)).toBe(true);

    // Individual states and transitions are also frozen
    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });

  it('works with a single step', () => {
    const def = formWizard({ steps: ['only'] });
    expect(stateIds(def)).toEqual(['only', 'complete', 'cancelled']);

    // Single step has SUBMIT (no NEXT), CANCEL, and no PREV
    const submit = findTransition(def, 'only', 'SUBMIT');
    expect(submit).toBeDefined();
    expect(submit!.to).toBe('complete');

    expect(findTransition(def, 'only', 'NEXT')).toBeUndefined();
    expect(findTransition(def, 'only', 'PREV')).toBeUndefined();

    const cancel = findTransition(def, 'only', 'CANCEL');
    expect(cancel).toBeDefined();
  });
});

// ── confirmFlow ──

describe('confirmFlow', () => {
  describe('simple (no double confirm)', () => {
    it('has states: idle, confirmed, cancelled', () => {
      const def = confirmFlow();
      expect(stateIds(def)).toEqual(['idle', 'confirmed', 'cancelled']);
    });

    it('idle → confirmed via CONFIRM', () => {
      const def = confirmFlow();
      const confirm = findTransition(def, 'idle', 'CONFIRM');
      expect(confirm).toBeDefined();
      expect(confirm!.to).toBe('confirmed');
      expect(confirm!.action).toBe('confirm-flow.confirm');
    });

    it('idle → cancelled via CANCEL', () => {
      const def = confirmFlow();
      const cancel = findTransition(def, 'idle', 'CANCEL');
      expect(cancel).toBeDefined();
      expect(cancel!.to).toBe('cancelled');
      expect(cancel!.action).toBe('confirm-flow.cancel');
    });

    it('initial state is idle', () => {
      const def = confirmFlow();
      expect(def.initial).toBe('idle');
    });
  });

  describe('double confirm', () => {
    it('has states: idle, confirming, confirmed', () => {
      const def = confirmFlow({ requireDoubleConfirm: true });
      expect(stateIds(def)).toEqual(['idle', 'confirming', 'confirmed']);
    });

    it('idle → confirming via CONFIRM', () => {
      const def = confirmFlow({ requireDoubleConfirm: true });
      const first = findTransition(def, 'idle', 'CONFIRM');
      expect(first).toBeDefined();
      expect(first!.to).toBe('confirming');
      expect(first!.action).toBe('confirm-flow.confirm');
    });

    it('confirming → confirmed via CONFIRM', () => {
      const def = confirmFlow({ requireDoubleConfirm: true });
      const second = findTransition(def, 'confirming', 'CONFIRM');
      expect(second).toBeDefined();
      expect(second!.to).toBe('confirmed');
      expect(second!.action).toBe('confirm-flow.confirm');
    });

    it('confirming → idle via CANCEL', () => {
      const def = confirmFlow({ requireDoubleConfirm: true });
      const cancel = findTransition(def, 'confirming', 'CANCEL');
      expect(cancel).toBeDefined();
      expect(cancel!.to).toBe('idle');
      expect(cancel!.action).toBe('confirm-flow.cancel');
    });

    it('does not have a cancelled state', () => {
      const def = confirmFlow({ requireDoubleConfirm: true });
      expect(stateIds(def)).not.toContain('cancelled');
    });
  });

  it('default id is confirm-flow', () => {
    const def = confirmFlow();
    expect(def.id).toBe('confirm-flow');
  });

  it('uses custom id', () => {
    const def = confirmFlow({ id: 'delete-confirm' });
    expect(def.id).toBe('delete-confirm');

    const confirm = findTransition(def, 'idle', 'CONFIRM');
    expect(confirm!.action).toBe('delete-confirm.confirm');

    const idleState = def.states.find((s) => s.id === 'idle')!;
    expect(idleState.onEntry).toBe('delete-confirm.idle.entered');
    expect(idleState.onExit).toBe('delete-confirm.idle.exited');
  });

  it('states have correct onEntry/onExit commands', () => {
    const def = confirmFlow();

    for (const state of def.states) {
      expect(state.onEntry).toBe(`confirm-flow.${state.id}.entered`);
      expect(state.onExit).toBe(`confirm-flow.${state.id}.exited`);
    }
  });

  it('result is frozen', () => {
    const def = confirmFlow();
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });

  it('double confirm result is frozen', () => {
    const def = confirmFlow({ requireDoubleConfirm: true });
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });

  it('works with no config argument', () => {
    const def = confirmFlow();
    expect(def.id).toBe('confirm-flow');
    expect(def.initial).toBe('idle');
  });
});

// ── crudLifecycle ──

describe('crudLifecycle', () => {
  it('has states: empty, loading, loaded, editing, saving, error', () => {
    const def = crudLifecycle();
    expect(stateIds(def)).toEqual(['empty', 'loading', 'loaded', 'editing', 'saving', 'error']);
  });

  it('initial state is empty', () => {
    const def = crudLifecycle();
    expect(def.initial).toBe('empty');
  });

  it('correct transitions for full CRUD cycle', () => {
    const def = crudLifecycle();

    // empty → loading (FETCH)
    const fetch = findTransition(def, 'empty', 'FETCH');
    expect(fetch).toBeDefined();
    expect(fetch!.to).toBe('loading');
    expect(fetch!.action).toBe('crud-lifecycle.fetch');

    // loading → loaded (SUCCESS)
    const loadSuccess = findTransition(def, 'loading', 'SUCCESS');
    expect(loadSuccess).toBeDefined();
    expect(loadSuccess!.to).toBe('loaded');
    expect(loadSuccess!.action).toBe('crud-lifecycle.success');

    // loading → error (FAILURE)
    const loadFailure = findTransition(def, 'loading', 'FAILURE');
    expect(loadFailure).toBeDefined();
    expect(loadFailure!.to).toBe('error');
    expect(loadFailure!.action).toBe('crud-lifecycle.failure');

    // loaded → editing (EDIT)
    const edit = findTransition(def, 'loaded', 'EDIT');
    expect(edit).toBeDefined();
    expect(edit!.to).toBe('editing');
    expect(edit!.action).toBe('crud-lifecycle.edit');

    // loaded → loading (REFRESH)
    const refresh = findTransition(def, 'loaded', 'REFRESH');
    expect(refresh).toBeDefined();
    expect(refresh!.to).toBe('loading');
    expect(refresh!.action).toBe('crud-lifecycle.refresh');

    // editing → saving (SAVE)
    const save = findTransition(def, 'editing', 'SAVE');
    expect(save).toBeDefined();
    expect(save!.to).toBe('saving');
    expect(save!.action).toBe('crud-lifecycle.save');

    // editing → loaded (CANCEL)
    const editCancel = findTransition(def, 'editing', 'CANCEL');
    expect(editCancel).toBeDefined();
    expect(editCancel!.to).toBe('loaded');
    expect(editCancel!.action).toBe('crud-lifecycle.cancel');

    // saving → loaded (SUCCESS)
    const saveSuccess = findTransition(def, 'saving', 'SUCCESS');
    expect(saveSuccess).toBeDefined();
    expect(saveSuccess!.to).toBe('loaded');
    expect(saveSuccess!.action).toBe('crud-lifecycle.success');

    // saving → error (FAILURE)
    const saveFailure = findTransition(def, 'saving', 'FAILURE');
    expect(saveFailure).toBeDefined();
    expect(saveFailure!.to).toBe('error');
    expect(saveFailure!.action).toBe('crud-lifecycle.failure');

    // error → loading (RETRY)
    const retry = findTransition(def, 'error', 'RETRY');
    expect(retry).toBeDefined();
    expect(retry!.to).toBe('loading');
    expect(retry!.action).toBe('crud-lifecycle.retry');

    // error → empty (DISMISS)
    const dismiss = findTransition(def, 'error', 'DISMISS');
    expect(dismiss).toBeDefined();
    expect(dismiss!.to).toBe('empty');
    expect(dismiss!.action).toBe('crud-lifecycle.dismiss');
  });

  it('allowDelete adds deleted state and DELETE/RESET transitions', () => {
    const def = crudLifecycle({ allowDelete: true });

    expect(stateIds(def)).toContain('deleted');

    // loaded → deleted (DELETE)
    const del = findTransition(def, 'loaded', 'DELETE');
    expect(del).toBeDefined();
    expect(del!.to).toBe('deleted');
    expect(del!.action).toBe('crud-lifecycle.delete');

    // deleted → empty (RESET)
    const reset = findTransition(def, 'deleted', 'RESET');
    expect(reset).toBeDefined();
    expect(reset!.to).toBe('empty');
    expect(reset!.action).toBe('crud-lifecycle.reset');
  });

  it('without allowDelete has no deleted state or DELETE/RESET transitions', () => {
    const def = crudLifecycle();

    expect(stateIds(def)).not.toContain('deleted');
    expect(findTransition(def, 'loaded', 'DELETE')).toBeUndefined();
  });

  it('default id is crud-lifecycle', () => {
    const def = crudLifecycle();
    expect(def.id).toBe('crud-lifecycle');
  });

  it('uses custom id', () => {
    const def = crudLifecycle({ id: 'user-crud' });
    expect(def.id).toBe('user-crud');

    const fetch = findTransition(def, 'empty', 'FETCH');
    expect(fetch!.action).toBe('user-crud.fetch');

    const emptyState = def.states.find((s) => s.id === 'empty')!;
    expect(emptyState.onEntry).toBe('user-crud.empty.entered');
    expect(emptyState.onExit).toBe('user-crud.empty.exited');
  });

  it('states have correct onEntry/onExit commands', () => {
    const def = crudLifecycle();

    for (const state of def.states) {
      expect(state.onEntry).toBe(`crud-lifecycle.${state.id}.entered`);
      expect(state.onExit).toBe(`crud-lifecycle.${state.id}.exited`);
    }
  });

  it('result is frozen', () => {
    const def = crudLifecycle();
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });

  it('allowDelete result is frozen', () => {
    const def = crudLifecycle({ allowDelete: true });
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    // deleted state is also frozen
    const deletedState = def.states.find((s) => s.id === 'deleted')!;
    expect(Object.isFrozen(deletedState)).toBe(true);
  });
});

// ── authFlow ──

describe('authFlow', () => {
  describe('basic (no MFA)', () => {
    it('has states: unauthenticated, authenticating, authenticated, error', () => {
      const def = authFlow();
      expect(stateIds(def)).toEqual(['unauthenticated', 'authenticating', 'authenticated', 'error']);
    });

    it('initial state is unauthenticated', () => {
      const def = authFlow();
      expect(def.initial).toBe('unauthenticated');
    });

    it('unauthenticated → authenticating via LOGIN', () => {
      const def = authFlow();
      const login = findTransition(def, 'unauthenticated', 'LOGIN');
      expect(login).toBeDefined();
      expect(login!.to).toBe('authenticating');
      expect(login!.action).toBe('auth-flow.login');
    });

    it('authenticating → authenticated via SUCCESS', () => {
      const def = authFlow();
      const success = findTransition(def, 'authenticating', 'SUCCESS');
      expect(success).toBeDefined();
      expect(success!.to).toBe('authenticated');
      expect(success!.action).toBe('auth-flow.success');
    });

    it('authenticating → error via FAILURE', () => {
      const def = authFlow();
      const failure = findTransition(def, 'authenticating', 'FAILURE');
      expect(failure).toBeDefined();
      expect(failure!.to).toBe('error');
      expect(failure!.action).toBe('auth-flow.failure');
    });

    it('authenticated → unauthenticated via LOGOUT', () => {
      const def = authFlow();
      const logout = findTransition(def, 'authenticated', 'LOGOUT');
      expect(logout).toBeDefined();
      expect(logout!.to).toBe('unauthenticated');
      expect(logout!.action).toBe('auth-flow.logout');
    });

    it('error → authenticating via RETRY', () => {
      const def = authFlow();
      const retry = findTransition(def, 'error', 'RETRY');
      expect(retry).toBeDefined();
      expect(retry!.to).toBe('authenticating');
      expect(retry!.action).toBe('auth-flow.retry');
    });

    it('error → unauthenticated via DISMISS', () => {
      const def = authFlow();
      const dismiss = findTransition(def, 'error', 'DISMISS');
      expect(dismiss).toBeDefined();
      expect(dismiss!.to).toBe('unauthenticated');
      expect(dismiss!.action).toBe('auth-flow.dismiss');
    });

    it('does not have mfa-pending state', () => {
      const def = authFlow();
      expect(stateIds(def)).not.toContain('mfa-pending');
    });
  });

  describe('MFA', () => {
    it('has states: unauthenticated, authenticating, mfa-pending, authenticated, error', () => {
      const def = authFlow({ mfaRequired: true });
      expect(stateIds(def)).toEqual([
        'unauthenticated',
        'authenticating',
        'mfa-pending',
        'authenticated',
        'error',
      ]);
    });

    it('authenticating → mfa-pending via SUCCESS (not authenticated)', () => {
      const def = authFlow({ mfaRequired: true });
      const success = findTransition(def, 'authenticating', 'SUCCESS');
      expect(success).toBeDefined();
      expect(success!.to).toBe('mfa-pending');
      expect(success!.action).toBe('auth-flow.success');
    });

    it('mfa-pending → authenticated via VERIFY', () => {
      const def = authFlow({ mfaRequired: true });
      const verify = findTransition(def, 'mfa-pending', 'VERIFY');
      expect(verify).toBeDefined();
      expect(verify!.to).toBe('authenticated');
      expect(verify!.action).toBe('auth-flow.verify');
    });

    it('mfa-pending → error via FAIL', () => {
      const def = authFlow({ mfaRequired: true });
      const fail = findTransition(def, 'mfa-pending', 'FAIL');
      expect(fail).toBeDefined();
      expect(fail!.to).toBe('error');
      expect(fail!.action).toBe('auth-flow.fail');
    });
  });

  it('default id is auth-flow', () => {
    const def = authFlow();
    expect(def.id).toBe('auth-flow');
  });

  it('uses custom id', () => {
    const def = authFlow({ id: 'login' });
    expect(def.id).toBe('login');

    const login = findTransition(def, 'unauthenticated', 'LOGIN');
    expect(login!.action).toBe('login.login');

    const unauthState = def.states.find((s) => s.id === 'unauthenticated')!;
    expect(unauthState.onEntry).toBe('login.unauthenticated.entered');
    expect(unauthState.onExit).toBe('login.unauthenticated.exited');
  });

  it('states have correct onEntry/onExit commands', () => {
    const def = authFlow();

    for (const state of def.states) {
      expect(state.onEntry).toBe(`auth-flow.${state.id}.entered`);
      expect(state.onExit).toBe(`auth-flow.${state.id}.exited`);
    }
  });

  it('MFA states have correct onEntry/onExit commands', () => {
    const def = authFlow({ mfaRequired: true });

    const mfaState = def.states.find((s) => s.id === 'mfa-pending')!;
    expect(mfaState.onEntry).toBe('auth-flow.mfa-pending.entered');
    expect(mfaState.onExit).toBe('auth-flow.mfa-pending.exited');
  });

  it('result is frozen', () => {
    const def = authFlow();
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });

  it('MFA result is frozen', () => {
    const def = authFlow({ mfaRequired: true });
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });
});

// ── toggleFlow ──

describe('toggleFlow', () => {
  it('has two states: off and on', () => {
    const def = toggleFlow();
    expect(stateIds(def)).toEqual(['off', 'on']);
  });

  it('off → on via TOGGLE', () => {
    const def = toggleFlow();
    const toggle = findTransition(def, 'off', 'TOGGLE');
    expect(toggle).toBeDefined();
    expect(toggle!.to).toBe('on');
    expect(toggle!.action).toBe('toggle-flow.toggle');
  });

  it('on → off via TOGGLE', () => {
    const def = toggleFlow();
    const toggle = findTransition(def, 'on', 'TOGGLE');
    expect(toggle).toBeDefined();
    expect(toggle!.to).toBe('off');
    expect(toggle!.action).toBe('toggle-flow.toggle');
  });

  it('default initial is off', () => {
    const def = toggleFlow();
    expect(def.initial).toBe('off');
  });

  it('custom initial state works', () => {
    const def = toggleFlow({ initialState: 'on' });
    expect(def.initial).toBe('on');
  });

  it('default id is toggle-flow', () => {
    const def = toggleFlow();
    expect(def.id).toBe('toggle-flow');
  });

  it('uses custom id', () => {
    const def = toggleFlow({ id: 'dark-mode' });
    expect(def.id).toBe('dark-mode');

    const toggleOff = findTransition(def, 'off', 'TOGGLE');
    expect(toggleOff!.action).toBe('dark-mode.toggle');

    const offState = def.states.find((s) => s.id === 'off')!;
    expect(offState.onEntry).toBe('dark-mode.off.entered');
    expect(offState.onExit).toBe('dark-mode.off.exited');
  });

  it('states have correct onEntry/onExit commands', () => {
    const def = toggleFlow();

    for (const state of def.states) {
      expect(state.onEntry).toBe(`toggle-flow.${state.id}.entered`);
      expect(state.onExit).toBe(`toggle-flow.${state.id}.exited`);
    }
  });

  it('result is frozen', () => {
    const def = toggleFlow();
    expect(Object.isFrozen(def)).toBe(true);
    expect(Object.isFrozen(def.states)).toBe(true);
    expect(Object.isFrozen(def.transitions)).toBe(true);

    for (const state of def.states) {
      expect(Object.isFrozen(state)).toBe(true);
    }
    for (const transition of def.transitions) {
      expect(Object.isFrozen(transition)).toBe(true);
    }
  });

  it('works with no config argument', () => {
    const def = toggleFlow();
    expect(def.id).toBe('toggle-flow');
    expect(def.initial).toBe('off');
    expect(def.states).toHaveLength(2);
    expect(def.transitions).toHaveLength(2);
  });
});
