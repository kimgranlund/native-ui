import type { TraitAdapter } from '../../core/trait-registry.ts';
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
    if ('delay' in options) instance.delay = Number(options['delay']);
    if ('leave-delay' in options) instance.leaveDelay = Number(options['leave-delay']);
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
