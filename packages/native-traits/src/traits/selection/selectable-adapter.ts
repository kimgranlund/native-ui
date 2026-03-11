import type { TraitAdapter } from '@nonoun/native-core';
import { SelectionController } from './selection-controller.ts';

export const selectableAdapter: TraitAdapter<SelectionController> = {
  name: 'selectable',
  create(host, options) {
    return new SelectionController(host, {
      selector: options['selector'] ?? '',
      mode: (options['mode'] as 'single' | 'multiple') ?? 'multiple',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('mode' in options) instance.mode = options['mode'] as 'single' | 'multiple';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
