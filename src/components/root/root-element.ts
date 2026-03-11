import { NativeElement } from '@nonoun/native-core';

// WHY: ?inline imports resolve @import chains at build time → full flattened CSS.
// Parsed once at module level, shared by all instances via adoptedStyleSheets.
import foundationCss from '../../styles/spa/spa-app.css?inline';
import componentsCss from '../../styles/css/components.native-ui.css?inline';

const rootSheet = new CSSStyleSheet();
rootSheet.replaceSync(foundationCss + '\n' + componentsCss + '\n:host { display: block; }');

/**
 * Host container with optional shadow DOM isolation boundary.
 * @attr {'light'|'shadow'} mode - Isolation mode (default: 'light')
 */
export class NRoot extends NativeElement {

  constructor() {
    super();
    if (this.getAttribute('mode') === 'shadow') {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.adoptedStyleSheets = [rootSheet];
      shadow.innerHTML = '<slot></slot>';
    }
  }
}
