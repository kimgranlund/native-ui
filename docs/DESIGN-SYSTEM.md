# Design System

OKLCH-based CSS design system with automatic dark mode via `light-dark()`. No class toggles, no JS theme switching.

Source: `src/styles/n-primitives.css`, `n-tokens.css`, `n-themes.css`, `n-base.css`, `n-components.shared.css`.

## CSS Layers

```css
@layer colors;   /* color primitives -- env params, OKLCH ramps, scrims */
@layer tokens;   /* semantic color tokens -- ground, ink, border, surface */
@layer ui;       /* geometry tokens, attribute selectors, components */
```

`n-themes.css` is intentionally unlayered -- `:where()` selectors at zero specificity.

## Dark Mode Mechanism: `light-dark()`

`:root` declares `color-scheme: light dark`. All mode-aware tokens use the CSS `light-dark()` function:

```css
--n-color-neutral-050: light-dark(var(--n-color-neutral-1), var(--n-color-neutral-11));
```

The browser picks the first value in light mode, the second in dark mode. No `@media (prefers-color-scheme)`, no `.dark` class, no JS runtime. The entire palette flips automatically.

## Color System

All colors are computed in OKLCH (`oklch(L C H)`) from 9 environment parameters on `:root`.

### Environment Parameters (9 knobs)

| Token | Default | Controls |
|-------|---------|----------|
| `--n-env-lightness-min` | `0.15` | Darkest point of all ramps |
| `--n-env-lightness-max` | `1.0` | Lightest point of all ramps |
| `--n-env-lightness-delta` | `0.015` | Micro-step between elevation levels |
| `--n-env-chroma` | `0.2` | Global chroma ceiling |
| `--n-env-chroma-k-muted` | `0.125` | Multiplier for muted backgrounds (elevation/brightness) |
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

`--n-env-chroma-{f}` is a family-local multiplier (0.0--1.0), not the final chroma. Final chroma = `env-chroma * chroma-k-{step} * env-chroma-{f}`.

### Ramp Generation Pipeline

Each family produces an 11-step color ramp (050--950). The pipeline:

```
env params → chroma coefficients → per-step chroma → lightness ramp → raw oklch → semantic light-dark
```

#### Step 1: Chroma Coefficients (symmetric bell curve)

6 coefficients (`--n-C-t-0` to `--n-C-t-5`) linearly interpolate from `chroma-k-edge` to `chroma-k-vivid`:

```
t-0 = env-chroma * chroma-k-edge                              (edges: 050, 950)
t-1 = env-chroma * (4/5 * chroma-k-edge + 1/5 * chroma-k-vivid)  (100, 900)
t-2 = env-chroma * (3/5 * chroma-k-edge + 2/5 * chroma-k-vivid)  (200, 800)
t-3 = env-chroma * (2/5 * chroma-k-edge + 3/5 * chroma-k-vivid)  (300, 700)
t-4 = env-chroma * (1/5 * chroma-k-edge + 4/5 * chroma-k-vivid)  (400, 600)
t-5 = env-chroma * chroma-k-vivid                              (500 = peak)
```

**Symmetric mapping** -- the same coefficient applies to mirror steps:

| Step | 050 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| Coeff | t-0 | t-1 | t-2 | t-3 | t-4 | t-5 | t-4 | t-3 | t-2 | t-1 | t-0 |

With defaults (`edge=0.05`, `vivid=1.0`): edges are nearly achromatic (0.01), center is at full chroma (0.2).

#### Step 2: Per-Step Chroma

Each family multiplies the shared coefficient by its own chroma factor:

```
C-{family}-{n} = C-t-{i} * env-chroma-{family}
```

Example: `--n-C-accent-6 = C-t-5 * 1.0 = 0.2` (full vivid). `--n-C-neutral-6 = C-t-5 * 0.125 = 0.025` (subtle).

#### Step 3: Muted Chroma (for backgrounds)

A flat chroma value used by elevation and brightness aliases:

```
C-muted = env-chroma * chroma-k-muted
C-{family}-muted = C-muted * env-chroma-{family}
```

With defaults: `C-muted = 0.2 * 0.125 = 0.025`. `C-neutral-muted = 0.025 * 0.125 = 0.003125` (nearly grey).

#### Step 4: Lightness Ramp (13 internal, 11 public)

