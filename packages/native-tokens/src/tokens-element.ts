import { NativeElement } from '@nonoun/native-ui';
import { buildTokens } from './build-tokens.ts';
import type { TokenSchema } from './build-tokens.ts';
import type { NTokensColors } from './tokens-colors-element.ts';
import type { NTokensVariable } from './tokens-variable-element.ts';

/**
 * Design system token inspector — renders token sections from a schema.
 *
 * - `schema` property — JSON-serializable `TokenSchema` describing what to
 *   render.  Falls back to `createDefaultSchema()` when unset.
 * - `family` attribute — filters visible sections ("all" or a family name).
 * - `native-tokens-theme-change` event (document-level) — syncs variable sliders.
 *
 * Minimal usage (default schema, host provides layout):
 * ```html
 * <native-tokens></native-tokens>
 * ```
 *
 * Custom schema (host decides what to show):
 * ```js
 * const el = document.querySelector('native-tokens');
 * el.schema = myCustomSchema;
 * ```
 */
export class NTokens extends NativeElement {
  static observedAttributes = ['family'];

  #schema: TokenSchema | undefined;

  /** JSON-serializable schema describing what to render. */
  get schema(): TokenSchema | undefined { return this.#schema; }
  set schema(val: TokenSchema | undefined) {
    this.#schema = val;
    if (this.isConnected) this.#rebuild();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'family') this.#applyFamilyFilter(val || 'all');
  }

  setup(): void {
    super.setup();
    buildTokens(this, this.#schema);

    // Apply initial family filter if attribute present
    const family = this.getAttribute('family');
    if (family) this.#applyFamilyFilter(family);

    // Listen at document level so theme controls can live anywhere
    document.addEventListener('native-tokens-theme-change', this.#onThemeChange);
  }

  teardown(): void {
    document.removeEventListener('native-tokens-theme-change', this.#onThemeChange);
    this.innerHTML = '';
    super.teardown();
  }

  #rebuild(): void {
    this.innerHTML = '';
    buildTokens(this, this.#schema);
    const family = this.getAttribute('family');
    if (family) this.#applyFamilyFilter(family);
  }

  /* ── Family filter ── */

  #applyFamilyFilter(selected: string): void {
    const sections = this.querySelectorAll<HTMLElement>('.native-tokens-section[data-family]');
    for (const section of sections) {
      const family = section.dataset.family!;
      if (selected === 'all') {
        section.hidden = false;
      } else if (family === 'env') {
        section.hidden = false;
      } else {
        section.hidden = family !== selected;
      }
    }
    // Refresh visible color strips after filter change
    requestAnimationFrame(() => {
      this.querySelectorAll<NTokensColors>('native-tokens-colors').forEach(c => c.refresh());
    });
  }

  /* ── Theme sync ── */

  #onThemeChange = (): void => {
    requestAnimationFrame(() => {
      this.querySelectorAll<NTokensVariable>('native-tokens-variable').forEach(v => v.sync());
    });
  };
}
