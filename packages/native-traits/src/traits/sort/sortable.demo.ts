import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// ── Basic Table Sort ──

const basicWrapper = document.getElementById('basic-wrapper');
basicWrapper.addEventListener('native:sort', (e) => {
  const { column, direction } = e.detail;
  const tbody = basicWrapper.querySelector('tbody');
  const rows = [...tbody.querySelectorAll('tr')];
  const headers = [...basicWrapper.querySelectorAll('th')];
  const colIndex = headers.findIndex(h => h.textContent.trim() === column);
  if (direction === 'none') return;
  rows.sort((a, b) => {
    const aVal = a.children[colIndex].textContent;
    const bVal = b.children[colIndex].textContent;
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
    return direction === 'asc' ? cmp : -cmp;
  });
  for (const row of rows) tbody.appendChild(row);
});

// ── Custom Selector Sort ──

const customWrapper = document.getElementById('custom-wrapper');
customWrapper.addEventListener('native:sort', (e) => {
  const { column, direction } = e.detail;
  const tbody = customWrapper.querySelector('tbody');
  const rows = [...tbody.querySelectorAll('tr')];
  const headers = [...customWrapper.querySelectorAll('[data-column]')];
  const colIndex = headers.findIndex(h => h.dataset.column === column);
  if (direction === 'none') return;
  rows.sort((a, b) => {
    const aVal = a.children[colIndex].textContent;
    const bVal = b.children[colIndex].textContent;
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
    return direction === 'asc' ? cmp : -cmp;
  });
  for (const row of rows) tbody.appendChild(row);
});

// ── Event logging ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

const basicLogEl = document.getElementById('basic-log');
basicWrapper.addEventListener('native:sort', (e) => {
  appendLog(basicLogEl, `Sort: ${e.detail.column} ${e.detail.direction}`);
});

const customLogEl = document.getElementById('custom-log');
customWrapper.addEventListener('native:sort', (e) => {
  appendLog(customLogEl, `Sort: ${e.detail.column} ${e.detail.direction}`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
