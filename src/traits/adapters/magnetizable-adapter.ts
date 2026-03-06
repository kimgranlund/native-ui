import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { MagnetController } from '../magnet-controller.ts';

export const magnetizableAdapter: TraitAdapter<MagnetController> = {
  name: 'magnetizable',
  create(host, options) {
    return new MagnetController(host, {
      selector: options['selector'] ?? undefined,
      threshold: options['threshold'] ? Number(options['threshold']) : undefined,
      gridSize: options['grid-size'] ? Number(options['grid-size']) : undefined,
      strength: options['strength'] ? Number(options['strength']) : undefined,
      guides: options['guides'] !== undefined ? options['guides'] !== 'false' : undefined,
      guideColor: options['guide-color'] ?? undefined,
      snapToEdges: options['snap-to-edges'] !== undefined ? options['snap-to-edges'] !== 'false' : undefined,
      snapToSiblings: options['snap-to-siblings'] !== undefined ? options['snap-to-siblings'] !== 'false' : undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('threshold' in options) {
      const val = options['threshold'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.threshold = n;
    }
    if ('grid-size' in options) {
      const val = options['grid-size'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.gridSize = n;
    }
    if ('strength' in options) {
      const val = options['strength'];
      const n = Number(val);
      if (val !== '' && !isNaN(n)) instance.strength = n;
    }
    if ('guides' in options) instance.guides = options['guides'] !== 'false';
    if ('guide-color' in options) instance.guideColor = options['guide-color'];
    if ('snap-to-edges' in options) instance.snapToEdges = options['snap-to-edges'] !== 'false';
    if ('snap-to-siblings' in options) instance.snapToSiblings = options['snap-to-siblings'] !== 'false';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