Internal ramp has 13 steps. Steps 1 and 13 are skipped (never pure white/black). 11 public steps map to internal 2--12.

**Upper half** (steps 1--6): linear from `L-max` to `L-{family}`:

```
L-{f}-n = L-max - n/6 * (L-max - L-{f})       for n = 1..5
L-{f}-6 = L-{f}                                 (anchor = family midpoint)
```

**Lower half** (steps 7--11): linear from `L-{family}` to `L-min`:

```
L-{f}-n = L-{f} - (n-6)/6 * (L-{f} - L-min)    for n = 7..11
```

Example for neutral (`L-{f}=0.50`): step 1 = 0.917, step 6 = 0.50, step 11 = 0.208.

#### Step 5: Raw Color Assembly

66 raw colors (11 steps x 6 families), mode-independent:

```css
--n-color-neutral-1: oklch(var(--n-L-neutral-1) var(--n-C-neutral-1) var(--n-env-hue-neutral));
/* ... through ... */
--n-color-neutral-11: oklch(var(--n-L-neutral-11) var(--n-C-neutral-11) var(--n-env-hue-neutral));
```

Raw step 1 = lightest, raw step 11 = darkest. These never change with color scheme.

#### Step 6: Semantic Ramp (light-dark flip)

11 public steps (050--950) wrap raw steps in `light-dark()` with mirror mapping:

```
050 = light-dark(raw-1,  raw-11)    lightest in light / darkest in dark
100 = light-dark(raw-2,  raw-10)
200 = light-dark(raw-3,  raw-9)
300 = light-dark(raw-4,  raw-8)
400 = light-dark(raw-5,  raw-7)
500 = light-dark(raw-6,  raw-6)     anchor: same raw tone in both modes
600 = light-dark(raw-7,  raw-5)
700 = light-dark(raw-8,  raw-4)
800 = light-dark(raw-9,  raw-3)
900 = light-dark(raw-10, raw-2)
950 = light-dark(raw-11, raw-1)     darkest in light / lightest in dark
```

**Key insight**: 050 is always "closest to page background" and 950 is always "farthest from page background", regardless of mode. 500 is perceptually identical in both modes.

**Anchor alias**: `--n-color-{family}` = `--n-color-{family}-500`.

### Background Lightness Ramps (for elevation & brightness)

Two 7-step ramps, shared across all families. These use `--n-env-lightness-delta` for micro-steps:

**Light ramp** (steps from L-max downward):

```
L-light-1 = L-max                          (1.0000)
L-light-2 = L-max - 1 * delta              (0.9850)
L-light-3 = L-max - 2 * delta              (0.9700)
L-light-4 = L-max - 3 * delta              (0.9550)
L-light-5 = L-max - 4 * delta              (0.9400)
L-light-6 = L-max - 5 * delta              (0.9250)
L-light-7 = L-max - 6 * delta              (0.9100)
```

**Dark ramp** (steps from L-min upward):

```
L-dark-1 = L-min                            (0.1500)
L-dark-2 = L-min + 1 * delta               (0.1650)
L-dark-3 = L-min + 2 * delta               (0.1800)
L-dark-4 = L-min + 3 * delta               (0.1950)
L-dark-5 = L-min + 4 * delta               (0.2100)
L-dark-6 = L-min + 5 * delta               (0.2250)
L-dark-7 = L-min + 6 * delta               (0.2400)
```

Both ramps use **muted chroma** and the family's hue.

### Elevation Aliases (`lowest`..`highest`)

Mode-relative backgrounds. Same step number in both modes -- "higher" always means "more elevated" in the UI, regardless of whether the page is light or dark:

```
lowest  = light-dark(oklch(L-light-1 C-muted H), oklch(L-dark-1 C-muted H))
lower   = light-dark(oklch(L-light-2 C-muted H), oklch(L-dark-2 C-muted H))
low     = light-dark(oklch(L-light-3 C-muted H), oklch(L-dark-3 C-muted H))
base    = light-dark(oklch(L-light-4 C-muted H), oklch(L-dark-4 C-muted H))
high    = light-dark(oklch(L-light-5 C-muted H), oklch(L-dark-5 C-muted H))
higher  = light-dark(oklch(L-light-6 C-muted H), oklch(L-dark-6 C-muted H))
highest = light-dark(oklch(L-light-7 C-muted H), oklch(L-dark-7 C-muted H))
```

