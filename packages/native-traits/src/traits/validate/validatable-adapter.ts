import type { TraitAdapter } from '@nonoun/native-core';
import { ValidateController } from './validate-controller.ts';

export const validatableAdapter: TraitAdapter<ValidateController> = {
  name: 'validatable',
  create(host) {
    return new ValidateController(host);
  },
  destroy(instance) { instance.destroy(); },
};
