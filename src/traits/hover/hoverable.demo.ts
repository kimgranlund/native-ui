import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import '../../components/controller/controller.ts';

// ── Helper: update status badge ──

function bindStatus(el) {
  const badge = el.querySelector('.hover-status');
  el.addEventListener('native:hover-start', () => { badge.textContent = 'hovered'; });
  el.addEventListener('native:hover-end', () => { badge.textContent = 'idle'; });
}

// ── Bind status badges ──

for (const el of document.querySelectorAll('.hover-card')) {
  bindStatus(el);
}

// ── Helper: event logging ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Instant Hover ──

const instantCard = document.getElementById('instant-card');
const instantLogEl = document.getElementById('instant-log');
instantCard.addEventListener('native:hover-start', (e) => {
  appendLog(instantLogEl, `Enter (${e.detail.pointerType})`);
});
instantCard.addEventListener('native:hover-end', (e) => {
  appendLog(instantLogEl, `Leave (${e.detail.pointerType})`);
});

// ── Hover Intent ──

const intentCard = document.getElementById('intent-card');
const intentLogEl = document.getElementById('intent-log');
intentCard.addEventListener('native:hover-start', (e) => {
  appendLog(intentLogEl, `Enter after 500ms (${e.detail.pointerType})`);
});
intentCard.addEventListener('native:hover-end', (e) => {
  appendLog(intentLogEl, `Leave (${e.detail.pointerType})`);
});

// ── Sticky Hover ──

const stickyCard = document.getElementById('sticky-card');
const stickyLogEl = document.getElementById('sticky-log');
stickyCard.addEventListener('native:hover-start', (e) => {
  appendLog(stickyLogEl, `Enter (${e.detail.pointerType})`);
});
stickyCard.addEventListener('native:hover-end', (e) => {
  appendLog(stickyLogEl, `Leave after 300ms delay (${e.detail.pointerType})`);
});

// ── Combined Delays ──

const combinedCard = document.getElementById('combined-card');
const combinedLogEl = document.getElementById('combined-log');
combinedCard.addEventListener('native:hover-start', (e) => {
  appendLog(combinedLogEl, `Enter after 400ms (${e.detail.pointerType})`);
});
combinedCard.addEventListener('native:hover-end', (e) => {
  appendLog(combinedLogEl, `Leave after 200ms (${e.detail.pointerType})`);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
