import { Kernel, resetKernel } from './kernel.ts';
import { WorkflowEngine } from './workflow.ts';
import { validateAccessibility, auditDOM } from './accessibility.ts';
import { effect } from '@nonoun/native-core';
import { COMPONENT_MANIFEST, getDescriptorsByCategory, installEventBridge } from './components.ts';
import { formWizard, crudLifecycle, authFlow, toggleFlow } from './workflow-templates.ts';
import { SCHEMA_CATALOG, getSchema } from './schema-catalog.ts';
import { Planner } from './planner.ts';

// ── Initialize Kernel ──

resetKernel();
const kernel = new Kernel({ allowUnregistered: true, logCommands: true });

// ── Command Bus Demo ──

let counter = 0;
let cmdCount = 0;
const cmdLog = document.getElementById('cmd-log');
const counterValue = document.getElementById('counter-value');
const cmdCountEl = document.getElementById('cmd-count');

function logCmd(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  cmdLog!.prepend(entry);
}

function updateCounterUI() {
  counterValue!.textContent = String(counter);
  cmdCountEl!.textContent = String(cmdCount);
}

// Register command handlers
kernel.bus.on('counter.increment', (cmd: any) => {
  counter++;
  cmdCount++;
  logCmd(`counter.increment → ${counter} (source: ${cmd.source})`);
  updateCounterUI();
});

kernel.bus.on('counter.decrement', (cmd: any) => {
  counter--;
  cmdCount++;
  logCmd(`counter.decrement → ${counter} (source: ${cmd.source})`);
  updateCounterUI();
});

kernel.bus.on('counter.set', (cmd: any) => {
  counter = cmd.payload;
  cmdCount++;
  logCmd(`counter.set → ${counter} (source: ${cmd.source})`, 'undo');
  updateCounterUI();
});

kernel.bus.on('counter.reset', () => {
  counter = 0;
  cmdCount++;
  logCmd('counter.reset → 0');
  updateCounterUI();
});

// Logging middleware (already wired by kernel for history)
kernel.bus.use((_command: any, next: () => void) => {
  next();
});

// Wire buttons
document.getElementById('cmd-increment')!.addEventListener('native:press', () => {
  kernel.bus.dispatch('counter.increment', null, {
    undoType: 'counter.set',
    undoPayload: counter,
  });
});

document.getElementById('cmd-decrement')!.addEventListener('native:press', () => {
  kernel.bus.dispatch('counter.decrement', null, {
    undoType: 'counter.set',
    undoPayload: counter,
  });
});

document.getElementById('cmd-reset')!.addEventListener('native:press', () => {
  kernel.bus.dispatch('counter.reset', null);
});

// ── Undo / Redo ──

const btnUndo = document.getElementById('btn-undo') as any;
const btnRedo = document.getElementById('btn-redo') as any;
const undoCountEl = document.getElementById('undo-count');
const redoCountEl = document.getElementById('redo-count');

function doUndo() {
  const cmd = kernel.history.undo(kernel.bus);
  if (cmd) logCmd(`Undo: ${cmd.type}`, 'undo');
}

function doRedo() {
  const cmd = kernel.history.redo(kernel.bus);
  if (cmd) logCmd(`Redo: ${cmd.type}`, 'undo');
}

btnUndo.addEventListener('native:press', doUndo);
btnRedo.addEventListener('native:press', doRedo);

// Reactive undo/redo status
effect(() => {
  const canUndo = kernel.history.canUndo.value;
  const canRedo = kernel.history.canRedo.value;
  btnUndo.disabled = !canUndo;
  btnRedo.disabled = !canRedo;
  undoCountEl!.textContent = String(kernel.history.undoStack.value.length);
  redoCountEl!.textContent = String(kernel.history.redoStack.value.length);
});

// ── Focus Router ──

const shortcutLog = document.getElementById('shortcut-log');
const shortcutList = document.getElementById('shortcut-list');

function logShortcut(text: string) {
  const entry = document.createElement('div');
  entry.className = 'log-entry cmd';
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  shortcutLog!.prepend(entry);
}

const isMac = navigator.platform.includes('Mac');
const modKey = isMac ? 'meta' : 'ctrl';
const modLabel = isMac ? 'Cmd' : 'Ctrl';

const shortcuts = [
  {
    key: 'z',
    mod: { [modKey]: true },
    handler: () => doUndo(),
    description: 'Undo',
  },
  {
    key: 'z',
    mod: { [modKey]: true, shift: true },
    handler: () => doRedo(),
    description: 'Redo',
  },
  {
    key: '1',
    mod: {},
    handler: () => {
      logShortcut('Shortcut: 1 pressed');
      kernel.bus.dispatch('shortcut.1', null);
    },
    description: 'Dispatch shortcut.1',
  },
  {
    key: '2',
    mod: {},
    handler: () => {
      logShortcut('Shortcut: 2 pressed');
      kernel.bus.dispatch('shortcut.2', null);
    },
    description: 'Dispatch shortcut.2',
  },
  {
    key: '?',
    mod: { shift: true },
    handler: () => {
      logShortcut('Help shortcut triggered!');
    },
    description: 'Show help',
  },
];

