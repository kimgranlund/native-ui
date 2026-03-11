import type { TraitAdapter } from '@nonoun/native-core';
import { SwipeController } from './swipe-controller.ts';

export const swipeableAdapter: TraitAdapter<SwipeController> = {
  name: 'swipeable',
  create(host, options) {
    return new SwipeController(host, {
      threshold: options['threshold'] ? Number(options['threshold']) : undefined,
      velocityThreshold: options['velocity-threshold'] ? Number(options['velocity-threshold']) : undefined,
      axis: (options['axis'] as 'horizontal' | 'vertical' | 'both') ?? undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('threshold' in options) {
      const val = options['threshold'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.threshold = n;
    }
    if ('velocity-threshold' in options) {
      const val = options['velocity-threshold'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.velocityThreshold = n;
    }
    if ('axis' in options) instance.axis = options['axis'] as 'horizontal' | 'vertical' | 'both';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
