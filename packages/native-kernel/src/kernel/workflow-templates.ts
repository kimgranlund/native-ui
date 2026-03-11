import type { WorkflowDefinition, WorkflowState, WorkflowTransition } from './workflow.ts';

// ── Helpers ──

function freezeStates(states: WorkflowState[]): readonly WorkflowState[] {
  return Object.freeze(states.map((s) => Object.freeze(s)));
}

function freezeTransitions(transitions: WorkflowTransition[]): readonly WorkflowTransition[] {
  return Object.freeze(transitions.map((t) => Object.freeze(t)));
}

function stateEntry(id: string, prefix: string): WorkflowState {
  return {
    id,
    onEntry: `${prefix}.${id}.entered`,
    onExit: `${prefix}.${id}.exited`,
  };
}

// ── formWizard ──

export function formWizard(config: {
  readonly id?: string;
  readonly steps: readonly string[];
}): WorkflowDefinition {
  const id = config.id ?? 'form-wizard';
  const steps = config.steps;

  const states: WorkflowState[] = steps.map((step) => stateEntry(step, id));
  states.push(stateEntry('complete', id));
  states.push(stateEntry('cancelled', id));

  const transitions: WorkflowTransition[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // NEXT → next step (or SUBMIT on last step)
    if (i < steps.length - 1) {
      transitions.push({
        from: step,
        event: 'NEXT',
        to: steps[i + 1],
        action: `${id}.next`,
      });
    } else {
      transitions.push({
        from: step,
        event: 'SUBMIT',
        to: 'complete',
        action: `${id}.submitted`,
      });
    }

    // PREV → previous step
    if (i > 0) {
      transitions.push({
        from: step,
        event: 'PREV',
        to: steps[i - 1],
        action: `${id}.prev`,
      });
    }

    // CANCEL from every step
    transitions.push({
      from: step,
      event: 'CANCEL',
      to: 'cancelled',
      action: `${id}.cancelled`,
    });
  }

  return Object.freeze({
    id,
    initial: steps[0],
    states: freezeStates(states),
    transitions: freezeTransitions(transitions),
    context: Object.freeze({ currentStep: 0, totalSteps: steps.length }),
  });
}

// ── confirmFlow ──

export function confirmFlow(config?: {
  readonly id?: string;
  readonly requireDoubleConfirm?: boolean;
}): WorkflowDefinition {
  const id = config?.id ?? 'confirm-flow';
  const double = config?.requireDoubleConfirm ?? false;

  if (double) {
    const states: WorkflowState[] = [
      stateEntry('idle', id),
      stateEntry('confirming', id),
      stateEntry('confirmed', id),
    ];

    const transitions: WorkflowTransition[] = [
      { from: 'idle', event: 'CONFIRM', to: 'confirming', action: `${id}.confirm` },
      { from: 'confirming', event: 'CONFIRM', to: 'confirmed', action: `${id}.confirm` },
      { from: 'confirming', event: 'CANCEL', to: 'idle', action: `${id}.cancel` },
    ];

    return Object.freeze({
      id,
      initial: 'idle',
      states: freezeStates(states),
      transitions: freezeTransitions(transitions),
    });
  }

  const states: WorkflowState[] = [
    stateEntry('idle', id),
    stateEntry('confirmed', id),
    stateEntry('cancelled', id),
  ];

  const transitions: WorkflowTransition[] = [
    { from: 'idle', event: 'CONFIRM', to: 'confirmed', action: `${id}.confirm` },
    { from: 'idle', event: 'CANCEL', to: 'cancelled', action: `${id}.cancel` },
  ];

  return Object.freeze({
    id,
    initial: 'idle',
    states: freezeStates(states),
    transitions: freezeTransitions(transitions),
  });
}

// ── crudLifecycle ──

