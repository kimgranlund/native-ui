import type { TraitAdapter } from '../../core/trait-registry.ts';
import { VirtualScrollController } from '../virtual-scroll-controller.ts';

export const virtualizableAdapter: TraitAdapter<VirtualScrollController> = {
  name: 'virtualizable',
  create(host, options) {
    return new VirtualScrollController(host, {
      itemHeight: options['item-height'] ? Number(options['item-height']) : undefined,
      overscan: options['overscan'] ? Number(options['overscan']) : undefined,
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('item-height' in options) instance.itemHeight = Number(options['item-height']);
    if ('overscan' in options) instance.overscan = Number(options['overscan']);
  },
};
