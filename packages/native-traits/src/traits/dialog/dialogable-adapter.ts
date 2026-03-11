import type { TraitAdapter } from '@nonoun/native-core';
import { DialogController } from './dialog-controller.ts';

export const dialogableAdapter: TraitAdapter<DialogController> = {
  name: 'dialogable',
  create(host) {
    return new DialogController(host);
  },
  destroy(instance) { instance.destroy(); },
};
