import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { PressController } from './press-controller.ts';

export const pressableAdapter: TraitAdapter<PressController> = {
  name: 'pressable',
  create(host, options) {
    const hoverEnabled = options['hover'] === 'true';
    return new PressController(host, {
      disabled: options['disabled'] === 'true',
      hover: hoverEnabled
        ? {
            delay: options['hover-delay'] ? Number(options['hover-delay']) : 0,
            leaveDelay: options['hover-leave-delay'] ? Number(options['hover-leave-delay']) : 0,
          }
        : false,
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
    if ('hover' in options) instance.hover = options['hover'] === 'true';
    if ('hover-delay' in options) {
      const n = Number(options['hover-delay']);
      if (!isNaN(n)) instance.hoverDelay = n;
    }
    if ('hover-leave-delay' in options) {
      const n = Number(options['hover-leave-delay']);
      if (!isNaN(n)) instance.hoverLeaveDelay = n;
    }
  },
};
