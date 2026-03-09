import '../../nav/native-dashboard.ts';
import './tabs.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/code.ts';
import '../../icons/phosphor/eye.ts';
import '../../icons/phosphor/gear.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

const eventTabs = document.getElementById('event-tabs');
const tabLog = document.getElementById('tab-event-log');
let tabCount = 0;
eventTabs.addEventListener('native:change', (e) => {
  tabCount++;
  tabLog.textContent = `#${tabCount} native:change → value: "${e.detail.value}"\n` + tabLog.textContent;
  if (tabLog.textContent.length > 500) tabLog.textContent = tabLog.textContent.slice(0, 500);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