for (const s of shortcuts) {
  kernel.focus.register(s);
}

// Render shortcut reference
for (const s of shortcuts) {
  const modParts: string[] = [];
  if ((s.mod as any)?.meta) modParts.push(modLabel);
  if ((s.mod as any)?.ctrl && !isMac) modParts.push('Ctrl');
  if ((s.mod as any)?.shift) modParts.push('Shift');
  modParts.push(s.key === ' ' ? 'Space' : s.key.toUpperCase());

  const kbdEl = document.createElement('div');
  kbdEl.innerHTML = `<kbd>${modParts.join(' + ')}</kbd>`;
  shortcutList!.appendChild(kbdEl);

  const descEl = document.createElement('div');
  descEl.textContent = s.description;
  descEl.style.color = 'var(--n-ink-muted-neutral)';
  descEl.style.fontSize = '0.8125rem';
  shortcutList!.appendChild(descEl);
}

// ── Overlay Manager ──

const overlayDepthEl = document.getElementById('overlay-depth');
const overlayTopEl = document.getElementById('overlay-top');

function updateOverlayStatus() {
  const stack = kernel.overlays.stack.value;
  overlayDepthEl!.textContent = String(stack.length);
  const top = kernel.overlays.topOverlay.value;
  overlayTopEl!.textContent = top ? `${top.type} (z: ${top.zIndex})` : 'none';
}

effect(() => {
  // Subscribe to overlay stack changes
  kernel.overlays.stack.value;
  updateOverlayStatus();
});

function createOverlayBox(type: string, title: string, message: string, x: number, y: number) {
  const box = document.createElement('div');
  box.className = 'overlay-demo-box';
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;

  const h = document.createElement('h4');
  h.textContent = title;
  box.appendChild(h);

  const p = document.createElement('p');
  p.textContent = message;
  box.appendChild(p);

  const closeBtn = document.createElement('n-button') as any;
  closeBtn.setAttribute('size', 'xs');
  closeBtn.innerHTML = '<span slot="label">Close</span>';
  box.appendChild(closeBtn);

  document.body.appendChild(box);
  const trigger = document.getElementById(`overlay-open-${type}`);
  const id = kernel.overlays.open({ type, element: box, owner: trigger });

  box.style.zIndex = String(kernel.overlays.getEntry(id)?.zIndex ?? 1000);

  closeBtn.addEventListener('native:press', () => {
    kernel.overlays.close(id);
    box.remove();
  });

  // Clean up when overlay is closed externally (Escape, click outside)
  const checkInterval = setInterval(() => {
    if (!kernel.overlays.isOpen(id)) {
      box.remove();
      clearInterval(checkInterval);
    }
  }, 100);

  return id;
}

document.getElementById('overlay-open-popover')!.addEventListener('native:press', (e) => {
  const rect = (e.target as Element).getBoundingClientRect();
  createOverlayBox(
    'popover',
    'Popover Overlay',
    'Click outside or press Escape to dismiss.',
    rect.left,
    rect.bottom + 8,
  );
});

document.getElementById('overlay-open-dialog')!.addEventListener('native:press', (e) => {
  const rect = (e.target as Element).getBoundingClientRect();
  createOverlayBox(
    'dialog',
    'Dialog Overlay',
    'Stacks on top of popovers. Try opening both!',
    rect.left + 40,
    rect.bottom + 8,
  );
});

document.getElementById('overlay-close-all')!.addEventListener('native:press', () => {
  // Remove all overlay DOM elements
  for (const entry of kernel.overlays.stack.value) {
    entry.element.remove();
  }
  kernel.overlays.closeAll();
});

// ── Plan Executor ──

const defaultPlan = {
  id: 'demo-plan-1',
  version: 1,
  source: 'generated',
  timestamp: Date.now(),
  root: {
    id: 'card',
    tag: 'div',
    attributes: { style: 'background: var(--n-card-neutral); border: 1px solid var(--n-border-muted-neutral); border-radius: 0.5rem; padding: 1.5rem;' },
    children: [
      {
        id: 'heading',
        tag: 'h3',
        attributes: { style: 'margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600;' },
        textContent: 'Generated UI',
      },
      {
        id: 'description',
        tag: 'p',
        attributes: { style: 'margin: 0 0 1rem; font-size: 0.875rem; color: var(--n-ink-muted-neutral);' },
        textContent: 'This card was rendered from a JSON plan by the PlanExecutor.',
      },
      {
        id: 'actions',
        tag: 'div',
        attributes: { style: 'display: flex; gap: 0.5rem;' },
        children: [
          {
            id: 'btn-confirm',
            tag: 'n-button',
            attributes: { variant: 'primary', size: 'sm' },
            events: { 'native:press': 'plan.confirm' },
            children: [
              { id: 'btn-confirm-label', tag: 'span', attributes: { slot: 'label' }, textContent: 'Confirm' },
            ],
          },
          {
            id: 'btn-cancel',
            tag: 'n-button',
            attributes: { size: 'sm' },
            events: { 'native:press': 'plan.cancel' },
            children: [
              { id: 'btn-cancel-label', tag: 'span', attributes: { slot: 'label' }, textContent: 'Cancel' },
            ],
          },
        ],
      },
    ],
  },
};

