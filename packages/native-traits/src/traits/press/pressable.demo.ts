import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';

// ── Helpers ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Basic Press log ──

let count = 0;
const logEl = document.getElementById('log');
for (const box of document.querySelectorAll('.press-box')) {
  box.addEventListener('native:press', (e) => {
    count++;
    appendLog(logEl, `#${count} native:press — pointerType: "${e.detail.pointerType}"`);
  });
}

// ── Button Press log ──

let btnCount = 0;
const btnLogEl = document.getElementById('btn-log');
for (const btn of [document.getElementById('btn-1'), document.getElementById('btn-2'), document.getElementById('btn-3')]) {
  btn.addEventListener('native:press', (e) => {
    btnCount++;
    appendLog(btnLogEl, `#${btnCount} native:press — pointerType: "${e.detail.pointerType}"`);
  });
}

// ── Pointer Type log ──

const typeBox = document.getElementById('type-box');
const typeLogEl = document.getElementById('type-log');
typeBox.addEventListener('native:press', (e) => {
  appendLog(typeLogEl, `pointerType: "${e.detail.pointerType}"`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
