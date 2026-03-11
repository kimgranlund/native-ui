import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';
import { NativeElement, define } from '@nonoun/native-core';
import { CopyController } from '../index.ts';

// ── Minimal NativeElement shell for injection demos ──

class CopyDemo extends NativeElement {}
define('copy-demo', CopyDemo);

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ── Basic Copy (injection) — wire native:press → copy ──

for (const el of document.querySelectorAll('copy-demo[traits*="copyable"]')) {
  el.addEventListener('native:press', () => {
    el.getTraitController('copyable')?.copy();
  });
}

const basicLogEl = document.getElementById('basic-log');
document.querySelector('copy-demo[data-trait-copyable-value="npm install native-ui"]').addEventListener('native:copy', (e) => {
  appendLog(basicLogEl, `Copied: "${e.detail.value}"`);
});

// ── Copy with Getter (CopyController direct) ──

const getterEl = document.getElementById('getter-demo');
const getterCopy = new CopyController(getterEl, {
  value: () => new Date().toISOString(),
});

getterEl.addEventListener('native:press', () => getterCopy.copy());

const getterLogEl = document.getElementById('getter-log');
getterEl.addEventListener('native:copy', (e) => {
  appendLog(getterLogEl, `Copied: "${e.detail.value}"`);
});

// ── Custom Duration (injection) — log ──

const fastLogEl = document.getElementById('fast-log');
document.querySelector('copy-demo[data-trait-copyable-feedback-duration="500"]').addEventListener('native:copy', (e) => {
  appendLog(fastLogEl, `Copied: "${e.detail.value}"`);
});

// ── Provider Pattern — wire click → copy ──
// The CopyController is managed by n-controller on the first child.
// Since targets are plain divs (not NativeElement), we read the value from
// the controller attribute and invoke clipboard API directly.

const providerCard = document.getElementById('provider-card');
providerCard.addEventListener('click', async () => {
  const value = document.getElementById('provider-ctrl').getAttribute('data-trait-copyable-value') ?? '';
  await navigator.clipboard.writeText(value);
  providerCard.toggleAttribute('copied', true);
  setTimeout(() => providerCard.removeAttribute('copied'), 2000);
  providerCard.dispatchEvent(new CustomEvent('native:copy', { bubbles: true, detail: { value } }));
});

const providerLogEl = document.getElementById('provider-log');
providerCard.addEventListener('native:copy', (e) => {
  appendLog(providerLogEl, `Copied: "${e.detail.value}"`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
