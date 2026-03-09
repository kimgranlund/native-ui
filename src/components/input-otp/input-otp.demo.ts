import '../../nav/native-dashboard.ts';
import './input-otp.ts';
import '../field/field.ts';
import '../input/input.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

const otp = document.getElementById('otp-live');
const display = document.getElementById('otp-value');
otp?.addEventListener('native:input', (e) => {
  const val = e.detail.value;
  display.textContent = val.padEnd(6, '_');
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
