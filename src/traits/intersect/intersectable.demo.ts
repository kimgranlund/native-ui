import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// ── Helpers ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function bindStatus(el) {
  const badge = el.querySelector('.intersect-status');
  el.addEventListener('native:intersect', (e) => {
    badge.textContent = e.detail.isIntersecting ? 'visible' : 'hidden';
  });
}

// ── Bind status badges ──

for (const el of document.querySelectorAll('.intersect-box')) {
  bindStatus(el);
}

// ── Once mode: add .revealed class on first intersection ──

for (const el of [document.getElementById('once-a'), document.getElementById('once-b'), document.getElementById('once-c')]) {
  el.addEventListener('native:intersect', (e) => {
    if (e.detail.isIntersecting) el.classList.add('revealed');
  });
}

// ── Event logging: Scroll Into View ──

const scrollLogEl = document.getElementById('scroll-log');
const scrollBoxes = document.querySelectorAll('.demo-section:nth-of-type(1) .intersect-box');
for (const el of scrollBoxes) {
  el.addEventListener('native:intersect', (e) => {
    const label = el.querySelector('.intersect-label').textContent;
    appendLog(scrollLogEl, `${label}: ${e.detail.isIntersecting ? 'enter' : 'leave'} (ratio: ${e.detail.ratio.toFixed(2)})`);
  });
}

// ── Event logging: Once mode ──

const onceLogEl = document.getElementById('once-log');
for (const el of [document.getElementById('once-a'), document.getElementById('once-b'), document.getElementById('once-c')]) {
  el.addEventListener('native:intersect', (e) => {
    const label = el.querySelector('.intersect-label').textContent;
    appendLog(onceLogEl, `${label}: ${e.detail.isIntersecting ? 'enter (observer disconnects)' : 'leave'}`);
  });
}

// ── Event logging: Threshold ──

const thresholdLogEl = document.getElementById('threshold-log');
const thresholdBoxes = document.querySelectorAll('.demo-section:last-of-type .intersect-box');
for (const el of thresholdBoxes) {
  el.addEventListener('native:intersect', (e) => {
    const label = el.querySelector('.intersect-label').textContent;
    appendLog(thresholdLogEl, `${label}: ${e.detail.isIntersecting ? 'enter' : 'leave'} (ratio: ${e.detail.ratio.toFixed(2)})`);
  });
}

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
