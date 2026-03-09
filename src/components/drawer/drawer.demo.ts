import '../../nav/native-dashboard.ts';
import './drawer.ts';
import '../button/button.ts';
import '../input/input.ts';
import '../field/field.ts';
import '../switch/switch.ts';
import '../checkbox/checkbox.ts';
import '../textarea/textarea.ts';
import '../../icons/icon.ts';
import '../nav/nav.ts';
import '../listbox/listbox.ts';
import '../../icons/phosphor/x.ts';
import '../../icons/phosphor/house.ts';
import '../../icons/phosphor/rocket-launch.ts';
import '../../icons/phosphor/book-open.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

function wire(openId, closeId, drawerId) {
  const open = document.getElementById(openId);
  const close = document.getElementById(closeId);
  const drawer = document.getElementById(drawerId);
  open?.addEventListener('native:press', () => drawer?.showModal());
  close?.addEventListener('native:press', () => drawer?.close());
}
wire('open-right', 'close-right', 'drawer-right');
wire('open-left', 'close-left', 'drawer-left');
wire('open-bottom', 'close-bottom', 'drawer-bottom');
wire('open-top', 'close-top', 'drawer-top');
wire('open-footer', 'close-footer', 'drawer-footer');
document.getElementById('cancel-footer')?.addEventListener('native:press', () => {
  document.getElementById('drawer-footer')?.close();
});
wire('open-no-escape', 'close-no-escape', 'drawer-no-escape');
wire('open-no-backdrop', 'close-no-backdrop', 'drawer-no-backdrop');
wire('open-persistent', 'close-persistent', 'drawer-persistent');

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
