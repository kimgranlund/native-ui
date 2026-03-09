import '../nav/native-dashboard.ts';
import './icon.ts';
import '../components/button/button.ts';
import '../components/select/select.ts';
import '../components/listbox/listbox.ts';

// Register specific icons for the demo
import './phosphor/house.ts';
import './phosphor/gear.ts';
import './phosphor/bell.ts';
import './phosphor/magnifying-glass.ts';
import './phosphor/heart.ts';
import './phosphor/star.ts';
import './phosphor/check.ts';
import './phosphor/x.ts';
import './phosphor/trash.ts';
import './phosphor/pencil-simple.ts';
import './phosphor/plus.ts';
import './phosphor/caret-up.ts';
import './phosphor/caret-down.ts';
import './phosphor/caret-left.ts';
import './phosphor/caret-right.ts';
import './phosphor/arrow-up.ts';
import './phosphor/arrow-down.ts';
import './phosphor/arrow-left.ts';
import './phosphor/arrow-right.ts';
import './phosphor/caret-up-down.ts';
import './phosphor/check-circle.ts';
import './phosphor/warning.ts';
import './phosphor/x-circle.ts';
import './phosphor/info.ts';

// Dynamic name change
const dynamicIcon = document.getElementById('dynamic-icon');
const iconPicker = document.getElementById('icon-picker');
iconPicker.addEventListener('native:change', (e) => {
  dynamicIcon.setAttribute('name', e.detail.value);
});

// Late registration demo
import { registerIcon } from './registry.ts';

const registerBtn = document.getElementById('register-btn');
const lateLog = document.getElementById('late-log');

function log(msg) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = msg;
  lateLog.prepend(entry);
}

log('n-icon[name="late-demo"] created — icon not yet registered, renders empty.');

registerBtn.addEventListener('native:press', () => {
  registerIcon('late-demo', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>');
  log('registerIcon("late-demo", ...) called — icon should now appear!');
  registerBtn.disabled = true;
});
