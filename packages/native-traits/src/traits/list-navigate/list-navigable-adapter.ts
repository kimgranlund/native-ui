import type { TraitAdapter } from '@nonoun/native-core';
import { ListNavigateController } from './list-navigate-controller.ts';

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
  update(instance, options) {
    if ('item-selector' in options) instance.itemSelector = options['item-selector'] || ':scope > [role]';
    if ('aria-attr' in options) instance.ariaAttr = (options['aria-attr'] as 'aria-selected' | 'aria-checked' | 'aria-current') || 'aria-selected';
    if ('auto-sync' in options) instance.autoSync = options['auto-sync'] !== 'false';
  },
};
