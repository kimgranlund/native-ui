import type { TraitAdapter } from '@nonoun/native-core';
import { LinkPasteController } from './link-paste-controller.ts';

export const linkPasteableAdapter: TraitAdapter<LinkPasteController> = {
  name: 'link-pasteable',
  create(host, options) {
    const input = host.querySelector('n-input, n-textarea, input, textarea') as HTMLElement;
    if (!input) return null as unknown as LinkPasteController;

    const disabled = options['disabled'] === 'true' || options['disabled'] === '';

    return new LinkPasteController(host, { input, disabled });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('disabled' in options) {
      instance.disabled = options['disabled'] === 'true' || options['disabled'] === '';
    }
  },
};
