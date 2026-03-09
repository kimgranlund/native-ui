import '../../nav/native-dashboard.ts';

import '../../components/button/button.ts';
import '../../components/drawer/drawer.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/dots-three.ts';
import '../../icons/phosphor/caret-left.ts';
import '../../icons/phosphor/x.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/file-text.ts';
import '../../icons/phosphor/check.ts';

// Drawer demo
const drawer = document.getElementById('drawer-demo');
document.getElementById('open-drawer').addEventListener('native:press', () => drawer.show());
document.getElementById('close-drawer').addEventListener('native:press', () => drawer.close());
document.getElementById('cancel-drawer').addEventListener('native:press', () => drawer.close());

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
