# Setup

## Installation

```bash
npm install @nonoun/native-ui
```

## Entry Points

### JS

| Import | Description |
|--------|-------------|
| `@nonoun/native-ui` | All component classes, trait controllers, reactivity, core, icons. Tree-shakeable. |
| `@nonoun/native-ui/register` | Side-effect import -- registers all ~55 custom elements |
| `@nonoun/native-ui/kernel` | Kernel + A2UI protocol (advanced) |
| `@nonoun/native-ui/traits` | Trait controllers + reactivity only (no components) |

### CSS

| Import | Description |
|--------|-------------|
| `@nonoun/native-ui/css` | Foundation + all component styles |
| `@nonoun/native-ui/css/lean` | Same without `force-*` debug selectors (production) |
| `@nonoun/native-ui/css/foundation` | Colors, tokens, themes, base, primitives only |
| `@nonoun/native-ui/css/components` | Component styles only (requires foundation) |
| `@nonoun/native-ui/css/components-lean` | Component styles without debug selectors |

### Key Rules

- CSS is NOT bundled with JS -- you must load both separately.
- No shadow DOM -- all styling via CSS custom properties and light-DOM selectors.
- CSS load order matters -- foundation must come before components.
- Bundlers resolve bare specifiers in `@import`. `<link>` tags do NOT resolve npm packages.

---

## Context 1: SPA (Bundler)

```js
// main.js
import '@nonoun/native-ui/register';
```

```css
/* main.css */
@import '@nonoun/native-ui/css';
```

### Tree-Shaking Individual Elements

```js
import { NButton, NInput, define } from '@nonoun/native-ui';
define('n-button', NButton);
define('n-input', NInput);
```

Full CSS is still required -- component styles are not tree-shakeable.

---

## Context 2: SSR (Astro)

```astro
---
// src/layouts/Layout.astro
---
<html>
<head>
  <style is:global>
    @import '@nonoun/native-ui/css/foundation';
    @import '@nonoun/native-ui/css/components';
  </style>
</head>
<body>
  <slot />
  <script>
    import '../scripts/setup.ts';
  </script>
</body>
</html>
```

```ts
// src/scripts/setup.ts
import { registerAllTraits } from '@nonoun/native-ui';
registerAllTraits();
import '@nonoun/native-ui/register';
```

When combining with other `@nonoun` packages, maintain CSS order:

```css
@import '@nonoun/native-ui/css/foundation';
@import '@nonoun/native-ui/css/components';
@import '@nonoun/native-app/css';
```

---

## Context 3: CDN / CodePen

Use `@nonoun/native-cdn` for a single IIFE bundle that auto-registers all elements and exposes the API on `window.NativeUI`.

```html
<link rel="stylesheet" href="path/to/native-ui.css">
<script src="path/to/native-ui.iife.js"></script>

<n-button variant="primary" intent="accent">Click me</n-button>
```

The IIFE bundle auto-registers all ~55 elements. The full API is available on `window.NativeUI` (e.g., `NativeUI.signal()`, `NativeUI.NButton`).

| Export | Path |
|--------|------|
| `@nonoun/native-cdn` | `./dist/native-ui.iife.js` |
| `@nonoun/native-cdn/css` | `./dist/native-ui.css` |

---

## CSS Load Order

```
foundation -> components -> app-level -> page-specific
```

```css
@import '@nonoun/native-ui/css/foundation';  /* 1. colors, tokens, themes, base */
@import '@nonoun/native-ui/css/components';   /* 2. component styles */
@import '@nonoun/native-app/css';             /* 3. app shell (if applicable) */
@import './page.css';                         /* 4. page overrides */
```

The internal foundation cascade is `colors.primitives.css -> colors.tokens.css -> themes.css -> n.base.css -> n.primitives.css`. Do not reorder.

---

## Traits Registration

`registerAllTraits()` registers 25 trait adapters for `<n-controller traits="...">` declarative usage. Call before component definitions:

