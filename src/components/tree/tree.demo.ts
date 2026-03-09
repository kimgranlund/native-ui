import '../../nav/native-dashboard.ts';
import './tree.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/caret-right.ts';
import '../../icons/phosphor/caret-down.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Event log for tree interactions
const tree = document.getElementById('event-tree');
const log = document.getElementById('tree-log');
let count = 0;

// Observe attribute changes on tree items to log select/expand/collapse
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type !== 'attributes') continue;
    const item = m.target;
    const label = item.querySelector(':scope > [slot="label"]')?.textContent?.trim() ?? '?';
    if (m.attributeName === 'selected' && item.hasAttribute('selected')) {
      count++;
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = `#${count} selected — "${label}"`;
      log.prepend(entry);
    } else if (m.attributeName === 'expanded') {
      count++;
      const expanded = item.hasAttribute('expanded');
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = `#${count} ${expanded ? 'expanded' : 'collapsed'} — "${label}"`;
      log.prepend(entry);
    }
  }
});

tree.querySelectorAll('n-tree-item').forEach((item) => {
  observer.observe(item, { attributes: true, attributeFilter: ['selected', 'expanded'] });
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
