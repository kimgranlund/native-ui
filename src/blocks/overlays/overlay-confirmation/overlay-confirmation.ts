function wire(openId: string, dialogId: string, closeIds: string[]) {
  const dialog = document.getElementById(dialogId) as HTMLDialogElement & { showModal(): void; close(): void };
  document.getElementById(openId)!.addEventListener('native:press', () => dialog.showModal());
  for (const id of closeIds) {
    document.getElementById(id)!.addEventListener('native:press', () => dialog.close());
  }
}

wire('open-info', 'info-dialog', ['info-cancel', 'info-confirm']);
wire('open-warning', 'warning-dialog', ['warning-discard', 'warning-save']);
wire('open-danger', 'danger-dialog', ['danger-cancel', 'danger-confirm']);
