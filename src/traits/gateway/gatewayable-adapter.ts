import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { GatewayController } from './gateway-controller.ts';

export const gatewayableAdapter: TraitAdapter<GatewayController> = {
  name: 'gatewayable',
  create(host, options) {
    return new GatewayController(host, {
      contentType: options['content-type'] ?? undefined,
    });
  },
  destroy(instance) { instance.destroy(); },
};
