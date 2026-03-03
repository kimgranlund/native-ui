# Package Ecosystem

`@nonoun/native-ui` is a monorepo with a core library and seven extension packages. All packages are ESM-only (`"type": "module"`).

## Package Overview

| Package | Version | Purpose | Peer Dep |
|---------|---------|---------|----------|
| `@nonoun/native-ui` | 0.6.9 | Core: components, design system, traits, reactivity, icons | -- |
| `@nonoun/native-app` | 0.3.3 | App shell: sidebar navigation, layout orchestration | `>=0.6.0` |
| `@nonoun/native-tokens` | 0.5.0 | OKLCH color token inspector widget | `>=0.6.0` |
| `@nonoun/native-chat` | 0.2.1 | Chat component system: feed, messages, avatar, activity, seeds, GenUI | `>=0.6.0` |
| `@nonoun/native-codemirror` | 0.2.5 | CodeMirror 6 integration layer (theme, extensions, re-exports) | `>=0.5.0` |
| `@nonoun/native-editor` | 0.2.4 | Markdown editor with live preview | `>=0.5.0` |
| `@nonoun/native-playground` | 0.2.4 | Embeddable live code sandbox (HTML/CSS/JS) | `>=0.5.0` |
| `@nonoun/native-a2ui` | 0.1.1 | A2UI protocol: adapter, transport, workbench | `>=0.5.0` |
| `@nonoun/native-cdn` | 0.2.1 | Single-file IIFE bundle for CDN/artifact use | `>=0.5.0` |

## Export Maps

### @nonoun/native-ui (core)

| Specifier | Resolves To | Description |
|-----------|-------------|-------------|
| `@nonoun/native-ui` | `dist/native-ui.js` | Default: element classes, traits, reactivity, icons (no registration) |
| `@nonoun/native-ui/register` | `dist/register-all.js` | Side-effect: registers all `n-*` custom elements |
| `@nonoun/native-ui/kernel` | `dist/kernel.js` | Kernel + plugin registry (separate entry point) |
| `@nonoun/native-ui/traits` | `dist/traits.js` | Trait controllers only |
| `@nonoun/native-ui/css` | `dist/native-ui.css` | Full CSS: foundation + components |
| `@nonoun/native-ui/css/foundation` | `dist/foundation.css` | Colors, tokens, themes, base, primitives |
| `@nonoun/native-ui/css/components` | `dist/components.css` | All component styles (incl. `force-*` debug selectors) |
| `@nonoun/native-ui/css/components-lean` | `dist/components-lean.css` | Component styles without `force-*` debug selectors |
| `@nonoun/native-ui/css/lean` | `dist/native-ui-lean.css` | Foundation + components-lean (production) |

### Extension Packages

| Package | JS Entry (default) | JS Entry (register) | CSS Entry |
|---------|--------------------|---------------------|-----------|
| `@nonoun/native-app` | `.` | -- (default auto-registers) | `./css` |
| `@nonoun/native-tokens` | `.` | -- (default auto-registers) | `./css`, `./css/foundation` |
| `@nonoun/native-chat` | `.` | `./register` | `./css` |
| `@nonoun/native-codemirror` | `.` | `./register` | `./css` |
| `@nonoun/native-editor` | `.` | `./register` | `./css` |
| `@nonoun/native-playground` | `.` | `./register` | `./css` |
| `@nonoun/native-a2ui` | `.` | `./register` | `./css` |
| `@nonoun/native-cdn` | `.` (IIFE) | -- (auto-registers) | `./css` |

Packages with `./register`: the default export gives classes only; import `./register` as a side-effect to call `customElements.define()`. Packages without `./register` auto-register on import.

## Elements Registered

| Package | Elements |
|---------|----------|
| `@nonoun/native-ui/register` | All `n-*` elements (30+) |
| `@nonoun/native-app` | `<native-app>`, `<n-sidebar-nav>`, `<n-sidebar-nav-item>`, `<n-sidebar-group>`, `<n-sidebar-group-header>`, `<n-sidebar-item>` |
| `@nonoun/native-tokens` | `<native-tokens>`, `<native-tokens-panel>`, `<native-tokens-variable>`, `<native-tokens-colors>`, `<native-tokens-color-swatch>`, `<native-tokens-themes>` |
| `@nonoun/native-chat` | `<n-chat-input>`, `<native-chat-panel>`, `<n-chat-feed>`, `<n-chat-messages>`, `<n-chat-message>`, `<n-chat-avatar>`, `<n-chat-message-text>`, `<n-chat-message-activity>`, `<n-chat-message-seed>`, `<n-chat-message-genui>`, `<n-chat-input-structured>` |
| `@nonoun/native-codemirror` | `<native-codemirror>` |
| `@nonoun/native-editor` | `<native-editor>` |
| `@nonoun/native-playground` | `<native-playground>` |
| `@nonoun/native-a2ui` | `<native-a2ui>` |
| `@nonoun/native-cdn` | All `n-*` elements (re-exports core + auto-registers) |

Extension packages also register dogfooded core elements they create internally (e.g., `n-button`, `n-listbox`). `define()` is idempotent -- duplicate calls are no-ops.

## Dependencies Between Packages

```
native-ui (core)
  |
  +-- native-app
  +-- native-tokens
  +-- native-chat
  +-- native-cdn
  +-- native-codemirror
  |     |
  |     +-- native-editor
  |     +-- native-playground
  |     +-- native-a2ui
  +-- native-a2ui (also depends on native-codemirror)
```

`@nonoun/native-codemirror` is a shared dependency for all CodeMirror-based packages. It re-exports key CodeMirror APIs (`EditorView`, `EditorState`, `keymap`, etc.) so downstream packages import through it rather than depending on `@codemirror/*` directly.

## Monorepo Structure

```
packages/
  native-app/          @nonoun/native-app
  native-tokens/       @nonoun/native-tokens
  native-chat/         @nonoun/native-chat
  native-codemirror/   @nonoun/native-codemirror
  native-editor/       @nonoun/native-editor
  native-playground/   @nonoun/native-playground
  native-a2ui/         @nonoun/native-a2ui
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
- Uses `<native-app>` layout directly in server-rendered HTML -- no Shadow DOM wrapper

**SPA wrapper** (`<native-app-spa>`):
- Shadow DOM wrapper for single-page apps that need encapsulated layout
- NOT used by Astro -- Astro uses server-rendered `<native-app>` directly

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
