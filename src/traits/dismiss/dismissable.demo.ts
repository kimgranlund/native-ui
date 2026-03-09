import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/dialog/dialog.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { DismissController } from '../../index.ts';

// ── Helpers ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Click Outside Demo ──

const panel = document.getElementById('panel');
const dismiss = new DismissController(panel);
const logEl = document.getElementById('log');
let count = 0;

function showPanel() {
  panel.removeAttribute('hidden');
  dismiss.enable();
  count++;
  appendLog(logEl, `#${count} Panel opened`);
}

function hidePanel() {
  dismiss.disable();
  panel.setAttribute('hidden', '');
}

document.getElementById('open-btn').addEventListener('native:press', () => showPanel());
panel.addEventListener('native:dismiss', () => {
  count++;
  appendLog(logEl, `#${count} Panel dismissed`);
  hidePanel();
});

// ── Nested Layers Demo ──

const panelA = document.getElementById('panel-a');
const panelB = document.getElementById('panel-b');
const dismissA = new DismissController(panelA);
const dismissB = new DismissController(panelB);

function showPanelEl(el, ctrl) {
  el.removeAttribute('hidden');
  ctrl.enable();
}

function hidePanelEl(el, ctrl) {
  ctrl.disable();
  el.setAttribute('hidden', '');
}

document.getElementById('open-a').addEventListener('native:press', () => showPanelEl(panelA, dismissA));
document.getElementById('open-b').addEventListener('native:press', () => showPanelEl(panelB, dismissB));
panelA.addEventListener('native:dismiss', () => hidePanelEl(panelA, dismissA));
panelB.addEventListener('native:dismiss', () => hidePanelEl(panelB, dismissB));

// ── Dialog Demo ──

const dialog = document.getElementById('demo-dialog');
document.getElementById('open-dialog').addEventListener('native:press', () => dialog.showModal());
document.getElementById('close-dialog').addEventListener('native:press', () => dialog.close());

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
