import '../../nav/native-dashboard.ts';
import './accordion.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/code.ts';
import '../../icons/phosphor/info.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Event log for accordion toggle events
const accordion = document.getElementById('event-accordion');
const log = document.getElementById('accordion-log');
let count = 0;

accordion.addEventListener('toggle', (e) => {
  const item = e.target.closest('n-accordion-item');
  if (!item) return;
  const heading = item.querySelector('[slot="heading"]')?.textContent?.trim() ?? '?';
  const isOpen = item.hasAttribute('open');
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} ${isOpen ? 'opened' : 'closed'} — "${heading}"`;
  log.prepend(entry);
}, true);

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
