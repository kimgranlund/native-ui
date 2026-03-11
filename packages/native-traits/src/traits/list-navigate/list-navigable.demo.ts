import { effect } from '@nonoun/native-core';
import { ListNavigateController } from '../index.ts';

// ── Helpers ──
function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// Make items dispatch native:select on click
function wireClicks(host) {
  for (const item of host.querySelectorAll('[role="option"], [role="radio"]')) {
    item.addEventListener('click', () => {
      const value = item.getAttribute('value') ?? '';
      const label = item.textContent?.trim() ?? '';
      item.dispatchEvent(new CustomEvent('native:select', {
        bubbles: true,
        composed: true,
        detail: { value, label },
      }));
    });
  }
}

// ── Basic list ──
const basicHost = document.getElementById('basic-list');
const basicLog = document.getElementById('basic-log');
wireClicks(basicHost);

const basicCtrl = new ListNavigateController(basicHost, {
  itemSelector: ':scope > [role="option"]',
  orientation: 'vertical',
});

// Manual ARIA sync (since we're not using NativeElement with addEffect/deferChildren)
basicHost.addEventListener('native:change', (e) => {
  appendLog(basicLog, `native:change — value: "${e.detail.value}", label: "${e.detail.label}"`);
  for (const item of basicHost.querySelectorAll('[role="option"]')) {
    const val = item.getAttribute('value');
    item.setAttribute('aria-selected', val === e.detail.value ? 'true' : 'false');
  }
});

// ── Radio group ──
const radioHost = document.getElementById('radio-list');
const radioLog = document.getElementById('radio-log');
wireClicks(radioHost);

const radioCtrl = new ListNavigateController(radioHost, {
  itemSelector: ':scope > [role="radio"]',
  ariaAttr: 'aria-checked',
  orientation: 'vertical',
});

radioHost.addEventListener('native:change', (e) => {
  appendLog(radioLog, `native:change — value: "${e.detail.value}"`);
  for (const item of radioHost.querySelectorAll('[role="radio"]')) {
    const val = item.getAttribute('value');
    item.setAttribute('aria-checked', val === e.detail.value ? 'true' : 'false');
  }
});

// ── Horizontal list ──
const horizontalHost = document.getElementById('horizontal-list');
const horizontalLog = document.getElementById('horizontal-log');
wireClicks(horizontalHost);

const horizontalCtrl = new ListNavigateController(horizontalHost, {
  itemSelector: ':scope > [role="option"]',
  orientation: 'horizontal',
  wrap: true,
});

horizontalHost.addEventListener('native:change', (e) => {
  appendLog(horizontalLog, `native:change — value: "${e.detail.value}"`);
  for (const item of horizontalHost.querySelectorAll('[role="option"]')) {
    const val = item.getAttribute('value');
    item.setAttribute('aria-selected', val === e.detail.value ? 'true' : 'false');
  }
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
