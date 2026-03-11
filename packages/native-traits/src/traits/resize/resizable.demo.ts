import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';

// ── Event logging ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Horizontal ──

const hOut = document.getElementById('h-output');
document.getElementById('h-panel').addEventListener('native:resize-move', (e) => {
  hOut.textContent = `Width: ${Math.round(e.detail.width)}px`;
});

// ── Vertical ──

const vOut = document.getElementById('v-output');
document.getElementById('v-panel').addEventListener('native:resize-move', (e) => {
  vOut.textContent = `Height: ${Math.round(e.detail.height)}px`;
});

// ── Both axes ──

const bothOut = document.getElementById('both-output');
document.getElementById('both-panel').addEventListener('native:resize-move', (e) => {
  bothOut.textContent = `${Math.round(e.detail.width)} x ${Math.round(e.detail.height)}`;
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
