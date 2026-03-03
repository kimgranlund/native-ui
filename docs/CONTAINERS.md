# Containers

Structural elements that group, frame, and organize content. Pure CSS or minimal CEs -- no signals, no events, no form association.

## Surface Containers

| Container | Display | Elevation | Implementation |
|-----------|---------|-----------|----------------|
| `n-card` | flex column | `--n-card` | Minimal CE |
| `n-panel` | flex column | `--n-panel` | CSS-only |
| `n-section` | flex column | none | Minimal CE |

**n-card** -- Bounded surface with `border: 1px solid var(--n-border-muted)` and `border-radius`. Slots: `header`, `media` (full-bleed image), `footer`, default (auto-padded body). Attributes: `padding` (none/tight/regular/relaxed), `dividers` (border-top between children), `interactive` (hover/focus styles).

**n-panel** -- Section surface with `container-type: inline-size`. Attributes: `padding`, `dividers`, `bordered`, `show-scrollbar`. Aside mode: `[aside]` enables collapsible side panel (360px default, 280-480px range) with animated open/close and resize handle. `[aside][open]` shows the panel.

**n-section** -- Semantic section. Slots: `heading` (bold), `description` (muted), `actions` (flex row alongside heading). Attributes: `padding`, `divider` (border-top), `collapsible` (clickable heading with chevron), `collapsed`.

## Unified Sub-Containers

`n-header`, `n-body`, `n-footer` work inside any flex-column parent (n-card, n-panel, n-drawer, n-app-panel). When `n-body` is present, the parent sets `overflow: hidden; padding: 0` so body handles scroll while header/footer stay fixed.

**n-header** -- Display: `grid`. Slots: `leading`, `label` (or unslotted), `trailing`, `content` (full-width row below). Grid auto-adapts columns to present slots. Attributes: `align` (center/end), `padding` (none/tight/regular/relaxed), `sticky`, `dividers`.

**n-body** -- Display: `flex column`. Fills remaining space, `overflow-y: auto`, scrollbar hidden by default. Attributes: `padding`, `show-scrollbar`. Auto-adds block padding next to `[dividers]` siblings.

**n-footer** -- Display: `flex row`, end-aligned. Attributes: `justify` (start/center/spread), `padding`, `sticky`, `dividers`.

**Parent context**: n-card and n-panel add `border-bottom` on n-header and `border-top` on n-footer. n-panel widens sub-container `padding-inline` at `@container (min-width: 22rem)`.

**Deprecated**: `n-card-header`, `n-card-body`, `n-card-footer`, `n-panel-header`, `n-panel-body`, `n-panel-footer` still work but prefer the unified names.

## Layout Primitives

**n-stack** -- Flex stacking (default: column). Attributes: `direction` (row/column-reverse/row-reverse), `gap` (0-8, multiplier of `--n-space`), `align` (start/center/end/stretch/baseline), `justify` (start/center/end/between/around/evenly), `wrap`, `padding`.

**n-grid** -- CSS grid. Default: `auto-fill, minmax(16rem, 1fr)`. Attributes: `cols` (1-6, fixed count), `min` (8rem-24rem, auto-fill min width), `gap` (0-8), `padding`.

**n-divider** -- Horizontal/vertical rule with optional text label. Attribute: `orientation` (vertical). Empty = line; with text = line segments flanking label.

**n-inset** -- Inline-start indentation via `padding-inline-start`. No attributes.

**n-toolbar** -- Horizontal action bar with `role="toolbar"` and roving focus. Elevation: `--n-panel`. Children shrink-wrap by default. Per-item `[fill]` grows one child; toolbar-level `[fill]` grows all. Overflow menu via `[data-overflow]` system. Attributes: `padding`, `fill`.

## App Layout (`@nonoun/native-app`)

Separate package. Full-page layout with collapsible sidebar.

```
native-app                         <- flex row, height: 100dvh
+-- [slot="sidebar"]               <- sticky aside (resizable, collapsible to 48px)
|   +-- n-sidebar-header           <- absolute overlay, top
|   +-- n-sidebar-content          <- scrollable, mask-image fade edges
|   |   +-- n-sidebar-nav          <- keyboard nav + selection
|   |   |   +-- n-sidebar-group    <- collapsible (<details>), flyout when collapsed
|   |   |   +-- n-sidebar-nav-item <- leaf item
|   |   +-- n-sidebar-item         <- generic row (icon + label + trailing)
|   +-- n-sidebar-footer           <- absolute overlay, bottom
+-- [content column]               <- flex column
    +-- n-app-breadcrumb           <- grid bar (leading / label / trailing slots)
    +-- n-app-canvas               <- flex row
        +-- n-app-panel            <- flex-1 scrollable (main mode)
        +-- n-app-panel[aside]     <- collapsible side panel (aside mode)
```

Collapsed: `[collapsed]` on `native-app` shrinks aside to 48px icon rail. Components respond via `@container sidebar (max-width: 80px)`.

## Elevation Model

| Level | Token | Containers |
|-------|-------|------------|
| body | `--n-body` | `:root` default |
| control | `--n-control` | Form inputs (empty state) |
| panel | `--n-panel` | n-toolbar, n-app-panel, filled inputs |
| button | `--n-button` | Button chrome |
| widget | `--n-widget` | Checkbox/radio/switch |
| card | `--n-card` | n-card |
