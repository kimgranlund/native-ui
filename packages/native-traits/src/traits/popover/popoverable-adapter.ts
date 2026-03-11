import type { TraitAdapter } from '@nonoun/native-core';
import { PopoverController } from './popover-controller.ts';

export const popoverableAdapter: TraitAdapter<PopoverController> = {
  name: 'popoverable',
  create(host) {
    return new PopoverController(host);
  },
  destroy(instance) { instance.destroy(); },
};