const planInput = document.getElementById('plan-input') as any;
const planOutput = document.getElementById('plan-output');
const planLog = document.getElementById('plan-log');

planInput.value = JSON.stringify(defaultPlan, null, 2);

function logPlan(text: string, cls = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  planLog!.prepend(entry);
}

// Listen for plan commands
kernel.bus.on('plan.confirm', () => logPlan('Command: plan.confirm', 'cmd'));
kernel.bus.on('plan.cancel', () => logPlan('Command: plan.cancel', 'cmd'));

// Listen for any command from plans using a filter
kernel.bus.on(
  (cmd: any) => cmd.type.startsWith('plan.'),
  (cmd: any) => {
    const target = cmd.payload?.target;
    if (target) {
      logPlan(`  → target: ${target}, event: ${cmd.payload.event}`);
    }
  },
);

let currentPlanId: string | null = null;

document.getElementById('plan-execute')!.addEventListener('native:press', () => {
  // Teardown previous
  if (currentPlanId) {
    kernel.executor.teardown(currentPlanId);
    currentPlanId = null;
  }
  planOutput!.innerHTML = '';

  try {
    const plan = JSON.parse(planInput.value);
    plan.timestamp = Date.now();

    const elements = kernel.executePlan(plan, planOutput);
    currentPlanId = plan.id;
    logPlan(`Plan "${plan.id}" executed — ${elements.size} elements rendered`, 'cmd');
  } catch (err: any) {
    logPlan(`Error: ${err.message}`, 'error');
  }
});

document.getElementById('plan-clear')!.addEventListener('native:press', () => {
  if (currentPlanId) {
    kernel.executor.teardown(currentPlanId);
    currentPlanId = null;
  }
  planOutput!.innerHTML = '';
  logPlan('Output cleared');
});

document.getElementById('plan-reset')!.addEventListener('native:press', () => {
  planInput.value = JSON.stringify(defaultPlan, null, 2);
  logPlan('JSON reset to default');
});

// ── Patch Protocol ──

const patchLog = document.getElementById('patch-log');
let patchCounter = 0;

function logPatch(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  patchLog!.prepend(entry);
}

document.getElementById('patch-text')!.addEventListener('native:press', () => {
  if (!currentPlanId) { logPatch('No active plan — execute a plan first', 'error'); return; }
  const result = kernel.patchPlan({
    planId: currentPlanId,
    ops: [{ type: 'set-text', targetId: 'heading', text: `Patched Heading #${++patchCounter}` }],
    source: 'human',
    timestamp: Date.now(),
  });
  logPatch(`set-text: applied=${result.applied}, errors=${result.errors.length}`);
});

document.getElementById('patch-add')!.addEventListener('native:press', () => {
  if (!currentPlanId) { logPatch('No active plan — execute a plan first', 'error'); return; }
  const childId = `added-${++patchCounter}`;
  const result = kernel.patchPlan({
    planId: currentPlanId,
    ops: [{ type: 'add', parentId: 'card', node: { id: childId, tag: 'p', textContent: `Added child #${patchCounter}` } }],
    source: 'human',
    timestamp: Date.now(),
  });
  logPatch(`add: "${childId}" → applied=${result.applied}, errors=${result.errors.length}`);
});

document.getElementById('patch-remove')!.addEventListener('native:press', () => {
  if (!currentPlanId) { logPatch('No active plan — execute a plan first', 'error'); return; }
  const result = kernel.patchPlan({
    planId: currentPlanId,
    ops: [{ type: 'remove', targetId: 'description' }],
    source: 'human',
    timestamp: Date.now(),
  });
  logPatch(`remove "description": applied=${result.applied}, errors=${result.errors.length}`, result.errors.length ? 'error' : 'cmd');
});

document.getElementById('patch-attr')!.addEventListener('native:press', () => {
  if (!currentPlanId) { logPatch('No active plan — execute a plan first', 'error'); return; }
  const result = kernel.patchPlan({
    planId: currentPlanId,
    ops: [{ type: 'set-attribute', targetId: 'card', name: 'style', value: 'background: var(--n-panel-accent); border: 1px solid var(--n-border-muted-accent); border-radius: 0.5rem; padding: 1.5rem;' }],
    source: 'human',
    timestamp: Date.now(),
  });
  logPatch(`set-attribute: applied=${result.applied}`);
});

// ── Accessibility Validation ──

const a11yLog = document.getElementById('a11y-log');

function logA11y(text: string, cls = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  a11yLog!.prepend(entry);
}

document.getElementById('a11y-check-plan')!.addEventListener('native:press', () => {
  try {
    const plan = JSON.parse(planInput.value);
    const result = kernel.validatePlanAccessibility(plan);
    logA11y(`Valid: ${result.valid} — ${result.violations.length} violation(s)`, result.valid ? 'cmd' : 'error');
    for (const v of result.violations) {
      logA11y(`  [${v.severity}] ${v.rule}: ${v.message} (${v.nodeId})`, v.severity === 'error' ? 'error' : 'undo');
    }
  } catch (err: any) {
    logA11y(`Parse error: ${err.message}`, 'error');
  }
});

