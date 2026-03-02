# @nonoun/native-ui

Zero-dependency web component library with an OKLCH CSS design system, signal-based reactivity, and composable trait controllers. No shadow DOM — styling via CSS custom property inheritance, `light-dark()` theming, and zero-specificity attribute selectors.

## Install

```bash
npm install @nonoun/native-ui
```

## Quick Start

**1. Load CSS** (required — CSS is not bundled with JS):

```html
<link rel="stylesheet" href="node_modules/@nonoun/native-ui/dist/native-ui.css">
```

Or via a bundler:

```css
@import '@nonoun/native-ui/css';
```

**2a. Register all elements** (simplest):

```js
import '@nonoun/native-ui/register';
```

**2b. Or import individual classes** (tree-shakeable):

```js
import { NButton, define } from '@nonoun/native-ui';
define('n-button', NButton);
```

**3. Use in HTML:**

```html
<n-button variant="primary" intent="accent">Save</n-button>
<n-input placeholder="Email" name="email"></n-input>
<n-select placeholder="Country" options='[{"value":"us","label":"United States"}]'></n-select>
```

## Entry Points

| Import | Description | Size |
|--------|-------------|------|
| `@nonoun/native-ui` | All component classes + reactivity + core + icons (tree-shakeable) | ~138 KB |
| `@nonoun/native-ui/register` | Side-effect import that registers all ~47 custom elements | ~140 KB |
| `@nonoun/native-ui/kernel` | Kernel + A2UI protocol (advanced) | ~107 KB |
| `@nonoun/native-ui/traits` | Trait controllers + reactivity (no components) | ~2 KB + shared chunks |

### CSS

| Import | Description |
|--------|-------------|
| `@nonoun/native-ui/css` | Foundation + all component styles |
| `@nonoun/native-ui/css/lean` | Same without `force-*` debug selectors (production) |
| `@nonoun/native-ui/css/foundation` | Colors, tokens, themes, base, primitives only |
| `@nonoun/native-ui/css/components` | Component styles only (requires foundation) |
| `@nonoun/native-ui/css/components-lean` | Component styles without debug selectors |

## CSS Architecture

CSS is distributed separately from JavaScript. Components have no shadow DOM and no adopted stylesheets — all styling flows through CSS custom properties and zero-specificity `:where()` attribute selectors in `@layer ui`.

This means:

- You **must** load CSS via `<link>` or `@import` — it is not automatic
- You **can** override any component style with a single class selector
- Theming works via 9 OKLCH environment parameters on `:root`
- Dark mode is automatic via `light-dark()` — no class toggles needed

## Components

30 interactive components, 17 structural containers, 23 trait controllers, and a Phosphor icon system.

### Interactive

`n-button` `n-input` `n-textarea` `n-select` `n-combobox` `n-command` `n-checkbox` `n-switch` `n-radio` `n-segmented-control` `n-tabs` `n-accordion` `n-dialog` `n-drawer` `n-calendar` `n-table` `n-listbox` `n-tree` `n-range` `n-input-otp` `n-pagination` `n-breadcrumb` `n-slideshow` `n-tooltip` `n-avatar` `n-badge` `n-nav` `n-chat` `n-field`

### Containers

`n-card` `n-panel` `n-stack` `n-grid` `n-divider` `n-inset` `n-card-header` `n-card-body` `n-card-footer` `n-section` `n-toolbar` `n-layout-sidebar` `n-layout-breadcrumb` `n-layout-canvas` `n-layout-body` `n-layout-chat`

### Traits

Composable behaviors available as controllers (imperative) or via `<n-controller>` (declarative):

`PressController` `DismissController` `PopoverController` `RovingFocusController` `FocusTrapController` `DragController` `DropZoneController` `RangeSelectController` `CollapsibleController` `ToastController` `ValidateController` `ResizeController` `VirtualScrollController` `CopyController` `SortController` `HoverController` `IntersectController` `SelectionController` `SearchController` `ClipboardController` `SwipeController` `EditController` `DialogController` `ListNavigateController`

## Browser Support

Modern browsers only. Requires native support for:

- Custom Elements v1 + `ElementInternals`
- CSS `@layer`, `:where()`, `oklch()`, `light-dark()`
- Popover API + anchor positioning
- `<dialog>` element

## License

[MIT](LICENSE)
