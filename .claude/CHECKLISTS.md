# Consistency & System Adherence Checklists

> Run every item on the relevant checklist before marking a roadmap item complete. These enforce the exact patterns established in Wave 1.

---

## Checklist A: Containers (CSS-only)

Applies to: `ui-divider`, `ui-stack`, `ui-grid`, `ui-inset`, `ui-panel`

### A1. File Structure
- [ ] CSS file at `src/containers/ui-{name}/ui-{name}.css`
- [ ] Demo page at `src/containers/ui-{name}/ui-{name}.html`
- [ ] No `.ts` files (pure CSS — no JavaScript)

### A2. CSS Rules
- [ ] Wrapped in `@layer ui { ... }`
- [ ] All selectors use `:where()` — zero specificity
- [ ] Selector pattern: `:where(ui-{name})` (custom element tag only)
- [ ] All values read from `--_*` locals — no hard-coded sizes, colors, or spacing
- [ ] No `!important`
- [ ] Component-scoped local tokens (e.g. `--_stack-gap`) defined in base rule
- [ ] State/variant selectors: `:where(ui-{name})[attr="value"]` or `:where(ui-{name}):where([attr])`
- [ ] Transitions use `var(--_duration) var(--_easing)`

### A3. Token Consumption
- [ ] Background: `var(--_ground)` or `var(--_background)` (from elevation model)
- [ ] Border: `var(--neutral-stroke-muted)` or `var(--_border-color)`
- [ ] Spacing: `calc(var(--_space) * N)` or `calc(var(--_space-k) * var(--_space))`
- [ ] Border radius: `var(--_radius)`
- [ ] No direct `--ui-*` or `--{family}-*` references in the component rule

### A4. Registration
- [ ] `@import` added to `src/styles/components.css` (container CSS goes alongside component CSS)
- [ ] No export needed in `src/index.ts` (CSS-only, no JS class)
  (CSS paths are auto-discovered by `scripts/build-css.mjs` — no manual step needed)

### A5. Demo Page
- [ ] `<!doctype html>` + `<html lang="en">`
- [ ] `<link rel="stylesheet" href="../../styles/index.css" />`
- [ ] `<link rel="stylesheet" href="../../styles/components.css" />`
- [ ] `<script type="module">` imports `../../nav/ui-layout.ts`
- [ ] Body: `<ui-layout><main>...</main></ui-layout>`
- [ ] Sections: Basic, Sizes, Variants/Attributes, Composition (with other components)
- [ ] Demo utility classes: `.demo-section`, `.demo-row`, `.demo-col`, `.demo-label`
- [ ] Page-level styles in `<style>` block (same pattern as component demos)

### A6. Sitemap
- [ ] Entry added to `src/nav/sitemap.json` with `"group": "Containers"`

### A7. Elevation (where applicable)
- [ ] Default `--_ground` set from correct elevation tier
- [ ] `elevation` attribute override if specified in roadmap

---

## Checklist B: Containers (Minimal CE)

Applies to: `ui-card`, `ui-section`, `ui-toolbar`

Everything from Checklist A, **plus**:

### B1. File Structure
- [ ] Element class at `src/containers/ui-{name}/ui-{name}-element.ts`
- [ ] Registration at `src/containers/ui-{name}/ui-{name}.ts`
- [ ] Barrel export at `src/containers/ui-{name}/index.ts` (if needed)

### B2. Element Class
- [ ] `import { UIElement } from '../../core/ui-element.ts'`
- [ ] Extends `UIElement` (or trait composition: `Trait(UIElement)`)
- [ ] `constructor()`: `super()` + `this.attachInternals()` (if ARIA role needed)
- [ ] `setup()`: calls `super.setup()` first, then wiring
- [ ] `teardown()`: cleanup, then `super.teardown()`
- [ ] Private fields use `#` prefix
- [ ] No signals unless absolutely necessary (containers are structural, not reactive)
- [ ] No form association

### B3. Registration
- [ ] `import { define } from '../../core/define.ts'`
- [ ] `define('ui-{name}', UI{Name})`
- [ ] `export { UI{Name} }`
- [ ] Children defined before parents if multi-element

### B4. Exports
- [ ] Element class exported from `src/index.ts`

### B5. ARIA (if applicable)
- [ ] Role set via `this.#internals.role = '{role}'` in constructor
- [ ] `aria-label` / `aria-labelledby` wiring in `setup()`

---

