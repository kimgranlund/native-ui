import '../../nav/native-dashboard.ts';
import './segmented-control.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/list.ts';
import '../../icons/phosphor/grid-four.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Change event logging
const eventSc = document.getElementById('event-sc');
const eventLog = document.getElementById('event-log');
let count = 0;

eventSc.addEventListener('native:change', (e) => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} native:change — value: "${e.detail.value}", label: "${e.detail.label}"`;
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
