import '../../nav/native-dashboard.ts';
import './select.ts';
import '../button/button.ts';
import '../listbox/listbox.ts';
import '../listbox/option.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/caret-up-down.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Event logging
const eventSelect = document.getElementById('event-select');
const eventLog = document.getElementById('event-log');
let count = 0;

eventSelect.addEventListener('native:change', (e) => {
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

// Dynamic update demo
const dynamicSelect = document.getElementById('dynamic-select');
const dynamicLog = document.getElementById('dynamic-log');

document.getElementById('load-fruits').addEventListener('native:press', () => {
  dynamicSelect.options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'grape', label: 'Grape' },
  ];
  dynamicSelect.placeholder = 'Choose a fruit';
});

document.getElementById('load-colors').addEventListener('native:press', () => {
  dynamicSelect.options = [
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
  ];
  dynamicSelect.placeholder = 'Choose a color';
});

dynamicSelect.addEventListener('native:change', (e) => {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `native:change — value: "${e.detail.value}", label: "${e.detail.label}"`;
  dynamicLog.prepend(entry);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
