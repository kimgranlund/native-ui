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

// ── Copy & Paste list ──

const copyList = document.getElementById('copy-list');
const copyLogEl = document.getElementById('copy-log');

copyList.addEventListener('native:selection-change', (e) => {
  appendLog(copyLogEl, `Selected ${e.detail.count} item(s)`);
});

copyList.addEventListener('native:clip-copy', (e) => {
  appendLog(copyLogEl, `Copied ${e.detail.items.length} item(s): "${e.detail.data}"`);
});

// ── Cut & Paste list ──

const cutList = document.getElementById('cut-list');
const cutLogEl = document.getElementById('cut-log');

cutList.addEventListener('native:selection-change', (e) => {
  appendLog(cutLogEl, `Selected ${e.detail.count} item(s)`);
});

cutList.addEventListener('native:clip-cut', (e) => {
  appendLog(cutLogEl, `Cut ${e.detail.items.length} item(s) — marked with [clip-cut]`);
});

cutList.addEventListener('native:clip-paste', (e) => {
  appendLog(cutLogEl, `Paste received: "${e.detail.data}"`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