document.getElementById('a11y-check-bad')!.addEventListener('native:press', () => {
  const badPlan = {
    id: 'bad-a11y', version: 1, source: 'generated', timestamp: Date.now(),
    root: {
      id: 'root', tag: 'div', children: [
        { id: 'btn', tag: 'button' },
        { id: 'img', tag: 'img' },
        { id: 'h3', tag: 'h3', textContent: 'Skipped h1/h2', attributes: { 'aria-label': 'heading' } },
      ],
    },
  };
  const result = validateAccessibility(badPlan.root);
  logA11y(`Bad plan: valid=${result.valid}, ${result.violations.length} violation(s)`, 'error');
  for (const v of result.violations) {
    logA11y(`  [${v.severity}] ${v.rule}: ${v.message} (${v.nodeId})`, v.severity === 'error' ? 'error' : 'undo');
  }
});

document.getElementById('a11y-audit-dom')!.addEventListener('native:press', () => {
  const root = document.querySelector('.plan-output');
  if (!root || !root.firstElementChild) { logA11y('No rendered plan to audit', 'error'); return; }
  const result = auditDOM(root as HTMLElement);
  logA11y(`DOM audit: valid=${result.valid}, ${result.violations.length} violation(s)`, result.valid ? 'cmd' : 'error');
  for (const v of result.violations) {
    logA11y(`  [${v.severity}] ${v.rule}: ${v.message}`, v.severity === 'error' ? 'error' : 'undo');
  }
});

// ── Observability ──

const obsLog = document.getElementById('obs-log');
const obsCountEl = document.getElementById('obs-count');
const obsPerfCountEl = document.getElementById('obs-perf-count');

function renderObsStatus() {
  obsCountEl!.textContent = String(kernel.log.size.value);
  obsPerfCountEl!.textContent = String(kernel.perf.samples.value.length);
}

effect(() => { renderObsStatus(); });

document.getElementById('obs-show-log')!.addEventListener('native:press', () => {
  obsLog!.innerHTML = '';
  const entries = kernel.log.query({ limit: 20 });
  for (const e of entries) {
    const div = document.createElement('div');
    div.className = `log-entry ${e.category === 'error' ? 'error' : e.category === 'command' ? 'cmd' : ''}`;
    div.textContent = `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.category}] ${e.summary}`;
    obsLog!.appendChild(div);
  }
  if (entries.length === 0) {
    obsLog!.innerHTML = '<div class="log-entry">No log entries yet.</div>';
  }
});

document.getElementById('obs-show-perf')!.addEventListener('native:press', () => {
  obsLog!.innerHTML = '';
  const labels = new Set(kernel.perf.samples.value.map((s: any) => s.label));
  for (const label of labels) {
    const summary = kernel.perf.getSummary(label as string);
    if (!summary) continue;
    const div = document.createElement('div');
    div.className = 'log-entry cmd';
    div.textContent = `${label}: count=${summary.count}, avg=${summary.avg.toFixed(2)}ms, min=${summary.min.toFixed(2)}ms, max=${summary.max.toFixed(2)}ms, p95=${summary.p95.toFixed(2)}ms`;
    obsLog!.appendChild(div);
  }
  if (labels.size === 0) {
    obsLog!.innerHTML = '<div class="log-entry">No perf samples yet.</div>';
  }
});

document.getElementById('obs-clear')!.addEventListener('native:press', () => {
  kernel.log.clear();
  kernel.perf.clear();
  obsLog!.innerHTML = '<div class="log-entry">Cleared.</div>';
});

// ── Workflow Engine ──

const wfLog = document.getElementById('wf-log');
const wfStateEl = document.getElementById('wf-state');
const wfRunningEl = document.getElementById('wf-running');
const wfCyclesEl = document.getElementById('wf-cycles');

const trafficLightDef = {
  id: 'traffic-light',
  initial: 'green',
  states: [
    { id: 'green', onEntry: 'light.entered', onExit: 'light.exited' },
    { id: 'yellow', onEntry: 'light.entered', onExit: 'light.exited' },
    { id: 'red', onEntry: 'light.entered', onExit: 'light.exited' },
  ],
  transitions: [
    { from: 'green', event: 'NEXT', to: 'yellow', action: 'light.changed' },
    { from: 'yellow', event: 'NEXT', to: 'red', action: 'light.changed' },
    { from: 'red', event: 'NEXT', to: 'green', action: 'light.changed' },
  ],
  context: { cycles: 0 },
};

const wfEngine = new WorkflowEngine(trafficLightDef, kernel.bus);

function logWf(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  wfLog!.prepend(entry);
}

kernel.bus.on('light.changed', () => {
  const state = wfEngine.currentState.value;
  if (state === 'green') {
    const c = (wfEngine.getContext('cycles') ?? 0) + 1;
    wfEngine.setContext('cycles', c);
  }
});

