import '../../nav/native-dashboard.ts';
import './combobox.ts';
import '../button/button.ts';
import '../input/input.ts';
import '../listbox/listbox.ts';
import '../listbox/option.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/magnifying-glass.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Event logging
const eventCombobox = document.getElementById('event-combobox');
const eventLog = document.getElementById('event-log');
let count = 0;

eventCombobox.addEventListener('native:change', (e) => {
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
