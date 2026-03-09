import '../../nav/native-dashboard.ts';
import './slideshow.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

const demo = document.getElementById('event-demo');
const log = document.getElementById('event-log');
demo.addEventListener('native:slide-change', (e) => {
  const { index } = e.detail;
  log.textContent = `native:slide-change → index: ${index}\n` + log.textContent;
  if (log.textContent.length > 500) log.textContent = log.textContent.slice(0, 500);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