effect(() => {
  wfStateEl!.textContent = wfEngine.currentState.value;
  wfRunningEl!.textContent = String(wfEngine.running.value);
  wfCyclesEl!.textContent = String(wfEngine.getContext('cycles') ?? 0);
});

document.getElementById('wf-start')!.addEventListener('native:press', () => {
  wfEngine.start();
  logWf(`Started → ${wfEngine.currentState.value}`);
});

document.getElementById('wf-next')!.addEventListener('native:press', () => {
  const record = wfEngine.send('NEXT');
  if (record) {
    logWf(`Transition: ${record.from} → ${record.to} (event: ${record.event})`);
  } else {
    logWf('No transition fired', 'undo');
  }
});

document.getElementById('wf-stop')!.addEventListener('native:press', () => {
  wfEngine.stop();
  logWf('Stopped', 'undo');
});

document.getElementById('wf-snapshot')!.addEventListener('native:press', () => {
  const snap = wfEngine.snapshot();
  logWf(`Snapshot: state=${snap.currentState}, history=${snap.history.length} transitions, context=${JSON.stringify(snap.context)}`);
});

// ── Policy & Capability ──

const polLog = document.getElementById('pol-log');
const polDeniedEl = document.getElementById('pol-denied');
const polLastEl = document.getElementById('pol-last');
let adminCapId: string | null = null;
let denyRuleId: string | null = null;

function logPol(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  polLog!.prepend(entry);
}

effect(() => {
  polDeniedEl!.textContent = String(kernel.policy.deniedCount.value);
  const last = kernel.policy.lastDecision.value;
  polLastEl!.textContent = last ? (last.allowed ? 'ALLOW' : `DENY: ${last.reason}`) : '-';
});

document.getElementById('pol-grant')!.addEventListener('native:press', () => {
  if (adminCapId) { logPol('Already granted', 'undo'); return; }
  adminCapId = kernel.policy.grant({ name: 'admin', patterns: ['admin.*'] });
  logPol(`Granted "admin" capability (id: ${adminCapId})`);
});

document.getElementById('pol-revoke')!.addEventListener('native:press', () => {
  if (!adminCapId) { logPol('No admin capability to revoke', 'undo'); return; }
  kernel.policy.revoke(adminCapId);
  logPol(`Revoked "admin" (id: ${adminCapId})`);
  adminCapId = null;
});

document.getElementById('pol-deny-rule')!.addEventListener('native:press', () => {
  if (denyRuleId) { logPol('Deny rule already active', 'undo'); return; }
  denyRuleId = kernel.policy.addRule({
    effect: 'deny',
    patterns: ['secret.*'],
    priority: 10,
    description: 'Block all secret.* commands',
  });
  logPol(`Added deny rule for "secret.*" (id: ${denyRuleId})`);
});

document.getElementById('pol-remove-rule')!.addEventListener('native:press', () => {
  if (!denyRuleId) { logPol('No deny rule to remove', 'undo'); return; }
  kernel.policy.removeRule(denyRuleId);
  logPol(`Removed deny rule (id: ${denyRuleId})`);
  denyRuleId = null;
});

kernel.bus.on('open.action', () => logPol('Handler: open.action executed'));
kernel.bus.on('admin.action', () => logPol('Handler: admin.action executed'));
kernel.bus.on('secret.action', () => logPol('Handler: secret.action executed'));

document.getElementById('pol-dispatch-open')!.addEventListener('native:press', () => {
  kernel.bus.dispatch('open.action', null);
  logPol('Dispatched open.action');
});

document.getElementById('pol-dispatch-protected')!.addEventListener('native:press', () => {
  kernel.bus.dispatch('admin.action', null, { capabilities: ['admin'] });
  const last = kernel.policy.lastDecision.value;
  logPol(`Dispatched admin.action → ${last?.allowed ? 'ALLOWED' : 'DENIED'}`, last?.allowed ? 'cmd' : 'error');
});

// ── Component Integration ──

const ciLog = document.getElementById('ci-log');
const ciCountEl = document.getElementById('ci-count');
const ciBridgeStatusEl = document.getElementById('ci-bridge-status');
let bridgeDispose: (() => void) | null = null;

ciCountEl!.textContent = String(COMPONENT_MANIFEST.length);

function logCi(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  ciLog!.prepend(entry);
}

document.getElementById('ci-show-manifest')!.addEventListener('native:press', () => {
  ciLog!.innerHTML = '';
  for (const d of COMPONENT_MANIFEST) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = `${d.tag} — ${d.category}, form: ${d.formAssociated}, events: [${d.events.join(', ')}]`;
    ciLog!.appendChild(div);
  }
});

document.getElementById('ci-by-category')!.addEventListener('native:press', () => {
  ciLog!.innerHTML = '';
  for (const cat of ['form', 'display', 'navigation', 'overlay', 'container']) {
    const items = getDescriptorsByCategory(cat);
    const div = document.createElement('div');
    div.className = 'log-entry cmd';
    div.textContent = `${cat} (${items.length}): ${items.map((d: any) => d.tag).join(', ')}`;
    ciLog!.appendChild(div);
  }
});

