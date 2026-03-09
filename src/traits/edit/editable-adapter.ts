import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { EditController } from './edit-controller.ts';

export const editableAdapter: TraitAdapter<EditController> = {
  name: 'editable',
  create(host, options) {
    return new EditController(host, {
      trigger: (options['trigger'] as 'click' | 'dblclick') ?? undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('trigger' in options) instance.trigger = options['trigger'] as 'click' | 'dblclick';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
