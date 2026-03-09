import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { DismissController } from './dismiss-controller.ts';

export const dismissableAdapter: TraitAdapter<DismissController> = {
  name: 'dismissable',
  create(host) {
    return new DismissController(host);
  },
  destroy(instance) { instance.destroy(); },
};
