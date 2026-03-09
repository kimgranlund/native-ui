import '../../nav/native-dashboard.ts';
import './input.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/magnifying-glass.ts';
import '../../icons/phosphor/envelope.ts';
import '../../icons/phosphor/lock.ts';
import '../../icons/phosphor/eye.ts';
import '../../icons/phosphor/user.ts';
import '../../icons/phosphor/pencil-simple.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Event logging
const eventInput = document.getElementById('event-input');
const eventLog = document.getElementById('event-log');
let count = 0;

eventInput.addEventListener('native:input', (e) => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} n-input — value: "${e.detail.value}"`;
  eventLog.prepend(entry);
});

eventInput.addEventListener('native:change', (e) => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} native:change — value: "${e.detail.value}"`;
  eventLog.prepend(entry);
});

// Form logging
const form = document.getElementById('demo-form');
const formLog = document.getElementById('form-log');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `submit — ${[...data.entries()].map(([k, v]) => `${k}: "${v}"`).join(', ')}`;
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
