# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@nonoun/native-ui** — Web component library with a pure CSS design system built on OKLCH color science, CSS custom property inheritance, and zero-specificity attribute selectors.

## Development Commands

```bash
npm run dev           # Start Vite dev server
npm run build         # Full build: JS (Vite lib) → CSS (concat) → types (.d.ts)
npm run build:js      # Build JS library (dist/native-ui.js + dist/kernel.js)
npm run build:css     # Build CSS bundles (foundation, components, lean variants)
npm run build:types   # Build TypeScript declarations (dist/**/*.d.ts)
npm test              # Run tests (vitest)
npm run test:watch    # Watch mode tests
npm run generate:icons  # Regenerate Phosphor icon modules
```

Build system is **Vite 8 beta** (Rolldown/OXC) in library mode. TypeScript uses `erasableSyntaxOnly` (compatible with Node `--strip-types`).

### Demo Pages

Each component has a demo HTML page. Open via Vite dev server:
- `src/styles/colors.html` — Color system demo with live sliders
- `src/styles/ui.html` — UI component showcase (all size/variant/intent combos)
- `src/components/ui-button/ui-button.html` — Button demo
- `src/components/ui-input/ui-input.html` — Input demo
- `src/components/ui-listbox/ui-listbox.html` — Listbox demo
- `src/components/ui-select/ui-select.html` — Select dropdown demo
- `src/components/ui-combobox/ui-combobox.html` — Combobox (filterable select) demo
- `src/components/ui-command/ui-command.html` — Command palette demo
- `src/icons/ui-icon.html` — Icon system demo
- `src/traits/*.html` — Trait demos (all 23 traits)

## Style Architecture (Option B: CSS-Separate)

**CSS is NOT bundled with JS.** Consumers load CSS via `<link>` or `@import`. JS modules define element behavior only.

### Distribution

```
dist/
  native-ui.js         ← JS library: components + traits + reactivity + core + icons (186 KB)
  kernel.js            ← JS library: kernel + A2UI protocol (105 KB, separate entry)
  foundation.css       ← colors + tokens + themes + base + primitives
  components.css       ← all component styles (incl. force-* debug selectors)
  components-lean.css  ← component styles WITHOUT force-* debug selectors
  native-ui.css        ← foundation + components (convenience)
  native-ui-lean.css   ← foundation + components-lean (no debug selectors)
```

**Two JS entry points:**
```ts
// Components + traits (most consumers):
import { UIButton, PressController, signal } from '@nonoun/native-ui';

// Kernel + A2UI (advanced consumers):
import { Kernel, Planner, A2UIAdapter } from '@nonoun/native-ui/kernel';
```

**CSS lean variants** strip `force-*` attribute selectors (force-hover, force-active, force-focus, force-focus-visible) — dev-only debug selectors that aren't needed in production.

### How CSS Flows

Plain `.css` files are the canonical style source. JS element classes have zero CSS awareness — no style imports, no sheet adoption, no `static sheet`.

Consumers load CSS via `<link>` or `@import`. The JS bundle defines element behavior only.

### `define()`

`src/core/define.ts` — Registers the custom element. Nothing else.

```ts
define('ui-button', UIButton);  // only calls customElements.define()
```

### Demo HTML Pattern

```html
<link rel="stylesheet" href="../../styles/index.css" />
<link rel="stylesheet" href="../../styles/components.css" />
<script type="module">
  import '../../nav/ui-layout.ts';  // dev navigation layout
  import './ui-button.ts';
</script>
```

**Trait demo pages** use a two-script pattern — traits must be registered before component `define()` calls:
```html
<!-- Script 1: Register traits BEFORE any component define() -->
<script type="module">
  import { registerAllTraits } from '../index.ts';
  registerAllTraits();
</script>
<!-- Script 2: Import components (runs after traits are registered) -->
<script type="module">
  import '../nav/ui-layout.ts';
  import '../components/ui-button/ui-button.ts';
  import '../components/ui-controller/ui-controller.ts';
</script>
```

`ui-layout.ts` (`src/nav/`) auto-injects a sidebar layout for navigating between demo pages in dev. Uses `src/nav/sitemap.json` for the page registry. Body content goes inside `<ui-layout><main>...</main></ui-layout>`.

## Cascade & Import Order

**Do NOT reorder imports in `index.css`** — the cascade depends on this exact sequence:

```
colors.primitives.css → colors.tokens.css → themes.css → ui.base.css → ui.primitives.css
```

```css
@layer colors;   /* color primitives — env params, OKLCH ramps, scrims, aliases */
@layer tokens;   /* semantic color tokens — ground, ink, border, surface */
@layer ui;       /* scales, attribute selectors, components */
```

`themes.css` is intentionally NOT in a layer — it uses `:where()` selectors at the unlayered level.

## Architecture: Three-Tier Token Model

Every value a component consumes flows through three tiers:

