import '../../nav/native-dashboard.ts';
import './calendar.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// Single select output
const single = document.getElementById('single');
const singleOutput = document.getElementById('single-output');
single.addEventListener('native:change', (e) => {
  singleOutput.textContent = `Selected: ${e.detail.value}`;
});

// Range output
const rangeCal = document.getElementById('range-cal');
const rangeOutput = document.getElementById('range-output');
rangeCal.addEventListener('native:range-select', (e) => {
  rangeOutput.textContent = `Range: ${e.detail.start} → ${e.detail.end}`;
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
