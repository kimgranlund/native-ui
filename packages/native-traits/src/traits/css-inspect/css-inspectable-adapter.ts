import type { TraitAdapter } from '@nonoun/native-core';
import { CSSInspectController } from './css-inspect-controller.ts';

export const cssInspectableAdapter: TraitAdapter<CSSInspectController> = {
  name: 'css-inspectable',
  create(host, options) {
    return new CSSInspectController(host, {
      depth: options['depth'] ? Number(options['depth']) : undefined,
      scale: options['scale'] ? Number(options['scale']) : undefined,
      maxTilt: options['max-tilt'] ? Number(options['max-tilt']) : undefined,
      tiltRadius: options['tilt-radius'] ? Number(options['tilt-radius']) : undefined,
      perspective: options['perspective'] ? Number(options['perspective']) : undefined,
      labels: options['labels'] !== undefined ? options['labels'] !== 'false' : undefined,
      recursive: options['recursive'] !== undefined ? options['recursive'] !== 'false' : undefined,
      pick: options['pick'] !== undefined ? options['pick'] !== 'false' : undefined,
      alwaysReady: options['always-ready'] !== undefined ? options['always-ready'] !== 'false' : undefined,
      dismissOnClickOutside: options['dismiss-on-click-outside'] !== undefined ? options['dismiss-on-click-outside'] !== 'false' : undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('depth' in options) {
      const n = Number(options['depth']);
      if (!isNaN(n)) instance.depth = n;
    }
    if ('scale' in options) {
      const n = Number(options['scale']);
      if (!isNaN(n)) instance.scale = n;
    }
    if ('max-tilt' in options) {
      const n = Number(options['max-tilt']);
      if (!isNaN(n)) instance.maxTilt = n;
    }
    if ('tilt-radius' in options) {
      const n = Number(options['tilt-radius']);
      if (!isNaN(n)) instance.tiltRadius = n;
    }
    if ('perspective' in options) {
      const n = Number(options['perspective']);
      if (!isNaN(n)) instance.perspective = n;
    }
    if ('labels' in options) instance.labels = options['labels'] !== 'false';
    if ('recursive' in options) instance.recursive = options['recursive'] !== 'false';
    if ('pick' in options) instance.pick = options['pick'] !== 'false';
    if ('always-ready' in options) instance.alwaysReady = options['always-ready'] !== 'false';
    if ('dismiss-on-click-outside' in options) instance.dismissOnClickOutside = options['dismiss-on-click-outside'] !== 'false';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
