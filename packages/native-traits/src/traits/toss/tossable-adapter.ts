import type { TraitAdapter } from '@nonoun/native-core';
import { TossController } from './toss-controller.ts';

export const tossableAdapter: TraitAdapter<TossController> = {
  name: 'tossable',
  create(host, options) {
    return new TossController(host, {
      friction: options['friction'] ? Number(options['friction']) : undefined,
      bounce: options['bounce'] !== undefined ? options['bounce'] !== 'false' : undefined,
      bounceDamping: options['bounce-damping'] ? Number(options['bounce-damping']) : undefined,
      gravity: options['gravity'] ? Number(options['gravity']) : undefined,
      spin: options['spin'] === 'true',
      returnOnEnd: options['return-on-end'] === 'true',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('friction' in options) {
      const val = options['friction'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.friction = n;
    }
    if ('bounce' in options) instance.bounce = options['bounce'] !== 'false';
    if ('bounce-damping' in options) {
      const val = options['bounce-damping'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.bounceDamping = n;
    }
    if ('gravity' in options) {
      const val = options['gravity'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.gravity = n;
    }
    if ('spin' in options) instance.spin = options['spin'] === 'true';
    if ('return-on-end' in options) instance.returnOnEnd = options['return-on-end'] === 'true';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
