import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import './controller.ts';
import { NativeElement, define } from '../../index.ts';

// ── Minimal NativeElement for injection demos ──

class InjectDemo extends NativeElement {}
define('inject-demo', InjectDemo);

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ═══════════════════════════════════════════
// INJECTION — SIMPLE
// ═══════════════════════════════════════════

// ── Hoverable log ──

const injectHoverLog = document.getElementById('inject-hover-log');
for (const el of document.querySelectorAll('inject-demo[traits*="hoverable"]:not([traits*="pressable"])')) {
  el.addEventListener('native:hover-start', () => appendLog(injectHoverLog, `Enter: "${el.textContent.trim()}"`));
  el.addEventListener('native:hover-end', () => appendLog(injectHoverLog, `Leave: "${el.textContent.trim()}"`));
}

// ── Pressable + multi log ──

const injectPressLog = document.getElementById('inject-press-log');
for (const el of document.querySelectorAll('#inject-press-log').values()) break; // skip
document.querySelectorAll('inject-demo[traits="pressable"], inject-demo[traits="hoverable pressable"]').forEach((el) => {
  el.addEventListener('native:press', () => appendLog(injectPressLog, `Press: "${el.textContent.trim()}"`));
  el.addEventListener('native:hover-start', () => appendLog(injectPressLog, `Hover: "${el.textContent.trim()}"`));
  el.addEventListener('native:hover-end', () => appendLog(injectPressLog, `Leave: "${el.textContent.trim()}"`));
});

// ── Runtime access ──

const runtimeEl = document.getElementById('runtime-ctrl');
const runtimeLog = document.getElementById('inject-runtime-log');

runtimeEl.addEventListener('native:hover-start', () => appendLog(runtimeLog, 'Hover enter'));
runtimeEl.addEventListener('native:hover-end', () => appendLog(runtimeLog, 'Hover leave'));

document.getElementById('set-delay-btn').addEventListener('native:press', () => {
  const hover = runtimeEl.getTraitController('hoverable');
  if (hover) { hover.delay = 1000; appendLog(runtimeLog, 'Set delay to 1000ms'); }
});

document.getElementById('reset-delay-btn').addEventListener('native:press', () => {
  const hover = runtimeEl.getTraitController('hoverable');
  if (hover) { hover.delay = 0; appendLog(runtimeLog, 'Reset delay to 0ms'); }
});

// ═══════════════════════════════════════════
// INJECTION — COMPLEX
// ═══════════════════════════════════════════

// ── Copyable ──

const copyLog = document.getElementById('copy-log');
for (const el of document.querySelectorAll('inject-demo[traits*="copyable"]')) {
  el.addEventListener('native:press', () => {
    const ctrl = el.getTraitController('copyable');
    if (ctrl) ctrl.copy();
  });
  el.addEventListener('native:copy', (e) => {
    appendLog(copyLog, `Copied: "${e.detail.value}"`);
  });
}

// ── Editable ──

const editLog = document.getElementById('edit-log');
for (const el of document.querySelectorAll('inject-demo[traits*="editable"]')) {
  el.addEventListener('native:edit-start', () => appendLog(editLog, 'Editing started'));
  el.addEventListener('native:edit-commit', (e) => appendLog(editLog, `Committed: "${e.detail.value}"`));
  el.addEventListener('native:edit-cancel', () => appendLog(editLog, 'Edit cancelled'));
}

// ── Swipeable ──

const swipeLog = document.getElementById('swipe-log');
const swipePages = ['Page 1 of 3', 'Page 2 of 3', 'Page 3 of 3'];
let swipeIndex = 1;
const swipePageEl = document.getElementById('swipe-page');
const dots = [document.getElementById('dot-0'), document.getElementById('dot-1'), document.getElementById('dot-2')];

function updateSwipeUI() {
  swipePageEl.textContent = swipePages[swipeIndex];
  dots.forEach((d, i) => d.classList.toggle('active', i === swipeIndex));
}

