import { UIElement } from '../core/ui-element.ts';
import { buildInspector } from './build-inspector.ts';

/**
 * Self-contained design system inspector.
 *
 * Stamps the full color/variable inspector UI on connection.
 * Consumer usage: `<native-tokens-inspector></native-tokens-inspector>`.
 *
 * All `native-tokens-*` sub-elements are registered by the `@nonoun/native-ui/inspector`
 * entry point as a side effect of import.
 */
export class NativeTokensInspector extends UIElement {
  setup(): void {
    super.setup();
    buildInspector(this);
  }

  teardown(): void {
    this.innerHTML = '';
    super.teardown();
  }
}
