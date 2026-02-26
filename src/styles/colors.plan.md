# Color Token System — Implementation Plan

## Scope

Color tokens only. Build the full oklch-based color system described in `tokens.architecture.md`.

---

## Deliverables

| File | What |
|---|---|
| `colors.css` | All CSS custom properties |
| `themes.css` | Theme presets (forest, rose, zinc) |
| `colors.ts` | Constructed stylesheet export |
| `colors.html` | Preview — surfaces, 11-step color ramp (solid/scrim), interactive sliders, theme picker |

---

## Token Structure Per Family

```
Naming: --name = input/output, --_name = derived intermediate (internal)

Two-layer architecture:
  Raw layer:      1–11 (mode-independent oklch values)
  Semantic layer: 050–950 (light-dark wrappers that flip raw tokens per mode)

Anchor at position 6 (raw) / 500 (semantic). Peak chroma. Symmetric about anchor.
Mapping: 1=lightest (was 050), 6=anchor (was 500), 11=darkest (was 950)

Per-step chroma (11, internal):     Lerps chroma-k-edge → chroma-k-vivid → chroma-k-edge. Peak at 6.
--_C-{family}-{1–11}

Per-step lightness (11, internal):  Internal 13-step ramp, steps 2–12 exposed (skip pure white/black).
--_L-{family}-{1–11}

Raw color ramp — solid (11, internal):  Lightness + chroma drift. Mode-independent.
--{family}-1                        near lightness-max (step 2/13), chroma-k-edge     (lightest)
--{family}-2                        1/5 toward anchor, C lerp 1/5
--{family}-3                        2/5 toward anchor, C lerp 2/5
--{family}-4                        3/5 toward anchor, C lerp 3/5
--{family}-5                        4/5 toward anchor, C lerp 4/5
--{family}-6                        L-anchor, chroma-k-vivid (peak color / anchor)
--{family}-7                        1/5 toward lightness-min, C lerp 4/5
--{family}-8                        2/5 toward lightness-min, C lerp 3/5
--{family}-9                        3/5 toward lightness-min, C lerp 2/5
--{family}-10                       4/5 toward lightness-min, C lerp 1/5
--{family}-11                       near lightness-min (step 12/13), chroma-k-edge     (darkest)

Semantic color ramp — solid (11, output):  light-dark() wrappers that flip raw tokens.
--{family}-050                      light-dark(var(--{family}-1),  var(--{family}-11))  lightest in light, darkest in dark
--{family}-100                      light-dark(var(--{family}-2),  var(--{family}-10))
--{family}-200                      light-dark(var(--{family}-3),  var(--{family}-9))
--{family}-300                      light-dark(var(--{family}-4),  var(--{family}-8))
--{family}-400                      light-dark(var(--{family}-5),  var(--{family}-7))
--{family}-500                      light-dark(var(--{family}-6),  var(--{family}-6))   anchor, same both modes
--{family}-600                      light-dark(var(--{family}-7),  var(--{family}-5))
--{family}-700                      light-dark(var(--{family}-8),  var(--{family}-4))
--{family}-800                      light-dark(var(--{family}-9),  var(--{family}-3))
--{family}-900                      light-dark(var(--{family}-10), var(--{family}-2))
--{family}-950                      light-dark(var(--{family}-11), var(--{family}-1))   darkest in light, lightest in dark

Anchor aliases (2, output):
--{family}                          = var(--{family}-500)
--{family}-scrim                    = var(--{family}-500-scrim)

Raw color ramp — scrim (11, internal):  Same L/C/H (incl. chroma drift), alpha = color-env-alpha. Mode-independent.
--{family}-1-scrim  through  --{family}-11-scrim

Semantic color ramp — scrim (11, output):  light-dark() wrappers that flip raw scrim tokens.
--{family}-050-scrim                light-dark(var(--{family}-1-scrim),  var(--{family}-11-scrim))
--{family}-100-scrim                light-dark(var(--{family}-2-scrim),  var(--{family}-10-scrim))
  …
--{family}-500-scrim                light-dark(var(--{family}-6-scrim),  var(--{family}-6-scrim))   anchor, same both modes
  …
--{family}-950-scrim                light-dark(var(--{family}-11-scrim), var(--{family}-1-scrim))

Background aliases (13, output):    Inlined oklch() in light-dark(), no intermediate --_bg-* vars.
--{family}-lowest … -highest          elevation aliases (7)
--{family}-brightest … -dimmest       brightness aliases (6)
--{family}-base                       shared by both alias sets

Scrim palette (14, output):         L+alpha graduated overlays, mode-independent.
--{family}-scrim-tint-strongest     Anchor L, anchor C, H / color-env-alpha
--{family}-scrim-tint-stronger      L + 1/6 toward L-max, alpha = 6/7 × color-env-alpha
--{family}-scrim-tint-strong        L + 2/6 toward L-max, alpha = 5/7 × color-env-alpha
--{family}-scrim-tint-base          L + 3/6 toward L-max, alpha = 4/7 × color-env-alpha
--{family}-scrim-tint-weak          L + 4/6 toward L-max, alpha = 3/7 × color-env-alpha
--{family}-scrim-tint-weaker        L + 5/6 toward L-max, alpha = 2/7 × color-env-alpha
--{family}-scrim-tint-weakest       L = L-max, alpha = 1/7 × color-env-alpha
--{family}-scrim-shade-strongest    Anchor L, anchor C, H / color-env-alpha
--{family}-scrim-shade-stronger     L - 1/6 toward L-min, alpha = 6/7 × color-env-alpha
--{family}-scrim-shade-strong       L - 2/6 toward L-min, alpha = 5/7 × color-env-alpha
--{family}-scrim-shade-base         L - 3/6 toward L-min, alpha = 4/7 × color-env-alpha
--{family}-scrim-shade-weak         L - 4/6 toward L-min, alpha = 3/7 × color-env-alpha
--{family}-scrim-shade-weaker       L - 5/6 toward L-min, alpha = 2/7 × color-env-alpha
--{family}-scrim-shade-weakest      L = L-min, alpha = 1/7 × color-env-alpha
```

