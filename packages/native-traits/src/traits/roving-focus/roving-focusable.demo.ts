import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/listbox/listbox.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';

// ── Tab bar: active class switching ──

const tabbar = document.getElementById('tabbar');
tabbar.addEventListener('focusin', (e) => {
  for (const item of tabbar.querySelectorAll('.tab-item')) item.classList.remove('active');
  if (e.target !== tabbar) e.target.classList.add('active');
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
