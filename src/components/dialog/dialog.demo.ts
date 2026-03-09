import '../../nav/native-dashboard.ts';
import '../button/button.ts';
import '../input/input.ts';
import '../field/field.ts';
import './dialog.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

function wire(openId, dialogId, closeIds) {
  const dialog = document.getElementById(dialogId);
  document.getElementById(openId).addEventListener('native:press', () => dialog.showModal());
  for (const id of closeIds) {
    document.getElementById(id).addEventListener('native:press', () => dialog.close());
  }
}

wire('open-basic', 'basic-dialog', ['basic-cancel', 'basic-confirm']);
wire('open-form', 'form-dialog', ['form-cancel', 'form-save']);
wire('open-persistent', 'persistent-dialog', ['persistent-close']);
wire('open-no-esc', 'no-esc-dialog', ['no-esc-close']);
wire('open-danger', 'danger-dialog', ['danger-cancel', 'danger-confirm']);

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
