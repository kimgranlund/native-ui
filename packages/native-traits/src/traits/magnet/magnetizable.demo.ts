import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/switch/switch.ts';
import '../../components/range/range.ts';
import '../../components/controller/controller.ts';
import { MagnetController } from '../index.ts';

// ── 1. Sibling snap demo ──
// Handled by n-controller in HTML — no JS needed

// ── 2. Grid snap demo ──
// Handled by n-controller in HTML — no JS needed

// ── 3. Edge snap demo ──
// Handled by n-controller in HTML — no JS needed

// ── 4. Controller demo (options playground) ──
const playgroundArena = document.getElementById('playground-arena');
const magnet = new MagnetController(playgroundArena, {
  threshold: 20,
  gridSize: 0,
  strength: 1,
  guides: true,
  snapToEdges: true,
  snapToSiblings: true,
});

// Option controls
const thresholdRange = document.getElementById('opt-threshold');
const thresholdVal = document.getElementById('threshold-val');
thresholdRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  magnet.threshold = v;
  thresholdVal.textContent = v;
});

const gridRange = document.getElementById('opt-grid');
const gridVal = document.getElementById('grid-val');
gridRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  magnet.gridSize = v;
  gridVal.textContent = v;
});

const strengthRange = document.getElementById('opt-strength');
const strengthVal = document.getElementById('strength-val');
strengthRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  magnet.strength = v;
  strengthVal.textContent = v.toFixed(2);
});

document.getElementById('opt-guides').addEventListener('native:change', (e) => {
  magnet.guides = e.detail.checked;
});
document.getElementById('opt-edges').addEventListener('native:change', (e) => {
  magnet.snapToEdges = e.detail.checked;
});
document.getElementById('opt-siblings').addEventListener('native:change', (e) => {
  magnet.snapToSiblings = e.detail.checked;
});

// Reset button
document.getElementById('btn-reset').addEventListener('native:press', () => {
  const items = playgroundArena.querySelectorAll('.magnet-box');
  items.forEach((item, i) => {
    item.style.translate = '';
    item.removeAttribute('magnet-snapping');
  });
});

// ── 5. Alignment tool demo ──
// Handled by n-controller in HTML

// ── Event log ──
const eventLog = document.getElementById('event-log');

function logEvent(type, detail) {
  const entry = document.createElement('div');
  entry.className = 'entry';
  if (type === 'snap') {
    entry.innerHTML = `<span class="snap">snap</span> → <span class="type">${detail.snappedTo} (${detail.axis})</span> x:${detail.x.toFixed(0)} y:${detail.y.toFixed(0)}`;
  } else {
    entry.innerHTML = `<span class="drop">drop</span> → x:${detail.x.toFixed(0)} y:${detail.y.toFixed(0)}`;
  }
  eventLog.prepend(entry);
  // Keep log manageable
  while (eventLog.children.length > 50) eventLog.lastChild.remove();
}

// Listen on document for all demos
document.addEventListener('native:magnet-snap', (e) => logEvent('snap', e.detail));
document.addEventListener('native:magnet-drop', (e) => logEvent('drop', e.detail));
