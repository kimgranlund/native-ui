import type { TraitAdapter } from '@nonoun/native-core';
import { CopyController } from './copy-controller.ts';

export const copyableAdapter: TraitAdapter<CopyController> = {
  name: 'copyable',
  create(host, options) {
    return new CopyController(host, {
      // WHY: When used as a trait, default to host textContent if no explicit value
      value: options['value'] ?? (() => host.textContent?.trim() ?? ''),
      feedbackDuration: options['feedback-duration'] ? Number(options['feedback-duration']) : undefined,
      // WHY: Traits auto-trigger on click — imperative users call .copy() directly
      trigger: (options['trigger'] ?? 'click') as 'click' | false,
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('value' in options) instance.value = options['value'];
    if ('feedback-duration' in options) {
      const val = options['feedback-duration'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.feedbackDuration = n;
    }
  },
};
