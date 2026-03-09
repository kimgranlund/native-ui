import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { PopoverController } from './popover-controller.ts';

export const popoverableAdapter: TraitAdapter<PopoverController> = {
  name: 'popoverable',
  create(host) {
    return new PopoverController(host);
  },
  destroy(instance) { instance.destroy(); },
};
