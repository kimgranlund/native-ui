import type { TraitAdapter } from '@nonoun/native-core';
import { DismissController } from './dismiss-controller.ts';

export const dismissableAdapter: TraitAdapter<DismissController> = {
  name: 'dismissable',
  create(host) {
    return new DismissController(host);
  },
  destroy(instance) { instance.destroy(); },
};
