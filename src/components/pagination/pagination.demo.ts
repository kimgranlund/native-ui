import '../../nav/native-dashboard.ts';
import './pagination.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/caret-left.ts';
import '../../icons/phosphor/caret-right.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

const pag = document.getElementById('live-pagination');
const display = document.getElementById('page-display');
pag?.addEventListener('native:change', (e) => {
  display.textContent = String(e.detail.value);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
