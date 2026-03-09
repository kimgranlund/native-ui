import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/switch/switch.ts';
import '../../components/range/range.ts';
import '../../components/controller/controller.ts';
import { ParallaxController } from '../../index.ts';

// ── Controller demo ──
const controllerCard = document.getElementById('controller-card');
const controllerLog = document.getElementById('controller-log');

const parallax = new ParallaxController(controllerCard, {
  maxTilt: 15,
  perspective: 1000,
  speed: 300,
  scale: 1.05,
  glare: false,
});

controllerCard.addEventListener('native:parallax-move', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `move → <span class="tilt">tiltX:${d.tiltX.toFixed(1)} tiltY:${d.tiltY.toFixed(1)}</span> <span class="pct">%X:${d.percentX.toFixed(2)} %Y:${d.percentY.toFixed(2)}</span>`;
  controllerLog.prepend(entry);
  // Keep log manageable
  while (controllerLog.children.length > 50) controllerLog.lastChild.remove();
});

// ── Provider event log ──
const providerLog = document.getElementById('provider-log');
const providerCards = document.getElementById('provider-cards');
providerCards.addEventListener('native:parallax-move', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `move → <span class="tilt">tiltX:${d.tiltX.toFixed(1)} tiltY:${d.tiltY.toFixed(1)}</span> <span class="pct">%X:${d.percentX.toFixed(2)} %Y:${d.percentY.toFixed(2)}</span>`;
  providerLog.prepend(entry);
  while (providerLog.children.length > 30) providerLog.lastChild.remove();
});

// ── Option controls ──
const tiltRange = document.getElementById('opt-tilt');
const tiltVal = document.getElementById('tilt-val');
tiltRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  parallax.maxTilt = v;
  tiltVal.textContent = v.toFixed(0);
});

const perspRange = document.getElementById('opt-perspective');
const perspVal = document.getElementById('perspective-val');
perspRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  parallax.perspective = v;
  perspVal.textContent = v.toFixed(0);
});

const scaleRange = document.getElementById('opt-scale');
const scaleVal = document.getElementById('scale-val');
scaleRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  parallax.scale = v;
  scaleVal.textContent = v.toFixed(2);
});

const speedRange = document.getElementById('opt-speed');
const speedVal = document.getElementById('speed-val');
speedRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  parallax.speed = v;
  speedVal.textContent = v.toFixed(0);
});

const glareSwitch = document.getElementById('opt-glare');
glareSwitch.addEventListener('native:change', (e) => {
  parallax.glare = e.detail.value;
  // Glare changes require re-attach to create/remove glare element
  parallax.detach();
  parallax.attach();
});

const glareOpRange = document.getElementById('opt-glare-opacity');
const glareOpVal = document.getElementById('glare-opacity-val');
glareOpRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  parallax.glareOpacity = v;
  glareOpVal.textContent = v.toFixed(2);
});

// Reset button
document.getElementById('btn-reset').addEventListener('native:press', () => {
  parallax.reset();
});
