import '../../nav/native-dashboard.ts';
import './command.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/magnifying-glass.ts';
import '../../icons/phosphor/plus.ts';
import '../../icons/phosphor/folder-open.ts';
import '../../icons/phosphor/floppy-disk.ts';
import '../../icons/phosphor/x.ts';
import '../../icons/phosphor/gear.ts';
import '../../icons/phosphor/arrow-counter-clockwise.ts';
import '../../icons/phosphor/arrow-clockwise.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/clipboard-text.ts';
import '../../icons/phosphor/magnifying-glass-plus.ts';
import '../../icons/phosphor/magnifying-glass-minus.ts';
import '../../icons/phosphor/arrows-out.ts';
import '../../icons/phosphor/scissors.ts';
import '../../icons/phosphor/trash.ts';
import '../../icons/phosphor/selection-all.ts';
import '../../icons/phosphor/check.ts';
import '../button/button.ts';

// Basic command event logging
const basicCommand = document.getElementById('basic-command');
const basicLog = document.getElementById('basic-log');
let count = 0;

basicCommand.addEventListener('native:change', (e) => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} native:change — value: "${e.detail.value}", label: "${e.detail.label}"`;
  basicLog.prepend(entry);
});

basicCommand.addEventListener('native:dismiss', () => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} native:dismiss`;
  basicLog.prepend(entry);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
