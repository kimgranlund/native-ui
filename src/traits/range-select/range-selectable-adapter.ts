import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { RangeSelectController } from './range-select-controller.ts';

export const rangeSelectableAdapter: TraitAdapter<RangeSelectController> = {
  name: 'range-selectable',
  create(host, options) {
    return new RangeSelectController(host, {
      selector: options['selector'] ?? '',
      mode: (options['mode'] as 'drag' | 'click') ?? 'drag',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('mode' in options) instance.mode = options['mode'] as 'drag' | 'click';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
