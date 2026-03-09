import '../../nav/native-dashboard.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/house.ts';
import '../../icons/phosphor/rocket-launch.ts';
import '../../icons/phosphor/book-open.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Basic nav value tracking
const basicNav = document.getElementById('basic-nav');
const basicValue = document.getElementById('basic-value');
basicNav.addEventListener('native:change', (e) => {
  basicValue.textContent = e.detail.value;
});

// Grouped nav value tracking
const groupedNav = document.getElementById('grouped-nav');
const groupedValue = document.getElementById('grouped-value');
groupedNav.addEventListener('native:change', (e) => {
  groupedValue.textContent = e.detail.value;
});

// Event logging
const eventNav = document.getElementById('event-nav');
const eventLog = document.getElementById('event-log');
let eventCount = 0;

eventNav.addEventListener('native:change', (e) => {
  eventCount++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${eventCount} native:change — value: "${e.detail.value}"`;
  eventLog.prepend(entry);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
