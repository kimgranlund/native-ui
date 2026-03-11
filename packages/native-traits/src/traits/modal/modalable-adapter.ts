import type { TraitAdapter } from '@nonoun/native-core';
import { ModalController } from './modal-controller.ts';

export const modalableAdapter: TraitAdapter<ModalController> = {
  name: 'modalable',
  create(host, options) {
    const ctrl = new ModalController(host, {
      dismiss: options['dismiss'] !== 'false',
      focusTrap: options['focus-trap'] !== 'false',
    });
    ctrl.enable();
    return ctrl;
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('dismiss' in options) instance.dismiss = options['dismiss'] !== 'false';
    if ('focus-trap' in options) instance.focusTrap = options['focus-trap'] !== 'false';
  },
};
