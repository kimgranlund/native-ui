# Color Token Architecture

## Driving Principle

Define a small set of environment-level parameters. Derive the entire palette mathematically — across light and dark modes, across all semantic families, across every role a color can play.

*What is the minimum set of knobs that can produce a complete, coherent, adaptive color system?*

---

## Naming Convention

```
--name       input (tunable) or public output token
--_name      derived intermediate (internal, do not consume)
```

**Inputs** are the knobs a consumer can override: `--color-env-*` params — both global (lightness bounds, chroma, alpha) and per-family (`--color-env-hue-{family}`, `--color-env-chroma-{family}`, `--color-env-lightness-{family}`).

**Public outputs** are the tokens components should reference. These come in two tiers: **raw tokens** (`--neutral-6`, `--accent-1`) are mode-independent oklch values; **semantic tokens** (`--neutral-500`, `--accent-050`, `--neutral-300-scrim`) are light-dark wrappers that invert for dark mode. Background aliases (`--accent-low`) and anchor aliases (`--accent`, `--accent-scrim`) are also public.

**Derived intermediates** (`--_`) are computation scaffolding — interpolation coefficients, per-step chroma, resolved lightness values, raw light/dark background ramps. They exist so the math is readable, but consumers should never reference them directly.

---

## Color Space

**oklch** — perceptually uniform. A given lightness value looks equally bright regardless of hue. This is what makes lightness arithmetic reliable. HSL and hex cannot do this.

Cylindrical coordinates (L, C, H) map directly to the architecture:
- **L** (lightness): controlled by environment params and role derivation
- **C** (chroma): controlled by family C-mult against environment range
- **H** (hue): owned by each family

---

## Three Layers

### Environment → Family → Role

**Environment** is the shared physics — the lightness bounds, chroma range, and step deltas that govern how all colors behave. These are universal constraints every family inherits.

**Family** is semantic identity — neutral, accent, info, success, warning, danger. Each family owns a hue, a chroma multiplier, and a lightness anchor.

**Role** is functional purpose — what the color *does* in a UI: background a surface, color a foreground element, overlay a scrim.

---

## CSS Layer

```css
@layer colors { :root { … } }
```

All color tokens live in a single `@layer colors` containing one `:root` block. Internally organized by section comments into three logical groups:

| Section | Contents | Visibility |
|---|---|---|
| Constants | `color-scheme`, `--color-env-*` params (global + per-family) | input knobs |
| Derived | `--_C-t-*`, `--_C-muted`, `--_L-light/dark-*`, `--_C-{family}-*`, `--_L-{family}-{n}` | internal (`--_`) |
| Raw tokens | Solid raw (1–11), scrim raw (1–11-scrim) — mode-independent oklch values | public (low-level) |
| Semantic tokens | Solid semantic (050–950), scrim semantic (050–950-scrim) — light-dark wrappers over raw tokens | public API |
| Aliases | Anchor aliases, elevation/brightness aliases | public API |

Custom properties on `:root` are unaffected by layer specificity — the single layer keeps the entire color system in one cascade unit, making it easy for downstream layers to override.

---

## Environment Parameters (9 knobs)

```css
:root {
  --color-env-lightness-min:      0.125;   /* darkest bound */
  --color-env-lightness-max:      1.000;   /* lightest bound */
  --color-env-lightness-delta:    0.025;   /* L step between adjacent background levels */

  --color-env-chroma:          0.220;   /* base chroma */
  --color-env-chroma-k-muted:  0.125;   /* chroma coefficient for surfaces */
  --color-env-chroma-k-vivid:  1.000;   /* chroma coefficient for solids (anchor) */
  --color-env-chroma-k-edge:   0.125;   /* chroma coefficient for solid edges (050, 950) */

  --color-env-alpha:          0.800;   /* scrim alpha */
  --color-env-alpha-delta:    0.025;   /* alpha step between adjacent scrim levels */
}
```

L-min and L-max are absolute — they do not change between themes. The light/dark inversion is handled at the role layer via `light-dark()`.

Chroma is split by role. `C` is the base chroma. `C-k-muted` scales surfaces (near-achromatic tinting). Solids use `C-k-edge` at the ramp edges and `C-k-vivid` at the anchor, with linear interpolation between. All `C-k-*` coefficients (including per-family `--color-env-chroma-{family}`) are scaling factors on `C`.

