# Native UI — Architecture & Philosophy

## Mission

Build a production-grade web component library where **CSS is a first-class domain** — not a byproduct of JavaScript. Style and behavior are separate concerns, shipped as separate artifacts, authored in their native languages.

The system is grounded in three beliefs:

1. **The platform is enough.** Custom elements, CSS custom properties, `@layer`, `:where()`, `oklch()`, anchor positioning, `[popover]`, `<dialog>`, `ElementInternals` — the web platform now provides everything a component library needs. We use it directly, without abstraction layers.

2. **Theming is generative, not hand-picked.** A small set of environment parameters produces the entire color palette mathematically — across light and dark modes, across all semantic families, across every role a color can play.

3. **Composition over inheritance.** Behavior is assembled from single-purpose controllers (PressController, DismissController, ValidateController, DragController…) that stack cleanly because each one does exactly one thing.

---

## Separation of Concerns

CSS and JavaScript are separate domains with a clean boundary:

| Domain | Responsibility | Ships as |
|--------|---------------|----------|
| **CSS** | All visual presentation — colors, spacing, typography, layout, transitions, states | `foundation.css` + `components.css` (or lean variants) |
| **JavaScript** | All behavior — event handling, ARIA wiring, form association, reactivity, keyboard navigation | `native-ui.js` (components) + `kernel.js` (optional AI/GenUI runtime) |

JS element classes have **zero CSS awareness** — no style imports, no sheet adoption, no `static sheet`. CSS files are the **canonical source of truth** for how components look. Consumers load them independently via `<link>` or `@import`.

This separation means:
- Consumers can override any style without fighting JavaScript
- CSS can be loaded selectively (foundation only, or foundation + specific components)
- JS is split into two entry points: `native-ui.js` (components, 186 KB) and `kernel.js` (AI/GenUI runtime, 105 KB) — consumers only pay for what they use
- CSS tooling (PostCSS, linters, DevTools) works natively

---

## CSS Architecture

### Three-Tier Token Model

Every visual value a component consumes flows through three tiers. No component ever hard-codes a value.

**Tier 1 — Public tokens (`--ui-*`)** live on `:root`. These are the consumer-facing API: `--ui-size-md`, `--ui-radius-round`, `--ui-duration`. Consumers customize here.

**Tier 2 — Local tokens (`--_*`)** are resolved by attribute selectors in `ui.primitives.css`. When an element has `size="sm"`, the selector `:where([size="sm"])` sets `--_min-height`, `--_font-size`, `--_space`, and `--_radius` to the appropriate values from Tier 1. Components never read public tokens directly — they read locals.

**Tier 3 — Component CSS** reads locals and applies them: `min-height: var(--_min-height)`. No intermediate composition layer.

This indirection is the key to the system's flexibility. A button doesn't know what `size="sm"` means — it just reads `--_min-height`. The meaning of "small" is defined once, in the primitives layer, and inherited by every component.

### Color Resolution (3 hops)

```
--accent-panel   →  "what color?"   (semantic token in @layer tokens)
--_panel         →  "which family?" (intent selector in @layer ui)
--_background    →  "what role?"    (variant selector in @layer ui)
background:      →  apply           (component CSS)
```

Intent (`[intent="accent"]`) picks the color family. Variant (`[variant="primary"]`) picks the visual treatment. Component CSS reads the result. A single variant rule works across all 6 color families without duplication.

### Zero Specificity

All component selectors use `:where()` — zero specificity. This is non-negotiable. Consumers can override any component style with a single class or attribute selector. The only rules with real specificity are resets where fighting UA defaults requires it (e.g., `[hidden] { display: none }`).

### Cascade Order

```css
@layer colors;   /* color primitives — env params, OKLCH ramps, scrims, aliases */
@layer tokens;   /* semantic tokens — ground, ink, stroke, surface, outline */
@layer ui;       /* scales, attribute selectors, components */
```

`themes.css` is intentionally **not** in a layer — it uses `:where()` at the unlayered level so consumers can override it trivially.

### Spacing & Sizing

One space unit (`--_space`) per size scale, one multiplier (`--_space-k`) per density:

| Need | Formula |
|------|---------|
| Block padding | `var(--_space)` |
| Inline padding | `calc(var(--_space-k) * var(--_space))` |
| Component gap | `calc(var(--_space) * 2)` |
| Nested child radius | `calc(var(--_radius) - var(--_space))` |

All interactive components use `min-height: var(--_min-height)` for vertical sizing. Never uniform `padding` — always split block/inline. Row items (options, command items) use `padding-inline` only since `min-height` + `align-items: center` handles vertical.

---

## Color Science

### OKLCH-Based Generative Palette

