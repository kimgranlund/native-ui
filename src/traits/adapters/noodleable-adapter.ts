import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { NoodleController } from '../noodle-controller.ts';

export const noodleableAdapter: TraitAdapter<NoodleController> = {
  name: 'noodleable',
  create(host, options) {
    return new NoodleController(host, {
      selector: options['selector'] ?? undefined,
      editable: options['editable'] === 'true',
      color: options['color'] ?? undefined,
      strokeWidth: options['stroke-width'] ? Number(options['stroke-width']) : undefined,
      tension: options['tension'] ? Number(options['tension']) : undefined,
      showPorts: options['show-ports'] !== undefined ? options['show-ports'] !== 'false' : undefined,
      portSize: options['port-size'] ? Number(options['port-size']) : undefined,
      style: (options['style'] as 'bezier' | 'step' | 'straight') ?? undefined,
      animated: options['animated'] === 'true',
      connections: options['connections'] ? JSON.parse(options['connections']) : undefined,
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('editable' in options) instance.editable = options['editable'] === 'true';
    if ('color' in options) instance.color = options['color'];
    if ('stroke-width' in options) {
      const n = Number(options['stroke-width']);
      if (!isNaN(n)) instance.strokeWidth = n;
    }
    if ('tension' in options) {
      const n = Number(options['tension']);
      if (!isNaN(n)) instance.tension = n;
    }
    if ('show-ports' in options) instance.showPorts = options['show-ports'] !== 'false';
    if ('port-size' in options) {
      const n = Number(options['port-size']);
      if (!isNaN(n)) instance.portSize = n;
    }
    if ('style' in options) instance.style = options['style'] as 'bezier' | 'step' | 'straight';
    if ('animated' in options) instance.animated = options['animated'] === 'true';
    if ('connections' in options) {
      try { instance.setConnections(JSON.parse(options['connections'])); } catch { /* ignore bad JSON */ }
    }
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