---

## Family Definitions (6 families)

Each family defines: **hue**, **chroma** (0–1 scaling factor), and **lightness** (the anchor L value for the solid ramp). These live in the constants layer under the `--color-env-*` namespace.

```css
:root {
  --color-env-hue-neutral: 225;   --color-env-chroma-neutral: 0.125;  --color-env-lightness-neutral: 0.500;
  --color-env-hue-accent:  225;   --color-env-chroma-accent:  1.0;     --color-env-lightness-accent:  0.600;
  --color-env-hue-info:    250;   --color-env-chroma-info:    0.60;    --color-env-lightness-info:    0.600;
  --color-env-hue-success: 145;   --color-env-chroma-success: 0.75;    --color-env-lightness-success: 0.550;
  --color-env-hue-warning:  95;   --color-env-chroma-warning: 0.95;    --color-env-lightness-warning: 0.750;
  --color-env-hue-danger:   25;   --color-env-chroma-danger:  0.85;    --color-env-lightness-danger:  0.500;
}
```

### Computed Chroma

**`color-env-chroma` is baked into the derived coefficients**, so it only appears once — in the `C-t` and `C-muted` definitions. All downstream formulas are simple two-term products.

**Solids** use 6 precomputed interpolation coefficients (`--_C-t-0` through `--_C-t-5`) that lerp from `C-k-edge` to `C-k-vivid`, pre-multiplied by `color-env-chroma`:

```css
--_C-t-0: calc(var(--color-env-chroma) * var(--color-env-chroma-k-edge));                                                    /* edge */
--_C-t-1: calc(var(--color-env-chroma) * (4 / 5 * var(--color-env-chroma-k-edge) + 1 / 5 * var(--color-env-chroma-k-vivid)));
--_C-t-2: calc(var(--color-env-chroma) * (3 / 5 * var(--color-env-chroma-k-edge) + 2 / 5 * var(--color-env-chroma-k-vivid)));
--_C-t-3: calc(var(--color-env-chroma) * (2 / 5 * var(--color-env-chroma-k-edge) + 3 / 5 * var(--color-env-chroma-k-vivid)));
--_C-t-4: calc(var(--color-env-chroma) * (1 / 5 * var(--color-env-chroma-k-edge) + 4 / 5 * var(--color-env-chroma-k-vivid)));
--_C-t-5: calc(var(--color-env-chroma) * var(--color-env-chroma-k-vivid));                                                    /* anchor */
```

Per-step chroma is then a simple product: `C(n) = C-t-{i} x color-env-chroma-{family}`, where `n` is the raw step 1-11 and `i` is the symmetric coefficient index 0-5.

**Surfaces** get a flat chroma via a similar pattern:

```css
--_C-muted: calc(var(--color-env-chroma) * var(--color-env-chroma-k-muted));
--_C-{family}-muted: calc(var(--_C-muted) * var(--color-env-chroma-{family}));
```

The ramp is symmetric — raw steps use the same coefficient mirrored about the anchor (raw step 6):

| Raw step | Semantic (light) | Semantic (dark) | Coefficient |
|----------|-------------------|-----------------|-------------|
| 1, 11 | 050, 950 | 950, 050 | `--_C-t-0` (edge) |
| 2, 10 | 100, 900 | 900, 100 | `--_C-t-1` |
| 3, 9  | 200, 800 | 800, 200 | `--_C-t-2` |
| 4, 8  | 300, 700 | 700, 300 | `--_C-t-3` |
| 5, 7  | 400, 600 | 600, 400 | `--_C-t-4` |
| 6     | 500      | 500      | `--_C-t-5` (vivid) |

`C-k-edge` controls how much color the extremes retain; raw step 6 (semantic 500) reaches full `C-k-vivid` chroma.

### Lightness

Each family's `--color-env-lightness-{family}` is a direct constant — the anchor L value for the solid ramp (raw step 6 / semantic step 500). The derived layer reads it directly (no intermediate var).

Lightness uses an internal 13-step ramp (L-max to lightness to L-min in 6 intervals per half), but the 11 public raw steps map to internal steps 2-12, skipping 1 and 13. This means **raw step 1 never reaches pure white** and **raw step 11 never reaches pure black** -- the extremes stay one step inward from L-max/L-min.