### Tier 1: Public (`--ui-*`)
Themeable scale definitions on `:root`. User-facing API.

### Tier 2: Local (`--_*`)
Resolved by attribute selectors. Internal, inherited via DOM.

### Tier 3: Component
Reads locals directly. No intermediate composition layer.

### Color Resolution (3 hops)
```
--accent-panel    → "what color?" (semantic token in @layer tokens)
--_panel          → "which family?" (intent selector in @layer ui)
--_background     → "what role?" (variant selector in @layer ui)
background:       → apply (component)
```

### Geometry Resolution (2 hops)
```
--ui-size-sm      → "what scale value?" (public token on :root)
--_min-height     → "what size?" (size selector)
min-height:       → apply (component)
```

### Spacing & Padding System

One space unit (`--_space`) per size scale, one multiplier (`--_space-k`) per density.

| Need | Formula |
|------|---------|
| **Block padding** | `var(--_space)` (single spacer unit) |
| **Inline padding** | `calc(var(--_space-k) * var(--_space))` (density-multiplied) |
| **Container padding** | `var(--_space)` |
| **Component gap** | `calc(var(--_space) * 2)` |
| **Nested child border-radius** | `calc(var(--_radius) - var(--_space))` |
| **Icon size** | `space × 2 + 0.75rem` |

All interactive components use `min-height: var(--_min-height)` for vertical sizing. Never use uniform `padding` — always split `padding-block` / `padding-inline`. Row items (option, command-item) use `padding-inline` only since `min-height` + `align-items: center` handles vertical.

### Control Text Defaults

`ui.base.css` sets `white-space: nowrap` on all control-like elements via a shared `:where()` selector (zero specificity). This prevents labels from line-breaking. Components that need wrapping (e.g. `ui-textarea` with `pre-wrap`) override freely since `:where()` has no specificity.

## Naming Conventions

- `--color-env-*` — color environment parameters (9 master knobs)
- `--{family}-*` — semantic color tokens (neutral, accent, info, success, warning, danger)
- `--ui-*` — public geometry/typography/animation tokens
- `--_*` — local resolved values (single underscore prefix, no namespace)

### Local Token Names Use Full CSS Property Names
```css
--_min-height      /* not --_min-h or --_size */
--_font-size       /* not --_font or --_fs */
--_space           /* spacing unit — two-tier: xs/sm=0.1875rem, md/lg/xl=0.25rem */
--_space-k         /* density multiplier: compact=2, default=4, loose=6 */
```

## Rules

- Never hard-code values in components — always read a `--_*` local
- Never use `!important`
- Never add specificity — always `:where()`
- Components must not know about sizes, families, or variants directly
- Public tokens (`--ui-*`) go on `:root`; locals (`--_*`) are set by attribute selectors
- `variant="default"` intentionally hard-codes `--neutral-*` — neutral chrome, intent-colored text

### Component Defaults (zero-attribute rendering)

Each component sets its own default variant/radius in the CSS base rule so it renders correctly with no attributes:

| Component | Default variant | Default radius | Background | Border |
|-----------|----------------|----------------|------------|--------|
| **ui-button** | `default` | `round` | `--neutral-panel` | `--neutral-border-muted` |
| **ui-input** | `secondary` | `round` | `--_control` | `--neutral-highest` |
| **ui-textarea** | `secondary` | `round` | `--_control` | `--neutral-highest` |
| **ui-listbox** | `secondary` | inherited | `--_control` | `--neutral-highest` |
| **ui-option** | `ghost` | inherited | `transparent` | none |
| **ui-option-group** | none | none | (structural `role="group"` wrapper) | none |
| **ui-command-item** | `ghost` | inherited | `transparent` | none |
| **ui-dialog** | none | none | `transparent` (full-viewport overlay) | none |

Components use the **intrinsic fallback pattern** for defaults: `background: var(--_background, var(--_control))`. When no variant attribute is present, the fallback provides the default look. When a variant selector sets `--_background`, the fallback is skipped. This avoids source-order conflicts between component CSS and `ui.primitives.css` variant selectors.

### Layout Sizing: Block vs Inline

Field-level components use **block display** so they fill available width in flex/grid layouts. Toggle widgets and decorative elements use **inline display** to shrink-wrap.

| Category | Display | Components |
|----------|---------|------------|
| **Block** (fills width) | `grid` / `flex` / `block` | ui-button, ui-input, ui-textarea, ui-listbox, ui-range, ui-segmented-control, ui-tabs, ui-accordion, ui-tree, ui-table, ui-command, ui-field, ui-slideshow, ui-breadcrumb |
| **Inline** (shrink-wraps) | `inline-flex` / `inline-grid` | ui-checkbox, ui-radio, ui-switch, ui-badge, ui-avatar, ui-pagination, ui-input-otp, ui-calendar |

**`[inline]` attribute:** Block components support `[inline]` to restore shrink-wrap sizing:
```html
<ui-button inline>Compact</ui-button>
<ui-input inline placeholder="Short">
```

