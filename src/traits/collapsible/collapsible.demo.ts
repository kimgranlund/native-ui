import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { NativeElement, define } from '../../index.ts';

// ── Minimal NativeElement shell for injection demos ──
// No custom logic — traits="collapsible" does all the work.
// getTraitController('collapsible') provides programmatic access.

class CollapseDemo extends NativeElement {}
define('collapse-demo', CollapseDemo);

// ── Event logging ──

const logEl = document.getElementById('log');
let count = 0;
function log(msg) {
  count++;
  const line = document.createElement('div');
  line.textContent = `#${count} ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Basic toggle ──

const section1 = document.getElementById('section1');
document.getElementById('toggle-btn').addEventListener('native:press', () => {
  section1.getTraitController('collapsible').toggle();
});
section1.addEventListener('native:expand', () => log('Expanded'));
section1.addEventListener('native:collapse', () => log('Collapsed'));

// ── Initially collapsed ──

const section2 = document.getElementById('section2');
document.getElementById('expand-btn').addEventListener('native:press', () => {
  const ctrl = section2.getTraitController('collapsible');
  if (ctrl.collapsed) {
    ctrl.expand();
  } else {
    ctrl.collapse();
  }
});

// ── Custom duration (500ms) ──

const section3 = document.getElementById('section3');
document.getElementById('slow-btn').addEventListener('native:press', () => {
  section3.getTraitController('collapsible').toggle();
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
