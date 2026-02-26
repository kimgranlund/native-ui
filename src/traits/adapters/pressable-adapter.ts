import type { TraitAdapter } from '../../core/trait-registry.ts';
import { PressController } from '../press-controller.ts';

export const pressableAdapter: TraitAdapter<PressController> = {
  name: 'pressable',
  create(host, options) {
    return new PressController(host, {
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
};
