import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { ResizeController } from '../resize-controller.ts';

export const resizableAdapter: TraitAdapter<ResizeController> = {
  name: 'resizable',
  create(host, options) {
    return new ResizeController(host, {
      handleSelector: options['handle-selector'] ?? '',
      axis: (options['axis'] as 'horizontal' | 'vertical' | 'both') ?? 'horizontal',
      min: options['min'] ? Number(options['min']) : undefined,
      max: options['max'] ? Number(options['max']) : undefined,
      disabled: options['disabled'] === 'true',
      reverse: options['reverse'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('axis' in options) instance.axis = options['axis'] as 'horizontal' | 'vertical' | 'both';
    if ('min' in options) {
      const val = options['min'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.min = n;
    }
    if ('max' in options) {
      const val = options['max'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.max = n;
    }
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
    if ('reverse' in options) instance.reverse = options['reverse'] === 'true';
  },
};
