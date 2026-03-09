import '../../nav/native-dashboard.ts';
import './switch.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Change event logging
const eventSw = document.getElementById('event-sw');
const eventLog = document.getElementById('event-log');
let count = 0;

eventSw.addEventListener('native:change', (e) => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} native:change — checked: ${e.detail.checked}, value: "${e.detail.value}"`;
  eventLog.prepend(entry);
});

// Form logging
const form = document.getElementById('demo-form');
const formLog = document.getElementById('form-log');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const entries = [...data.entries()].map(([k, v]) => `${k}=${v}`).join(', ');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `submit — ${entries || '(empty)'}`;
  formLog.prepend(entry);
});

form.addEventListener('reset', () => {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = 'reset';
  formLog.prepend(entry);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
