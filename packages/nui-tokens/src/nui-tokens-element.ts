import { UIElement } from '@nonoun/native-ui';
import { buildTokens } from './build-tokens.ts';

/**
 * Self-contained design system token inspector.
 *
 * Stamps the full color/variable inspector UI on connection.
 * Consumer usage: `<nui-tokens></nui-tokens>`.
 *
 * All `nui-tokens-*` sub-elements are registered by the `@nonoun/nui-tokens`
 * entry point as a side effect of import.
 */
export class NuiTokens extends UIElement {
  setup(): void {
    super.setup();
    buildTokens(this);
  }

  teardown(): void {
    this.innerHTML = '';
    super.teardown();
  }
}
