import type { TraitAdapter } from '../../core/trait-registry.ts';
import { CopyController } from '../copy-controller.ts';

export const copyableAdapter: TraitAdapter<CopyController> = {
  name: 'copyable',
  create(host, options) {
    return new CopyController(host, {
      value: options['value'] ?? '',
      feedbackDuration: options['feedback-duration'] ? Number(options['feedback-duration']) : undefined,
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