### Input/Textarea Filled State

Inputs and textareas visually differentiate between empty (placeholder) and filled states using `:state(empty)` / `:not(:state(empty))`:

| State | Background | Text | Border |
|-------|-----------|------|--------|
| **Empty (rest)** | `--_control` | `--_ink` | `--neutral-highest` |
| **Empty (hover)** | `--_control-hover` | `--_ink-hover` | `--_border-muted` |
| **Filled** | `--_panel` | `--_ink-strong` | `transparent` |
| **Filled (hover)** | `--_panel-hover` | `--_ink-strong` | `transparent` |

Empty fields have a subtle border so they're discoverable; filled fields drop the border and elevate to `--_panel` ground.

### Selected State Pattern

`variant="selected"` (buttons), `[aria-selected="true"]` (options), and the segmented control indicator all use a white background with `--_ink-inverse` text — a high-contrast "pill" that stands out in both light and dark mode:

| Token | Value |
|-------|-------|
| `--_background` | `white` |
| `--_color` | `--_ink-inverse` |
| `--_border-color` | `transparent` |

**`--_ink-inverse`** resolves to `--{family}-ink-inverse` → `--{family}-11` (raw darkest ramp step, never flips with theme). This avoids the `--_ink-strong` problem where `--{family}-950` uses `light-dark()` and resolves to a light color in dark mode — invisible against a white background.

### Button `justify="spread"` (trigger mode)

`ui-button` uses `inline-grid` with `grid-template-columns: auto auto auto`. By default all columns shrink-wrap content — correct for standalone buttons. When used as a dropdown trigger (inside `ui-select`), add `justify="spread"` to switch to `auto 1fr auto` so the label fills available space and trailing icon pushes to the far edge. **Always use `justify="spread"` on trigger buttons in `<ui-select>`.**

Data-driven mode's `#stampDOM()` adds `justify="spread"` automatically.

### Input Slot Ordering

`ui-input` is `inline-flex` with `contenteditable`. Child slot elements render after `::before` (placeholder) and text nodes in DOM order. CSS `order` fixes visual positioning:
- `[slot="leading"]`: `order: -1` — renders before placeholder/text
- `[slot="trailing"]`: `order: 1` + `margin-inline-start: auto` — pushes to far right

### UITextarea (`ui-textarea`)

Multi-line text input using `contenteditable="plaintext-only"`. Form-associated.

**Attributes**: `value`, `placeholder`, `disabled`, `readonly`, `required`, `name`, `rows`, `maxlength`, `autogrow`

**Sizing**: `rows` attribute sets `min-height` via `--_rows` (default 3). Preset values: 1, 2, 4, 5, 6, 8, 10.

**Scrolling**: `overflow-y: auto` + `scrollbar-width: none` — scrolls without visible scrollbar. `resize: vertical` lets users drag to grow.

**Autogrow mode**: `[autogrow]` — JS measures `scrollHeight` → sets `--_autogrow-height`. Disables resize handle and hides overflow.

**Events**: `ui-input` (on keystroke), `ui-change` (on blur). Both carry `{ value }` detail.

**Empty state**: Tracks via `CustomStateSet` (`:state(empty)`) for CSS placeholder display via `::before`.

### Listbox Grouped Options (`ui-option-group`)

`ui-option-group` wraps a heading + child options for sidebar-navigation-style grouped lists. Follows the same pattern as `ui-command-group`.

```html
<ui-listbox>
  <ui-option-group>
    <span slot="heading"><ui-icon name="house"></ui-icon> Getting Started</span>
    <ui-option value="install">Installation</ui-option>
    <ui-option value="structure">Project Structure</ui-option>
  </ui-option-group>
  <ui-option-group>
    <span slot="heading">Other</span>
    <ui-option value="examples">Examples</ui-option>
  </ui-option-group>
</ui-listbox>
```

**Key details:**
- Element sets `role="group"` via `ElementInternals`, wires `aria-labelledby` to `[slot="heading"]`
- Heading is non-interactive (`cursor: default`, `user-select: none`), bold (`--ui-font-weight-button`)
- Vertical connector line drawn as `::after` pseudo-element on the group (not border-left on options)
- Keyboard navigation traverses across groups seamlessly (flat roving focus)
- Listbox queries use `:scope ui-option` (descendant, not direct child) to find options inside groups

**CSS alignment math — two custom properties on the group:**

| Case | `--_group-line-inset` | `--_group-child-inset` |
|------|-----------------------|------------------------|
| **No icon** | `space-k × space` | `line-inset + space × 2` |
| **With icon** (`:has()`) | `space-k × space + icon-size / 2` | `space-k × space + icon-size` |

Child options: `margin-inline-start: var(--_group-child-inset)`, `padding-inline-start: calc(var(--_space) * 2)`.

### Event Guard Pattern (`stopImmediatePropagation`)

