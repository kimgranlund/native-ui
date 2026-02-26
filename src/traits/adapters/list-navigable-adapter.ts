import type { TraitAdapter } from '../../core/trait-registry.ts';
import { ListNavigateController } from '../list-navigate-controller.ts';

export const listNavigableAdapter: TraitAdapter<ListNavigateController> = {
  name: 'list-navigable',
  create(host, options) {
    return new ListNavigateController(host, {
      itemSelector: options['item-selector'] ?? undefined,
      ariaAttr: (options['aria-attr'] as 'aria-selected' | 'aria-checked') ?? undefined,
      autoSync: options['auto-sync'] !== 'false',
      orientation: (options['orientation'] as 'horizontal' | 'vertical' | 'both') ?? undefined,
      wrap: options['wrap'] !== 'false',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
};
