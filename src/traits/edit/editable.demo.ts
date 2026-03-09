import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { EditController } from '../../index.ts';

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ── Double-Click to Edit (provider) ──
// n-controller with for=".edit-item" applies EditController to each item.
// Events bubble up from each item to the list container.

const dblLogEl = document.getElementById('dbl-log');
const dblList = document.getElementById('dbl-list');

dblList.addEventListener('native:edit-start', (e) => {
  appendLog(dblLogEl, `Editing: "${e.detail.value}"`);
});
dblList.addEventListener('native:edit-commit', (e) => {
  appendLog(dblLogEl, `Committed: "${e.detail.value}" (was "${e.detail.previousValue}")`);
});
dblList.addEventListener('native:edit-cancel', (e) => {
  appendLog(dblLogEl, `Cancelled: "${e.detail.value}"`);
});

// ── Click to Edit (provider) ──

const clickLogEl = document.getElementById('click-log');
const clickList = document.getElementById('click-list');

clickList.addEventListener('native:edit-start', (e) => {
  appendLog(clickLogEl, `Editing: "${e.detail.value}"`);
});
clickList.addEventListener('native:edit-commit', (e) => {
  appendLog(clickLogEl, `Committed: "${e.detail.value}" (was "${e.detail.previousValue}")`);
});
clickList.addEventListener('native:edit-cancel', (e) => {
  appendLog(clickLogEl, `Cancelled: "${e.detail.value}"`);
});

// ── EditController — attach to plain element ──

const ctrlItem = document.getElementById('controller-item');
const ctrlEditor = new EditController(ctrlItem, { trigger: 'dblclick' });

const ctrlLogEl = document.getElementById('ctrl-log');

ctrlItem.addEventListener('native:edit-start', (e) => {
  appendLog(ctrlLogEl, `Editing: "${e.detail.value}"`);
});
ctrlItem.addEventListener('native:edit-commit', (e) => {
  appendLog(ctrlLogEl, `Committed: "${e.detail.value}" (was "${e.detail.previousValue}")`);
});
ctrlItem.addEventListener('native:edit-cancel', (e) => {
  appendLog(ctrlLogEl, `Cancelled: "${e.detail.value}"`);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
