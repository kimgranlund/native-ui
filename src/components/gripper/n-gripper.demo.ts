import '../../nav/native-dashboard.ts';
import './n-gripper.ts';

// Live readouts
function readout(targetId, readoutId) {
  const target = document.getElementById(targetId);
  const el = document.getElementById(readoutId);
  if (!target || !el) return;

  const update = () => {
    const rect = target.getBoundingClientRect();
    el.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
  };

  target.addEventListener('native:grip-move', update);
  target.addEventListener('native:grip-end', update);
  target.addEventListener('native:grip-cancel', update);
}

readout('panel-h', 'readout-h');
readout('panel-v', 'readout-v');
readout('panel-c', 'readout-c');
readout('panel-r', 'readout-r');
readout('panel-s', 'readout-s');
