import type { TraitAdapter } from '@nonoun/native-core';
import { FlipController } from './flip-controller.ts';

export const flippableAdapter: TraitAdapter<FlipController> = {
  name: 'flippable',
  create(host, options) {
    return new FlipController(host, {
      axis: (options['axis'] as 'x' | 'y') ?? undefined,
      duration: options['duration'] ? Number(options['duration']) : undefined,
      perspective: options['perspective'] ? Number(options['perspective']) : undefined,
      trigger: (options['trigger'] as 'click' | 'hover' | 'manual') ?? undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('axis' in options) instance.axis = options['axis'] as 'x' | 'y';
    if ('duration' in options) {
      const val = options['duration'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.duration = n;
    }
    if ('perspective' in options) {
      const val = options['perspective'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.perspective = n;
    }
    if ('trigger' in options) instance.trigger = options['trigger'] as 'click' | 'hover' | 'manual';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
