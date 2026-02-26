# src/styles/ — CSS Design System

## File Dependency Order

```
colors.primitives.css → colors.tokens.css → themes.css → ui.primitives.css → ui.button.css
```

Do not reorder imports in `index.css` — the cascade depends on it.

## Color System

### Environment Parameters (colors.primitives.css)
9 master knobs on `:root` control the entire palette:
- Lightness range: `--color-env-lightness-min/max/delta`
- Chroma scaling: `--color-env-chroma`, `-k-muted`, `-k-vivid`, `-k-edge`
- Opacity: `--color-env-alpha`, `-alpha-delta`

Per-family overrides: `--color-env-hue-{family}`, `--color-env-chroma-{family}`, `--color-env-lightness-{family}`

### 6 Color Families
`neutral`, `accent`, `info`, `success`, `warning`, `danger`

### Semantic Color Tokens (colors.tokens.css)
Per family, 49 tokens:
- **Grounds** (6 levels x 4 states = 24): doc, body, panel, control, card, modal
- **Ink** (7): default, strong, muted, placeholder, hover, active, disabled
- **Stroke** (5): default, muted, hover, active, disabled
- **Surface** (4): default, hover, active, disabled
- **Surface Ink** (4): default, hover, active, disabled
- **Outline** (5): default, muted, hover, active, disabled

Ground elevation order: doc (lowest) → body → panel → control → card → modal (brightest)

### Elevation vs Brightness
- **Elevation** aliases (`lowest`→`highest`): same visual step in both light/dark modes
- **Brightness** aliases (`brightest`→`dimmest`): flip across modes (brightest is always perceptually brightest)

## UI Primitives

### Public Scale Tokens (--ui-*)
5 scales: `xs`, `sm`, `md`, `lg`, `xl`
5 properties per scale: `size`, `font`, `tracking`, `space`, `radius`
Constants: `--ui-radius-sharp`, `--ui-duration`, `--ui-easing`
Typography: `--ui-font-weight-button/input/text`, `--ui-line-height-control/text`

### Local Tokens (--_*)
Set by `:where([size/density/radius/intent/variant="*"])` selectors.

Geometry locals: `--_min-height`, `--_font-size`, `--_letter-spacing`, `--_space`, `--_radius`, `--_space-k`
Typography locals: `--_line-height`, `--_font-weight`
Animation locals: `--_duration`, `--_easing`
Color role locals: `--_panel`, `--_surface`, `--_surface-ink`, `--_border`, `--_ink` (each with state suffixes)
Global focus ring: `--ui-focus-ring` (single accent-colored token, not per-intent)
Component output locals: `--_background`, `--_color`, `--_border-color` (each with -hover/-active/-disabled)

### Intent → Variant Flow
`[intent]` sets `--_panel`, `--_surface`, `--_ink`, etc. (which family)
`[variant]` reads those to set `--_background`, `--_color`, `--_border-color` (which role)

### Variant Behaviors
- **primary**: surface fill, surface-ink text, no border
- **secondary**: panel fill, ink text, border-muted border
- **default**: neutral panel fill, intent ink text, neutral border
- **ghost**: transparent fill (panel on hover), ink text, no border (border on hover)
- **outline**: transparent fill (panel on hover), ink text, border

### Density
Single multiplier `--_space-k`: loose=6, default=4, compact=2
Applied via `calc(var(--_space-k) * var(--_space))` for padding-inline.

## Button Component (ui.button.css)

Grid layout: `[leading] [label] [trailing]`
- 3-column grid when label present (balances empty slots)
- Collapses to single column in icon-only mode (no `[slot="label"]`)
- Empty children hidden in icon-only mode

Overrides from text defaults: `--_font-weight: var(--ui-font-weight-button)`, `--_line-height: var(--ui-line-height-control)`

Focus ring: `outline: 2px solid var(--ui-focus-ring)` — global accent color, does not follow intent.

## Themes (themes.css)

Override `--color-env-hue-*` and `--color-env-chroma-*` per family via `:where([theme="name"])`.
Current themes: `forest`, `rose`, `zinc`.

## CSS Build Output

`scripts/build-css.mjs` auto-discovers CSS files in `src/components/` and `src/containers/` (matching `ui-*.css`). No manual registration needed for new components.

**Output files:**
| File | Contents |
|------|----------|
| `dist/foundation.css` | 5 foundation files (colors → tokens → themes → base → primitives) |
| `dist/components.css` | All component/container CSS (incl. `force-*` debug selectors) |
| `dist/components-lean.css` | Same as above, minus `force-*` debug selectors |
| `dist/native-ui.css` | foundation + components |
| `dist/native-ui-lean.css` | foundation + components-lean (production recommended) |

**Lean variants** strip `force-hover`, `force-active`, `force-focus`, `force-focus-visible` attribute selectors — dev-only debug selectors used for state demos and visual testing. The `stripDebugSelectors()` function removes comma-separated `[force-*]` alternative selectors via regex.

## Icons (icons.ts)

30 SVG sprites as ESM string exports. All use `stroke="currentColor"`, `fill="none"`, 24x24 viewBox, stroke-width 2. Dynamic lookup via `icons` Record.
