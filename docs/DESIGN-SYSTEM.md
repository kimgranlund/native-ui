# Design System

OKLCH-based CSS design system with automatic dark mode via `light-dark()`. No class toggles.

Source: `src/styles/colors.primitives.css`, `colors.tokens.css`, `themes.css`, `n.base.css`, `n.primitives.css`.

## CSS Layers

```css
@layer colors;   /* color primitives -- env params, OKLCH ramps, scrims */
@layer tokens;   /* semantic color tokens -- ground, ink, border, surface */
@layer ui;       /* geometry tokens, attribute selectors, components */
```

`themes.css` is intentionally unlayered -- `:where()` selectors at zero specificity.

## Color System

All colors computed in OKLCH from 9 environment parameters on `:root`:

| Token | Default | Controls |
|-------|---------|----------|
| `--n-env-lightness-min` | `0.15` | Darkest point of all ramps |
| `--n-env-lightness-max` | `1.0` | Lightest point of all ramps |
| `--n-env-lightness-delta` | `0.015` | Micro-step between elevation levels |
| `--n-env-chroma` | `0.2` | Global chroma ceiling |
| `--n-env-chroma-k-muted` | `0.125` | Multiplier for muted backgrounds |
| `--n-env-chroma-k-vivid` | `1.0` | Multiplier for vivid center (step 500) |
| `--n-env-chroma-k-edge` | `0.05` | Multiplier for edge steps (050, 950) |
| `--n-env-alpha` | `0.85` | Base alpha for scrims |
| `--n-env-alpha-delta` | `0.02` | Alpha step between scrim levels |

### 6 Color Families

Each has `--n-env-hue-{f}`, `--n-env-chroma-{f}`, `--n-env-lightness-{f}`:

| Family | Hue | Chroma | Lightness |
|--------|-----|--------|-----------|
| `neutral` | 230 | 0.125 | 0.50 |
| `accent` | 230 | 1.0 | 0.60 |
| `info` | 250 | 0.60 | 0.60 |
| `success` | 150 | 0.75 | 0.55 |
| `warning` | 80 | 0.95 | 0.75 |
| `danger` | 20 | 0.85 | 0.50 |

Each family generates: 11-step solid ramp (050--950), elevation aliases (`lowest`..`highest`), brightness aliases (`brightest`..`dimmest` -- flipped across modes), scrim ramps (semi-transparent tints/shades).

**Themes**: `<html theme="forest">`. Built-in: `forest`, `rose`, `zinc`. Override env params with `:where()`.

## Two-Tier Token Model

### Tier 1: Definitions (`--n-{role}[-{modifier}]-{family}`)

Per-family tokens on `:root` in `@layer tokens`. Never change at runtime.

- **Roles**: doc, body, panel, control, button, card, modal, ink, border, surface, surface-ink
- **Modifiers**: hover, active, disabled, muted, strong, inverse, placeholder
- **Families**: neutral, accent, info, success, warning, danger

Examples: `--n-panel-neutral`, `--n-ink-muted-danger`, `--n-surface-ink-hover-info`

### Tier 2: Resolved (`--n-{role}`)

Default to neutral. `[intent]` attribute remaps to the target family. Components read only Tier 2.

### Color Resolution (2 hops)

```
--n-panel-accent    --> "what color?"   (Tier 1, @layer tokens)
--n-panel           --> "which family?" (Tier 2, set by [intent])
--n-background      --> "what role?"    (component default or [variant])
background:         --> apply
```

## Intent & Variant

**Intent** sets the color family via `[intent]` attribute. Inherits to descendants.

**Variant** sets the chrome via `[variant]` attribute at `(0,1,0)` specificity:

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `primary` | `--n-surface` (filled) | `--n-surface-ink` | transparent |
| `secondary` | `--n-button` | `--n-ink` | `--n-border-muted` |
| `default` | `--n-button-neutral` (always neutral) | `--n-ink` (intent-colored) | `--n-border-muted-neutral` |
| `ghost` | transparent | `--n-ink` | transparent |
| `outline` | transparent | `--n-ink` | `--n-border` |
| `selected` | white | `--n-ink-inverse` | transparent |
| `plain` | transparent | `--n-ink` | transparent, radius 0 |

## Size Scale

Applied via `[size]`. Each size sets `--n-size`, `--n-font-size`, `--n-space`, `--n-icon-size`, `--n-widget-size`:

| Size | `--n-size` | `--n-font-size` | `--n-icon-size` |
|------|-----------|----------------|----------------|
| `xs` | 1.5rem | 0.75rem | 0.75rem |
| `sm` | 1.75rem | 0.8125rem | 0.875rem |
| `md` (default) | 2.25rem | 0.875rem | 1rem |
| `lg` | 2.75rem | 0.9375rem | 1.125rem |
| `xl` | 3.25rem | 1rem | 1.25rem |

## Spacing & Density

| Need | Formula |
|------|---------|
| Block padding | `var(--n-space)` |
| Inline padding | `calc(var(--n-space-k) * var(--n-space))` |
| Component gap | `calc(var(--n-space) * 2)` |

Density controls `--n-space-k`: `[density="compact"]` = 2, default = 4, `[density="loose"]` = 6.

## Radius

`[radius="sharp"]` = 0.125rem, `[radius="rounded"]` = `space * 2`, `[radius="round"]` (default) = `min(size/2, 1.125rem)`.

## Elevation

| Level | Token | Usage |
|-------|-------|-------|
| doc | `--n-doc-neutral` | `:root` background (Tier 1 only, no resolved shorthand) |
| body | `--n-body` | Default `--n-ground` |
| control | `--n-control` | Empty form inputs |
| panel | `--n-panel` | Toolbars, sidebars, filled inputs |
| button | `--n-button` | Button chrome |
| widget | `--n-widget` | Checkbox/radio/switch base |
| card | `--n-card` | Cards |

## Specificity

| Layer | Specificity | Mechanism |
|-------|-------------|-----------|
| Component CSS | (0,0,0) | `:where(n-button)` |
| Attribute selectors | (0,1,0) | `[variant="primary"]` |
| Consumer CSS | (0,1,0)+ | Later source order |

Rules: never `!important`, no fallback chains `var(--n-X, var(--n-Y))`.

## Other Tokens

| Token | Default | Purpose |
|-------|---------|---------|
| `--n-font-family` | `system-ui, -apple-system, sans-serif` | Body font |
| `--n-font-family-mono` | `ui-monospace, SFMono-Regular, ...` | Code font |
| `--n-button-font-weight` | 500 | Button labels |
| `--n-control-line-height` | 1 | Interactive elements |
| `--n-text-line-height` | 1.5 | Body text |
| `--n-duration` | 0.225s | Transition duration (0s with reduced-motion) |
| `--n-easing` | `cubic-bezier(0.2, 0, 0, 1)` | Transition easing |
| `--n-focus-ring` | `--n-color-accent-600-scrim` | Focus outline (accent, ignores intent) |
| `--n-shadow-xs..xl` | Increasing elevation | Box shadows |
