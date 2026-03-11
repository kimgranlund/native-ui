import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/switch/switch.ts';
import '../../../../../src/components/range/range.ts';
import '../../../../../src/components/controller/controller.ts';
import { TossController } from '../index.ts';

// ── Provider demo event log ──
const providerLog = document.getElementById('provider-log');
const arena = document.getElementById('provider-arena');
arena.addEventListener('native:toss', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `toss → <span class="pos">x:${d.x.toFixed(0)} y:${d.y.toFixed(0)}</span> <span class="vel">v:(${d.velocityX.toFixed(2)}, ${d.velocityY.toFixed(2)})</span> <span class="bounce">bounces:${d.bounces}</span> rot:${d.rotation.toFixed(0)}°`;
  providerLog.prepend(entry);
});
arena.addEventListener('native:bounce', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `<span class="bounce">bounce → ${d.edge}</span> <span class="pos">x:${d.x.toFixed(0)} y:${d.y.toFixed(0)}</span>`;
  providerLog.prepend(entry);
});

// ── Controller demo ──
const controllerCard = document.getElementById('controller-card');
const controllerLog = document.getElementById('controller-log');

const toss = new TossController(controllerCard, {
  friction: 0.95,
  bounce: true,
  bounceDamping: 0.6,
  returnOnEnd: false,
});

controllerCard.addEventListener('native:toss', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `toss → <span class="pos">x:${d.x.toFixed(0)} y:${d.y.toFixed(0)}</span> <span class="vel">v:(${d.velocityX.toFixed(2)}, ${d.velocityY.toFixed(2)})</span> <span class="bounce">bounces:${d.bounces}</span> rot:${d.rotation.toFixed(0)}°`;
  controllerLog.prepend(entry);
});
controllerCard.addEventListener('native:bounce', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `<span class="bounce">bounce → ${d.edge}</span> <span class="pos">x:${d.x.toFixed(0)} y:${d.y.toFixed(0)}</span>`;
  controllerLog.prepend(entry);
});

// ── Option controls ──
const frictionRange = document.getElementById('opt-friction');
const frictionVal = document.getElementById('friction-val');
frictionRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  toss.friction = v;
  frictionVal.textContent = v.toFixed(2);
});

const dampingRange = document.getElementById('opt-damping');
const dampingVal = document.getElementById('damping-val');
dampingRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  toss.bounceDamping = v;
  dampingVal.textContent = v.toFixed(2);
});

const gravityRange = document.getElementById('opt-gravity');
const gravityVal = document.getElementById('gravity-val');
gravityRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  toss.gravity = v;
  gravityVal.textContent = v.toFixed(2);
});

const spinSwitch = document.getElementById('opt-spin');
spinSwitch.addEventListener('native:change', (e) => {
  toss.spin = e.detail.value;
});

const bounceSwitch = document.getElementById('opt-bounce');
bounceSwitch.addEventListener('native:change', (e) => {
  toss.bounce = e.detail.value;
});

const returnSwitch = document.getElementById('opt-return');
returnSwitch.addEventListener('native:change', (e) => {
  toss.returnOnEnd = e.detail.value;
});

// Reset button
document.getElementById('btn-reset').addEventListener('native:press', () => {
  controllerCard.style.translate = '';
  controllerCard.style.rotate = '';
  // Also reset internal state by destroying and recreating
  toss.destroy();
  const newToss = new TossController(controllerCard, {
    friction: toss.friction,
    bounce: toss.bounce,
    bounceDamping: toss.bounceDamping,
    gravity: toss.gravity,
    spin: toss.spin,
    returnOnEnd: toss.returnOnEnd,
  });
  // Update references on the options controls
  Object.assign(toss, newToss);
});
