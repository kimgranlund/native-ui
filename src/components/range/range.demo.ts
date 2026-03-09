import '../../nav/native-dashboard.ts';
import './range.ts';
import '../field/field.ts';
import '../input/input.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

const range = document.getElementById('zoom-range');
const display = document.getElementById('zoom-value');
range?.addEventListener('native:input', (e) => {
  display.textContent = `${e.detail.value}%`;
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