Internal vars use `--_L-{family}-{n}` where `n` is the raw step number 1-11:

| Raw step | Internal step | Lightness formula | Region |
|----------|---------------|-------------------|--------|
| 1 | 2 | L-max - 1/6 x (L-max - lightness) | light half (above anchor) |
| 2 | 3 | L-max - 2/6 x (L-max - lightness) | light half |
| 3 | 4 | L-max - 3/6 x (L-max - lightness) | light half |
| 4 | 5 | L-max - 4/6 x (L-max - lightness) | light half |
| 5 | 6 | L-max - 5/6 x (L-max - lightness) | light half |
| 6 | 7 | lightness (anchor) | anchor |
| 7 | 8 | lightness - 1/6 x (lightness - L-min) | dark half (below anchor) |
| 8 | 9 | lightness - 2/6 x (lightness - L-min) | dark half |
| 9 | 10 | lightness - 3/6 x (lightness - L-min) | dark half |
| 10 | 11 | lightness - 4/6 x (lightness - L-min) | dark half |
| 11 | 12 | lightness - 5/6 x (lightness - L-min) | dark half |

---

## Role: Surface (Background)

### Lightness Ramps

Two separate 7-step lightness ramps — one light, one dark. Steps move *inward* from their respective extreme using a fixed delta. These are precomputed as `--_L-light-{1–7}` and `--_L-dark-{1–7}`, shared across all families.

**Light ramp** — steps away from L-max:

```
--_L-light-1 = L-max                    (brightest)
--_L-light-2 = L-max - 1 × L-delta
...
--_L-light-7 = L-max - 6 × L-delta     (dimmest of lights)
```

**Dark ramp** — steps away from L-min:

```
--_L-dark-1  = L-min                    (dimmest)
--_L-dark-2  = L-min + 1 × L-delta
...
--_L-dark-7  = L-min + 6 × L-delta     (brightest of darks)
```

### Semantic Aliases: Elevation

Elevation describes visual layering. Same step in both modes. Each token inlines `oklch()` directly into `light-dark()` — no intermediate `--_bg-*` vars.

```css
--{family}-lowest:  light-dark(oklch(L-light-1 C-muted H), oklch(L-dark-1 C-muted H));
…
--{family}-highest: light-dark(oklch(L-light-7 C-muted H), oklch(L-dark-7 C-muted H));
```

### Semantic Aliases: Brightness

Brightness describes raw luminance. Flips step mapping across modes.

```css
--{family}-brightest: light-dark(oklch(L-light-1 C-muted H), oklch(L-dark-7 C-muted H));
…
--{family}-dimmest:   light-dark(oklch(L-light-7 C-muted H), oklch(L-dark-1 C-muted H));
```

---

## Role: Color

### Two-Tier Ramp: Raw (1-11) + Semantic (050-950)

The color ramp is split into two layers per family:

1. **Raw tokens (1-11)** -- mode-independent `oklch()` values. These are the physical tones.
2. **Semantic tokens (050-950)** -- `light-dark()` wrappers that map raw tokens to the correct direction for each mode.

#### Raw 1-11 Tokens

A single ramp per family. Mode-independent. Both lightness and chroma vary per step. Step 1 is lightest, step 6 is the anchor (peak chroma), step 11 is darkest.

```
--{family}-1    L near L-max,    C-k-edge     (lightest, lowest chroma)
--{family}-2    L lerp 1/5,      C lerp 1/5
--{family}-3    L lerp 2/5,      C lerp 2/5
--{family}-4    L lerp 3/5,      C lerp 3/5
--{family}-5    L lerp 4/5,      C lerp 4/5
--{family}-6    L-anchor,        C-k-vivid    (peak color / anchor)
--{family}-7    L lerp 1/5,      C lerp 4/5
--{family}-8    L lerp 2/5,      C lerp 3/5
--{family}-9    L lerp 3/5,      C lerp 2/5
--{family}-10   L lerp 4/5,      C lerp 1/5
--{family}-11   L near L-min,    C-k-edge     (darkest, lowest chroma)
```

Steps 1-6: lerp L from near L-max to L-anchor (5 equal intervals, light half).
Steps 6-11: lerp L from L-anchor to near L-min (5 equal intervals, dark half).
Chroma lerps from C-k-edge at edges (1, 11) to C-k-vivid at step 6, symmetric.

