import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/switch/switch.ts';
import '../../components/range/range.ts';
import '../../components/input/input.ts';
import '../../components/field/field.ts';
import '../../components/controller/controller.ts';
import { ConfettiController } from '../index.ts';

// ── Event log ──
const eventLog = document.getElementById('event-log');
document.addEventListener('native:confetti', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `confetti — <span class="count">count:${d.count}</span> <span class="origin">origin:(${d.origin.x.toFixed(0)}, ${d.origin.y.toFixed(0)})</span>`;
  eventLog.prepend(entry);
});

// ── Form success demo ──
const formBtn = document.getElementById('form-submit');
const formHost = document.getElementById('form-card');
const formConfetti = new ConfettiController(formHost, { trigger: 'manual', count: 50, spread: 120 });

formBtn.addEventListener('native:press', () => {
  formBtn.toggleAttribute('disabled', true);
  formBtn.textContent = 'Submitting...';
  setTimeout(() => {
    formBtn.textContent = 'Success!';
    formConfetti.fire();
    setTimeout(() => {
      formBtn.removeAttribute('disabled');
      formBtn.textContent = 'Submit';
    }, 1500);
  }, 800);
});

// ── Programmatic presets ──
const subtleHost = document.getElementById('btn-subtle');
const partyHost = document.getElementById('btn-party');
const explosionHost = document.getElementById('btn-explosion');

const subtleCtrl = new ConfettiController(subtleHost, { trigger: 'manual', count: 10, velocity: 6, spread: 45, duration: 1200 });
const partyCtrl = new ConfettiController(partyHost, { trigger: 'manual', count: 60, velocity: 15, spread: 120, duration: 2500 });
const explosionCtrl = new ConfettiController(explosionHost, { trigger: 'manual', count: 100, velocity: 25, spread: 180, gravity: 0.3, duration: 3000 });

subtleHost.addEventListener('native:press', () => subtleCtrl.fire());
partyHost.addEventListener('native:press', () => partyCtrl.fire());
explosionHost.addEventListener('native:press', () => explosionCtrl.fire());

// ── Options playground ──
const playgroundBtn = document.getElementById('playground-fire');
const playgroundHost = document.getElementById('playground-target');
let playCtrl = new ConfettiController(playgroundHost, { trigger: 'manual' });

playgroundBtn.addEventListener('native:press', () => playCtrl.fire());

const countRange = document.getElementById('opt-count');
const countVal = document.getElementById('count-val');
countRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  playCtrl.count = v;
  countVal.textContent = String(v);
});

const spreadRange = document.getElementById('opt-spread');
const spreadVal = document.getElementById('spread-val');
spreadRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  playCtrl.spread = v;
  spreadVal.textContent = String(v);
});

const velocityRange = document.getElementById('opt-velocity');
const velocityVal = document.getElementById('velocity-val');
velocityRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  playCtrl.velocity = v;
  velocityVal.textContent = String(v);
});

const gravityRange = document.getElementById('opt-gravity');
const gravityVal = document.getElementById('gravity-val');
gravityRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  playCtrl.gravity = v;
  gravityVal.textContent = v.toFixed(2);
});

const durationRange = document.getElementById('opt-duration');
const durationVal = document.getElementById('duration-val');
durationRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  playCtrl.duration = v;
  durationVal.textContent = String(v);
});
