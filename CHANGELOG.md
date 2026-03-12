# Changelog

All notable changes to `@nonoun/native-ui` and sub-packages.

## 0.7.141

### Added
- **`<n-noodles>` component** — Declarative SVG noodle canvas. Wraps NoodleController with a zero-config custom element. Children declare ports via `data-noodle-port`, element handles SVG overlay, coordinate system, and stacking context. Attributes: `editable`, `color`, `stroke-width`, `tension`, `show-ports`, `port-size`, `curve`, `animated`, `disabled`. Demo page with 3 interactive demos.

## 0.7.140

### Changed
- Updated docs (INTERNALS, PATTERNS, TRAITS) with correct `packages/*/` paths after package split

## 0.7.139

### Fixed
- **All 35 trait demo pages broken** — HTML/TS files had stale `../../` relative imports after move from `src/traits/` to `packages/native-traits/src/traits/`. Fixed to `../../../../../src/`.
- **Kernel demo page broken** — HTML/inline scripts had stale `../styles/` and `../nav/` after move to `packages/native-kernel/src/kernel/`.
- **Context API demo page broken** — same stale relative path issue after move to `packages/native-core/src/core/`.
- **Sitemap paths updated** — all 35 trait paths, kernel path, and context API path now point to `packages/*/` locations.

## 0.7.138

### Fixed
- **A2UI Builder 500 error** — 7 demo/source files had stale relative imports to `src/kernel/kernel.ts` (moved to `@nonoun/native-kernel` in 0.7.135). Fixed: `a2ui-builder.ts`, all A2A demo files, `a2ui-components.demo.ts`, `a2ui-protocol.demo.ts`.

## @nonoun/native-ai 1.0.77

### Fixed
- Stale `src/kernel/` relative imports → `@nonoun/native-kernel` in 7 demo/source files

## 0.7.137

### Added
- **n-feed demo page** — four interactive demos: basic feed, bottom-anchored (chat-style), auto-scroll with pin detection, virtual scroll (10k items)
- **n-feed registered** in `register-all.ts` (was exported but not registered)
- **n-feed YAML record** (`records/components/feed.yaml`)
- n-feed added to sitemap navigation

## 0.7.136

### Changed
- Updated T0208 ticket with full package split details (kernel extraction, import migrations, dependency graph)

## 0.7.135

### Added
- **`@nonoun/native-kernel@0.1.0`** — kernel extracted to standalone package (command bus, plan executor, planner, data binding, schema catalog). `@nonoun/native-ui/kernel` continues to work via re-export.

### Changed
- **native-code** imports migrated from `@nonoun/native-ui` to `@nonoun/native-core` + `@nonoun/native-traits` (8 files)
- **native-ai** imports migrated from `@nonoun/native-ui` to `@nonoun/native-core` + `@nonoun/native-traits` (25 files)

## @nonoun/native-ai 1.0.76

### Changed
- Imports migrated to `@nonoun/native-core`, `@nonoun/native-traits`, `@nonoun/native-kernel`
- Only component class imports remain on `@nonoun/native-ui`

## @nonoun/native-code 1.0.12

### Changed
- Imports migrated to `@nonoun/native-core` + `@nonoun/native-traits`
- Only `NSegmentedControl`/`NSegment` remain on `@nonoun/native-ui`

---

## 0.7.133

### Added
- **Package split**: `@nonoun/native-core@0.1.0` (reactivity, NativeElement, define, registries) and `@nonoun/native-traits@0.1.0` (34 trait controllers, adapters, gesture-router) extracted as standalone packages
- Backwards compatible — `@nonoun/native-ui` re-exports everything from both packages

### Changed
- All internal imports updated from relative paths to `@nonoun/native-core` / `@nonoun/native-traits`
- Build scripts and YAML records updated for new package locations

## @nonoun/native-ai 1.0.74

### Added
- **LLM utilities extracted from A2UI builder**: `parseJsonFromResponse`, `stripFences` (JSON parsing), `createAdapter`, `detectProvider` (model registry), `runPipeline` (multi-step orchestration)

## @nonoun/native-code 1.0.11

### Changed
- Version bump (no functional changes beyond renames from 1.0.10)

---

## 0.7.132

### Added
- **`<n-feed>`** component — generic scrollable feed container extracted from `n-chat-feed`. Supports `align`, `scroll`, `auto-scroll`, virtual scroll. (`src/components/feed/`)

## @nonoun/native-ai 1.0.72

### Changed
- **Chat → Agent renames**: `n-chat-input-advanced` → `n-agent-input`, `n-chat-messages` → `n-agent-dialogue`, `n-chat-message` → `n-agent-dialogue-item`
- **A2UI Builder**: `.builder-chat` class → `[data-panel="agent-chat"]` attribute

## @nonoun/native-code 1.0.10

