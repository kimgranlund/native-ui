# Package Ecosystem

`@nonoun/native-ui` is a monorepo with a core library and extension packages. All packages are ESM-only (`"type": "module"`).

## Package Overview

| Package | Version | Purpose | Peer Dep |
|---------|---------|---------|----------|
| `@nonoun/native-ui` | 0.7.11 | Core: components, design system, traits, reactivity, icons | -- |
| `@nonoun/native-dashboard` | 0.3.7 | App shell: sidebar navigation, layout orchestration | `>=0.6.0` |
| `@nonoun/native-design` | 0.5.5 | OKLCH color token inspector widget | `>=0.6.0` |
| `@nonoun/native-ai` | 1.0.0 | A2UI protocol + chat components (merged from native-a2ui + native-chat) | `>=0.5.0` |
| `@nonoun/native-code` | 1.0.0 | Code editing: CodeMirror integration, markdown editor, live playground (merged from native-codemirror + native-editor + native-playground) | `>=0.5.0` |
| `@nonoun/native-cdn` | 0.2.6 | Single-file IIFE bundle for CDN/artifact use | `>=0.5.0` |

## Export Maps

### @nonoun/native-ui (core)

| Specifier | Resolves To | Description |
|-----------|-------------|-------------|
| `@nonoun/native-ui` | `dist/native-ui.js` | Default: element classes, traits, reactivity, icons (no registration) |
| `@nonoun/native-ui/register` | `dist/register-all.js` | Side-effect: registers all `n-*` custom elements |
| `@nonoun/native-ui/kernel` | `dist/kernel.js` | Kernel + plugin registry (separate entry point) |
| `@nonoun/native-ui/traits` | `dist/traits.js` | Trait controllers only |
| `@nonoun/native-ui/css` | `dist/foundation.css` | Full CSS: colors + layout + components (everything) |
| `@nonoun/native-ui/css/colors` | `dist/colors.css` | OKLCH primitives, semantic tokens, themes |
| `@nonoun/native-ui/css/layout` | `dist/layout.css` | Reset, utilities, containers |
| `@nonoun/native-ui/css/components` | `dist/components.css` | Component tokens, utilities, icons, all component styles |
| `@nonoun/native-ui/css/foundation` | `dist/foundation.css` | Alias for `./css` (colors + layout + components) |

### Extension Packages

| Package | JS Entry (default) | JS Entry (register) | CSS Entry |
|---------|--------------------|---------------------|-----------|
| `@nonoun/native-dashboard` | `.` | -- (default auto-registers) | `./css` |
| `@nonoun/native-design` | `.` | -- (default auto-registers) | `./css`, `./css/foundation` |
| `@nonoun/native-ai` | `.` | `./register` | `./css` |
| `@nonoun/native-code` | `.` | `./register` | `./css` |
| `@nonoun/native-cdn` | `.` (IIFE) | -- (auto-registers) | `./css` |

Packages with `./register`: the default export gives classes only; import `./register` as a side-effect to call `customElements.define()`. Packages without `./register` auto-register on import.

## Elements Registered

| Package | Elements |
|---------|----------|
| `@nonoun/native-ui/register` | All `n-*` elements (30+) |
| `@nonoun/native-dashboard` | `<native-dashboard>`, `<n-sidebar-nav>`, `<n-sidebar-nav-item>`, `<n-sidebar-group>`, `<n-sidebar-group-header>`, `<n-sidebar-item>` |
| `@nonoun/native-design` | `<native-design>`, `<native-design-panel>`, `<native-design-variable>`, `<native-design-colors>`, `<native-design-color-swatch>`, `<native-design-themes>` |
| `@nonoun/native-ai` | `<native-a2ui>`, `<n-chat-input>`, `<native-chat-panel>`, `<n-chat-feed>`, `<n-chat-messages>`, `<n-chat-message>`, `<n-chat-avatar>`, `<n-chat-message-text>`, `<n-chat-message-activity>`, `<n-chat-message-seed>`, `<n-chat-message-genui>`, `<n-chat-input-structured>` |
| `@nonoun/native-code` | `<native-codemirror>`, `<native-editor>`, `<native-playground>` |
| `@nonoun/native-cdn` | All `n-*` elements (re-exports core + auto-registers) |

Extension packages also register dogfooded core elements they create internally (e.g., `n-button`, `n-listbox`). `define()` is idempotent -- duplicate calls are no-ops.

## Dependencies Between Packages

```
native-ui (core)
  |
  +-- native-dashboard
  +-- native-design
  +-- native-ai (also depends on native-code)
  +-- native-cdn
  +-- native-code
```

`@nonoun/native-code` consolidates all code editing into one package. It re-exports key CodeMirror APIs (`EditorView`, `EditorState`, `keymap`, etc.) and provides the markdown editor and live playground.

## Monorepo Structure

```
packages/
  native-dashboard/          @nonoun/native-dashboard
  native-design/       @nonoun/native-design
  native-ai/           @nonoun/native-ai
  native-code/         @nonoun/native-code
  native-cdn/          @nonoun/native-cdn
```

Managed via npm workspaces (`"workspaces": ["packages/*"]` in root `package.json`). Each package has its own `build` script; the root build only builds the core library.

## Version Alignment

All packages declare `@nonoun/native-ui` as a peer dependency. When native-ui bumps a major version, all packages must update their peer dep range. Packages should be published together to avoid version skew.

## SSR (Astro) vs SPA

**Astro host** (server-rendered):
- CSS via `<style is:global>@import '@nonoun/native-ui/css';</style>` or `<link>`
- JS registration via a shared `setup.ts` that imports `/register` entries
- Navigation via Astro View Transitions (no client-side router)
- Uses `<native-dashboard>` layout directly in server-rendered HTML -- no Shadow DOM wrapper

**SPA wrapper** (`<native-dashboard-spa>`):
- Shadow DOM wrapper for single-page apps that need encapsulated layout
- NOT used by Astro -- Astro uses server-rendered `<native-dashboard>` directly

## CDN Usage

For prototyping or non-bundled environments:

```html
<link rel="stylesheet" href="https://cdn.example.com/@nonoun/native-cdn/dist/native-ui.css">
<script src="https://cdn.example.com/@nonoun/native-cdn/dist/native-ui.iife.js"></script>
<script>
  // Full API available on window.NativeUI
  const { signal, NButton } = window.NativeUI;
</script>
```

The CDN bundle auto-registers all elements and exposes the full API on `window.NativeUI`.
