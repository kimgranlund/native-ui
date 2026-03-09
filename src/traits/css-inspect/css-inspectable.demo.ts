import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/switch/switch.ts';
import '../../components/range/range.ts';
import '../../components/input/input.ts';
import '../../components/controller/controller.ts';
import { CSSInspectController } from '../../index.ts';

// ── Provider event log ──
const providerLog = document.getElementById('provider-log');
document.querySelectorAll('.provider-target').forEach(el => {
  el.addEventListener('native:inspect', (e) => {
    const d = e.detail;
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.innerHTML = `inspect → <span class="${d.active ? 'on' : 'off'}">${d.active ? 'ON' : 'OFF'}</span> <span class="layers">layers: ${d.layers}</span>`;
    providerLog.prepend(entry);
  });
});

// ── Controller demo ──
const controllerTarget = document.getElementById('controller-target');
const controllerLog = document.getElementById('controller-log');

const inspector = new CSSInspectController(controllerTarget, {
  depth: 16,
  scale: 0.85,
  maxTilt: 60,
  tiltRadius: 384,
  perspective: 1200,
  labels: true,
});

controllerTarget.addEventListener('native:inspect', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `inspect → <span class="${d.active ? 'on' : 'off'}">${d.active ? 'ON' : 'OFF'}</span> <span class="layers">layers: ${d.layers}</span>`;
  controllerLog.prepend(entry);
});

// ── Option controls ──
const depthRange = document.getElementById('opt-depth');
const depthVal = document.getElementById('depth-val');
depthRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  inspector.depth = v;
  depthVal.textContent = v.toFixed(0);
});

const scaleRange = document.getElementById('opt-scale');
const scaleVal = document.getElementById('scale-val');
scaleRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  inspector.scale = v;
  scaleVal.textContent = v.toFixed(2);
});

const perspRange = document.getElementById('opt-perspective');
const perspVal = document.getElementById('perspective-val');
perspRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  inspector.perspective = v;
  perspVal.textContent = v.toFixed(0);
});

const maxTiltRange = document.getElementById('opt-max-tilt');
const maxTiltVal = document.getElementById('max-tilt-val');
maxTiltRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  inspector.maxTilt = v;
  maxTiltVal.textContent = v.toFixed(0);
});

const tiltRadiusRange = document.getElementById('opt-tilt-radius');
const tiltRadiusVal = document.getElementById('tilt-radius-val');
tiltRadiusRange.addEventListener('native:change', (e) => {
  const v = Number(e.detail.value);
  inspector.tiltRadius = v;
  tiltRadiusVal.textContent = v.toFixed(0);
});

const labelSwitch = document.getElementById('opt-labels');
labelSwitch.addEventListener('native:change', (e) => {
  inspector.labels = e.detail.checked;
});

// ── Pick mode event log ──
const pickLog = document.getElementById('pick-log');
document.getElementById('pick-target').addEventListener('native:inspect', (e) => {
  const d = e.detail;
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `inspect → <span class="${d.active ? 'on' : 'off'}">${d.active ? 'ON' : 'OFF'}</span> <span class="layers">layers: ${d.layers}</span>`;
  pickLog.prepend(entry);
});
