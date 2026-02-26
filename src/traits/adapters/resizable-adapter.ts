import type { TraitAdapter } from '../../core/trait-registry.ts';
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
    if ('min' in options) instance.min = Number(options['min']);
    if ('max' in options) instance.max = Number(options['max']);
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
    if ('reverse' in options) instance.reverse = options['reverse'] === 'true';
  },
};