document.getElementById('ci-install-bridge')!.addEventListener('native:press', () => {
  if (bridgeDispose) {
    bridgeDispose();
    bridgeDispose = null;
    ciBridgeStatusEl!.textContent = 'not installed';
    logCi('Event bridge removed');
    return;
  }
  bridgeDispose = installEventBridge(kernel);
  ciBridgeStatusEl!.textContent = 'active';
  logCi('Event bridge installed — all native:* events now route to command bus');

  // Listen for bridge-routed commands
  kernel.bus.on((cmd: any) => cmd.type.includes('.press') || cmd.type.includes('.change'), (cmd: any) => {
    logCi(`Bridge: ${cmd.type} → ${JSON.stringify(cmd.payload)}`);
  });
});

// ── Workflow Templates ──

const wftLog = document.getElementById('wft-log');
const wftNameEl = document.getElementById('wft-name');
const wftStateEl = document.getElementById('wft-state');
const wftEventsEl = document.getElementById('wft-events');
const wftSendBtn = document.getElementById('wft-send') as any;
const wftStopBtn = document.getElementById('wft-stop') as any;
let wftEngine: WorkflowEngine | null = null;
let wftEventIndex = 0;

function logWft(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  wftLog!.prepend(entry);
}

function startTemplate(name: string, def: any) {
  if (wftEngine) wftEngine.stop();
  wftEngine = new WorkflowEngine(def, kernel.bus);
  wftEngine.start();
  wftEventIndex = 0;
  wftNameEl!.textContent = name;
  wftSendBtn.disabled = false;
  wftStopBtn.disabled = false;
  logWft(`Started "${name}" (${def.id}) → initial: ${def.initial}`);
  logWft(`States: ${def.states.map((s: any) => s.id).join(', ')}`);

  effect(() => {
    wftStateEl!.textContent = wftEngine!.currentState.value;
    const events = wftEngine!.getAvailableEvents();
    wftEventsEl!.textContent = events.join(', ') || 'none';
  });
}

document.getElementById('wft-form-wizard')!.addEventListener('native:press', () => {
  const def = formWizard({ steps: ['personal', 'address', 'payment', 'review'] });
  startTemplate('Form Wizard', def);
});

document.getElementById('wft-crud')!.addEventListener('native:press', () => {
  const def = crudLifecycle({ allowDelete: true });
  startTemplate('CRUD Lifecycle', def);
});

document.getElementById('wft-auth')!.addEventListener('native:press', () => {
  const def = authFlow({ mfaRequired: true });
  startTemplate('Auth Flow (MFA)', def);
});

document.getElementById('wft-toggle')!.addEventListener('native:press', () => {
  const def = toggleFlow();
  startTemplate('Toggle', def);
});

document.getElementById('wft-send')!.addEventListener('native:press', () => {
  if (!wftEngine) return;
  const events = wftEngine.getAvailableEvents();
  if (events.length === 0) {
    logWft('No available events in current state', 'undo');
    return;
  }
  const event = events[wftEventIndex % events.length];
  wftEventIndex++;
  const record = wftEngine.send(event);
  if (record) {
    logWft(`Sent ${event}: ${record.from} → ${record.to}`);
  } else {
    logWft(`Event ${event} did not fire`, 'undo');
  }
});

document.getElementById('wft-stop')!.addEventListener('native:press', () => {
  if (wftEngine) {
    wftEngine.stop();
    wftSendBtn.disabled = true;
    wftStopBtn.disabled = true;
    logWft('Stopped', 'undo');
  }
});

// ── Schema Catalog ──

const scLog = document.getElementById('sc-log');

function logSc(text: string, cls = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = text;
  scLog!.appendChild(entry);
}

document.getElementById('sc-list-all')!.addEventListener('native:press', () => {
  scLog!.innerHTML = '';
  for (const [tag, schema] of SCHEMA_CATALOG) {
    logSc(`${tag} [${schema.category}] — ${schema.description}`, 'cmd');
    logSc(`  attrs: ${schema.attributes.map((a: any) => a.name).join(', ') || 'none'}`);
    logSc(`  events: ${schema.events.map((e: any) => e.name).join(', ') || 'none'}`);
    logSc(`  slots: ${schema.slots.map((s: any) => s.name || '(default)').join(', ') || 'none'}`);
  }
});

