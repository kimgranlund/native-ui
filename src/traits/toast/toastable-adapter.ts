import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { ToastController } from './toast-controller.ts';

export const toastableAdapter: TraitAdapter<ToastController> = {
  name: 'toastable',
  create(host) {
    return new ToastController(host);
  },
  destroy(instance) { instance.destroy(); },
};
