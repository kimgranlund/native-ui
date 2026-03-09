import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { VirtualScrollController } from '../../index.ts';

// ── Helper: render rows into a content container ──

function renderRows(container, start, end, prefix) {
  const old = container.querySelectorAll('.virtual-row');
  for (const r of old) r.remove();

  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) {
    const row = document.createElement('div');
    row.className = 'virtual-row';
    row.textContent = `${prefix} ${i + 1} — Item data here`;
    frag.appendChild(row);
  }
  // Insert rows between spacers
  const bottomSpacer = container.querySelector('.n-virtual-spacer-bottom');
  container.insertBefore(frag, bottomSpacer);
}

// ── 10,000 Items Demo ──

const TOTAL1 = 10000;
const host1 = document.getElementById('host1');
const viewport1 = document.getElementById('viewport1');
const content1 = document.getElementById('content1');
const renderedEl = document.getElementById('rendered-count');
const rangeEl = document.getElementById('range-display');

const vctrl1 = new VirtualScrollController(host1, {
  itemHeight: 40,
  overscan: 5,
});
vctrl1.enable(viewport1, content1, TOTAL1);

host1.addEventListener('native:virtual-change', (e) => {
  const { start, end } = e.detail;
  renderRows(content1, start, end, 'Row');
  renderedEl.textContent = String(end - start);
  rangeEl.textContent = `${start}\u2013${end}`;
});

// Initial render
renderRows(content1, vctrl1.start, vctrl1.end, 'Row');
renderedEl.textContent = String(vctrl1.end - vctrl1.start);
rangeEl.textContent = `${vctrl1.start}\u2013${vctrl1.end}`;

// ── Dynamic Count Demo ──

let dynamicCount = 100;
const host2 = document.getElementById('host2');
const viewport2 = document.getElementById('viewport2');
const content2 = document.getElementById('content2');
const dynOut = document.getElementById('dynamic-output');

const vctrl2 = new VirtualScrollController(host2, {
  itemHeight: 40,
  overscan: 5,
});
vctrl2.enable(viewport2, content2, dynamicCount);

host2.addEventListener('native:virtual-change', (e) => {
  const { start, end, totalCount } = e.detail;
  renderRows(content2, start, end, 'Dynamic row');
  dynOut.textContent = `${totalCount} items \u2014 showing ${start}\u2013${end}`;
});

// Initial render
renderRows(content2, vctrl2.start, vctrl2.end, 'Dynamic row');

document.getElementById('add-btn').addEventListener('native:press', () => {
  dynamicCount += 1000;
  vctrl2.updateCount(dynamicCount);
  dynOut.textContent = `${dynamicCount} items`;
});

document.getElementById('reset-btn').addEventListener('native:press', () => {
  dynamicCount = 100;
  vctrl2.updateCount(dynamicCount);
  dynOut.textContent = `${dynamicCount} items`;
});

// ── VirtualScrollController — Attach to Any Element ──

const CTRL_TOTAL = 5000;
const ctrlHost = document.getElementById('ctrl-host');
const ctrlViewport = document.getElementById('ctrl-viewport');
const ctrlContent = document.getElementById('ctrl-content');
const ctrlRendered = document.getElementById('ctrl-rendered');
const ctrlRange = document.getElementById('ctrl-range');

const vctrl3 = new VirtualScrollController(ctrlHost, {
  itemHeight: 40,
  overscan: 5,
});
vctrl3.enable(ctrlViewport, ctrlContent, CTRL_TOTAL);

ctrlHost.addEventListener('native:virtual-change', (e) => {
  const { start, end } = e.detail;
  renderRows(ctrlContent, start, end, 'Controller row');
  ctrlRendered.textContent = String(end - start);
  ctrlRange.textContent = `${start}\u2013${end}`;
});

// Initial render
renderRows(ctrlContent, vctrl3.start, vctrl3.end, 'Controller row');
ctrlRendered.textContent = String(vctrl3.end - vctrl3.start);
ctrlRange.textContent = `${vctrl3.start}\u2013${vctrl3.end}`;

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
