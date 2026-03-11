import type { TraitAdapter } from '@nonoun/native-core';
import { IntersectController } from './intersect-controller.ts';

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
  update(instance, options) {
    // threshold/margin/root: IntersectionObserver options can't be changed — detach and reattach
    const needsReattach = 'threshold' in options || 'margin' in options || 'root' in options;
    if (needsReattach) {
      instance.detach();
      if ('threshold' in options) {
        const val = options['threshold'];
        const n = Number(val);
        if (val !== '' && !isNaN(n)) instance.threshold = n;
      }
      if ('margin' in options) instance.margin = options['margin'] ?? instance.margin;
      if ('root' in options) instance.root = options['root'] ?? instance.root;
      if (!instance.disabled) instance.attach();
      return;
    }
    if ('disabled' in options) {
      instance.disabled = options['disabled'] === 'true';
      if (instance.disabled) instance.detach();
      else instance.attach();
    }
    if ('once' in options) instance.once = options['once'] === 'true';
  },
};
