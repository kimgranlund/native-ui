import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';

// ── Drop mode — swap ──

const swapList = document.getElementById('swap-list');
swapList.addEventListener('native:drop', (e) => {
  const { item, target } = e.detail;
  if (!target || target === item) return;
  const itemLabel = item.querySelector('.label').textContent;
  const targetLabel = target.querySelector('.label').textContent;
  const placeholder = document.createElement('div');
  item.before(placeholder);
  target.before(item);
  placeholder.replaceWith(target);
  swapLog(`Swapped "${itemLabel}" ↔ "${targetLabel}"`);
});
swapList.addEventListener('native:drag-cancel', (e) => {
  swapLog(`Cancelled: "${e.detail.item.querySelector('.label').textContent}"`);
});

// ── Drop mode — replace ──

const replaceList = document.getElementById('replace-list');
replaceList.addEventListener('native:drop', (e) => {
  const { item, target } = e.detail;
  if (!target) return;
  const slot = target.querySelector('.role-assignee');
  const name = item.textContent;
  const role = target.querySelector('.role-name').textContent;
  slot.textContent = name;
  replaceLog(`Assigned "${name}" → ${role}`);
});

// ── Slot mode — vertical list ──

const slotList = document.getElementById('slot-list');
slotList.addEventListener('native:drop', (e) => {
  const { item, insertBefore, fromIndex, toIndex } = e.detail;
  if (toIndex === -1) return;
  if (insertBefore) {
    insertBefore.before(item);
  } else {
    slotList.appendChild(item);
  }
  slotLog(`Inserted "${item.querySelector('.label').textContent}" at position ${toIndex}`);
});

// ── Slot mode — horizontal cards ──

const cardRow = document.getElementById('card-row');
cardRow.addEventListener('native:drop', (e) => {
  const { item, insertBefore } = e.detail;
  if (insertBefore) {
    insertBefore.before(item);
  } else {
    cardRow.appendChild(item);
  }
});

// ── Preview mode — grid ──
// view-transition-name assignment is handled automatically by DragController

const previewGrid = document.getElementById('preview-grid');
previewGrid.addEventListener('native:drop', (e) => {
  const { item, fromIndex, toIndex } = e.detail;
  previewLog(`Moved cell ${item.textContent.trim()} from position ${fromIndex} → ${toIndex}`);
});
previewGrid.addEventListener('native:drag-cancel', (e) => {
  previewLog(`Cancelled: cell ${e.detail.item.textContent.trim()} restored`);
});

// ── Slot mode — grid ──

const slotGrid = document.getElementById('slot-grid');
slotGrid.addEventListener('native:drop', (e) => {
  const { item, insertBefore, fromIndex, toIndex } = e.detail;
  if (toIndex === -1) return;
  if (insertBefore) {
    insertBefore.before(item);
  } else {
    slotGrid.appendChild(item);
  }
  slotGridLog(`Moved cell ${item.textContent.trim()} from ${fromIndex} → ${toIndex}`);
});

// ── Kanban — cross-zone slot mode ──

const kanbanBoard = document.getElementById('kanban-board');
kanbanBoard.addEventListener('native:drop', (e) => {
  const { item, fromIndex, toIndex, insertBefore, sourceZone, targetZone } = e.detail;
  const label = item.textContent.trim();
  const fromCol = sourceZone?.querySelector('.kanban-column-title')?.textContent ?? '?';
  const toCol = targetZone?.querySelector('.kanban-column-title')?.textContent ?? '?';

  // Move the actual card into the target zone
  if (insertBefore) {
    insertBefore.before(item);
  } else if (targetZone) {
    targetZone.appendChild(item);
  }

  if (sourceZone !== targetZone) {
    kanbanLog(`Moved "${label}" from ${fromCol} → ${toCol} (position ${toIndex})`);
  } else {
    kanbanLog(`Reordered "${label}" in ${fromCol} (${fromIndex} → ${toIndex})`);
  }
});

kanbanBoard.addEventListener('native:drag-cancel', (e) => {
  kanbanLog(`Cancelled: "${e.detail.item.textContent.trim()}" returned`);
});

// ── Event logging ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

const swapLogEl = document.getElementById('swap-log');
function swapLog(msg) { appendLog(swapLogEl, msg); }

const replaceLogEl = document.getElementById('replace-log');
function replaceLog(msg) { appendLog(replaceLogEl, msg); }

const slotLogEl = document.getElementById('slot-log');
function slotLog(msg) { appendLog(slotLogEl, msg); }

const previewLogEl = document.getElementById('preview-log');
function previewLog(msg) { appendLog(previewLogEl, msg); }

const slotGridLogEl = document.getElementById('slot-grid-log');
function slotGridLog(msg) { appendLog(slotGridLogEl, msg); }

const kanbanLogEl = document.getElementById('kanban-log');
function kanbanLog(msg) { appendLog(kanbanLogEl, msg); }

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
