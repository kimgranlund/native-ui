import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// ── Multiple Selection ──

const multiList = document.querySelector('n-controller[data-trait-selectable-mode="multiple"] > .select-list');
multiList.addEventListener('native:selection-change', (e) => {
  const { selected, count } = e.detail;
  const names = selected.map(el => el.textContent).join(', ');
  multiLog(`Selected ${count}: ${names || 'none'}`);
});

// ── Single Selection ──

const singleList = document.querySelector('n-controller[data-trait-selectable-mode="single"] > .select-list');
singleList.addEventListener('native:selection-change', (e) => {
  const { selected } = e.detail;
  const name = selected[0]?.textContent ?? 'none';
  singleLog(`Selected: ${name}`);
});

// ── Event logging ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

const multiLogEl = document.getElementById('multi-log');
function multiLog(msg) { appendLog(multiLogEl, msg); }

const singleLogEl = document.getElementById('single-log');
function singleLog(msg) { appendLog(singleLogEl, msg); }

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
