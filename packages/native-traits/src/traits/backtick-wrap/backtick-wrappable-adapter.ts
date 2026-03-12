import type { TraitAdapter } from '@nonoun/native-core';
import { BacktickWrapController } from './backtick-wrap-controller.ts';

export const backtickWrappableAdapter: TraitAdapter<BacktickWrapController> = {
  name: 'backtick-wrappable',
  create(host, options) {
    const input = host.querySelector('n-input, n-textarea, input, textarea') as HTMLElement;
    if (!input) return null as unknown as BacktickWrapController;

    const disabled = options['disabled'] === 'true' || options['disabled'] === '';

    return new BacktickWrapController(host, { input, disabled });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('disabled' in options) {
      instance.disabled = options['disabled'] === 'true' || options['disabled'] === '';
    }
  },
};
