import '../../nav/native-dashboard.ts';
import './listbox.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/house.ts';
import '../../icons/phosphor/rocket-launch.ts';
import '../../icons/phosphor/book-open.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Basic listbox value tracking
const basicListbox = document.getElementById('basic-listbox');
const basicValue = document.getElementById('basic-value');

basicListbox.addEventListener('native:change', (e) => {
  basicValue.textContent = e.detail.value;
});

// Pre-select "medium"
const preListbox = document.getElementById('preselected-listbox');
preListbox.addEventListener('native:change', () => {});
// Programmatic select after registration
requestAnimationFrame(() => {
  preListbox.controller.select('medium');
});

// Event logging
const eventListbox = document.getElementById('event-listbox');
const eventLog = document.getElementById('event-log');
let eventCount = 0;

eventListbox.addEventListener('native:select', (e) => {
  eventCount++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${eventCount} n-select — value: "${e.detail.value}", label: "${e.detail.label}"`;
  eventLog.prepend(entry);
});

eventListbox.addEventListener('native:change', (e) => {
  eventCount++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${eventCount} native:change — value: "${e.detail.value}", label: "${e.detail.label}"`;
  eventLog.prepend(entry);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
