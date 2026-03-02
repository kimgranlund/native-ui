import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { HoverController } from '../hover-controller.ts';

export const hoverableAdapter: TraitAdapter<HoverController> = {
  name: 'hoverable',
  create(host, options) {
    return new HoverController(host, {
      delay: options['delay'] ? Number(options['delay']) : undefined,
      leaveDelay: options['leave-delay'] ? Number(options['leave-delay']) : undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('delay' in options) {
      const val = options['delay'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.delay = n;
    }
    if ('leave-delay' in options) {
      const val = options['leave-delay'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.leaveDelay = n;
    }
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
