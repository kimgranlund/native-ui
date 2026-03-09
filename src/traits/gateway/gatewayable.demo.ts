import { GatewayController } from '../../index.ts';

// ── Helpers ──
const logEl = document.getElementById('event-log');
function appendLog(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Load demo ──
const host1 = document.createElement('div');
document.body.appendChild(host1);
const gw1 = new GatewayController(host1);

const loadInd = document.getElementById('load-indicator');
const dirtyInd = document.getElementById('dirty-indicator');
const errorInd = document.getElementById('error-indicator');
const contentDisplay = document.getElementById('content-display');

function updateLoadStatus() {
  loadInd.toggleAttribute('active', gw1.loading.value);
  dirtyInd.toggleAttribute('active', gw1.dirty.value);
  errorInd.toggleAttribute('error', gw1.error.value !== null);
  errorInd.textContent = gw1.error.value ?? 'error';
}

document.getElementById('load-btn').addEventListener('click', async () => {
  updateLoadStatus();
  appendLog('Loading /native.svg...');
  const content = await gw1.load('/native.svg');
  updateLoadStatus();
  if (content) {
    contentDisplay.textContent = content.slice(0, 500) + (content.length > 500 ? '...' : '');
    appendLog(`Loaded ${content.length} chars`);
  } else {
    contentDisplay.textContent = 'Load failed: ' + gw1.error.value;
    appendLog('Load failed: ' + gw1.error.value);
  }
});

document.getElementById('load-fail-btn').addEventListener('click', async () => {
  appendLog('Loading /not-found...');
  const content = await gw1.load('/not-found');
  updateLoadStatus();
  contentDisplay.textContent = 'Load failed: ' + gw1.error.value;
  appendLog('Load failed: ' + gw1.error.value);
});

// ── Save demo ──
const host2 = document.createElement('div');
document.body.appendChild(host2);
const gw2 = new GatewayController(host2);

const saveInd = document.getElementById('save-indicator');
const saveDirtyInd = document.getElementById('save-dirty-indicator');
const saveErrorInd = document.getElementById('save-error-indicator');
const textarea = document.getElementById('save-textarea');

function updateSaveStatus() {
  saveInd.toggleAttribute('active', gw2.saving.value);
  saveDirtyInd.toggleAttribute('active', gw2.dirty.value);
  saveErrorInd.toggleAttribute('error', gw2.error.value !== null);
  saveErrorInd.textContent = gw2.error.value ?? 'error';
}

textarea.addEventListener('input', () => {
  gw2.markDirty();
  updateSaveStatus();
  appendLog('Content changed — marked dirty');
});

document.getElementById('save-btn').addEventListener('click', async () => {
  // Mock save — intercept with a fake success
  appendLog('Saving...');
  gw2.saving.value = true;
  updateSaveStatus();
  await new Promise(r => setTimeout(r, 500));
  gw2.saving.value = false;
  gw2.dirty.value = false;
  updateSaveStatus();
  appendLog('Saved successfully (mock)');
});

document.getElementById('mark-dirty-btn').addEventListener('click', () => {
  gw2.markDirty();
  updateSaveStatus();
  appendLog('Marked dirty');
});

document.getElementById('mark-clean-btn').addEventListener('click', () => {
  gw2.markClean();
  updateSaveStatus();
  appendLog('Marked clean');
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
