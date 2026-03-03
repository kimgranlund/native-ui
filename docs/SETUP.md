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

## Production Checklist

| Item | Action |
|------|--------|
| CSS loaded | Verify both foundation and component CSS are present |
| JS loaded | Verify `register` import or individual `define()` calls run |
| Load order | Foundation CSS before component CSS |
| Lean CSS | Use `@nonoun/native-ui/css/lean` to strip debug selectors |
| Traits | Only call `registerAllTraits()` if using `<n-controller>` |
| `sideEffects` | The `register` entry is marked in package.json -- bundlers will not tree-shake it |