Coordinators (`ui-select`, `ui-combobox`) catch internal `ui-change` events from their listbox and re-dispatch as their own `ui-change`. To prevent duplicate events reaching external listeners, they use `stopImmediatePropagation()` (not `stopPropagation()`) on internal events:

```ts
this.addEventListener('ui-change', (e: Event) => {
  if (e.target !== this) e.stopImmediatePropagation();
});
```

`stopPropagation()` only prevents parent propagation — same-element listeners still fire. `stopImmediatePropagation()` prevents both.

## Component File Pattern

```
src/components/ui-foo/
  ui-foo.css              ← CSS source of truth (plain CSS, @layer ui)
  ui-foo-element.ts       ← Element class (behavior only, no CSS imports)
  ui-foo.ts               ← Registration (import { define } from '../../core/define.ts')
  index.ts                ← Barrel exports
  ui-foo.html             ← Demo page
  foo-controller.ts       ← Simple reactive state (2-3 signals) — optional
  foo-store.ts            ← Complex reactive state (5+ signals, computed) — optional
```

### UISelect Data-Driven Mode

`<ui-select>` supports two modes: **manual** (author writes all children) and **data-driven** (component stamps its own children from data). Mode is detected at `setup()` time by the presence of `options` or `src` attributes.

```html
<!-- Manual mode — always use justify="spread" on trigger buttons -->
<ui-select>
  <ui-button justify="spread"><span slot="label">Pick</span><ui-icon name="caret-up-down" slot="trailing"></ui-icon></ui-button>
  <ui-listbox popover>
    <ui-option value="us">United States</ui-option>
  </ui-listbox>
</ui-select>

<!-- Data-driven: inline JSON -->
<ui-select placeholder="Pick a country" options='[{"value":"us","label":"United States"}]'></ui-select>

<!-- Data-driven: remote fetch -->
<ui-select placeholder="Pick a country" src="/api/countries"></ui-select>
```

**`SelectOption` interface:** `{ value: string; label: string; disabled?: boolean }` — exported from `src/index.ts`.

**Signal flow:**
- `options` attr → `#options` signal → effect → `#renderOptions()` → DOM
- `src` attr → `#src` signal → effect → `fetch()` → `#options` signal → same chain
- `placeholder` attr → `#placeholder` signal → effect → trigger label fallback

**Key implementation details:**
- `#stampDOM()` creates `<ui-button>` + `<ui-listbox popover>` synchronously before existing wiring runs
- `#renderOptions()` clears listbox and stamps `<ui-option>` elements from signal
- `#fetchOptions()` uses `AbortController` with stale-response guards
- Data-mode effects are inside `deferChildren()` — they only register when `#dataMode` is true
- `options` attribute must be present in HTML for data mode (not added via JS after `setup()`)
- The `options` property setter reflects to attribute as JSON

### UIDialog (`ui-dialog`)

Modal dialog wrapper. Creates a native `<dialog>` in `setup()`, moves children into it, provides `showModal()`/`close()` API. Opt-out attributes: `no-close-on-escape`, `no-close-on-backdrop`. Dispatches `close` event on close. Listens for `ui-dismiss` and native `cancel` events.

### `deferChildren` Effect Placement

`deferChildren(fn)` defers `fn` to a microtask when the element has no children yet. Effects that don't depend on children **must be registered outside `deferChildren`**, or they won't fire when signals change before the microtask runs.

```ts
// OUTSIDE deferChildren — no child dependency:
this.addEffect(() => this.syncPopover(this.#store.open.value));
this.addEffect(() => this.#internals.setFormValue(this.#store.value.value ?? ''));

// INSIDE deferChildren — needs children present:
this.deferChildren(() => {
  this.addEffect(() => { /* filter options by query */ });
  this.addEffect(() => { /* sync [active] + scrollIntoView */ });
});
```

### Signal Same-Value Skip in Effects

Signals don't notify subscribers when set to the same value. This matters when effects need to re-run after related state changes even though their primary signal didn't change. Example: `ui-command` resets `activeIndex` to 0 on every keystroke, but if it's already 0, the active-sync effect won't re-run — so the `[active]` attribute won't be applied to the new first visible item. Fix: read an additional signal (like `query`) to ensure the effect re-runs:

```ts
this.addEffect(() => {
  this.#store.query.value;          // track query to re-run after filtering
  const idx = this.#store.activeIndex.value;
  const items = this.#getVisibleItems();
  // ... sync [active] attribute
});
```

### Coordinator Pattern (ui-select, ui-combobox, ui-command)

Coordinators wire existing primitives together. They have `display: contents` (no visual presence) and wire ARIA + events between children. In **manual mode** they don't create DOM; in **data-driven mode** (when `options` or `src` is present) they stamp their own children via `#stampDOM()` before the standard wiring runs:

