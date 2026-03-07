# Containers

Structural elements that group, frame, and organize content. Pure CSS or minimal CEs -- no signals, no events, no form association.

## Surface Containers

| Container | Display | Elevation | Implementation |
|-----------|---------|-----------|----------------|
| `n-container` | flex column | `--n-card` | Minimal CE |
| `n-panel` | flex column | `--n-panel` | CSS-only |

**n-container** -- Bounded surface with `border: 1px solid var(--n-border-muted)` and `border-radius`. Default `flex: 1 1 0%` grows to fill space. Slots: `header`, `media` (full-bleed image), `footer`, default (auto-padded body). Attributes: `padding` (none/tight/regular/relaxed), `dividers` (border-top between children), `interactive` (hover/focus styles), `inline` (opt-out from flex growth — `flex: 0 0 auto`, sizes to content for feeds/transcripts/grids).

**n-panel** -- Section surface with `container-type: inline-size`. Attributes: `padding`, `dividers`, `bordered`, `scrollable`, `show-scrollbar`, `fade`. Panels don't scroll by default — add `[scrollable]` for opt-in `overflow-y: auto` when bounded by height. `[fade]` applies `mask-image` gradient on `n-body` so content dissolves as it scrolls under header/footer — uses `:has(> n-header)` / `:has(> n-footer)` to detect edges. Override `--n-fade-top` / `--n-fade-bottom` for custom fade distances. Aside mode: `[aside]` enables collapsible side panel (360px default, 280-480px range) with animated open/close and resize handle. `[aside][open]` shows the panel.

## Sub-Containers

Semantic HTML tags and CSS classes are the sub-containers inside `n-container`, `n-panel`, `n-drawer`, and `<main>`. Defined in `css/containers.css`.

**`<header>`** -- Display: `grid`. Children auto-detect grid columns via `:has()`. Attributes: `align` (center/end), `padding` (none/tight/regular/relaxed), `sticky`, `dividers`, `truncate`.

**`<div class="body">`** (or `<section>`) -- Display: `flex column`. Fills remaining space, `overflow-y: auto`, scrollbar hidden by default. Attributes: `padding`, `show-scrollbar`.

**`<footer>`** -- Display: `flex row`, end-aligned. Attributes: `justify` (start/center/spread), `padding`, `sticky`, `dividers`.

**Parent context**: `n-container` adds `border-bottom` on `<header>` and `border-top` on `<footer>`. Panel widens sub-container `padding-inline` at `@container (min-width: 22rem)`.

## Content Reset

**`[markdown-html]` / `.markdown-html`** -- Reusable scoped rich-text reset (defined in `css/reset.css`). Apply to any container rendering user-generated or markdown-sourced HTML. Provides: flex column with gap-based vertical rhythm, margin reset on all block elements, heading styles (weight, color, scale), code/pre styling (`--n-font-mono`, `--n-control` background), blockquote border, link underline, list padding, hr styling. All selectors use `:where()` for zero specificity.

```html
<div markdown-html>
  <h2>Title</h2>
  <p>Paragraph with <code>inline code</code> and a <a href="#">link</a>.</p>
  <pre><code>code block</code></pre>
  <blockquote>Quoted text</blockquote>
</div>
```

## Layout Primitives

**`.stack`** -- Flex stacking (default: column). Defined in `css/layout.css`. Attributes: `direction` (row/column-reverse/row-reverse), `gap` (0-8, multiplier of `--n-space`), `align` (start/center/end/stretch/baseline), `justify` (start/center/end/between/around/evenly), `wrap`, `padding`.

**`.grid`** -- CSS grid. Defined in `css/layout.css`. Default: `auto-fill, minmax(16rem, 1fr)`. Attributes: `cols` (1-6, fixed count), `min` (8rem-24rem, auto-fill min width), `gap` (0-8), `padding`.

**`<hr>`** / **`.divider`** -- Horizontal/vertical rule with optional text label. Defined in `css/containers.css`. Attribute: `orientation` (vertical). `<hr>` for standard horizontal rules; `<div class="divider">` for vertical or text-labeled dividers.

**n-toolbar** -- Horizontal action bar with `role="toolbar"` and roving focus. Elevation: `--n-panel`. Children shrink-wrap by default. Per-item `[fill]` grows one child; toolbar-level `[fill]` grows all. Overflow menu via `[data-overflow]` system with inline SVG icon (no icon import dependency). Attributes: `padding`, `fill`, `variant` (`plain` — transparent/unstyled for embedding in headers, chat controls, or other containers; preserves layout + keyboard nav + overflow).

**Overflow priority**: Per-item `[overflow-priority="low|normal|high"]` controls overflow order (low items overflow first). `[overflow-pin]` prevents an item from overflowing. Same-priority items overflow in reverse DOM order.

**Overflow diagnostics**: After every measurement, dispatches `native:toolbar-overflow` with detail `{ visibleCount, overflowedCount, overflowedLabels, availableWidth, totalWidth }`.

```html
<!-- Plain toolbar inside a header -->
<header>
  <span slot="label">Title</span>
  <n-toolbar variant="plain" slot="trailing">
    <n-button variant="ghost" icon="gear"></n-button>
    <n-button variant="ghost" icon="x"></n-button>
  </n-toolbar>
</header>
```

## App Layout (`@nonoun/native-dashboard`)

Separate package. Full-page layout with collapsible sidebar.

```
native-dashboard                         <- flex row, height: 100dvh
+-- [slot="sidebar"]               <- sticky aside (resizable, collapsible to 48px)
|   +-- n-sidebar-header           <- absolute overlay, top
|   +-- n-sidebar-content          <- scrollable, mask-image fade edges
|   |   +-- n-sidebar-nav          <- keyboard nav + selection
|   |   |   +-- n-sidebar-group    <- collapsible (<details>), flyout when collapsed
|   |   |   +-- n-sidebar-nav-item <- leaf item
|   |   +-- n-sidebar-item         <- generic row (icon + label + trailing)
|   +-- n-sidebar-footer           <- absolute overlay, bottom
+-- <section>                      <- flex column (content column)
    +-- <nav>                      <- grid bar (breadcrumb + actions)
    +-- <section class="content">  <- flex row
        +-- <main>                 <- flex-1 scrollable (main content)
        +-- [aside panels]         <- collapsible side panel (CEs with [aside])
```

Collapsed: `[collapsed]` on `native-dashboard` shrinks aside to 48px icon rail. Components respond via `@container sidebar (max-width: 80px)`.

## Elevation Model

| Level | Token | Containers |
|-------|-------|------------|
| body | `--n-body` | `:root` default |
| control | `--n-control` | Form inputs (empty state) |
| panel | `--n-panel` | n-toolbar, n-dashboard-panel, filled inputs |
| button | `--n-button` | Button chrome |
| widget | `--n-widget` | Checkbox/radio/switch |
| card | `--n-card` | n-container |
