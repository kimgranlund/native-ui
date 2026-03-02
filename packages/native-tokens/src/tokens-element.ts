import { NativeElement } from '@nonoun/native-ui';
import { buildTokens } from './build-tokens.ts';

/**
 * Self-contained design system token inspector.
 *
 * Stamps the full color/variable inspector UI on connection.
 * Consumer usage: `<native-tokens></native-tokens>`.
 *
 * All `native-tokens-*` sub-elements are registered by the `@nonoun/native-tokens`
 * entry point as a side effect of import.
 */
export class NTokens extends NativeElement {
  setup(): void {
    super.setup();
    buildTokens(this);
  }

  teardown(): void {
    this.innerHTML = '';
    super.teardown();
  }
}
