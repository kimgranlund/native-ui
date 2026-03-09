import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { ValidateController } from './validate-controller.ts';

export const validatableAdapter: TraitAdapter<ValidateController> = {
  name: 'validatable',
  create(host) {
    return new ValidateController(host);
  },
  destroy(instance) { instance.destroy(); },
};
