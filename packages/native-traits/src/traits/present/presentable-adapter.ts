import type { TraitAdapter } from '@nonoun/native-core';
import { PresentController } from './present-controller.ts';

export const presentableAdapter: TraitAdapter<PresentController> = {
  name: 'presentable',
  create(host, options) {
    return new PresentController(host, {
      inset: options['inset'] ?? '2rem',
      closeButton: options['close-button'] !== 'false',
    });
  },
  destroy(instance) { instance.destroy(); },
};
