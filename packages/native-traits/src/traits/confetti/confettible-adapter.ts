import type { TraitAdapter } from '@nonoun/native-core';
import { ConfettiController } from './confetti-controller.ts';

export const confettibleAdapter: TraitAdapter<ConfettiController> = {
  name: 'confettible',
  create(host, options) {
    return new ConfettiController(host, {
      count: options['count'] ? Number(options['count']) : undefined,
      spread: options['spread'] ? Number(options['spread']) : undefined,
      velocity: options['velocity'] ? Number(options['velocity']) : undefined,
      gravity: options['gravity'] ? Number(options['gravity']) : undefined,
      duration: options['duration'] ? Number(options['duration']) : undefined,
      trigger: (options['trigger'] as 'click' | 'manual') ?? undefined,
      shapes: (options['shapes'] as 'square' | 'circle' | 'mixed') ?? undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('count' in options) {
      const val = options['count'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.count = n;
    }
    if ('spread' in options) {
      const val = options['spread'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.spread = n;
    }
    if ('velocity' in options) {
      const val = options['velocity'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.velocity = n;
    }
    if ('gravity' in options) {
      const val = options['gravity'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.gravity = n;
    }
    if ('duration' in options) {
      const val = options['duration'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.duration = n;
    }
    if ('trigger' in options) instance.trigger = options['trigger'] as 'click' | 'manual';
    if ('shapes' in options) instance.shapes = options['shapes'] as 'square' | 'circle' | 'mixed';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
