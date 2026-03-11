import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/listbox/listbox.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// ── Tab bar: active class switching ──

const tabbar = document.getElementById('tabbar');
tabbar.addEventListener('focusin', (e) => {
  for (const item of tabbar.querySelectorAll('.tab-item')) item.classList.remove('active');
  if (e.target !== tabbar) e.target.classList.add('active');
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
