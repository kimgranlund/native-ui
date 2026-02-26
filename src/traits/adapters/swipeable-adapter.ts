import type { TraitAdapter } from '../../core/trait-registry.ts';
import { SwipeController } from '../swipe-controller.ts';

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
    if ('threshold' in options) instance.threshold = Number(options['threshold']);
    if ('velocity-threshold' in options) instance.velocityThreshold = Number(options['velocity-threshold']);
    if ('axis' in options) instance.axis = options['axis'] as 'horizontal' | 'vertical' | 'both';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
