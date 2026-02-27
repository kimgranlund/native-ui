import type { TraitAdapter } from '../../core/trait-registry.ts';
import { DragController } from '../drag-controller.ts';

export const draggableAdapter: TraitAdapter<DragController> = {
  name: 'draggable',
  create(host, options) {
    return new DragController(host, {
      selector: options['selector'] ?? '',
      dropZoneSelector: options['drop-zone-selector'] ?? '',
      axis: (options['axis'] as 'vertical' | 'horizontal' | 'both') ?? 'both',
      mode: (options['mode'] as 'drop' | 'slot' | 'preview') ?? 'drop',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('drop-zone-selector' in options) instance.dropZoneSelector = options['drop-zone-selector'];
    if ('axis' in options) instance.axis = options['axis'] as 'vertical' | 'horizontal' | 'both';
    if ('mode' in options) instance.mode = options['mode'] as 'drop' | 'slot' | 'preview';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