Token: `--n-color-{family}-{level}`. Example: `--n-color-neutral-low`, `--n-color-accent-highest`.

In light mode, "higher" = slightly darker (descending from white). In dark mode, "higher" = slightly lighter (ascending from black). The visual hierarchy is preserved: elevated surfaces stand out from the page regardless of mode.

### Brightness Aliases (`brightest`..`dimmest`)

Absolute brightness -- "brightest" is always perceptually the brightest color, regardless of mode. **Flipped step mapping** across modes:

```
brightest = light-dark(oklch(L-light-1 C-muted H), oklch(L-dark-7 C-muted H))
brighter  = light-dark(oklch(L-light-2 C-muted H), oklch(L-dark-6 C-muted H))
bright    = light-dark(oklch(L-light-3 C-muted H), oklch(L-dark-5 C-muted H))
dim       = light-dark(oklch(L-light-5 C-muted H), oklch(L-dark-3 C-muted H))
dimmer    = light-dark(oklch(L-light-6 C-muted H), oklch(L-dark-2 C-muted H))
dimmest   = light-dark(oklch(L-light-7 C-muted H), oklch(L-dark-1 C-muted H))
```

Token: `--n-color-{family}-{brightness}`. Example: `--n-color-neutral-bright`, `--n-color-danger-dimmest`.

Note: there is no `base`-equivalent in the brightness scale (6 steps, not 7). Light step 4 / dark step 4 is skipped.

**Elevation vs brightness**: Elevation preserves hierarchy across modes (lowest is always the page background). Brightness preserves perceived lightness (brightest is always near-white). Use elevation for UI layering, brightness for decorative or emphasis backgrounds.

### Scrims (Semi-Transparent Colors)

Three scrim systems, each for different use cases:

#### 1. Numeric Scrims (050--950 at alpha)

Same L/C/H as the solid ramp, with `env-alpha` opacity. Token: `--n-color-{family}-{step}-scrim`.

```css
--n-color-neutral-500-scrim: oklch(L C H / var(--n-env-alpha));
```

Semantic versions follow the same `light-dark()` mirror as solids:

```css
--n-color-neutral-050-scrim: light-dark(var(--n-color-neutral-1-scrim), var(--n-color-neutral-11-scrim));
```

Anchor alias: `--n-color-{family}-scrim` = `--n-color-{family}-500-scrim`.

**Used for**: borders (`--n-border-neutral: var(--n-color-neutral-200-scrim)`), focus rings, disabled states.

#### 2. Tint Scrims (toward lightness-max)

7 intensity levels from anchor lightness toward `L-max`. Both lightness and alpha decrease together:

```
strongest = oklch(L-{f}           C-anchor H / env-alpha)
stronger  = oklch(L-{f} + 1/6*d  C-anchor H / 6/7 * env-alpha)
strong    = oklch(L-{f} + 2/6*d  C-anchor H / 5/7 * env-alpha)
base      = oklch(L-{f} + 3/6*d  C-anchor H / 4/7 * env-alpha)
weak      = oklch(L-{f} + 4/6*d  C-anchor H / 3/7 * env-alpha)
weaker    = oklch(L-{f} + 5/6*d  C-anchor H / 2/7 * env-alpha)
weakest   = oklch(L-max           C-anchor H / 1/7 * env-alpha)
```

Where `d = L-max - L-{f}` and `C-anchor = C-{family}-6` (peak chroma).

Token: `--n-color-{family}-scrim-tint-{intensity}`.

**Used for**: disabled ink/borders (e.g., `--n-ink-disabled-neutral: var(--n-color-neutral-scrim-tint-weaker)`).

#### 3. Shade Scrims (toward lightness-min)

Same structure as tints but lightness decreases toward `L-min`:

```
strongest = oklch(L-{f}           C-anchor H / env-alpha)
stronger  = oklch(L-{f} - 1/6*d  C-anchor H / 6/7 * env-alpha)
...
weakest   = oklch(L-min           C-anchor H / 1/7 * env-alpha)
```

Where `d = L-{f} - L-min`.

Token: `--n-color-{family}-scrim-shade-{intensity}`.

**Note**: Tint and shade scrims are mode-independent (no `light-dark()` wrapper). They always tint toward white or shade toward black.

## Themes

Apply via attribute: `<html theme="forest">`. Override any `--n-env-*` token.

