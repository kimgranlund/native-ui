import type { TraitAdapter } from '../../registries/trait-registry.ts';
import type { ShortcutBinding } from './shortcut-controller.ts';
import { ShortcutController } from './shortcut-controller.ts';

export const shortcutableAdapter: TraitAdapter<ShortcutController> = {
  name: 'shortcutable',
  create(host, options) {
    let shortcuts: ShortcutBinding[] = [];
    if (options['shortcuts']) {
      try { shortcuts = JSON.parse(options['shortcuts']); } catch { /* ignore malformed JSON */ }
    }
    return new ShortcutController(host, {
      shortcuts,
      global: options['global'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('shortcuts' in options) {
      try {
        const shortcuts: ShortcutBinding[] = JSON.parse(options['shortcuts']);
        // WHY: No bulk-replace API — destroy and re-add
        instance.destroy();
        for (const binding of shortcuts) instance.add(binding);
      } catch { /* ignore malformed JSON */ }
    }
  },
};
