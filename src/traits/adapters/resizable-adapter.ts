import type { TraitAdapter } from '../../registries/trait-registry.ts';
import type { HandlePosition } from '../resize-controller.ts';
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
      handleMode: (options['handle-mode'] as 'edge' | 'corner') ?? 'edge',
      handles: options['handles']
        ? options['handles'].split(/\s+/) as HandlePosition[]
        : undefined,
      minWidth: options['min-width'] ? Number(options['min-width']) : undefined,
      maxWidth: options['max-width'] ? Number(options['max-width']) : undefined,
      minHeight: options['min-height'] ? Number(options['min-height']) : undefined,
      maxHeight: options['max-height'] ? Number(options['max-height']) : undefined,
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
    if ('handle-mode' in options) instance.handleMode = (options['handle-mode'] as 'edge' | 'corner') ?? 'edge';
    if ('handles' in options) {
      const val = options['handles'];
      if (val) instance.handles = val.split(/\s+/) as HandlePosition[];
    }
    if ('min-width' in options) {
      const val = options['min-width'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.minWidth = n;
    }
    if ('max-width' in options) {
      const val = options['max-width'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.maxWidth = n;
    }
    if ('min-height' in options) {
      const val = options['min-height'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.minHeight = n;
    }
    if ('max-height' in options) {
      const val = options['max-height'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.maxHeight = n;
    }
  },
};
