import { UIElement } from '../core/ui-element.ts';
import { buildInspector } from './build-inspector.ts';

/**
 * Self-contained design system inspector.
 *
 * Stamps the full color/variable inspector UI on connection.
 * Consumer usage: `<ds-inspector></ds-inspector>`.
 *
 * All `ds-*` sub-elements are registered by the `@nonoun/native-ui/inspector`
 * entry point as a side effect of import.
 */
export class DSInspector extends UIElement {
  setup(): void {
    super.setup();
    buildInspector(this);
  }

  teardown(): void {
    this.innerHTML = '';
    super.teardown();
  }
}
