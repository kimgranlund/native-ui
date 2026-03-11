import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import '../../components/controller/controller.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import { ToastController } from '../index.ts';

// ── Toast Controller — attached to the main content area ──

const toaster = new ToastController(document.querySelector('main'));

// ── Intent demos ──

document.getElementById('info-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'This is an info notification.', intent: 'info' });
});
document.getElementById('success-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'Action completed successfully!', intent: 'success' });
});
document.getElementById('warning-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'Careful — this action cannot be undone.', intent: 'warning' });
});
document.getElementById('danger-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'Something went wrong. Please try again.', intent: 'danger' });
});

// ── Duration demos ──

document.getElementById('fast-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'Gone in 1 second!', intent: 'info', duration: 1000 });
});
document.getElementById('slow-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'I\'ll stick around for 10 seconds.', intent: 'info', duration: 10000 });
});
document.getElementById('sticky-btn').addEventListener('native:press', () => {
  toaster.toast({ message: 'I won\'t go away until you dismiss me.', intent: 'warning', duration: 0 });
});

// ── Batch demos ──

document.getElementById('batch-btn').addEventListener('native:press', () => {
  const intents = ['info', 'success', 'warning', 'danger', 'info'];
  intents.forEach((intent, i) => {
    setTimeout(() => {
      toaster.toast({ message: `Toast #${i + 1} (${intent})`, intent, duration: 6000 });
    }, i * 100);
  });
});
document.getElementById('clear-btn').addEventListener('native:press', () => {
  toaster.dismissAllToasts();
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
