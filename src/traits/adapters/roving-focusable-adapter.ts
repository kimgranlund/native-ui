import type { TraitAdapter } from '../../core/trait-registry.ts';
import { RovingFocusController } from '../roving-focus-controller.ts';

export const rovingFocusableAdapter: TraitAdapter<RovingFocusController> = {
  name: 'roving-focusable',
  create(host, options) {
    return new RovingFocusController(host, {
      selector: options['selector'] ?? undefined,
      orientation: (options['orientation'] as 'horizontal' | 'vertical' | 'both') ?? undefined,
      wrap: options['wrap'] !== 'false',
      disabled: options['disabled'] === 'true',
    });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if ('selector' in options) instance.selector = options['selector'];
    if ('orientation' in options) instance.orientation = options['orientation'] as 'horizontal' | 'vertical' | 'both';
    if ('wrap' in options) instance.wrap = options['wrap'] !== 'false';
    if ('disabled' in options) instance.disabled = options['disabled'] === 'true';
  },
};
