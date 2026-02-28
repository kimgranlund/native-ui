import type { TraitAdapter } from '../../core/trait-registry.ts';
import { SearchController } from '../search-controller.ts';

export const searchableAdapter: TraitAdapter<SearchController> = {
  name: 'searchable',
  create(host, options) {
    return new SearchController(host, {
      selector: options['selector'] ?? '',
      textField: options['text-field'] ?? undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('text-field' in options) instance.textField = options['text-field'] ?? 'textContent';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