document.getElementById('swipe-demo').addEventListener('native:swipe', (e) => {
  const { direction, distance, velocity } = e.detail;
  appendLog(swipeLog, `Swipe ${direction} (dist: ${Math.round(distance)}px, vel: ${velocity.toFixed(2)})`);
  if (direction === 'left' && swipeIndex < 2) swipeIndex++;
  else if (direction === 'right' && swipeIndex > 0) swipeIndex--;
  updateSwipeUI();
});

// ═══════════════════════════════════════════
// PROVIDER — SIMPLE
// ═══════════════════════════════════════════

// ── Wrapper mode ──

const wrapperLog = document.getElementById('wrapper-log');
const wrapperCard = document.querySelector('n-controller[traits="hoverable"][data-trait-hoverable-delay="200"] > .demo-card');
if (wrapperCard) {
  wrapperCard.addEventListener('native:hover-start', () => appendLog(wrapperLog, 'Hover enter'));
  wrapperCard.addEventListener('native:hover-end', () => appendLog(wrapperLog, 'Hover leave'));
}

// ── Selector hoverable ──

const selectorHoverLog = document.getElementById('selector-hover-log');
for (const card of document.querySelectorAll('.card.demo-card')) {
  card.addEventListener('native:hover-start', () => appendLog(selectorHoverLog, `Enter: "${card.textContent.trim()}"`));
  card.addEventListener('native:hover-end', () => appendLog(selectorHoverLog, `Leave: "${card.textContent.trim()}"`));
}

// ── Dynamic children ──

const dynamicLog = document.getElementById('dynamic-log');
const dynamicList = document.getElementById('dynamic-list');
let itemCounter = 0;

document.getElementById('add-item-btn').addEventListener('native:press', () => {
  itemCounter++;
  const item = document.createElement('div');
  item.className = 'dynamic-item demo-card';
  item.style.cursor = 'pointer';
  item.textContent = `Item ${itemCounter}`;
  dynamicList.appendChild(item);
  appendLog(dynamicLog, `Added "Item ${itemCounter}" — traits auto-wired`);
  item.addEventListener('native:hover-start', () => appendLog(dynamicLog, `Hover: "${item.textContent}"`));
  item.addEventListener('native:press', () => appendLog(dynamicLog, `Press: "${item.textContent}"`));
});

document.getElementById('clear-items-btn').addEventListener('native:press', () => {
  dynamicList.innerHTML = '';
  itemCounter = 0;
  appendLog(dynamicLog, 'Cleared all items');
});

// ── Live option updates ──

const liveCtrl = document.getElementById('live-ctrl');
document.getElementById('delay-0').addEventListener('native:press', () => liveCtrl.setAttribute('data-trait-hoverable-delay', '0'));
document.getElementById('delay-300').addEventListener('native:press', () => liveCtrl.setAttribute('data-trait-hoverable-delay', '300'));
document.getElementById('delay-800').addEventListener('native:press', () => liveCtrl.setAttribute('data-trait-hoverable-delay', '800'));

// ═══════════════════════════════════════════
// PROVIDER — COMPLEX
// ═══════════════════════════════════════════

// ── Draggable: vertical slot ──

const dragProviderLog = document.getElementById('drag-provider-log');
const dragList = document.getElementById('drag-provider-list');
dragList.addEventListener('native:drop', (e) => {
  const { item, insertBefore, fromIndex, toIndex } = e.detail;
  if (toIndex === -1) return;
  if (insertBefore) insertBefore.before(item);
  else dragList.appendChild(item);
  appendLog(dragProviderLog, `Moved "${item.querySelector('.label').textContent}" from ${fromIndex} to ${toIndex}`);
});

// ── Draggable: horizontal slot ──

const dragHorizList = document.getElementById('drag-horiz-list');
dragHorizList.addEventListener('native:drop', (e) => {
  const { item, insertBefore } = e.detail;
  if (insertBefore) insertBefore.before(item);
  else dragHorizList.appendChild(item);
});

// ── Draggable: drop swap ──