- CSS: `display: contents` on the coordinator, anchor positioning on the popover listbox
- JS: discovers children via `:scope >` queries, wires events (`ui-press`, `ui-select`, `ui-input`, `ui-dismiss`), drives popover via `showPopover()`/`hidePopover()`
- Events: catches internal events (e.g. `ui-select` from listbox), re-dispatches as public `ui-change`

## Wave 2 Components (Implemented)

All Wave 2 components are implemented:
- **Phase 8 (Form Infrastructure)**: `ui-field`, `ui-textarea`, `ui-range`, `ui-input-otp`
- **Phase 9 (Navigation & Disclosure)**: `ui-breadcrumb`, `ui-pagination`, `ui-drawer`, `ui-tree`
- **Phase 10 (Display & Decoration)**: `ui-avatar`, `ui-badge`

Additional components beyond roadmap: `ui-tabs`, `ui-radio`, `ui-switch`, `ui-checkbox`, `ui-accordion`, `ui-calendar`, `ui-table`, `ui-segmented-control`.

See `.claude/ROADMAP.components.md` for specs.

## Traits (`src/traits/`)

23 composable behaviors. Each trait has a **controller** (standalone class) and a **trait adapter** (for `<ui-controller>` declarative usage). Mixin wrappers were removed in the bundle optimization pass.

### Two Consumption Patterns

**1. Controller pattern** — direct instantiation for imperative APIs:
```ts
import { PopoverController, signal, effect } from '@nonoun/native-ui';
const ctrl = new PopoverController(host);
ctrl.wirePopover(anchor, panel);
effect(() => ctrl.syncPopover(open.value));
```

**2. Provider pattern** — `<ui-controller>` applies traits declaratively to children:
```html
<ui-controller traits="pressable">
  <div class="my-element">Click me</div>
</ui-controller>

<!-- With options (namespaced attributes on the controller): -->
<ui-controller traits="draggable" draggable-axis="vertical" draggable-selector=".item">
  <div><div class="item">A</div><div class="item">B</div></div>
</ui-controller>
```

### Trait Architecture

```
src/traits/
  press-controller.ts     ← Controller class
  adapters/
    pressable-adapter.ts  ← TraitAdapter for ui-controller
  register-all.ts         ← registerAllTraits() registers all 23 adapters
```

**Trait Registry** (`src/core/trait-registry.ts`): `TraitAdapter<T>` interface with `create()`, `destroy()`, optional `update()`. Registered via `registerTrait()`, looked up by `getTrait(name)`.

**`<ui-controller>`** (`src/components/ui-controller/`): Three modes — **wrapper** (default, applies to first child), **selector** (`for="..."`, applies to matching descendants with MutationObserver), **provider** (`provides="..."`, future context API). Options come from namespaced attributes on the controller element (e.g. `draggable-axis="vertical"`), not the target. An option observer calls `adapter.update()` when these attributes change.

**`registerAllTraits()`**: Must be called **before** any component `define()`. In demo HTML pages, use two separate `<script type="module">` blocks — first registers traits, second imports components.

### When to Use Which Pattern

| Pattern | Best for |
|---------|----------|
| **Controller** (direct) | All component internals and any imperative API usage. Components create controllers in `setup()` and destroy in `teardown()`. |
| **Provider** (`ui-controller`) | Declarative traits on plain HTML elements (pressable, draggable, roving-focusable, droppable, intersectable, range-selectable in drag mode) |

### Trait Reference

| Controller | Events |
|-----------|--------|
| `PressController` | `ui-press` |
| `DismissController` | `ui-dismiss` |
| `PopoverController` | — |
| `RovingFocusController` | — |
| `FocusTrapController` | — |
| `DragController` | `ui-drag-start`, `ui-drag-move`, `ui-drag-over`, `ui-drop`, `ui-drag-cancel` |
| `RangeSelectController` | `ui-range-change`, `ui-range-select` |
| `CollapsibleController` | `ui-expand`, `ui-collapse` |
| `ToastController` | `ui-toast` |
| `ValidateController` | `ui-valid`, `ui-invalid` |
| `ResizeController` | `ui-resize-start`, `ui-resize-move`, `ui-resize-end` |
| `VirtualScrollController` | `ui-virtual-change` |
| `CopyController` | `ui-copy` |
| `SortController` | `ui-sort` |
| `HoverController` | `ui-hover-start`, `ui-hover-end` |
| `DropZoneController` | `ui-drop-enter`, `ui-drop-leave`, `ui-drop` |
| `IntersectController` | `ui-intersect` |
| `SelectionController` | `ui-selection-change` |
| `SearchController` | `ui-search` |
| `ClipboardController` | `ui-clip` |
| `SwipeController` | `ui-swipe` |
| `EditController` | `ui-edit-start`, `ui-edit-end` |
| `DialogController` | `ui-dismiss` |
| `ListNavigateController` | — |

### Component Trait Usage

Components use controllers directly. All components import controllers from `../../traits/` paths:

