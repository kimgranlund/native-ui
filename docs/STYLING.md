# Styling

How to style native-ui components. The cardinal rule: **use attributes for component appearance, CSS for page layout.**

## Loading Styles

CSS is **not bundled with JS** — you must load both separately. The design system, component styles, and element behavior are decoupled by design.

### Quick Start (single package)

| Context | CSS | JS |
|---------|-----|-----|
| **SPA (bundler)** | `@import '@nonoun/native-ui/css';` in your CSS | `import '@nonoun/native-ui/register';` |
| **SSR (Astro)** | `<style is:global>@import '@nonoun/native-ui/css';</style>` | `import '@nonoun/native-ui/register';` in a client script |
| **CDN** | `<link href="https://esm.sh/@nonoun/native-ui@latest/dist/native-ui.css">` | `<script type="module">import 'https://esm.sh/@nonoun/native-ui@latest/register';</script>` |

For production, use the lean bundle (`@nonoun/native-ui/css/lean`) which strips `force-*` debug selectors.

### Multi-Package CSS Order

When using extension packages, **load CSS in this order** — foundation first, then components, then extensions:

```css
/* 1. Foundation: colors, tokens, themes, base */
@import '@nonoun/native-ui/css/foundation';

/* 2. Core component styles */
@import '@nonoun/native-ui/css/components';

/* 3. Extension packages (any order among themselves) */
@import '@nonoun/native-dashboard/css';        /* sidebar layout */
@import '@nonoun/native-chat/css';       /* chat components */
@import '@nonoun/native-codemirror/css'; /* CodeMirror integration */

/* 4. Your page/app CSS last */
@import './app.css';
```

Or use the convenience bundle for steps 1+2: `@import '@nonoun/native-ui/css';`

### JS Registration

Register elements before using them. Traits must be registered before component definitions:

```js
// SPA or Astro setup script
import { registerAllTraits } from '@nonoun/native-ui';
registerAllTraits(); // optional: only if using <n-controller>

import '@nonoun/native-ui/register';
import '@nonoun/native-chat/register';  // extension packages
```

### CSS Entry Points

| Specifier | Contents |
|-----------|----------|
| `@nonoun/native-ui/css` | Foundation + all component styles (convenience) |
| `@nonoun/native-ui/css/lean` | Same without `force-*` debug selectors (production) |
| `@nonoun/native-ui/css/foundation` | Colors, tokens, themes, base, primitives only |
| `@nonoun/native-ui/css/components` | Component styles only (requires foundation loaded first) |
| `@nonoun/native-chat/css` | Chat component styles |
| `@nonoun/native-dashboard/css` | App shell + sidebar styles |

### Key Rules

- **CSS load order matters.** Foundation must come before components. Extension CSS must come after core.
- **Bundlers resolve bare specifiers** in `@import`. `<link>` tags do **not** resolve npm packages — use full paths or a CDN.
- **No shadow DOM.** All styling flows through CSS custom properties and light-DOM selectors. This means your CSS cascade matters.
- **`color-scheme: light dark`** must be set on `:root`. The design system uses `light-dark()` for automatic dark mode — if your project overrides `color-scheme`, the entire palette breaks.

See [SETUP.md](SETUP.md) for complete SPA, SSR, and CDN setup instructions. See [PACKAGES.md](PACKAGES.md) for the full package ecosystem.

---

## Decision Tree

| You want to... | Use | Not |
|----------------|-----|-----|
| Change button color | `intent="accent"` | `n-button { background: blue }` |
| Change button style | `variant="primary"` | `n-button { border: none }` |
| Change element size | `size="lg"` | `n-button { padding: 1rem; font-size: 1.2rem }` |
| Change corner shape | `radius="sharp"` | `n-button { border-radius: 0 }` |
| Tighten spacing | `density="compact"` | `n-button { padding: 0.25rem }` |
| Make a button fill width | _(default behavior)_ | `n-button { width: 100% }` |
| Shrink-wrap a button | `inline` | `n-button { display: inline-flex }` |
| Color a whole section | `<div intent="danger">` on parent | Per-element `intent` or CSS overrides |
| Change the global palette | `--n-env-hue-accent: 280` on `:root` | Overriding individual color steps |
| Apply a theme | `<html theme="forest">` | Class-based theme toggling |
| Space out components | CSS on a **wrapper** (`gap`, `margin`) | CSS on the components themselves |
| Build a grid of cards | CSS Grid on a **wrapper** | CSS on `n-card` |
| Hide an element | `hidden` attribute | `n-button { display: none }` |

## Three Layers of Styling

### Layer 1: Component Attributes (use this first)

Every visual property has an attribute. Combine freely:

```html
<n-button variant="primary" intent="accent" size="lg" density="compact" radius="rounded">
  Save
</n-button>
```

