import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { RangeSelectController } from '../index.ts';

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ── Stamp 28 cells into grids ──

function stampCells(container) {
  for (let i = 1; i <= 28; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = String(i);
    container.appendChild(cell);
  }
}

// Drag mode grid (cells inside n-controller child div)
const dragGrid = document.getElementById('drag-grid');
stampCells(dragGrid);

// Click mode grid (cells inside plain div)
const clickGrid = document.getElementById('click-grid');
stampCells(clickGrid);

// ── Drag Mode: Calendar Grid (Provider) ──

const dragOutput = document.getElementById('drag-output');
dragGrid.addEventListener('native:range-select', (e) => {
  const { startIndex, endIndex } = e.detail;
  appendLog(dragOutput, `Selected days ${startIndex + 1}\u2013${endIndex + 1}`);
});
dragGrid.addEventListener('native:range-change', (e) => {
  const { startIndex, endIndex } = e.detail;
  dragOutput.textContent = `Dragging: days ${startIndex + 1}\u2013${endIndex + 1}`;
});

// ── Click Mode: Calendar Grid (RangeSelectController) ──

const clickCtrl = new RangeSelectController(clickGrid, {
  selector: '.cell',
  mode: 'click',
});

const clickOutput = document.getElementById('click-output');

clickGrid.addEventListener('native:range-change', (e) => {
  const { startIndex, endIndex } = e.detail;
  clickOutput.textContent = `Preview: days ${startIndex + 1}\u2013${endIndex + 1}`;
});

clickGrid.addEventListener('native:range-select', (e) => {
  const { startIndex, endIndex } = e.detail;
  appendLog(clickOutput, `Committed: days ${startIndex + 1}\u2013${endIndex + 1}`);
});

document.getElementById('clear-btn').addEventListener('native:press', () => {
  clickCtrl.clearRange();
  clickOutput.textContent = 'Range cleared. Click a start date.';
});

// ── Drag Mode: Vertical List (Provider) ──

const listOutput = document.getElementById('list-output');
const list = document.getElementById('list');

list.addEventListener('native:range-select', (e) => {
  const { startIndex, endIndex, items } = e.detail;
  appendLog(listOutput, `Selected ${items.length} items (${startIndex}\u2013${endIndex})`);
});

// ── RangeSelectController: Attach to Any Element ──

const ctrlList = document.getElementById('ctrl-list');
const ctrl = new RangeSelectController(ctrlList, {
  selector: '.list-item',
  mode: 'drag',
});

const ctrlOutput = document.getElementById('ctrl-output');
ctrlList.addEventListener('native:range-select', (e) => {
  const { startIndex, endIndex, items } = e.detail;
  appendLog(ctrlOutput, `Selected ${items.length} items (${startIndex}\u2013${endIndex})`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
