import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/switch/switch.ts';
import '../../../../../src/components/select/select.ts';
import '../../../../../src/components/range/range.ts';
import '../../../../../src/components/controller/controller.ts';
import { FlipController } from '../index.ts';

// ── Provider demo event log ──
const providerLog = document.getElementById('provider-log');
document.getElementById('provider-section').addEventListener('native:flip', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  const cls = d.flipped ? 'flipped' : 'unflipped';
  entry.innerHTML = `flip -> <span class="${cls}">${d.flipped ? 'flipped' : 'unflipped'}</span> <span class="axis">axis:${d.axis}</span>`;
  providerLog.prepend(entry);
});

// ── Programmatic demo ──
const progCard = document.getElementById('prog-card');
const progFlip = new FlipController(progCard, { trigger: 'manual' });

document.getElementById('btn-flip').addEventListener('native:press', () => {
  progFlip.flip();
});
document.getElementById('btn-unflip').addEventListener('native:press', () => {
  progFlip.unflip();
});
document.getElementById('btn-toggle').addEventListener('native:press', () => {
  progFlip.toggle();
});

// ── Options playground ──
const optCard = document.getElementById('opt-card');
let optFlip = new FlipController(optCard, { trigger: 'click' });
const optLog = document.getElementById('opt-log');

optCard.addEventListener('native:flip', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  const cls = d.flipped ? 'flipped' : 'unflipped';
  entry.innerHTML = `flip -> <span class="${cls}">${d.flipped ? 'flipped' : 'unflipped'}</span> <span class="axis">axis:${d.axis}</span>`;
  optLog.prepend(entry);
});

// Axis select
document.getElementById('opt-axis').addEventListener('native:change', (e) => {
  const val = e.detail.value;
  optFlip.destroy();
  // Update back face rotation class
  const backEl = optCard.querySelector('.flip-back');
  if (backEl) {
    backEl.classList.toggle('x-axis', val === 'x');
    backEl.style.transform = val === 'x' ? 'rotateX(180deg)' : 'rotateY(180deg)';
  }
  optFlip = new FlipController(optCard, {
    axis: val,
    duration: optFlip.duration,
    perspective: optFlip.perspective,
    trigger: optFlip.trigger,
  });
});

// Duration range
const durationVal = document.getElementById('duration-val');
document.getElementById('opt-duration').addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  optFlip.duration = v;
  optCard.style.transition = `transform ${v}ms ease-in-out`;
  durationVal.textContent = `${v}ms`;
});

// Perspective range
const perspectiveVal = document.getElementById('perspective-val');
document.getElementById('opt-perspective').addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  optFlip.perspective = v;
  optCard.style.perspective = `${v}px`;
  perspectiveVal.textContent = `${v}px`;
});

// Trigger select
document.getElementById('opt-trigger').addEventListener('native:change', (e) => {
  const val = e.detail.value;
  optFlip.detach();
  optFlip.trigger = val;
  optFlip.attach();
});

// Disabled switch
document.getElementById('opt-disabled').addEventListener('native:change', (e) => {
  optFlip.disabled = e.detail.value;
});
