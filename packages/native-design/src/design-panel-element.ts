import { NativeElement } from '@nonoun/native-ui';
import { themes, familyFilterOptions } from './build-design.ts';
import type { TokenSchema } from './build-design.ts';
import type { NDesign } from './design-element.ts';

/**
 * Stamped panel for the design token inspector.
 *
 * Creates `<n-header>` (icon, title, theme selector, family filter) and
 * `<n-body>` containing `<native-design>` directly as children.
 * The host element itself is the panel surface — style via CSS.
 *
 * Usage:
 * ```html
 * <native-design-panel></native-design-panel>
 * ```
 *
 * The host can also set a custom schema:
 * ```js
 * panel.schema = customSchema;
 * ```
 */
export class NDesignPanel extends NativeElement {
  #design: NDesign | null = null;
  #schema: TokenSchema | undefined;

  /** Pass-through to the inner `<native-design>` schema. */
  get schema(): TokenSchema | undefined { return this.#schema; }
  set schema(val: TokenSchema | undefined) {
    this.#schema = val;
    if (this.#design) this.#design.schema = val;
  }

  setup(): void {
    super.setup();

    // ── Header ──
    const header = document.createElement('n-header');
    header.setAttribute('sticky', '');

    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'palette');
    icon.setAttribute('slot', 'leading');
    header.appendChild(icon);

    const label = document.createElement('span');
    label.setAttribute('slot', 'label');
    label.textContent = 'Design Tokens';
    header.appendChild(label);

    // Content slot: theme selector + family filter
    const content = document.createElement('div');
    content.setAttribute('slot', 'content');

    const themesEl = document.createElement('native-design-themes');
    themesEl.setAttribute('data', JSON.stringify(themes));

    const filterCtrl = document.createElement('n-select');
    filterCtrl.setAttribute('size', 'xs');
    filterCtrl.setAttribute('placeholder', 'Family...');
    filterCtrl.setAttribute('options', JSON.stringify(familyFilterOptions));
    filterCtrl.setAttribute('value', 'all');

    content.append(themesEl, filterCtrl);
    header.appendChild(content);

    // ── Body ──
    const body = document.createElement('n-body');

    const tokens = document.createElement('native-design') as NDesign;
    if (this.#schema) tokens.schema = this.#schema;
    body.appendChild(tokens);
    this.#design = tokens;

    // ── Assemble ──
    this.append(header, body);

    // ── Wiring ──
    filterCtrl.addEventListener('native:change', ((e: CustomEvent) => {
      const selected = e.detail.value as string;
      tokens.setAttribute('family', selected);
    }) as EventListener);
  }

  teardown(): void {
    this.innerHTML = '';
    this.#design = null;
    super.teardown();
  }
}