## Checklist C: Components (Wave 2)

Applies to: `ui-field`, `ui-textarea`, `ui-range`, `ui-input-otp`, `ui-breadcrumb`, `ui-pagination`, `ui-drawer`, `ui-tree`, `ui-avatar`, `ui-badge`

### C1. File Structure
```
src/components/ui-{name}/
  ui-{name}.css              ← CSS in @layer ui
  ui-{name}-element.ts       ← Element class
  ui-{name}.ts               ← Registration (define)
  ui-{name}.html             ← Demo page
  {name}-store.ts            ← Optional: complex state (5+ signals)
  {name}-controller.ts       ← Optional: simple reactive state
```

### C2. CSS Rules (same as A2, plus)
- [ ] Selector pattern: `:where(ui-{name})` for custom element
- [ ] Default variant/radius set in base rule (see CLAUDE.md component defaults)
- [ ] State selectors: `[aria-checked]`, `[aria-expanded]`, `[aria-disabled]`, `[pressed]`, etc.
- [ ] Pseudo-elements for decorative parts: `::before`, `::after`
- [ ] Hover: `:where(ui-{name}):hover`
- [ ] Active: `:where(ui-{name})[pressed]` or `:where(ui-{name}):active`
- [ ] Focus: `:where(ui-{name}):focus-visible` with correct ring pattern
- [ ] Disabled: `:where(ui-{name})[aria-disabled="true"]`
- [ ] Typography overrides: `--_font-weight: var(--ui-font-weight-button)` and `--_line-height: var(--ui-line-height-control)` where appropriate

### C3. Element Class
- [ ] Imports: `signal` from reactivity, `UIElement` from core, controllers from traits
- [ ] Class: `export class UI{Name} extends UIElement` (use controllers, not mixins)
- [ ] `static formAssociated = true` if form-participating
- [ ] `static observedAttributes = [...]` for reflected attributes
- [ ] `#internals: ElementInternals` with role set in constructor
- [ ] Signals: `#fieldName = signal(initialValue)`
- [ ] Getters/setters for public properties (read signal, write signal + toggleAttribute)
- [ ] `attributeChangedCallback()`: delegates to signal writes, calls `super.attributeChangedCallback?.()`
- [ ] `setup()`: `super.setup()` first, then `addEffect()` calls, then `addEventListener()` calls
- [ ] `teardown()`: `removeEventListener()` calls, then `super.teardown()`
- [ ] Events use arrow function properties: `#onPress = (): void => { ... }`
- [ ] Custom events: `new CustomEvent('ui-{verb}', { bubbles: true, composed: true, detail: {...} })`
- [ ] Form callbacks: `formDisabledCallback()`, `formResetCallback()` if form-associated
- [ ] `tabindex` set in setup if interactive: `if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0')`

### C4. Registration
- [ ] File: `import { define } from '../../core/define.ts'`
- [ ] `define('ui-{name}', UI{Name})`
- [ ] `export { UI{Name} }`
- [ ] Children registered before parents (if multi-element)

### C5. Integration Points
- [ ] `@import` added to `src/styles/components.css`
- [ ] Element class exported from `src/index.ts`
  (CSS paths are auto-discovered by `scripts/build-css.mjs` — no manual step needed)
- [ ] Store/controller/types exported from `src/index.ts` if public
- [ ] Entry added to `src/nav/sitemap.json` with `"group": "Components"`

### C6. Demo Page (same as A5, plus)
- [ ] Script imports the component's registration file: `import './ui-{name}.ts'`
- [ ] Sections: Basic, Sizes (xs through xl), Intents (all 6), Disabled, Events, Form (if applicable)
- [ ] Density demo if relevant (compact/default/loose)
- [ ] Cascading demo (parent size/intent inheritance)
- [ ] Keyboard interaction noted in description

### C7. Verification
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass (write tests if spec warrants)
- [ ] `npm run build` — clean build
- [ ] Browser: all size × intent × variant × state combos render correctly
- [ ] Browser: keyboard navigation works per ARIA spec
- [ ] Browser: screen reader announces correct roles/states

---

## Checklist D: Traits (Controller)

Applies to: all 23 trait controllers

### D1. File Structure
- [ ] `src/traits/{name}-controller.ts` — controller class
- [ ] `src/traits/adapters/{name}-adapter.ts` — TraitAdapter for `<ui-controller>` declarative usage