```ts
// In ui-button-element.ts:
import { PressController } from '../../traits/press-controller.ts';
this.#press = new PressController(this, { ... });
// In teardown():
this.#press.destroy();
```

**FormAssociable** is a core mixin (not a trait). Import from `../../core/form-associable.ts`.

### Draggable Modes

`dragMode: 'drop' | 'slot'` (default `'drop'`):

- **`drop`** — highlights the hovered target (`[drag-over]` attribute). `ui-drop` detail: `{ item, target, fromIndex, toIndex }`. Consumer decides swap/replace semantics. Drop mode is for "acting on a target" — NOT for reordering. Use cases: swap (same selector for drag + drop), replace (different selectors via `dropZoneSelector` for dragging items onto roles/zones).
- **`slot`** — inserts a `<div class="drag-placeholder">` between items to indicate insertion position. Sets `[drag-slot-before]` / `[drag-slot-after]` on adjacent items. `ui-drop` detail: `{ item, fromIndex, toIndex, insertBefore: HTMLElement | null }`. Slot mode is for reordering lists.

**`dropZoneSelector`** — when set, allows drag items and drop targets to be different selectors (e.g., drag `.drag-person` onto `.drag-role`). When unset, `dragSelector` is used for both.

### RangeSelectable Modes

`rangeMode: 'drag' | 'click'` (default `'drag'`):

- **`drag`** — pointerdown starts range, pointermove extends, pointerup commits
- **`click`** — 3-phase state machine: first click picks start → hover previews range → second click captures pointer for optional drag-to-adjust → release commits. `clearRange()` resets to idle.

### PopoverController

Extends `DismissController` to handle the full popover lifecycle:
- `wirePopover(anchor, popover)` — generates `uid('anchor')`, sets `anchor-name` / `position-anchor` styles
- `syncPopover(open)` — call in an effect; handles `showPopover()` / `hidePopover()` + dismiss layer

```ts
// Usage in coordinator setup():
this.wirePopover(trigger, listbox);
this.addEffect(() => this.syncPopover(this.#controller.open.value));
this.addEventListener('ui-dismiss', () => this.#controller.hide());
```

### Popover CSS Pattern

```css
:where(ui-select) > :where(ui-listbox[popover]) {
  position: fixed;
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block;
  margin: 0.25rem 0 0;
  min-width: anchor-size(inline);
}
```

**Viewport clipping**: All anchor-positioned popovers use `position-try-fallbacks` to auto-flip when they would clip the viewport:
- **Dropdowns** (select, combobox): `flip-block` — flips above the anchor if clipping bottom
- **Tooltips**: `flip-block, flip-inline` — tries opposite side for any placement direction

**Important**: Author-layer `display` overrides UA `display: none`. Every component that sets `display` and uses `[popover]` or wraps a native `<dialog>` must add an explicit hidden rule:
```css
:where(ui-foo[popover]):not(:popover-open) { display: none; }
:where(ui-dialog) > :where(dialog):not([open]) { display: none; }
```

### Top-Layer Rendering

Native `<dialog>.showModal()` promotes to the top layer for *rendering*, but the element stays in the DOM. CSS custom properties from `:root` inherit normally — no re-declaration needed. `ui-dialog.css` and `ui-drawer.css` only reset structural UA styles (`border: none`, `background: transparent`, `width: 100vw`, etc.).

### Focus Ring Pattern

| Context | Style | Rationale |
|---------|-------|-----------|
| **Buttons** | `outline: 2px solid var(--ui-focus-ring); outline-offset: 2px` | External ring, clear separation |
| **Inputs** | `outline: 1px solid var(--ui-focus-ring); outline-offset: 0` | Border-highlight, inline field |
| **Options/items** | `outline: 2px solid var(--ui-focus-ring); outline-offset: -2px` | Inset, inside container |

All focus rings use `--ui-focus-ring` — a single global token (`var(--accent-600-scrim)`). Focus ring color is accent-based and does NOT follow intent (a danger button still has the same focus ring). This is correct UX — focus indicators should be globally consistent.

### Disabled Cascade Patterns

Every interactive component has a standard disabled pipeline built on `createDisabledEffect()` from `src/core/effects.ts`.

**Standard disabled pipeline** (used by all interactive components):
```ts
// In element class:
#disabled = signal(false);

get disabled(): boolean { return this.#disabled.value; }
set disabled(val: boolean) {
  this.#disabled.value = val;
  this.toggleAttribute('disabled', val);
}

attributeChangedCallback(name, old, val) {
  if (name === 'disabled') this.#disabled.value = val !== null;
}

// In setup():
this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
```

**What `createDisabledEffect` does:**
1. Toggles `[disabled]` attribute on host
2. Sets `aria-disabled="true"` via `setAttribute()` (NOT `internals.ariaDisabled` — CSS needs the DOM attribute)
3. Optionally manages `tabindex` (`manageTabindex: true` for standalone focusable elements)
4. Dispatches `ui-disabled` event on state change

