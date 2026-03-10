const dialog = document.getElementById('palette-dialog') as HTMLDialogElement & { showModal(): void; close(): void };
const command = document.getElementById('palette-command') as HTMLElement;

// Open via button
document.getElementById('open-palette')!.addEventListener('native:press', () => {
  dialog.showModal();
  // Focus the input after dialog opens
  requestAnimationFrame(() => {
    const input = command.querySelector('input');
    if (input) input.focus();
  });
});

// Open via Ctrl+K global shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    dialog.showModal();
    requestAnimationFrame(() => {
      const input = command.querySelector('input');
      if (input) input.focus();
    });
  }
});

// Close dialog on command selection
command.addEventListener('native:change', (_e) => {
  dialog.close();
});

// Close dialog on Escape (native:dismiss from command)
command.addEventListener('native:dismiss', () => {
  dialog.close();
});