### D2. Controller Class Pattern
```ts
export interface {Name}Options {
  prop?: type;
  // ...
}

export class {Name}Controller {
  readonly host: HTMLElement;
  prop: type;

  #privateState = value;
  #attached = false;

  constructor(host: HTMLElement, options?: {Name}Options) {
    this.host = host;
    this.prop = options?.prop ?? default;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('event', this.#handler);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('event', this.#handler);
  }

  destroy(): void { this.detach(); }

  #handler = (e: Event): void => { ... };
}
```

### D3. Conventions
- [ ] Class name: `{Name}Controller` (PascalCase + Controller suffix)
- [ ] Options interface: `{Name}Options` (exported)
- [ ] Event handlers use arrow-function properties (auto-bind): `#handler = (e: Event): void => { ... }`
- [ ] Events: `new CustomEvent('ui-{verb}', { bubbles: true, composed: true, detail: {...} })`
- [ ] Attributes: `this.host.toggleAttribute('{name}', value)` / `this.host.setAttribute()` / `this.host.removeAttribute()`
- [ ] Cleanup: all timers cleared, all listeners removed in `destroy()`
- [ ] Idempotent `attach()` / `detach()` with `#attached` guard
- [ ] Check `host.disabled` property (not attribute) when checking disabled state

### D4. Exports
- [ ] Controller class exported from `src/traits/index.ts`
- [ ] Options type exported from `src/traits/index.ts`
- [ ] Both exported from `src/index.ts` (via traits barrel)

### D5. Adapter
- [ ] Adapter file at `src/traits/adapters/{name}-adapter.ts`
- [ ] Implements `TraitAdapter<{Name}Controller>` with `create()`, `destroy()`, optional `update()`
- [ ] Registered in `src/traits/register-all.ts`

### D6. Demo Page
- [ ] `src/traits/{name}.html`
- [ ] Same HTML structure as component demos
- [ ] Entry in `src/nav/sitemap.json` with `"group": "Traits"`
- [ ] Uses two-script pattern: `registerAllTraits()` in script 1, component imports in script 2

---

## Checklist F: Blocks

Applies to: all 18 block templates

### F1. File Structure
- [ ] `src/blocks/{category}/{block-name}/{block-name}.html`
- [ ] No `.ts` files, no `.css` files (uses existing component/container styles only)

### F2. HTML Template
- [ ] `<!doctype html>` + `<html lang="en">`
- [ ] `<link rel="stylesheet" href="../../../styles/index.css" />`
- [ ] `<link rel="stylesheet" href="../../../styles/components.css" />`
- [ ] Script imports only existing component registrations + `ui-layout.ts`
- [ ] No new CSS classes except minimal page-level layout
- [ ] All layout via existing containers (`ui-stack`, `ui-grid`, `ui-card`, etc.)
- [ ] All interactivity via existing components
- [ ] Body: `<ui-layout><main>...</main></ui-layout>`

### F3. Content
- [ ] Realistic placeholder content (names, emails, amounts — not lorem ipsum)
- [ ] All variants from roadmap spec (e.g., centered card + split layout for auth-login)
- [ ] Responsive — works at mobile and desktop widths
- [ ] Accessible — proper heading hierarchy, form labels, ARIA

### F4. Registration
- [ ] Entry in `src/nav/sitemap.json` with `"group": "Blocks"` and subcategory
- [ ] No changes to `components.css`, `build-css.mjs`, or `index.ts`

---

## Quick Reference: Common Mistakes

| Mistake | Rule | Fix |
|---------|------|-----|
| Hard-coded `0.5rem` in CSS | A2/C2 | Use `calc(var(--_space) * 2)` |
| `[size="sm"]` without `:where()` | A2/C2 | `:where([size="sm"])` |
| `color: #333` | A3/C2 | `color: var(--_ink)` |
| `import { css }` in container | A1 | CSS-only containers have no JS |
| Missing `destroy()` in teardown | D3 | Always call `controller.destroy()` in `teardown()` |
| Signal in container CE | B2 | Containers are structural, not reactive |
| New CSS file for block | F2 | Blocks use only existing styles |
| Missing sitemap entry | A6/C5/D6/F4 | Always add to sitemap.json |
| `this.#internals.ariaChecked` | C3 | Use `setAttribute('aria-checked')` so CSS selectors match |
| Using mixin pattern | D2 | Mixins removed — use controllers only |

---

> **Version:** 2.0.0
> **Last updated:** 2026-02-25