**When to use `manageTabindex: true`:**

| Use `manageTabindex` | Don't use `manageTabindex` |
|----------------------|---------------------------|
| Standalone focusable: ui-button, ui-input, ui-textarea, ui-listbox, ui-range, ui-input-otp | Roving focus: ui-radio, ui-tab, ui-segment, ui-nav-item (managed by `ListNavigateController`) |
| | Native focus: ui-accordion-item (uses `<details>/<summary>`) |

**Coordinator cascade** (ui-select, ui-combobox): Coordinators have an additional effect that cascades disabled to children:
```ts
// After createDisabledEffect:
this.addEffect(() => {
  const val = this.#disabled.value;
  if (trigger) trigger.toggleAttribute('disabled', val);
  if (val) { /* close popover */ }
});
```

**FormAssociable integration**: `formDisabledCallback(disabled)` is called by the browser when the parent `<fieldset>` is disabled. Implementations call `onFormDisabled(disabled)` which sets the signal:
```ts
override onFormDisabled(disabled: boolean): void {
  this.#disabled.value = disabled;
}
```

**CSS disabled styling**: All disabled CSS uses `[aria-disabled="true"]` selectors (set by `createDisabledEffect`). Disabled styles use proper disabled tokens — never `opacity`:
```css
:where(ui-button)[aria-disabled="true"] {
  color: var(--_ink-disabled);
  cursor: not-allowed;
  pointer-events: none;
}
```

### Debug State Attributes (`force-*`)

Every CSS pseudo-state that changes visual appearance has a corresponding `force-*` attribute that triggers the same styles. This enables DevTools debugging, Storybook-style state demos, and visual testing without user interaction.

| Pseudo | Attribute | Components |
|--------|-----------|------------|
| `:hover` | `[force-hover]` | All interactive components |
| `:active` | `[force-active]` | ui-button, ui-option, ui-command-item, ui-tab, ui-segment |
| `:focus` | `[force-focus]` | ui-input, ui-textarea, ui-input-otp |
| `:focus-visible` | `[force-focus-visible]` | All components with focus rings |

**CSS pattern:**
```css
/* Simple: add force-* to existing selector */
:where(ui-button):hover,
:where(ui-button)[force-hover] { ... }

/* Compound: mirror each condition */
:where(ui-checkbox)[aria-checked="true"]:hover::before,
:where(ui-checkbox)[aria-checked="true"][force-hover]::before { ... }

/* Internal children: force-* on host, targets children */
:where(ui-calendar) :where(.cal-cell):hover:not(:disabled),
:where(ui-calendar[force-hover]) :where(.cal-cell):not(:disabled) { ... }
```

**Not mirrored:** `:disabled` / `[aria-disabled]` (already attribute-driven), `[pressed]` (already an attribute), `[active]` (coordinator-managed), `:popover-open` (API-controlled).

## Adding a New Component

1. Create `ui-{name}.css` in `@layer ui` with `:where()` selectors
2. Create `ui-{name}-element.ts` (behavior only, no CSS references)
3. Create `ui-{name}.ts` calling `define('ui-{name}', ElementClass)`
4. Add `@import` to `src/styles/components.css`
5. Export from `src/index.ts`

CSS paths are auto-discovered by `scripts/build-css.mjs` — no manual registration needed. The script scans `src/components/` and `src/containers/` for `ui-*.css` files.

## Testing

Tests use **Vitest + happy-dom**. Each test file requires `// @vitest-environment happy-dom` at the top.

```bash
npx vitest run                           # all tests
npx vitest run src/traits                # trait tests only
npx vitest run src/traits/__tests__/draggable.test.ts  # single file
```

`src/test-setup.ts` polyfills APIs missing in happy-dom: `attachInternals()`, `setPointerCapture()`, `releasePointerCapture()`. `document.elementFromPoint()` returns `null` in happy-dom (no layout engine) — pointer-based traits fall back to `e.target`.

## Containers (`src/containers/`)

Structural components that group, frame, and organize content. Pure CSS or minimal CE — no interactive behavior, no signals, no events, no form association.

### Elevation Model

Containers resolve `--_ground` from their elevation tier:

| Elevation | Ground token | Container / Usage |
|-----------|-------------|-------------------|
| `doc` | `--{family}-doc` | Page background |
| `body` | `--{family}-body` | Main content area |
| `control` | `--{family}-control` | Form inputs, textareas, listboxes (empty state) |
| `panel` | `--{family}-panel` | `ui-panel`, `ui-toolbar`, `ui-layout-body`, `ui-layout-chat`, filled inputs, selected items |
| `card` | `--{family}-card` | `ui-card` |
| `modal` | `--{family}-modal` | `ui-dialog` surface |

### Container Types

