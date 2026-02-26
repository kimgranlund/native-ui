import type { TraitAdapter } from '../../core/trait-registry.ts';
import { ClipboardController } from '../clipboard-controller.ts';

export const clippableAdapter: TraitAdapter<ClipboardController> = {
  name: 'clippable',
  create(host, options) {
    return new ClipboardController(host, {
      selector: options['selector'] ?? '',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
