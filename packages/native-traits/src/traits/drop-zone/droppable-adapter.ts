import type { TraitAdapter } from '@nonoun/native-core';
import { DropZoneController } from './drop-zone-controller.ts';

export const droppableAdapter: TraitAdapter<DropZoneController> = {
  name: 'droppable',
  create(host, options) {
    return new DropZoneController(host, {
      accept: options['accept'] ?? undefined,
      disabled: options['disabled'] === 'true',
      multiple: options['multiple'] !== 'false',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('accept' in options) instance.accept = options['accept'];
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
    if ('multiple' in options) instance.multiple = options['multiple'] !== 'false';
  },
};