Built-in themes override hue and chroma for neutral and accent families using `:where()` selectors (zero specificity):

| Theme | Neutral Hue | Neutral Chroma | Accent Hue | Accent Chroma | Extra |
|-------|-------------|----------------|------------|---------------|-------|
| `forest` | 155 | 0.25 | 155 | 1.0 | -- |
| `rose` | 350 | 0.35 | 350 | 1.0 | -- |
| `zinc` | 240 | 0.15 | 240 | 1.0 | `--n-env-chroma: 0.18` |

**How themes work**: Changing hue/chroma env params causes the entire color system to recalculate. All ramps, scrims, elevation, and brightness aliases recompute automatically because they reference the env params via `calc()`. Lightness is NOT overridden -- the perceptual brightness of all families stays consistent. Only the hue and saturation shift.

**Custom themes**: Override any `--n-env-*` on `:root` or any ancestor:

```css
:root {
  --n-env-hue-neutral: 280;
  --n-env-hue-accent: 280;
  --n-env-chroma-neutral: 0.3;
}
```

## Two-Tier Token Model

### Tier 1: Definitions (`--n-{role}[-{modifier}]-{family}`)

Per-family tokens on `:root` in `@layer tokens`. Never change at runtime. Map color primitives to UI roles.

- **Roles**: doc, body, panel, control, button, card, modal, ink, border, surface, surface-ink
- **Modifiers**: hover, active, disabled, muted, strong, inverse, placeholder
- **Families**: neutral, accent, info, success, warning, danger

Examples: `--n-panel-neutral`, `--n-ink-muted-danger`, `--n-surface-ink-hover-info`

#### How Tier 1 maps primitives to roles

Grounds (backgrounds by elevation):

| Role | Primitive used | Meaning |
|------|---------------|---------|
| `doc` | `--n-color-{f}-dimmer` | Deepest page background |
| `body` | `--n-color-{f}-low` | Default page ground |
| `panel` | `--n-color-{f}-bright` | Toolbar, sidebar |
| `control` | `--n-color-{f}-base` | Empty form inputs |
| `button` | `--n-color-{f}-higher` | Button chrome |
| `card` | `--n-color-{f}-brighter` | Card surface |
| `modal` | `--n-color-{f}-brightest` | Dialog surface |

Ink (text/icons):

| Role | Primitive used |
|------|---------------|
| `ink` | `--n-color-{f}-700` |
| `ink-strong` | `--n-color-{f}-950` |
| `ink-muted` | `--n-color-{f}-600` |
| `ink-placeholder` | `--n-color-{f}-400` |
| `ink-inverse` | `--n-color-{f}-11` (raw, never flips) |
| `ink-disabled` | `--n-color-{f}-scrim-tint-weaker` |

Borders: use numeric scrim steps (`--n-color-{f}-{step}-scrim`).

Surfaces (interactive fills like buttons/badges): use numeric solid steps (`--n-color-{f}-500`, `400`, `600`).

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

## Token Naming Quick Reference

| Pattern | Layer | Example |
|---------|-------|---------|
| `--n-env-*` | primitives | `--n-env-hue-accent`, `--n-env-chroma` |
| `--n-C-*`, `--n-L-*` | primitives (internal) | `--n-C-neutral-6`, `--n-L-light-3` |
| `--n-color-{f}-{step}` | primitives | `--n-color-accent-500`, `--n-color-danger-050` |
| `--n-color-{f}-{step}-scrim` | primitives | `--n-color-neutral-200-scrim` |
| `--n-color-{f}-scrim-tint-{i}` | primitives | `--n-color-accent-scrim-tint-weaker` |
| `--n-color-{f}-scrim-shade-{i}` | primitives | `--n-color-danger-scrim-shade-strong` |
| `--n-color-{f}-{elevation}` | primitives | `--n-color-neutral-low`, `--n-color-accent-highest` |
| `--n-color-{f}-{brightness}` | primitives | `--n-color-neutral-bright`, `--n-color-info-dimmest` |
| `--n-{role}[-{mod}]-{f}` | tokens (Tier 1) | `--n-panel-hover-accent`, `--n-ink-muted-danger` |
| `--n-{role}[-{mod}]` | tokens (Tier 2) | `--n-panel`, `--n-ink-muted`, `--n-border-hover` |