| Attribute | Values | Controls |
|-----------|--------|----------|
| `variant` | `default`, `primary`, `secondary`, `ghost`, `outline`, `selected`, `plain` | Chrome (bg, border, text contrast) |
| `intent` | `neutral`, `accent`, `info`, `success`, `warning`, `danger` | Color family (inherits to children) |
| `size` | `xs`, `sm`, `md`, `lg`, `xl` | Height, font-size, padding, icon size |
| `density` | `compact`, _(default)_, `loose` | Horizontal padding multiplier |
| `radius` | `sharp`, `rounded`, `round` | Corner rounding |
| `inline` | boolean | Shrink-wrap instead of fill width |
| `disabled` | boolean | Disabled state |

These attributes work on all interactive components (`n-button`, `n-input`, `n-textarea`, `n-select`, `n-tabs`, etc.). `intent` inherits via CSS custom properties, so setting it on a parent colors all children.

### Layer 2: Token Overrides (for theming and sections)

Override `--n-*` tokens on a **parent container** to restyle a section:

```css
/* Good: token override on a parent, scoped to a section */
.hero-section {
  --n-background: var(--n-surface);
  --n-color: var(--n-surface-ink);
}

/* Good: global theme via env params */
:root {
  --n-env-hue-accent: 280;
  --n-env-chroma-neutral: 0.3;
}
```

Token overrides are for **theming** — changing what the design system values resolve to. Not for overriding individual component geometry (padding, font-size, border-radius).

### Layer 3: Page Layout CSS (for composition)

Write CSS for **spacing, positioning, and layout** between components. Target wrappers and containers, not component internals:

```css
/* Good: layout CSS on wrappers */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Good: margin between sibling components */
.sidebar n-button + n-button {
  margin-top: 0.25rem;
}
```

## Anti-Patterns

### Don't override component geometry with CSS

```html
<!-- WRONG: CSS overrides for properties that have attributes -->
<style>
  .big-button { padding: 1rem 2rem; font-size: 1.2rem; border-radius: 0.5rem; }
</style>
<n-button class="big-button">Save</n-button>

<!-- RIGHT: use attributes -->
<n-button size="lg" radius="rounded">Save</n-button>
```

### Don't add classes to custom elements for styling

```html
<!-- WRONG: class on component for visual styling -->
<style>
  .danger-btn { background: red; color: white; }
</style>
<n-button class="danger-btn">Delete</n-button>

<!-- RIGHT: use variant + intent -->
<n-button variant="primary" intent="danger">Delete</n-button>
```

### Don't override display or internal layout

```html
<!-- WRONG: overriding component internals -->
<style>
  n-button { display: inline-flex; }
  n-input { border: 2px solid blue; }
  n-card { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
</style>

<!-- RIGHT: use attributes and tokens -->
<n-button inline>Compact</n-button>
<n-input intent="info"><!-- border follows intent --></n-input>
<n-card><!-- shadow is built-in --></n-card>
```

### Don't override colors per-component

```css
/* WRONG: per-component color override */
n-button { background-color: #2563eb; }
n-button:hover { background-color: #1d4ed8; }

/* RIGHT: use intent for color */
```
```html
<n-button variant="primary" intent="accent">Save</n-button>
```

```css
/* Or if you truly need a custom palette, override the env params */
:root {
  --n-env-hue-accent: 230;
  --n-env-chroma: 0.25;
}
```

### Don't mix CSS classes with component attributes

```html
<!-- WRONG: redundant/conflicting CSS alongside attributes -->
<style>
  .card-header { padding: 1rem; font-weight: bold; border-bottom: 1px solid #eee; }
</style>
<n-card>
  <n-header class="card-header"><span slot="label">Title</span></n-header>
</n-card>

<!-- RIGHT: n-header handles its own padding, weight, and border -->
<n-card>
  <n-header padding="regular"><span slot="label">Title</span></n-header>
</n-card>
```

## When CSS IS Appropriate

CSS is appropriate for things the component API doesn't cover:

| Use case | Example |
|----------|---------|
| **Page layout** | Grid, flex, margins between components |
| **Container sizing** | `max-width`, `min-height` on wrapper divs |
| **Custom animations** | `@keyframes` on wrapper elements |
| **Prose content** | Typography for rendered markdown/HTML (use `[n-prose]`) |
| **Scoped token overrides** | `--n-background` on a section container |
| **Application-specific layout** | Sidebar widths, header heights, responsive breakpoints |

## Specificity Contract

Component CSS uses `:where()` — zero specificity `(0,0,0)`. Any selector you write beats it. This means:

- A single class selector (`.my-section n-button`) wins automatically
- You never need `!important`
- Token overrides (`--n-background: ...`) on a parent apply immediately

This is by design — but it's a **safety net**, not an invitation. Prefer attributes over CSS overrides. The specificity contract exists for the rare cases where you need section-level theming or layout integration that attributes can't express.

## Summary

```
Attribute > Token override > Layout CSS > Direct component CSS (avoid)
```

1. **Start with attributes.** They cover variant, intent, size, density, radius, inline, disabled.
2. **Theme with tokens.** Override `--n-env-*` globally or `--n-*` on parent containers.
3. **Layout with CSS.** Grids, flex, gaps, margins — on wrappers, not components.
4. **Never write CSS targeting component internals** (background, padding, border-radius, font-size, display). If you think you need to, there's almost certainly an attribute or token for it.
