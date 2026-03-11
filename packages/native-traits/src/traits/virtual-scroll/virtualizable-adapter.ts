import type { TraitAdapter } from '@nonoun/native-core';
import { VirtualScrollController } from './virtual-scroll-controller.ts';

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
    if ('item-height' in options) {
      const val = options['item-height'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.itemHeight = n;
    }
    if ('overscan' in options) {
      const val = options['overscan'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.overscan = n;
    }
  },
};