All raw steps: `oklch(var(--_L-{family}-{n}) var(--_C-{family}-{n}) var(--color-env-hue-{family}))`

#### Semantic 050-950 Tokens

Semantic tokens use Tailwind-style numeric names and are `light-dark()` wrappers over the raw tokens. In light mode, 050 is lightest; in dark mode, 050 is darkest (and vice versa for 950). The anchor (500) is the same raw tone in both modes.

```css
--{family}-050: light-dark(var(--{family}-1),  var(--{family}-11));   /* lightest in light, darkest in dark */
--{family}-100: light-dark(var(--{family}-2),  var(--{family}-10));
--{family}-200: light-dark(var(--{family}-3),  var(--{family}-9));
--{family}-300: light-dark(var(--{family}-4),  var(--{family}-8));
--{family}-400: light-dark(var(--{family}-5),  var(--{family}-7));
--{family}-500: light-dark(var(--{family}-6),  var(--{family}-6));    /* anchor — same both modes */
--{family}-600: light-dark(var(--{family}-7),  var(--{family}-5));
--{family}-700: light-dark(var(--{family}-8),  var(--{family}-4));
--{family}-800: light-dark(var(--{family}-9),  var(--{family}-3));
--{family}-900: light-dark(var(--{family}-10), var(--{family}-2));
--{family}-950: light-dark(var(--{family}-11), var(--{family}-1));    /* darkest in light, lightest in dark */
```

The semantic ramp inverts around the anchor: in dark mode, low semantic numbers (050) resolve to the darkest raw tones, while high numbers (950) resolve to the lightest. This means **`--{family}-050` always means "furthest from the anchor in the light direction"** regardless of color-scheme.

### Anchor Aliases

The bare family name aliases to semantic step 500:

```css
--{family}: var(--{family}-500);
--{family}-scrim: var(--{family}-500-scrim);
```

### Asymmetric Step Size

L-anchor (e.g. 0.60) is not centered between L-max (1.000) and L-min (0.125). Because the ramp uses `/6` intervals internally:

- Raw steps 1-6 span the L-max to L-anchor range (~0.067 per internal step for L-anchor=0.60)
- Raw steps 6-11 span the L-anchor to L-min range (~0.079 per internal step for L-anchor=0.60)

### Scrim Variants

Scrims follow the same two-tier pattern as solids:

**Raw scrim tokens (1-11):** Same L, C, H as the corresponding raw solid, but with `color-env-alpha` opacity:

```
--{family}-{n}-scrim    oklch(L C H / color-env-alpha)     (n = 1-11)
```

**Semantic scrim tokens (050-950):** `light-dark()` wrappers over raw scrim tokens, using the same inversion pattern:

```css
--{family}-050-scrim: light-dark(var(--{family}-1-scrim),  var(--{family}-11-scrim));
--{family}-500-scrim: light-dark(var(--{family}-6-scrim),  var(--{family}-6-scrim));
--{family}-950-scrim: light-dark(var(--{family}-11-scrim), var(--{family}-1-scrim));
```

Plus anchor aliases: `--{family}-scrim` = `var(--{family}-500-scrim)`.

This gives **11 raw solid + 11 semantic solid + 11 raw scrim + 11 semantic scrim = 44 color tokens** per family, plus 2 anchor aliases (`--{family}` and `--{family}-scrim`).

### Scrim Palette: Tint & Shade

A separate 7-step overlay system per family with both L and alpha graduated, mode-independent. Unlike the semantic scrim ramp (050-950-scrim) which uses `light-dark()` to invert tones, the tint/shade palettes always apply the same physical direction regardless of mode:

- **Both** start from the family anchor (step 500 = internal step 6) at full alpha — the strongest scrim closely represents the family's identity color
- **Tint** lightens: L interpolates from anchor toward L-max; always lightens
- **Shade** darkens: L interpolates from anchor toward L-min; always darkens
- **Alpha** decreases from `color-env-alpha` (strongest) to `1/7 × color-env-alpha` (weakest)
- **Chroma** is constant at anchor chroma (`--_C-{family}-6`) throughout

