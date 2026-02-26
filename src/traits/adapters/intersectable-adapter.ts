import type { TraitAdapter } from '../../core/trait-registry.ts';
import { IntersectController } from '../intersect-controller.ts';

export const intersectableAdapter: TraitAdapter<IntersectController> = {
  name: 'intersectable',
  create(host, options) {
    return new IntersectController(host, {
      threshold: options['threshold'] ? Number(options['threshold']) : undefined,
      root: options['root'] ?? null,
      margin: options['margin'] ?? undefined,
      once: options['once'] === 'true',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
};
