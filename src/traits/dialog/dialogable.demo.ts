import { DialogController } from '../../index.ts';

// ── Helpers ──
const logEl = document.getElementById('basic-log');
function appendLog(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Basic dialog ──
const basicHost = document.getElementById('basic-dialog');
const basicCtrl = new DialogController(basicHost);

document.getElementById('open-basic').addEventListener('click', () => {
  basicCtrl.showModal();
  appendLog('Dialog opened');
});

document.getElementById('basic-cancel').addEventListener('click', () => {
  basicCtrl.close();
  appendLog('Dialog cancelled');
});

document.getElementById('basic-confirm').addEventListener('click', () => {
  basicCtrl.close();
  appendLog('Dialog confirmed');
});

basicHost.addEventListener('close', () => {
  appendLog('close event fired');
});

// ── Persistent dialog ──
const persistentHost = document.getElementById('persistent-dialog');
const persistentCtrl = new DialogController(persistentHost);

document.getElementById('open-persistent').addEventListener('click', () => {
  persistentCtrl.showModal();
});

document.getElementById('persistent-close').addEventListener('click', () => {
  persistentCtrl.close();
});

// ── No backdrop dialog ──
const noBackdropHost = document.getElementById('no-backdrop-dialog');
const noBackdropCtrl = new DialogController(noBackdropHost);

document.getElementById('open-no-backdrop').addEventListener('click', () => {
  noBackdropCtrl.showModal();
});

document.getElementById('no-backdrop-close').addEventListener('click', () => {
  noBackdropCtrl.close();
});

// ── Custom content target dialog ──
const customHost = document.getElementById('custom-dialog');
const customCtrl = new DialogController(customHost, {
  contentTarget: (dialog) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'dialog-body';
    dialog.appendChild(wrapper);
    return wrapper;
  },
});

document.getElementById('open-custom').addEventListener('click', () => {
  customCtrl.showModal();
});

document.getElementById('custom-close').addEventListener('click', () => {
  customCtrl.close();
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
