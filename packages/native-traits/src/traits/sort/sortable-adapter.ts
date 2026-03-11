import type { TraitAdapter } from '@nonoun/native-core';
import { SortController } from './sort-controller.ts';

export const sortableAdapter: TraitAdapter<SortController> = {
  name: 'sortable',
  create(host, options) {
    return new SortController(host, {
      selector: options['selector'] ?? '',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'] ?? '';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