function inspectSchema(tag: string) {
  scLog!.innerHTML = '';
  const schema = getSchema(tag);
  if (!schema) { logSc(`No schema found for "${tag}"`, 'error'); return; }

  logSc(`── ${schema.tag} ──`, 'cmd');
  logSc(`Category: ${schema.category}`);
  logSc(`Description: ${schema.description}`);
  logSc(`Form associated: ${schema.formAssociated}`);
  logSc('');

  logSc('Attributes:', 'cmd');
  for (const a of schema.attributes) {
    const vals = a.values ? ` [${a.values.join(', ')}]` : '';
    const def = a.default ? ` (default: ${a.default})` : '';
    logSc(`  ${a.name}: ${a.type}${vals}${def} — ${a.description}`);
  }

  if (schema.properties.length) {
    logSc('');
    logSc('Properties:', 'cmd');
    for (const p of schema.properties) {
      logSc(`  ${p.name}: ${p.type}${p.required ? ' (required)' : ''} — ${p.description}`);
    }
  }

  logSc('');
  logSc('Slots:', 'cmd');
  for (const s of schema.slots) {
    logSc(`  ${s.name || '(default)'} — ${s.description}`);
  }

  logSc('');
  logSc('Events:', 'cmd');
  for (const e of schema.events) {
    logSc(`  ${e.name} — ${e.description}${e.detail ? ` (detail: ${e.detail})` : ''}`);
  }

  logSc('');
  logSc('ARIA:', 'cmd');
  if (schema.aria.role) logSc(`  role: ${schema.aria.role}`);
  logSc(`  autoLabeled: ${schema.aria.autoLabeled}`);
  if (schema.aria.requiredAttributes?.length) {
    logSc(`  required: ${schema.aria.requiredAttributes.join(', ')}`);
  }

  if (schema.allowedChildren) {
    logSc('');
    logSc('Allowed children:', 'cmd');
    logSc(`  ${schema.allowedChildren.join(', ')}`);
  }
}

document.getElementById('sc-inspect-button')!.addEventListener('native:press', () => inspectSchema('n-button'));
document.getElementById('sc-inspect-input')!.addEventListener('native:press', () => inspectSchema('native:input'));
document.getElementById('sc-inspect-select')!.addEventListener('native:press', () => inspectSchema('n-select'));

// ── GenUI Planner ──

const gpLog = document.getElementById('gp-log');
const gpPlanJson = document.getElementById('gp-plan-json');
const gpOutput = document.getElementById('gp-output');
const gpValidEl = document.getElementById('gp-valid');
const gpA11yEl = document.getElementById('gp-a11y');
const gpWarningsEl = document.getElementById('gp-warnings');
const gpExecuteBtn = document.getElementById('gp-execute') as any;
let gpLastResult: any = null;
let gpCurrentPlanId: string | null = null;

const planner = new Planner();

function logGp(text: string, cls = 'cmd') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  gpLog!.prepend(entry);
}

function showPlanResult(result: any) {
  gpLastResult = result;
  gpValidEl!.textContent = result.validation.valid ? 'yes' : 'no';
  gpA11yEl!.textContent = result.accessibility.valid ? 'pass' : `${result.accessibility.violations.length} issue(s)`;
  gpWarningsEl!.textContent = String(result.warnings.length);
  gpExecuteBtn.disabled = !result.validation.valid;

  gpPlanJson!.innerHTML = '';
  const pre = document.createElement('div');
  pre.className = 'log-entry';
  pre.textContent = JSON.stringify(result.plan, null, 2);
  pre.style.whiteSpace = 'pre-wrap';
  gpPlanJson!.appendChild(pre);

  if (result.warnings.length) {
    logGp(`Warnings:`, 'undo');
    for (const w of result.warnings) logGp(`  ⚠ ${w}`, 'undo');
  }
  if (!result.accessibility.valid) {
    for (const v of result.accessibility.violations) {
      logGp(`  [${v.severity}] ${v.rule}: ${v.message}`, v.severity === 'error' ? 'error' : 'undo');
    }
  }
  logGp(`Plan generated: ${result.plan.root.children?.length ?? 1} top-level node(s), valid=${result.validation.valid}`);
}

// Default intent
const defaultIntent = {
  type: 'form',
  title: 'User Profile',
  elements: [
    { component: 'native:input', label: 'Display Name', attributes: { placeholder: 'Enter your name' } },
    { component: 'native:input', label: 'Email', attributes: { placeholder: 'name@example.com' } },
    {
      component: 'n-select', label: 'Country',
      children: [
        { component: 'n-option', label: 'United States', attributes: { value: 'us' } },
        { component: 'n-option', label: 'Canada', attributes: { value: 'ca' } },
        { component: 'n-option', label: 'United Kingdom', attributes: { value: 'uk' } },
      ],
    },
    { component: 'n-button', label: 'Save Profile', attributes: { variant: 'primary', intent: 'accent' }, events: { 'native:press': 'profile.save' } },
  ],
};

(document.getElementById('gp-intent-input') as any).value = JSON.stringify(defaultIntent, null, 2);

document.getElementById('gp-login-form')!.addEventListener('native:press', () => {
  const result = Planner.form([
    { name: 'Email', type: 'email', placeholder: 'name@example.com', required: true },
    { name: 'Password', type: 'password', placeholder: 'Enter password', required: true },
  ], { title: 'Login', submitLabel: 'Sign In', submitCommand: 'auth.login' });
  showPlanResult(result);
  logGp('Generated: Login form (Planner.form)', 'success');
});

