import { NativeElement } from '@nonoun/native-ui';
import { themes, familyFilterOptions } from './build-tokens.ts';
import type { TokenSchema } from './build-tokens.ts';
import type { NTokens } from './tokens-element.ts';

/**
 * Stamped panel for the design token inspector.
 *
 * Creates `<n-header>` (icon, title, theme selector, family filter) and
 * `<n-body>` containing `<native-tokens>` directly as children.
 * The host element itself is the panel surface — style via CSS.
 *
 * Usage:
 * ```html
 * <native-tokens-panel></native-tokens-panel>
 * ```
 *
 * The host can also set a custom schema:
 * ```js
 * panel.schema = customSchema;
 * ```
 */
export class NTokensPanel extends NativeElement {
  #tokens: NTokens | null = null;
  #schema: TokenSchema | undefined;

  /** Pass-through to the inner `<native-tokens>` schema. */
  get schema(): TokenSchema | undefined { return this.#schema; }
  set schema(val: TokenSchema | undefined) {
    this.#schema = val;
    if (this.#tokens) this.#tokens.schema = val;
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

    const themesEl = document.createElement('native-tokens-themes');
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

    const tokens = document.createElement('native-tokens') as NTokens;
    if (this.#schema) tokens.schema = this.#schema;
    body.appendChild(tokens);
    this.#tokens = tokens;

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
    this.#tokens = null;
    super.teardown();
  }
}
