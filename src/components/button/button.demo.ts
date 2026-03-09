import '../../nav/native-dashboard.ts';
import './button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/plus.ts';
import '../../icons/phosphor/arrow-right.ts';
import '../../icons/phosphor/x.ts';
import '../../icons/phosphor/heart.ts';
import '../../icons/phosphor/pencil-simple.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Press event logging
const pressBtn = document.getElementById('press-btn');
const pressLog = document.getElementById('press-log');
let pressCount = 0;

pressBtn.addEventListener('native:press', (e) => {
  pressCount++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${pressCount} native:press — pointerType: ${e.detail.pointerType}`;
  pressLog.prepend(entry);
});

// Form logging
const form = document.getElementById('demo-form');
const formLog = document.getElementById('form-log');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `submit — value: "${new FormData(form).get('demo')}"`;
  formLog.prepend(entry);
});

form.addEventListener('reset', () => {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = 'reset';
  formLog.prepend(entry);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