document.getElementById('gp-contact-form')!.addEventListener('native:press', () => {
  const result = Planner.form([
    { name: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
    { name: 'Email', type: 'email', placeholder: 'name@example.com', required: true },
    { name: 'Subject', type: 'select', options: [
      { value: 'general', label: 'General Inquiry' },
      { value: 'support', label: 'Technical Support' },
      { value: 'billing', label: 'Billing' },
    ]},
    { name: 'Message', type: 'textarea', placeholder: 'How can we help?' },
  ], { title: 'Contact Us', submitLabel: 'Send Message', submitCommand: 'contact.send' });
  showPlanResult(result);
  logGp('Generated: Contact form (Planner.form)', 'success');
});

document.getElementById('gp-action-bar')!.addEventListener('native:press', () => {
  const result = Planner.actions([
    { label: 'Save', command: 'doc.save', variant: 'primary', intent: 'accent' },
    { label: 'Preview', command: 'doc.preview', variant: 'secondary' },
    { label: 'Discard', command: 'doc.discard', variant: 'ghost', intent: 'danger' },
  ]);
  showPlanResult(result);
  logGp('Generated: Action bar (Planner.actions)', 'success');
});

document.getElementById('gp-card')!.addEventListener('native:press', () => {
  const result = Planner.card({
    heading: 'Welcome to native-ui',
    body: 'A web component library with a pure CSS design system built on OKLCH color science, CSS custom property inheritance, and zero-specificity attribute selectors.',
    footer: [
      { label: 'Learn More', command: 'card.learn', variant: 'ghost' },
      { label: 'Get Started', command: 'card.start', variant: 'primary', intent: 'accent' },
    ],
  });
  showPlanResult(result);
  logGp('Generated: Content card (Planner.card)', 'success');
});

document.getElementById('gp-dialog')!.addEventListener('native:press', () => {
  const result = Planner.dialog({
    title: 'Delete Project?',
    body: 'This action cannot be undone. All files and settings will be permanently removed.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmCommand: 'project.delete',
    cancelCommand: 'dialog.cancel',
    intent: 'danger',
  });
  showPlanResult(result);
  logGp('Generated: Confirmation dialog (Planner.dialog)', 'success');
});

document.getElementById('gp-settings')!.addEventListener('native:press', () => {
  const result = Planner.settings([
    { label: 'Push notifications', name: 'push', description: 'Receive alerts for new messages and updates', checked: true, command: 'settings.push' },
    { label: 'Dark mode', name: 'dark-mode', description: 'Switch to a darker color scheme', command: 'settings.darkMode' },
    { label: 'Auto-save', name: 'autosave', description: 'Automatically save changes every 30 seconds', checked: true, command: 'settings.autosave' },
    { label: 'Analytics', name: 'analytics', description: 'Help improve the product by sharing usage data', command: 'settings.analytics' },
  ], { title: 'Preferences' });
  showPlanResult(result);
  logGp('Generated: Settings toggles (Planner.settings)', 'success');
});

document.getElementById('gp-tabs')!.addEventListener('native:press', () => {
  const result = Planner.tabs([
    { label: 'Overview', value: 'overview', content: 'The Interaction OS Kernel provides command bus, undo/redo, focus routing, overlay management, and plan execution.' },
    { label: 'Components', value: 'components', content: '27 interactive components, 8 containers, and 22 composable traits — all built on native web standards.' },
    { label: 'Architecture', value: 'architecture', content: 'Three-tier CSS token model, OKLCH color science, zero-specificity attribute selectors, and CSS-separate build.' },
  ]);
  showPlanResult(result);
  logGp('Generated: Tab panel (Planner.tabs)', 'success');
});

document.getElementById('gp-nav')!.addEventListener('native:press', () => {
  const result = Planner.nav([
    { label: 'Dashboard', value: 'dashboard', icon: 'house', group: 'Main' },
    { label: 'Analytics', value: 'analytics', icon: 'chart-bar', group: 'Main' },
    { label: 'Projects', value: 'projects', icon: 'folder', group: 'Main' },
    { label: 'Profile', value: 'profile', icon: 'user', group: 'Account' },
    { label: 'Settings', value: 'settings', icon: 'gear', group: 'Account' },
    { label: 'Billing', value: 'billing', icon: 'credit-card', group: 'Account' },
  ], { title: 'App Navigation' });
  showPlanResult(result);
  logGp('Generated: Navigation list (Planner.nav)', 'success');
});

document.getElementById('gp-generate')!.addEventListener('native:press', () => {
  try {
    const intent = JSON.parse((document.getElementById('gp-intent-input') as any).value);
    const result = planner.generate(intent);
    showPlanResult(result);
    logGp('Generated plan from custom intent', 'success');
  } catch (err: any) {
    logGp(`Error: ${err.message}`, 'error');
  }
});

document.getElementById('gp-execute')!.addEventListener('native:press', () => {
  if (!gpLastResult) return;
  // Teardown previous
  if (gpCurrentPlanId) {
    kernel.executor.teardown(gpCurrentPlanId);
    gpCurrentPlanId = null;
  }
  gpOutput!.innerHTML = '';
  try {
    const plan = gpLastResult.plan;
    const elements = kernel.executePlan(plan, gpOutput);
    gpCurrentPlanId = plan.id;
    logGp(`Executed plan "${plan.id}" — ${elements.size} elements rendered`, 'success');
  } catch (err: any) {
    logGp(`Execution error: ${err.message}`, 'error');
  }
});
