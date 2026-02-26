import type { TraitAdapter } from '../../core/trait-registry.ts';
import { FocusTrapController } from '../focus-trap-controller.ts';

export const focusTrappableAdapter: TraitAdapter<FocusTrapController> = {
  name: 'focus-trappable',
  create(host) {
    return new FocusTrapController(host);
  },
  destroy(instance) { instance.destroy(); },
};