The color system is **data-driven, not hand-picked**. Nine environment parameters produce the entire palette:

```
--color-env-lightness-min / max / delta   →  Lightness range
--color-env-chroma                         →  Overall saturation intensity
--color-env-chroma-k-muted / vivid / edge  →  Saturation modulation
--color-env-alpha / alpha-delta            →  Opacity baseline + step variance
```

Per-family overrides (`--color-env-hue-{family}`, `--color-env-chroma-{family}`) allow fine-tuning individual families (neutral, accent, info, success, warning, danger) while keeping the overall system coherent.

### Why OKLCH?

- **Perceptually uniform** — lightness changes look equally bright across all hues
- **Hue-independent** — changing hue doesn't shift perceived brightness (unlike HSL)
- **Gamut mapping** — generated colors are guaranteed in-gamut
- **Generative** — one algorithm, 6 families, automatic light/dark mode

### 11-Step Ramp

Each family produces an 11-step scale (050–950) with step 500 at peak chroma. The ramp is symmetric around the anchor — steps equidistant from 500 have matching perceptual weight.

### Semantic Roles

Color primitives flow into semantic tokens organized by role:

| Role | Purpose |
|------|---------|
| **Ground** | Page backgrounds at 6 elevation tiers (doc → body → control → panel → card → modal) |
| **Ink** | Text/icon colors (default, strong, muted, placeholder + state variants) |
| **Stroke** | Borders/dividers (default, muted + state variants) |
| **Surface** | Interactive fills — buttons, badges, selected states |
| **Outline** | High-contrast focus rings and active borders |

---

## JavaScript Architecture

### UIElement Base Class

The foundation is deliberately minimal:

```ts
class UIElement extends HTMLElement {
  setup(): void {}        // subclass hook — replaces connectedCallback
  teardown(): void {}     // subclass hook — replaces disconnectedCallback
  addEffect(fn): void     // auto-cleanup reactive effect
  deferChildren(fn): void // defer to microtask if no children yet
}
```

No CSS imports. No style adoption. `setup()` / `teardown()` chain via `super` for mixin compatibility. Effects registered with `addEffect()` are automatically disposed on disconnect.

### Signals & Effects

Fine-grained reactivity inspired by Solid.js:

- **Signal** — smallest unit of state. Read tracks dependency, write notifies effects.
- **Computed** — derived signal, memoized, auto-recomputed when deps change.
- **Effect** — runs when tracked signals change. Auto-tracks, returns dispose function.

No dependency arrays. No hooks rules. Signals compose naturally with the `setup()/teardown()` lifecycle.

### Reactive Properties

The `prop()` factory eliminates the repetitive signal-getter-setter-attribute pattern:

```ts
// One line replaces ~10 lines of boilerplate
#disabled = prop(this, 'disabled', { type: 'boolean' });
```

Returns `ReactiveProp<T>` with `.value` (reactive read), `.set(val)` (write + reflect to attribute), `.signal` (underlying signal for effects).

### define()

Registration is one line:

```ts
define('ui-button', UIButton);  // calls customElements.define(), nothing else
```

Idempotent. No configuration, no schema, no metadata. The class is the component.

---

## Trait System

Traits are composable behaviors delivered as **controller classes**. Each controller manages its own event listeners and cleanup:

```ts
// In component setup():
this.#press = new PressController(this, { onPress: this.#handlePress });
// In component teardown():
this.#press.destroy();
```

Components use controllers directly. For declarative usage on plain HTML elements, `<ui-controller>` applies traits via trait adapters.

**FormAssociable** is a core mixin (not a trait controller) — the one remaining mixin, used for form participation via `ElementInternals`.

### Controller Inventory (23 controllers)

| Category | Controllers |
|----------|------------|
| **Interaction** | `PressController`, `DismissController`, `HoverController` |
| **Focus** | `RovingFocusController`, `FocusTrapController`, `ListNavigateController` |
| **Overlay** | `PopoverController` (extends `DismissController`), `DialogController` |
| **Animation** | `CollapsibleController` |
| **DnD / Selection** | `DragController`, `DropZoneController`, `RangeSelectController`, `SelectionController`, `SortController` |
| **Form** | `ValidateController` |
| **Layout** | `ResizeController`, `VirtualScrollController`, `IntersectController` |
| **Content** | `CopyController`, `ClipboardController`, `SearchController`, `EditController`, `SwipeController` |
| **Feedback** | `ToastController` |

---

## Component Patterns

### File Structure

```
src/components/ui-foo/
  ui-foo.css           ← CSS source of truth (@layer ui, :where() selectors)
  ui-foo-element.ts    ← behavior only, no CSS imports
  ui-foo.ts            ← define('ui-foo', UIFoo)
  index.ts             ← barrel exports
  ui-foo.html          ← demo page
```

