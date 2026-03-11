import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { SwipeController } from '../index.ts';

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ── Horizontal Swipe (provider) ──

const hCard = document.getElementById('h-card');
const hLogEl = document.getElementById('h-log');
hCard.addEventListener('native:swipe', (e) => {
  const { direction, distance, velocity } = e.detail;
  appendLog(hLogEl, `${direction} — ${Math.round(distance)}px @ ${velocity.toFixed(2)}px/ms`);
});

// ── Vertical Swipe (provider) ──

const vCard = document.getElementById('v-card');
const vLogEl = document.getElementById('v-log');
vCard.addEventListener('native:swipe', (e) => {
  const { direction, distance, velocity } = e.detail;
  appendLog(vLogEl, `${direction} — ${Math.round(distance)}px @ ${velocity.toFixed(2)}px/ms`);
});

// ── Both Axes (provider) ──

const bCard = document.getElementById('b-card');
const bLogEl = document.getElementById('b-log');
bCard.addEventListener('native:swipe', (e) => {
  const { direction, distance, velocity } = e.detail;
  appendLog(bLogEl, `${direction} — ${Math.round(distance)}px @ ${velocity.toFixed(2)}px/ms`);
});

// ── Custom Threshold (provider) ──

const cCard = document.getElementById('c-card');
const cLogEl = document.getElementById('c-log');
cCard.addEventListener('native:swipe', (e) => {
  const { direction, distance, velocity } = e.detail;
  appendLog(cLogEl, `${direction} — ${Math.round(distance)}px @ ${velocity.toFixed(2)}px/ms`);
});

// ── SwipeController — attach to plain element ──

const ctrlCard = document.getElementById('controller-card');
const swipe = new SwipeController(ctrlCard, {
  threshold: 50,
  velocityThreshold: 0.3,
  axis: 'both',
});

const ctrlLogEl = document.getElementById('ctrl-log');
ctrlCard.addEventListener('native:swipe', (e) => {
  const { direction, distance, velocity } = e.detail;
  appendLog(ctrlLogEl, `${direction} — ${Math.round(distance)}px @ ${velocity.toFixed(2)}px/ms`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