| Container | Implementation | Purpose |
|-----------|---------------|---------|
| `ui-divider` | CSS-only | Horizontal/vertical rule |
| `ui-stack` | CSS-only | Flex stacking with gap |
| `ui-grid` | CSS-only | CSS grid layout |
| `ui-card` | Minimal CE | Bounded surface with header/body/footer slots |
| `ui-panel` | CSS-only | Section surface (sidebar, toolbar background) |
| `ui-section` | Minimal CE | Semantic section with heading + optional collapse |
| `ui-inset` | CSS-only | Content indentation (no visual surface) |
| `ui-toolbar` | Minimal CE | Horizontal action bar with `role="toolbar"` + roving focus |

### Layout Components

Full-page layout system: collapsible/resizable sidebar + content column with breadcrumb, body, and chat panels.

```
ui-layout-sidebar              ← flex row, height: 100dvh
├── [slot="sidebar"]           ← sticky aside (resizable, collapsible to 48px icon rail)
└── [content column]           ← flex column (auto, no [slot])
    ├── ui-layout-breadcrumb   ← grid bar (leading / label / trailing slots)
    └── ui-layout-canvas       ← flex row, gap, padding — structural only (no bg/radius)
        ├── ui-layout-body     ← flex: 1, rounded, bg, scrollable
        └── ui-layout-chat     ← fixed width, rounded, bg, scrollable, resizable, hidden by default
```

| Component | Implementation | Purpose |
|-----------|---------------|---------|
| `ui-layout-sidebar` | Minimal CE | Outer layout: sidebar aside + content column. Owns `ResizeController` for both sidebar and chat. |
| `ui-layout-sidebar-header` | CSS-only | Header bar inside sidebar aside. `min-height: 54px`. |
| `ui-layout-breadcrumb` | CSS-only | Grid bar with `[slot="leading"]` / label / `[slot="trailing"]`. `min-height: 54px`. Same slot pattern as `ui-header`. |
| `ui-layout-canvas` | CSS-only | Structural flex row for body + chat. No background, no radius. |
| `ui-layout-body` | CSS-only | Scrollable content surface. `background: var(--_ground, var(--_panel))`. |
| `ui-layout-chat` | CSS-only | Right panel, hidden by default (`display: none`), shown via `[open]`. Left-edge resize handle. |

**Collapsed state** (`[collapsed]` on `ui-layout-sidebar`):
- Sidebar shrinks to 48px icon rail, resize handle hidden
- Canvas and breadcrumb drop left padding (`padding-left: 0`)

**Resize**: Sidebar uses standard `ResizeController` (right-edge handle). Chat uses `ResizeController` with `reverse: true` (left-edge handle — dragging left grows width).

**Dev layout** (`src/nav/ui-layout-element.ts`): `<ui-layout>` orchestrator that builds the layout from sitemap.json. Creates all layout components, wires collapse/expand toggle, theme toggle, chat toggle, command dialog (⌘K). Styles in `src/styles/ui-layout.css` (dev-only: icon-rail overrides, logo, search hint, breadcrumb colors, command dialog).

### Sub-Containers (`ui-header`, `ui-body`, `ui-footer`)

Composable structural elements for use inside `ui-card`, `ui-drawer`, `ui-panel`, or any flex column. All CSS-only, no JS.

| Sub-Container | Display | Key Attributes | Purpose |
|---------------|---------|---------------|---------|
| `ui-header` | `grid` (auto 1fr auto) | `align` (`center`, `end`), `sticky` | Header with leading/label/trailing slots |
| `ui-body` | `flex` column | `show-scrollbar` | Scrollable content region, fills remaining space |
| `ui-footer` | `flex` row | `justify` (`start`, `center`, `spread`), `sticky` | Footer actions, right-aligned by default |

**`ui-header` slots:** `[slot="leading"]` (col 1), `[slot="label"]` or unslotted (col 2), `[slot="trailing"]` (col 3).

**Parent-context borders:** Sub-containers are unopinionated about dividers. Parent surfaces add borders contextually:
```css
:where(ui-card) > :where(ui-header) { border-bottom: ... }
:where(ui-card) > :where(ui-footer) { border-top: ... }
```

**Drawer overflow delegation:** When `ui-body` is present inside a drawer, the panel delegates `overflow-y` to `ui-body` so header/footer stay fixed while body scrolls.

### Blocks (`src/blocks/`)

Pre-composed HTML templates using existing components and containers. NOT custom elements — copy-paste starting points for common UI patterns. Each block is a demo page organized by category (auth, account, forms, data, notifications, navigation, overlays).

## Icon System (`src/icons/`)

Phosphor-based icon system with two consumption paths:
- **Path A**: `<ui-icon name="house">` custom element with global registry
- **Path B**: Direct SVG string imports from `src/icons/icons.ts` (PascalCase: `IconCaretDown`, `IconCheck`, etc.)

Codegen: `npm run generate:icons` reads `@phosphor-icons/core` SVGs → `src/icons/phosphor/*.ts` modules.