### Coordinator Pattern

Components like `ui-select`, `ui-combobox`, and `ui-command` are **coordinators** — they wire existing primitives together without having visual presence themselves.

- CSS: `display: contents`
- JS: discovers children, wires events, manages popover lifecycle
- Two modes: **manual** (author writes children) and **data-driven** (component stamps children from data)

### Zero-Attribute Defaults

Every component renders correctly with no attributes. Default variant, radius, background, and border are set in the CSS base rule. Attribute selectors override when present.

### Form Association

12 components use the `FormAssociable` trait with native `ElementInternals` for form participation — `setFormValue()`, `setValidity()`, disabled/reset callbacks. Validation is handled by the separate `Validatable` trait, wired through `ui-field`.

---

## Accessibility

Accessibility is structural, not an afterthought:

- **ARIA roles** via `ElementInternals` on every component (33 role assignments)
- **Keyboard navigation** via traits: RovingFocusable (arrow keys), FocusTrappable (tab confinement), Pressable (Enter/Space), Dismissable (Escape)
- **Form association** via native `ElementInternals` — components participate in `<form>` submission, reset, and validation natively
- **ARIA wiring** — `ui-field` connects `aria-labelledby` and `aria-describedby` between labels, descriptions, errors, and controls

One important constraint: `ElementInternals.ariaX` does **not** create DOM attributes. When CSS selectors depend on ARIA state (e.g., `[aria-checked="true"]`), use `setAttribute()` instead.

---

## Debug State Attributes (`force-*`)

Every CSS pseudo-state that changes visual appearance has a corresponding `force-*` attribute that triggers the same styles:

| Pseudo | Attribute |
|--------|-----------|
| `:hover` | `[force-hover]` |
| `:active` | `[force-active]` |
| `:focus` | `[force-focus]` |
| `:focus-visible` | `[force-focus-visible]` |

This enables:
- **DevTools debugging** — toggle an attribute instead of simulating mouse events
- **State demos** — show all states side-by-side in documentation
- **Visual testing** — assert CSS states without user interaction

The CSS pattern adds the attribute as an alternative selector:

```css
:where(ui-button):hover,
:where(ui-button)[force-hover] { ... }
```

For components with internal children (calendar, accordion, tree), the attribute goes on the **host** and targets children via descendant selectors:

```css
:where(ui-accordion-item) > :where(details) > :where(summary):hover,
:where(ui-accordion-item[force-hover]) > :where(details) > :where(summary) { ... }
```

States that are already attribute-driven (`[disabled]`, `[aria-disabled]`, `[pressed]`, `[active]`) don't need `force-*` mirrors — they already work by toggling the attribute directly.

---

## Principles

1. **Read a local, never a public token.** Components consume `--_*` locals. The mapping from `--ui-*` public tokens to locals happens once, in the primitives layer.

2. **Never use `!important`.** If you need it, the architecture has a bug.

3. **Never add specificity.** Always `:where()`. The consumer's single class selector should win.

4. **One controller, one job.** PressController handles press. DismissController handles dismiss. They compose; they don't overlap.

5. **CSS is the source of truth.** If you want to know how a component looks, read the `.css` file. The `.ts` file won't tell you.

6. **Attribute selectors replace classes.** `:where([size="md"])` is more semantic and self-documenting than `.size-md`.

7. **Defaults render correctly.** Drop a `<ui-button>` on a page with zero attributes. It should look right.

8. **Signals eliminate ceremony.** `prop(this, 'disabled', { type: 'boolean' })` replaces 10 lines of signal-getter-setter-attribute boilerplate.

9. **Controllers are the only trait pattern.** All 23 behaviors are delivered as standalone controller classes. Controllers encapsulate algorithms (drag, range selection, virtual scroll) in plain classes that can be tested without DOM.

10. **The platform is the framework.** Custom elements, CSS layers, popover API, anchor positioning, dialog element, ElementInternals — use the platform, don't abstract it away.

11. **Every pseudo-state has a debug attribute.** `force-hover`, `force-active`, `force-focus`, `force-focus-visible` — every visual pseudo-state can be forced via attribute for debugging and demos.

12. **Block by default, inline by opt-in.** Field-level components (`ui-button`, `ui-input`, `ui-segmented-control`) use block display (`grid`/`flex`) so they fill available width in flex/grid layouts. Add `[inline]` to restore shrink-wrap sizing. Toggle widgets (`ui-checkbox`, `ui-radio`, `ui-switch`) and decorative elements (`ui-badge`, `ui-avatar`) stay `inline-flex` because they sit next to labels or content.