| Step | L (tint) | L (shade) | Alpha |
|------|----------|-----------|-------|
| strongest | anchor-L | anchor-L | `color-env-alpha` |
| stronger | anchor-L + 1/6 × range | anchor-L - 1/6 × range | `6/7 × color-env-alpha` |
| strong | anchor-L + 2/6 × range | anchor-L - 2/6 × range | `5/7 × color-env-alpha` |
| base | anchor-L + 3/6 × range | anchor-L - 3/6 × range | `4/7 × color-env-alpha` |
| weak | anchor-L + 4/6 × range | anchor-L - 4/6 × range | `3/7 × color-env-alpha` |
| weaker | anchor-L + 5/6 × range | anchor-L - 5/6 × range | `2/7 × color-env-alpha` |
| weakest | L-max | L-min | `1/7 × color-env-alpha` |

Where range = `L-max - anchor-L` (tint) or `anchor-L - L-min` (shade).

**Tint** tokens (L moves toward L-max, chroma constant):
```
--{family}-scrim-tint-strongest    oklch(anchor-L  C-anchor  H / alpha)
...
--{family}-scrim-tint-weakest      oklch(L-max  C-anchor  H / 1/7 × alpha)
```

**Shade** tokens (L moves toward L-min, chroma constant):
```
--{family}-scrim-shade-strongest   oklch(anchor-L  C-anchor  H / alpha)
...
--{family}-scrim-shade-weakest     oklch(L-min  C-anchor  H / 1/7 × alpha)
```

This produces **14 tokens per family (7 tint + 7 shade), 84 total across 6 families**. These tokens are not wrapped in `light-dark()` — tint always lightens from anchor, shade always darkens from anchor, allowing explicit control over overlay direction independent of color-scheme.

---

## Theme Toggle

The entire system pivots on one property:

```css
:root { color-scheme: light dark; }
```

`light-dark()` appears in:
- Semantic color ramp (050-950) -- wrapping raw 1-11 tokens
- Semantic scrim ramp (050-950-scrim) -- wrapping raw 1-11-scrim tokens
- Background elevation aliases
- Background brightness aliases

The raw 1-11 tokens (solid and scrim) are mode-independent `oklch()` values. Only the semantic layer uses `light-dark()` to invert direction.

No `@media (prefers-color-scheme)` blocks. No data attributes. No utility classes. One property, one mutation.

---

## Token Inventory Per Family

| Role | Tokens | Notes |
|---|---|---|
| Per-step chroma | 11 | `--_C-{family}-{1–11}`, lerp C-k-edge to C-k-vivid to C-k-edge (internal) |
| Per-step lightness | 11 | `--_L-{family}-{1–11}`, lerp L-max to lightness to L-min (internal) |
| Raw color ramp (solid) | 11 | `--{family}-1` through `--{family}-11`, mode-independent oklch |
| Semantic color ramp (solid) | 11 | `--{family}-050` through `--{family}-950`, light-dark wrappers over raw tokens |
| Anchor alias (solid) | 1 | `--{family}` = `var(--{family}-500)` |
| Raw color ramp (scrim) | 11 | `--{family}-1-scrim` through `--{family}-11-scrim`, mode-independent oklch with alpha |
| Semantic color ramp (scrim) | 11 | `--{family}-050-scrim` through `--{family}-950-scrim`, light-dark wrappers over raw scrim tokens |
| Anchor alias (scrim) | 1 | `--{family}-scrim` = `var(--{family}-500-scrim)` |
| Scrim palette (tint) | 7 | `--{family}-scrim-tint-{strongest…weakest}`, L+alpha graduated from anchor toward L-max |
| Scrim palette (shade) | 7 | `--{family}-scrim-shade-{strongest…weakest}`, L+alpha graduated from anchor toward L-min |
| Background elevation | 7 | lowest to highest, inlined oklch in light-dark() |
| Background brightness | 6 | brightest to dimmest, inlined oklch in light-dark() |
| **Total per family** | **84** | (excluding 22 internal derived vars) |

**x 6 families = 504 tokens + 9 env params + 18 family params = ~531 grand total**

---

## Rules