```js
import { registerAllTraits } from '@nonoun/native-ui';
registerAllTraits();
import '@nonoun/native-ui/register';
```

In HTML pages, use two separate `<script type="module">` blocks:

```html
<script type="module">
  import { registerAllTraits } from '@nonoun/native-ui';
  registerAllTraits();
</script>
<script type="module">
  import '@nonoun/native-ui/register';
</script>
```

Traits are optional. Skip `registerAllTraits()` if not using `<n-controller>`.

---

## New Project Checklist

10-point checklist for any project using native-ui.

### 1. Load the CSS bundle

CSS is not bundled with JS. Load the convenience bundle for simplicity:

```css
@import '@nonoun/native-ui/css';
```

Or for production without debug selectors: `@nonoun/native-ui/css/lean`.

### 2. Register traits before components

`registerAllTraits()` must run before any `customElements.define()` call:

```ts
import { registerAllTraits } from '@nonoun/native-ui';
registerAllTraits();
import '@nonoun/native-ui/register';
```

Skip `registerAllTraits()` only if you never use `<n-controller>`.

### 3. Pick your JS entry point

- `@nonoun/native-ui` -- components + traits + reactivity + icons (most projects)
- `@nonoun/native-ui/kernel` -- kernel + A2UI protocol (advanced consumers only)

### 4. Set `color-scheme: light dark` on `:root`

The design system uses `light-dark()` for automatic dark mode. If your project overrides `color-scheme`, the entire palette breaks. The system handles both modes with zero JS.

### 5. Use attributes, not classes

Styling is driven by HTML attributes:

```html
<n-button variant="primary" intent="accent" size="lg">Save</n-button>
```

Key attributes: `intent` (color family), `variant` (chrome), `size` (scale), `density` (spacing), `radius` (corners).

### 6. Theme via `--n-env-*` tokens

Don't override individual color steps. Override the 9 environment parameters and the entire system recalculates:

```css
:root {
  --n-env-hue-neutral: 280;
  --n-env-hue-accent: 280;
  --n-env-chroma-neutral: 0.3;
}
```

Or use a built-in theme: `<html theme="forest">`.

### 7. Listen for `native:` events

All component events use the `native:` prefix with a colon:

```js
button.addEventListener('native:press', handlePress);
select.addEventListener('native:change', handleChange);
input.addEventListener('native:input', handleInput);
```

### 8. Respect the specificity contract

Component CSS is zero-specificity (`:where()`). Your CSS at `(0,1,0)+` wins automatically. Never use `!important`. Override `--n-*` tokens directly:

```css
.my-hero n-button {
  --n-background: var(--n-surface);
  --n-color: var(--n-surface-ink);
}
```

### 9. Choose your app shell

- **SPA**: `<native-app-spa>` wraps your app with sidebar + breadcrumb + canvas layout
- **SSR (Astro)**: Use `@nonoun/native-app` layout components server-side, register JS client-side
- **CDN**: `@nonoun/native-cdn` IIFE bundle + `<link>` tags, no build step
- **Custom**: Build your own layout -- components work anywhere in any container

### 10. Verify the full stack loads

Render this smoke test after setup:

```html
<n-button variant="primary" intent="accent">Works</n-button>
<n-input placeholder="Type here"></n-input>
<n-select placeholder="Pick" options='[{"value":"a","label":"Alpha"},{"value":"b","label":"Beta"}]'></n-select>
```

You should see: styled button with accent fill, input with placeholder, working dropdown. If anything is unstyled -- CSS is missing or load order is wrong.

---

## Production Checklist

| Item | Action |
|------|--------|
| CSS loaded | Verify both foundation and component CSS are present |
| JS loaded | Verify `register` import or individual `define()` calls run |
| Load order | Foundation CSS before component CSS |
| Lean CSS | Use `@nonoun/native-ui/css/lean` to strip debug selectors |
| Traits | Only call `registerAllTraits()` if using `<n-controller>` |
| `sideEffects` | The `register` entry is marked in package.json -- bundlers will not tree-shake it |