### Changed
- **Tag renames**: `native-codemirror` → `n-editor` (`NCodeEditor`), `native-editor` → `n-markdown-editor` (`NMarkdownEditor`), `native-playground` → `n-playground`
- **File/folder reorganization**: `src/codemirror/` files renamed to match `n-editor`, `src/editor/` → `src/markdown-editor/`
- **Playground**: `.pg-split`/`.pg-editor`/`.pg-preview` → `n-panes`/`n-pane[data-panel="editor|preview"]`
- **Markdown editor**: `.native-editor-surface` → `n-pane[data-panel="surface"]`, `.native-editor-resize-handle` → `[data-role="resize-handle"]`

---

## 0.7.69

### Fixed
- **Noodleable demo**: Flow node colors switched from raw semantic tokens (`--n-surface-accent`) to button-level resolved tokens via `intent` attributes — proper colors from the two-tier system
- **Noodleable demo**: Cleaned up style drift — removed redundant `main`/`h3` overrides, `.hint` → `.demo-desc`, `<n-body>` → `<div class="body">`, `<n-container>` → `<article>`

## 0.7.68

### Added
- **Demo pages**: `n-audio`, `n-picture`, `n-video`, `n-progress` container demos
- **Demo pages**: `.body` container demo (`src/containers/body/body.html`)
- **Sitemap**: Registered Audio, Picture, Video, Progress, Body in dev navigation

### Fixed
- **Block pages**: Added missing `spa-pages.css` stylesheet to all 19 block demo pages

## 0.7.67

### Added
- **API Reference sections** on all 68 demo pages — attributes, slots, events, CSS selectors, keyboard, accessibility tables
- **Shared CSS**: `.api-section`, `.api-table` rules in `spa-pages.css`
- **Shared CSS**: `main` max-width: 64rem

### Changed
- **23 trait pages**: Stripped duplicated inline `.api-*` CSS (now in shared stylesheet)
- **4 pages** (slideshow, badge, pressable, controller): Removed style drift overrides

## 0.7.66

### Changed
- **Container consolidation**: `<article>` bare element selectors migrated to `<n-container>` custom element tag selectors
- **Bare element migration**: `<hr>` → `<n-divider>`, layout `<aside>` → `<n-aside>`
- All CSS selectors now target custom element tag names, not bare HTML elements

## 0.7.65

### Added
- **NoodleController**: SVG noodle connection trait — bezier/step/straight curves, editable mode, port indicators, animated flow
- **MagnetController**: Snap-to-edge and snap-to-sibling alignment guides

### Changed
- **Badge/Avatar/Kbd**: Migrated from CSS class selectors to undefined custom element tag selectors (`<n-badge>`, `<n-avatar>`, `<n-kbd>`)

## 0.7.64

### Changed
- **Sub-container reversal**: `<n-header>` / `<n-body>` / `<n-footer>` across all packages — unified pattern

## 0.7.63

### Changed
- **CSS specificity**: All attribute API selectors (`[variant]`, `[intent]`, `[size]`, `[density]`, `[radius]`) moved outside `@layer ui` — real (0,1,0) specificity beats unlayered consumer CSS

## 0.7.62

### Changed
- **Container consolidation**: `n-card` → `n-container`, `n-section` removed
- `NContainer` CE with `data-kind="panel"` for panel mode

## 0.7.61

### Changed
- **CSS source reorganization**: Foundation files moved to `src/styles/css/`
- **Granular dist bundles**: `foundation.css`, `components.css`, `components-lean.css`, `native-ui.css`, `native-ui-lean.css`
- **Container-to-component moves**: Media containers (`n-audio`, `n-picture`, `n-video`, `n-progress`) moved to `src/components/`
- **Base layer stylesheet**: Box-sizing reset, body defaults, reduced-motion `--n-duration: 0s`

---

## Sub-packages

### @nonoun/native-ai 1.0.15

- **SCHEMA pane**: Editable schema viewer in A2UI workbench
- **ComponentRegistry**: Central registry for A2UI component definitions
- **Card sub-container pattern**: All presets use Card > Header | Body | Footer root
- **Preset IDs**: Standardized — no abbreviations, consistent naming
- **Component map fixes**: Divider mapped to `n-divider` after bare-element migration

### @nonoun/native-dashboard 0.4.8

- **Sidebar section label**: `<n-sidebar-section-label>` CSS element (T0132)
- **Semantic layout parity**: Padding/gap variables, `[show-scrollbar]` fix (T0135–T0138)
- **Content typography**: Opt-in `main h1/h2/h3` using design tokens
- **DOM architecture**: Canonical page templates, CSS contract

### @nonoun/native-cdn 0.2.17

- Rebuilt IIFE bundle from native-ui@0.7.68

### @nonoun/native-code 1.0.7

- Register.js build fix (T0131) — separate Vite build pass with `treeshake: false`

### @nonoun/native-design 0.6.6

- Tag renames: `<native-tokens-panel>` → `<native-design-panel>`, `<native-tokens>` → `<native-design>`
