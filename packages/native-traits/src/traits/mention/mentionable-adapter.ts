import type { TraitAdapter } from '@nonoun/native-core';
import { MentionController } from './mention-controller.ts';
import type { MentionItem } from './mention-controller.ts';

export const mentionableAdapter: TraitAdapter<MentionController> = {
  name: 'mentionable',
  create(host, options) {
    const input = host.querySelector('n-input, n-textarea, input, textarea') as HTMLElement;
    if (!input) return null as unknown as MentionController;

    let items: MentionItem[] = [];
    if (options['items']) {
      try { items = JSON.parse(options['items']); } catch { /* ignore */ }
    }

    return new MentionController(host, { input, items });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if (options['items']) {
      try {
        instance.items = JSON.parse(options['items']);
      } catch { /* ignore */ }
    }
  },
};
