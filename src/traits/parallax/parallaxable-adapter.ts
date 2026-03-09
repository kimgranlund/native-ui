import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { ParallaxController } from './parallax-controller.ts';

export const parallaxableAdapter: TraitAdapter<ParallaxController> = {
  name: 'parallaxable',
  create(host, options) {
    return new ParallaxController(host, {
      maxTilt: options['max-tilt'] ? Number(options['max-tilt']) : undefined,
      perspective: options['perspective'] ? Number(options['perspective']) : undefined,
      speed: options['speed'] ? Number(options['speed']) : undefined,
      scale: options['scale'] ? Number(options['scale']) : undefined,
      glare: options['glare'] === 'true',
      glareOpacity: options['glare-opacity'] ? Number(options['glare-opacity']) : undefined,
      gyroscope: options['gyroscope'] === 'true',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('max-tilt' in options) {
      const val = options['max-tilt'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.maxTilt = n;
    }
    if ('perspective' in options) {
      const val = options['perspective'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.perspective = n;
    }
    if ('speed' in options) {
      const val = options['speed'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.speed = n;
    }
    if ('scale' in options) {
      const val = options['scale'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.scale = n;
    }
    if ('glare' in options) instance.glare = options['glare'] === 'true';
    if ('glare-opacity' in options) {
      const val = options['glare-opacity'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.glareOpacity = n;
    }
    if ('gyroscope' in options) instance.gyroscope = options['gyroscope'] === 'true';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