export function crudLifecycle(config?: {
  readonly id?: string;
  readonly allowDelete?: boolean;
}): WorkflowDefinition {
  const id = config?.id ?? 'crud-lifecycle';
  const allowDelete = config?.allowDelete ?? false;

  const states: WorkflowState[] = [
    stateEntry('empty', id),
    stateEntry('loading', id),
    stateEntry('loaded', id),
    stateEntry('editing', id),
    stateEntry('saving', id),
    stateEntry('error', id),
  ];

  if (allowDelete) {
    states.push(stateEntry('deleted', id));
  }

  const transitions: WorkflowTransition[] = [
    { from: 'empty', event: 'FETCH', to: 'loading', action: `${id}.fetch` },
    { from: 'loading', event: 'SUCCESS', to: 'loaded', action: `${id}.success` },
    { from: 'loading', event: 'FAILURE', to: 'error', action: `${id}.failure` },
    { from: 'loaded', event: 'EDIT', to: 'editing', action: `${id}.edit` },
    { from: 'loaded', event: 'REFRESH', to: 'loading', action: `${id}.refresh` },
    { from: 'editing', event: 'SAVE', to: 'saving', action: `${id}.save` },
    { from: 'editing', event: 'CANCEL', to: 'loaded', action: `${id}.cancel` },
    { from: 'saving', event: 'SUCCESS', to: 'loaded', action: `${id}.success` },
    { from: 'saving', event: 'FAILURE', to: 'error', action: `${id}.failure` },
    { from: 'error', event: 'RETRY', to: 'loading', action: `${id}.retry` },
    { from: 'error', event: 'DISMISS', to: 'empty', action: `${id}.dismiss` },
  ];

  if (allowDelete) {
    transitions.push(
      { from: 'loaded', event: 'DELETE', to: 'deleted', action: `${id}.delete` },
      { from: 'deleted', event: 'RESET', to: 'empty', action: `${id}.reset` },
    );
  }

  return Object.freeze({
    id,
    initial: 'empty',
    states: freezeStates(states),
    transitions: freezeTransitions(transitions),
  });
}

// ── authFlow ──

export function authFlow(config?: {
  readonly id?: string;
  readonly mfaRequired?: boolean;
}): WorkflowDefinition {
  const id = config?.id ?? 'auth-flow';
  const mfa = config?.mfaRequired ?? false;

  const states: WorkflowState[] = [
    stateEntry('unauthenticated', id),
    stateEntry('authenticating', id),
  ];

  if (mfa) {
    states.push(stateEntry('mfa-pending', id));
  }

  states.push(stateEntry('authenticated', id));
  states.push(stateEntry('error', id));

  const transitions: WorkflowTransition[] = [
    { from: 'unauthenticated', event: 'LOGIN', to: 'authenticating', action: `${id}.login` },
    {
      from: 'authenticating',
      event: 'SUCCESS',
      to: mfa ? 'mfa-pending' : 'authenticated',
      action: `${id}.success`,
    },
    { from: 'authenticating', event: 'FAILURE', to: 'error', action: `${id}.failure` },
    { from: 'authenticated', event: 'LOGOUT', to: 'unauthenticated', action: `${id}.logout` },
    { from: 'error', event: 'RETRY', to: 'authenticating', action: `${id}.retry` },
    { from: 'error', event: 'DISMISS', to: 'unauthenticated', action: `${id}.dismiss` },
  ];

  if (mfa) {
    transitions.push(
      { from: 'mfa-pending', event: 'VERIFY', to: 'authenticated', action: `${id}.verify` },
      { from: 'mfa-pending', event: 'FAIL', to: 'error', action: `${id}.fail` },
    );
  }

  return Object.freeze({
    id,
    initial: 'unauthenticated',
    states: freezeStates(states),
    transitions: freezeTransitions(transitions),
  });
}

// ── toggleFlow ──

export function toggleFlow(config?: {
  readonly id?: string;
  readonly initialState?: 'on' | 'off';
}): WorkflowDefinition {
  const id = config?.id ?? 'toggle-flow';
  const initial = config?.initialState ?? 'off';

  const states: WorkflowState[] = [
    stateEntry('off', id),
    stateEntry('on', id),
  ];

  const transitions: WorkflowTransition[] = [
    { from: 'off', event: 'TOGGLE', to: 'on', action: `${id}.toggle` },
    { from: 'on', event: 'TOGGLE', to: 'off', action: `${id}.toggle` },
  ];

  return Object.freeze({
    id,
    initial,
    states: freezeStates(states),
    transitions: freezeTransitions(transitions),
  });
}
