import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/input/input.ts';
import '../../../../../src/components/dialog/dialog.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';
import { FocusTrapController } from '../index.ts';

// ── Focus Trap Demo ──

const trapEl = document.getElementById('trap');
const trap = new FocusTrapController(trapEl);

function showTrap() {
  trapEl.removeAttribute('hidden');
  trap.enable();
}

function hideTrap() {
  trap.disable();
  trapEl.setAttribute('hidden', '');
}

document.getElementById('open-trap').addEventListener('native:press', () => showTrap());
document.getElementById('close-btn').addEventListener('native:press', () => hideTrap());
document.getElementById('save-btn').addEventListener('native:press', () => hideTrap());

// ── No Autofocus Demo ──

const trap2El = document.getElementById('trap2');
const trap2 = new FocusTrapController(trap2El);

document.getElementById('open-trap2').addEventListener('native:press', () => {
  trap2El.removeAttribute('hidden');
  trap2.enable();
});
document.getElementById('close-btn2').addEventListener('native:press', () => {
  trap2.disable();
  trap2El.setAttribute('hidden', '');
});

// ── Dialog Demo ──

const dialog = document.getElementById('demo-dialog');
document.getElementById('open-dialog').addEventListener('native:press', () => dialog.showModal());
document.getElementById('close-dialog').addEventListener('native:press', () => dialog.close());

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