const dragSwapLog = document.getElementById('drag-swap-log');
const dragSwapList = document.getElementById('drag-swap-list');
dragSwapList.addEventListener('native:drop', (e) => {
  const { item, target } = e.detail;
  if (!target || target === item) return;
  const itemLabel = item.querySelector('.label').textContent;
  const targetLabel = target.querySelector('.label').textContent;
  const ph = document.createElement('div');
  item.before(ph);
  target.before(item);
  ph.replaceWith(target);
  appendLog(dragSwapLog, `Swapped "${itemLabel}" ↔ "${targetLabel}"`);
});

// ── Resizable ──

const resizeLog = document.getElementById('resize-log');
const resizeH = document.getElementById('resize-h');
const resizeV = document.getElementById('resize-v');

resizeH.addEventListener('native:resize-move', (e) => {
  appendLog(resizeLog, `Horizontal: ${Math.round(e.detail.width)}px`);
});

resizeV.addEventListener('native:resize-move', (e) => {
  appendLog(resizeLog, `Vertical: ${Math.round(e.detail.height)}px`);
});

// ── Selectable ──

const selectLog = document.getElementById('select-log');
const selectList = document.getElementById('select-list');
selectList.addEventListener('native:selection-change', (e) => {
  const { selected, count } = e.detail;
  const names = selected.map(el => el.textContent.trim());
  appendLog(selectLog, `Selected (${count}): ${names.join(', ') || 'none'}`);
});

// ── Sortable ──

const sortLog = document.getElementById('sort-log');
const sortTable = document.getElementById('sort-table');
const sortTbody = document.getElementById('sort-tbody');

sortTable.addEventListener('native:sort', (e) => {
  const { column, direction } = e.detail;
  appendLog(sortLog, `Sort: ${column} ${direction}`);

  if (direction === 'none') return;

  const rows = [...sortTbody.querySelectorAll('tr')];
  const headers = [...sortTable.querySelectorAll('th')];
  const colIndex = headers.findIndex(th => th.dataset.key === column);
  if (colIndex === -1) return;

  rows.sort((a, b) => {
    const aText = a.cells[colIndex].textContent.trim();
    const bText = b.cells[colIndex].textContent.trim();
    const cmp = aText.localeCompare(bText);
    return direction === 'descending' ? -cmp : cmp;
  });

  for (const row of rows) sortTbody.appendChild(row);
});

// ── Editable (provider) ──

const editProviderLog = document.getElementById('edit-provider-log');
const editList = document.getElementById('edit-list');
editList.addEventListener('native:edit-start', () => appendLog(editProviderLog, 'Editing started'));
editList.addEventListener('native:edit-commit', (e) => appendLog(editProviderLog, `Committed: "${e.detail.value}"`));
editList.addEventListener('native:edit-cancel', () => appendLog(editProviderLog, 'Edit cancelled'));

// ── Collapsible ──

for (let i = 1; i <= 3; i++) {
  const trigger = document.getElementById(`c-trigger-${i}`);
  const content = document.getElementById(`c-content-${i}`);
  // WHY: The collapsible controller is on the content element (wrapper mode).
  // We listen for clicks on the trigger and toggle the content's controller.
  trigger.addEventListener('click', () => {
    // Dispatch toggle via the content's controller
    content.dispatchEvent(new CustomEvent('native:collapse-toggle', { bubbles: true }));
  });

  content.addEventListener('native:collapse', () => trigger.setAttribute('collapsed', ''));
  content.addEventListener('native:expand', () => trigger.removeAttribute('collapsed'));
}

// ── Multi-trait provider ──

const multiProviderLog = document.getElementById('multi-provider-log');
for (const el of document.querySelectorAll('.multi-target')) {
  el.addEventListener('native:hover-start', () => appendLog(multiProviderLog, `Hover: "${el.textContent.trim()}"`));
  el.addEventListener('native:hover-end', () => appendLog(multiProviderLog, `Leave: "${el.textContent.trim()}"`));
  el.addEventListener('native:press', () => appendLog(multiProviderLog, `Press: "${el.textContent.trim()}"`));
}

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
