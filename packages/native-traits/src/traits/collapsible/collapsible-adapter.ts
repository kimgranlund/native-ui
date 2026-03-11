import type { TraitAdapter } from '@nonoun/native-core';
import { CollapsibleController } from './collapsible-controller.ts';

export const collapsibleAdapter: TraitAdapter<CollapsibleController> = {
  name: 'collapsible',
  create(host, options) {
    return new CollapsibleController(host, {
      duration: options['duration'] ? Number(options['duration']) : undefined,
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('duration' in options) {
      const val = options['duration'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.duration = n;
    }
  },
};
