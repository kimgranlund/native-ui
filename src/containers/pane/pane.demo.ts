import '../../nav/native-dashboard.ts';
import './pane.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/folder.ts';
import '../../icons/phosphor/code.ts';
import '../../icons/phosphor/eye.ts';
import '../../icons/phosphor/sidebar.ts';
import '../../icons/phosphor/terminal.ts';
import '../../icons/phosphor/x.ts';
import '../../icons/phosphor/minus.ts';
import '../../icons/phosphor/caret-up.ts';
import '../../components/button/button.ts';
import '../../containers/container/container.ts';

// Event log
const log = document.getElementById('event-log');
const events = ['native:pane-close', 'native:pane-minimize', 'native:pane-restore', 'native:pane-resize'];
for (const name of events) {
  document.addEventListener(name, (e: Event) => {
    const ce = e as CustomEvent;
    const label = (ce.detail.pane as HTMLElement)?.getAttribute?.('label') ?? '';
    const line = document.createElement('div');
    line.textContent = `${name}${label ? ` — ${label}` : ''}${ce.detail.sizes ? ` sizes: [${ce.detail.sizes.map((s: number) => Math.round(s)).join(', ')}]` : ''}`;
    log?.prepend(line);
  });
}
