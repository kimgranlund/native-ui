import { NativeElement, define, ToastController } from '../../../index.ts';

// Custom element with ToastController to host toast calls
class ToastDemo extends NativeElement {
  #toaster!: ToastController;
  setup() {
    super.setup();
    this.#toaster = new ToastController(this);
  }
  toast(options: Parameters<ToastController['toast']>[0]) { return this.#toaster.toast(options); }
  dismissAllToasts() { this.#toaster.dismissAllToasts(); }
  teardown() { this.#toaster.destroy(); super.teardown(); }
}
define('toast-demo', ToastDemo);

const host = document.createElement('toast-demo') as ToastDemo;
document.body.appendChild(host);

// Intent variant buttons
document.getElementById('toast-default')!.addEventListener('native:press', () => {
  host.toast({ message: 'This is a default notification.' });
});
document.getElementById('toast-info')!.addEventListener('native:press', () => {
  host.toast({ message: 'A new version is available. Refresh to update.', intent: 'info' });
});
document.getElementById('toast-success')!.addEventListener('native:press', () => {
  host.toast({ message: 'Project saved successfully!', intent: 'success' });
});
document.getElementById('toast-warning')!.addEventListener('native:press', () => {
  host.toast({ message: 'Your session will expire in 5 minutes.', intent: 'warning' });
});
document.getElementById('toast-danger')!.addEventListener('native:press', () => {
  host.toast({ message: 'Failed to delete the resource. Please try again.', intent: 'danger' });
});

// Long message
document.getElementById('toast-long')!.addEventListener('native:press', () => {
  host.toast({
    message: 'This is a much longer toast notification message designed to test how the toast component handles multi-line content and text wrapping behavior within the container.',
    intent: 'info',
    duration: 8000,
  });
});

// Non-dismissible (sticky) toast
document.getElementById('toast-sticky')!.addEventListener('native:press', () => {
  host.toast({
    message: 'This toast will not auto-dismiss. You must close it manually.',
    intent: 'warning',
    duration: 0,
  });
});

// Batch spawn
document.getElementById('toast-batch')!.addEventListener('native:press', () => {
  const intents = ['info', 'success', 'warning', 'danger', 'info'] as const;
  const messages = [
    'Syncing project data...',
    'Build completed in 2.3s.',
    'Disk usage above 80%.',
    'Connection lost to server.',
    'Deployment queued for review.',
  ];
  intents.forEach((intent, i) => {
    setTimeout(() => {
      host.toast({ message: messages[i], intent, duration: 6000 });
    }, i * 150);
  });
});

// Dismiss all
document.getElementById('toast-clear')!.addEventListener('native:press', () => {
  host.dismissAllToasts();
});