1. `light-dark()` wraps complete `oklch()` values or references to raw tokens that resolve to complete `oklch()` values -- never nested inside `oklch()`.
2. Environment params (L-min, L-max, etc.) are absolute -- they don't change between themes.
3. The raw 1-11 color ramp is entirely mode-independent `oklch()`. The semantic 050-950 ramp uses `light-dark()` to wrap raw tokens, inverting direction between modes.
4. Raw scrim variants (1-11-scrim) share the same L/C/H as their solid counterpart (including chroma drift), differing only in alpha (`color-env-alpha`). Semantic scrim variants (050-950-scrim) are `light-dark()` wrappers over raw scrims.
5. Background chroma uses flat `--_C-{family}-muted`; solid/scrim chroma lerps from `C-k-edge` (edges) to `C-k-vivid` (anchor) via `--_C-{family}-{n}`. `color-env-chroma` is baked into the `C-t` and `C-muted` coefficients; per-family formulas are just `coeff x color-env-chroma-{family}`.
6. No `@property` -- initial values cannot contain `light-dark()`.
7. All tokens live in `@layer colors` -- a single layer with section comments separating inputs, internal math, raw tokens, semantic tokens, and aliases. Custom properties on `:root` are unaffected by layer specificity.
8. No `@media` queries -- `color-scheme` is the sole toggle.
9. All tokens live on `:root`.
10. Derived intermediates use `--_` prefix. Consumers should reference semantic tokens for mode-aware behavior: `--{fam}-{step}` for solids, `--{fam}-{step}-scrim` for scrims, `--{fam}-{qualifier}` for backgrounds, `--{fam}` as anchor (= step 500), `--{fam}-scrim` as scrim anchor. Raw tokens (`--{fam}-{n}`, `--{fam}-{n}-scrim`) are available for cases where mode-independent values are needed.

---

## Constructed Stylesheet Pattern

```
colors.css  →  colors.ts (import ?inline)  →  CSSStyleSheet  →  adoptedStyleSheets
```

`colors.ts` exports:
- `tokenSheet` — constructed `CSSStyleSheet` for adoption
- `adoptTokens(root?)` — convenience function, idempotent
- `tokenCSS` — raw CSS string for edge cases

`colors.html` loads `colors.css` directly via `<link>` for preview.

---

## Theme Presets (`themes.css`)

Theme presets override family params and env params via `:where([theme="..."])` selectors. Zero specificity — easy to override downstream.

```css
:where([theme="forest"]) {
  --color-env-hue-neutral: 100;
  --color-env-hue-accent: 155;
  ...
}
```

Apply via attribute: `<html theme="forest">`. Everything recalculates — derived, solids, scrims, backgrounds.

Themes are additive. `themes.css` loads after `colors.css`. Consumers can define their own theme blocks in separate files.

---

## Preview Page (`colors.html`)

The preview page renders each family section with:

1. **Per-family sliders** — hue, chroma, lightness
2. **Swatch rows** — six rows per family:
   - **Raw Solid (1–11)** — mode-independent oklch values
   - **Raw Scrim (1–11)** — mode-independent with alpha
   - **Semantic Solid (050–950)** — light-dark aware, auto-flips between modes
   - **Semantic Scrim (050–950)** — light-dark aware with alpha
   - **Scrim Tint (strongest–weakest)** — L+alpha graduated from anchor toward L-max
   - **Scrim Shade (strongest–weakest)** — L+alpha graduated from anchor toward L-min
3. **UI Examples** — concrete components demonstrating token usage:
   - **Buttons** (5 variants): Primary, Neutral, Subtle, Ghost, Outline — all use per-family tokens via `${fam}`
   - **Profile card**: avatar, name, role, bio, stats — uses bg, solid, and scrim tokens together

All examples are data-driven from the families array. Slider changes update examples live.

### Button hover states

All 5 button variants use per-family tokens via `${fam}`. Hover adds visual weight via background changes:

| Variant | bg | bg hover | text | border |
|---------|-----|----------|------|--------|
| Primary | `--{fam}` | raw `--{fam}-8` | `--{fam}-050` | none |
| Neutral | `--{fam}-high` | `--{fam}-higher` | `--{fam}` | none |
| Subtle | transparent | `--{fam}-high` | `--{fam}` | none |
| Ghost | transparent | `--{fam}-high` | `--{fam}` | transparent |
| Outline | transparent | `--{fam}-high` | `--{fam}` | `1px solid --{fam}` |

Primary uses raw `--{fam}-8` for hover (mode-independent darker tone). Subtle, Ghost, and Outline use semantic `--{fam}-high` for hover (light-dark aware).
