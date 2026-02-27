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
import { UIButton, define } from '@nonoun/native-ui';
define('ui-button', UIButton);
```

**3. Use in HTML:**

```html
<ui-button variant="primary" intent="accent">Save</ui-button>
<ui-input placeholder="Email" name="email"></ui-input>
<ui-select placeholder="Country" options='[{"value":"us","label":"United States"}]'></ui-select>
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

`ui-button` `ui-input` `ui-textarea` `ui-select` `ui-combobox` `ui-command` `ui-checkbox` `ui-switch` `ui-radio` `ui-segmented-control` `ui-tabs` `ui-accordion` `ui-dialog` `ui-drawer` `ui-calendar` `ui-table` `ui-listbox` `ui-tree` `ui-range` `ui-input-otp` `ui-pagination` `ui-breadcrumb` `ui-slideshow` `ui-tooltip` `ui-avatar` `ui-badge` `ui-nav` `ui-chat` `ui-field`

### Containers

`ui-card` `ui-panel` `ui-stack` `ui-grid` `ui-divider` `ui-inset` `ui-header` `ui-body` `ui-footer` `ui-section` `ui-toolbar` `ui-layout-sidebar` `ui-layout-breadcrumb` `ui-layout-canvas` `ui-layout-body` `ui-layout-chat`

### Traits

Composable behaviors available as controllers (imperative) or via `<ui-controller>` (declarative):

`PressController` `DismissController` `PopoverController` `RovingFocusController` `FocusTrapController` `DragController` `DropZoneController` `RangeSelectController` `CollapsibleController` `ToastController` `ValidateController` `ResizeController` `VirtualScrollController` `CopyController` `SortController` `HoverController` `IntersectController` `SelectionController` `SearchController` `ClipboardController` `SwipeController` `EditController` `DialogController` `ListNavigateController`

## Browser Support

Modern browsers only. Requires native support for:

- Custom Elements v1 + `ElementInternals`
- CSS `@layer`, `:where()`, `oklch()`, `light-dark()`
- Popover API + anchor positioning
- `<dialog>` element

## License

[MIT](LICENSE)