Families: neutral, accent, info, success, warning, danger

Total tokens per family: 11 raw solid + 11 raw scrim + 11 semantic solid + 11 semantic scrim + 2 anchor aliases + 13 background aliases + 14 scrim palette = 73 tokens
Total across 6 families: 438 tokens

---

## CSS Layer

```css
@layer colors { :root { … } }
```

Single layer, three logical sections (separated by comments):

| Section | Contents | Visibility |
|---|---|---|
| Constants | `color-scheme`, `--color-env-*` params, `--color-env-hue-{family}`, `--color-env-chroma-{family}`, `--color-env-lightness-{family}` | input knobs |
| Derived | `--_C-t-{0–5}` coefficients, `--_C-{family}-{1–11}`, `--_L-{family}-{1–11}` | internal (`--_`) |
| Tokens | Raw ramp ({family}-1–11, {family}-1–11-scrim), semantic ramp ({family}-050–950 via light-dark, {family}-050–950-scrim via light-dark), anchor aliases ({family}, {family}-scrim), elevation/brightness aliases ({family}-lowest…-highest, {family}-brightest…-dimmest, {family}-base) | public API |

---

## Implementation Steps

### 1. Constants section

- `color-scheme: light dark`
- 9 environment params (color-env-lightness-min, color-env-lightness-max, color-env-lightness-delta, color-env-chroma, color-env-chroma-k-muted, color-env-chroma-k-vivid, color-env-chroma-k-edge, color-env-alpha, color-env-alpha-delta)
- 18 family params (color-env-hue-{family}, color-env-chroma-{family}, color-env-lightness-{family} x 6 families)

### 2. Derived section

- 6 interpolation coefficients (`--_C-t-0..5`, lerp chroma-k-edge -> chroma-k-vivid)
- `--_C-muted` + 6 per-family `--_C-{family}-muted` values (flat, for backgrounds)
- 66 per-step `--_C-{family}-{1–11}` values (lerp chroma-k-edge -> chroma-k-vivid -> chroma-k-edge, x 6 families)
- 66 precomputed `--_L-{family}-{1–11}` solid lightness values (read `--color-env-lightness-{family}` directly, x 6 families)
- 14 precomputed `--_L-light/dark-{1–7}` background lightness values (shared across families)

### 3. Tokens section

#### 3a. Raw layer (mode-independent)

- 11 raw solid tokens per family (`--{family}-1` through `--{family}-11`, oklch values)
- 11 raw scrim tokens per family (`--{family}-1-scrim` through `--{family}-11-scrim`, oklch with alpha)

#### 3b. Semantic layer (mode-aware via light-dark)

- 11 semantic solid tokens per family (`--{family}-050` through `--{family}-950`, each a `light-dark()` wrapper referencing raw tokens)
- 11 semantic scrim tokens per family (`--{family}-050-scrim` through `--{family}-950-scrim`, each a `light-dark()` wrapper referencing raw scrim tokens)

#### 3c. Aliases

- 6 anchor aliases (`--{family}` = `var(--{family}-500)` x 6 families)
- 6 scrim anchor aliases (`--{family}-scrim` = `var(--{family}-500-scrim)` x 6 families)
- 7 elevation aliases per family (`--{family}-lowest` through `--{family}-highest`)
- 6 brightness aliases per family (`--{family}-brightest` through `--{family}-dimmest`)

#### 3d. Scrim palette (mode-independent overlays)

- 7 tint tokens per family (`--{family}-scrim-tint-strongest` through `--{family}-scrim-tint-weakest`, L+alpha graduated from anchor toward L-max)
- 7 shade tokens per family (`--{family}-scrim-shade-strongest` through `--{family}-scrim-shade-weakest`, L+alpha graduated from anchor toward L-min)

### 4. colors.ts

- Import colors.css?inline
- Construct CSSStyleSheet
- Export tokenSheet, adoptTokens(), tokenCSS

### 5. colors.html

- Load colors.css via `<link>`
- Light/Dark toggle switch (flips `color-scheme`)
- Per-family sliders: hue, chroma, lightness
- Surfaces: elevation + brightness rows (7 columns each)
- Color swatches per family (6 rows):
  1. Raw Solid (1–11) — mode-independent oklch values
  2. Raw Scrim (1–11) — mode-independent with alpha
  3. Semantic Solid (050–950) — light-dark aware, auto-flips between modes
  4. Semantic Scrim (050–950) — light-dark aware with alpha
  5. Scrim Tint (7 steps) — L+alpha graduated from anchor toward L-max
  6. Scrim Shade (7 steps) — L+alpha graduated from anchor toward L-min
- Step 500 highlighted as anchor (bold label) in semantic rows
- UI Examples per family:
  - Buttons: Primary, Neutral, Subtle, Ghost, Outline (all use per-family tokens via ${fam}. Primary bg:hover uses raw --{fam}-8. Subtle/Ghost/Outline bg:hover uses --{fam}-high)
  - Profile card: avatar, name, role, bio, stats

---

## Open Questions

- Exact hue values — tune visually once preview is live
- color-env-lightness-delta value — tune once visible
