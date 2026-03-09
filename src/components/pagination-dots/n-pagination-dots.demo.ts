import '../../nav/native-dashboard.ts';
import './n-pagination-dots.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Event log
const demo = document.getElementById('event-demo');
const log = document.getElementById('event-log');
demo.addEventListener('native:change', (e) => {
  const { index } = e.detail;
  log.textContent = `native:change → index: ${index}\n` + log.textContent;
  if (log.textContent.length > 500) log.textContent = log.textContent.slice(0, 500);
});

// Programmatic control
const prog = document.getElementById('prog-demo');
document.getElementById('prog-prev').addEventListener('native:press', () => {
  prog.active = Math.max(0, prog.active - 1);
});
document.getElementById('prog-next').addEventListener('native:press', () => {
  prog.active = Math.min(prog.count - 1, prog.active + 1);
});
document.getElementById('prog-reset').addEventListener('native:press', () => {
  prog.active = 0;
});

// Copy buttons

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
