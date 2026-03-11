import { PresentController } from '../index.ts';

// ── Helpers ──
const logEl = document.getElementById('basic-log');
function appendLog(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Basic present ──
const basicCard = document.getElementById('basic-card');
const basicCtrl = new PresentController(basicCard);

basicCard.addEventListener('click', () => {
  if (!basicCtrl.open) {
    basicCtrl.present();
    appendLog('Presented');
  }
});

basicCard.addEventListener('native:present', () => {
  appendLog('native:present fired');
});

basicCard.addEventListener('native:dismiss', () => {
  appendLog('native:dismiss fired');
});

// ── No close button ──
const noCloseCard = document.getElementById('no-close-card');
const noCloseCtrl = new PresentController(noCloseCard, { closeButton: false });

noCloseCard.addEventListener('click', () => {
  if (!noCloseCtrl.open) noCloseCtrl.present();
});

// ── Custom inset ──
const insetCard = document.getElementById('inset-card');
const insetCtrl = new PresentController(insetCard, { inset: '4rem' });

insetCard.addEventListener('click', () => {
  if (!insetCtrl.open) insetCtrl.present();
});

// ── Toggle button ──
const toggleCard = document.getElementById('toggle-card');
const toggleCtrl = new PresentController(toggleCard);

document.getElementById('toggle-btn').addEventListener('click', () => {
  toggleCtrl.toggle();
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
