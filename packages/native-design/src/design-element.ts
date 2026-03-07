import { NativeElement } from '@nonoun/native-ui';
import { buildTokens } from './build-design.ts';
import type { TokenSchema } from './build-design.ts';
import type { NDesignColors } from './design-colors-element.ts';
import type { NDesignVariable } from './design-variable-element.ts';

/**
 * Design system token inspector — renders token sections from a schema.
 *
 * - `schema` property — JSON-serializable `TokenSchema` describing what to
 *   render.  Falls back to `createDefaultSchema()` when unset.
 * - `family` attribute — filters visible sections ("all" or a family name).
 * - `native-design-theme-change` event (document-level) — syncs variable sliders.
 *
 * Minimal usage (default schema, host provides layout):
 * ```html
 * <native-design></native-design>
 * ```
 *
 * Custom schema (host decides what to show):
 * ```js
 * const el = document.querySelector('native-design');
 * el.schema = myCustomSchema;
 * ```
 */
export class NDesign extends NativeElement {
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
    document.addEventListener('native-design-theme-change', this.#onThemeChange);
  }

  teardown(): void {
    document.removeEventListener('native-design-theme-change', this.#onThemeChange);
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
    const sections = this.querySelectorAll<HTMLElement>('.native-design-section[data-family]');
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
      this.querySelectorAll<NDesignColors>('native-design-colors').forEach(c => c.refresh());
    });
  }

  /* ── Theme sync ── */

  #onThemeChange = (): void => {
    requestAnimationFrame(() => {
      this.querySelectorAll<NDesignVariable>('native-design-variable').forEach(v => v.sync());
    });
  };
}
