import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/select/select.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import '../../icons/phosphor/caret-up-down.ts';
import { signal, effect } from '@nonoun/native-core';
import { PopoverController } from '../index.ts';

// ── Helper: wire a popover instance ──

function wirePopDemo(hostId, triggerId, contentId) {
  const host = document.getElementById(hostId);
  const trigger = document.getElementById(triggerId);
  const content = document.getElementById(contentId);
  const popover = new PopoverController(host);
  const open = signal(false);

  popover.wirePopover(trigger, content);

  trigger.addEventListener('native:press', () => {
    open.value = !open.value;
  });

  host.addEventListener('native:dismiss', () => {
    open.value = false;
  });

  effect(() => {
    popover.syncPopover(open.value);
  });
}

// ── Wire all popover demos ──

wirePopDemo('pop-1', 'pop-trigger-1', 'pop-content-1');
wirePopDemo('pop-2', 'pop-trigger-2', 'pop-content-2');
wirePopDemo('pop-3', 'pop-trigger-3', 'pop-content-3');

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
