# Migrating to nonoun-css Color Tokens

## What changed

The token system now uses a **two-layer architecture** for the color ramp:

1. **Raw 1-11 tokens** replace the old direct oklch declarations:
   - Old: `--{fam}-050: oklch(...)` through `--{fam}-950: oklch(...)`
   - New: `--{fam}-1: oklch(...)` through `--{fam}-11: oklch(...)` (raw, mode-independent)
   - Mapping: 1=lightest (was 050), 6=anchor/peak chroma (was 500), 11=darkest (was 950)

2. **Semantic 050-950 tokens** are now light-dark wrappers:
   - `--{fam}-050: light-dark(var(--{fam}-1), var(--{fam}-11))` -- lightest in light mode, darkest in dark
   - `--{fam}-500: light-dark(var(--{fam}-6), var(--{fam}-6))` -- anchor, same both modes
   - `--{fam}-950: light-dark(var(--{fam}-11), var(--{fam}-1))` -- darkest in light, lightest in dark

3. **Same pattern for scrim**:
   - Raw: `--{fam}-1-scrim` through `--{fam}-11-scrim` (oklch with alpha)
   - Semantic: `--{fam}-050-scrim: light-dark(var(--{fam}-1-scrim), var(--{fam}-11-scrim))` etc.

4. **New scrim tint/shade palette**:
   - Tint: `--{fam}-scrim-tint-{step}` (7 steps: strongest, stronger, strong, base, weak, weaker, weakest)
   - Shade: `--{fam}-scrim-shade-{step}` (7 steps: strongest, stronger, strong, base, weak, weaker, weakest)
   - Both start from the family anchor (step 500) — strongest closely represents the family identity color
   - Tint: L interpolates from anchor toward L-max; shade: L toward L-min
   - Alpha: strongest = `color-env-alpha`, then `6/7`, `5/7`… `1/7` of `color-env-alpha`
   - Chroma: constant at anchor chroma throughout
   - Mode-independent (not `light-dark()` wrapped) — tint always lightens, shade always darkens
   - Use case: overlay effects, glass morphism, subtle backgrounds
   - 14 tokens per family, 84 total across all families

5. **Internal vars** renamed: `--_L-{fam}-050` is now `--_L-{fam}-1`, `--_C-{fam}-050` is now `--_C-{fam}-1`, etc.

6. **Anchor aliases** unchanged: `--{fam}: var(--{fam}-500)`, `--{fam}-scrim: var(--{fam}-500-scrim)`

7. **Fill/elevation/brightness tokens** unchanged (they already used light-dark).

---

## What to consume

Only reference **public color tokens** -- never `--_` derived intermediates, never `--color-env-*` environment params directly.

**Semantic 050-950 tokens** (`--{fam}-050` through `--{fam}-950`) are the primary public API. These auto-invert between light and dark modes via `light-dark()`. Use these in virtually all component code.

**Raw 1-11 tokens** (`--{fam}-1` through `--{fam}-11`) are also public but mode-independent. Use these only when you need a specific absolute tone regardless of color scheme (e.g., forced-light or forced-dark contexts).

### Quick reference

| Need | Token | Example |
|------|-------|---------|
| Layered surfaces (cards, modals, popovers) | `--{fam}-{elevation}` | `background: var(--neutral-high)` |
| Brightness-relative surface | `--{fam}-{brightness}` | `background: var(--neutral-bright)` |
| Primary foreground color | `--{fam}` | `color: var(--accent)` |
| Lighter / darker foreground | `--{fam}-{step}` | `color: var(--neutral-800)` |
| Borders, dividers | `--{fam}-{step}-scrim` | `border-color: var(--neutral-300-scrim)` |
| Overlays | `--{fam}-scrim` | `background: var(--neutral-scrim)` |
| Lightening overlay (glass morphism, frosted) | `--{fam}-scrim-tint-{step}` | `background: var(--neutral-scrim-tint-strong)` |
| Darkening overlay (shadow, scrim, vignette) | `--{fam}-scrim-shade-{step}` | `background: var(--neutral-scrim-shade-base)` |
| Body text (auto light/dark) | `--{fam}-950` | `color: var(--neutral-950)` |
| Lightest foreground (auto) | `--{fam}-050` | `color: var(--neutral-050)` |
| Fixed light tone (mode-independent) | `--{fam}-1` | `color: var(--neutral-1)` |
| Fixed dark tone (mode-independent) | `--{fam}-11` | `color: var(--neutral-11)` |

### Token families

| Family | Purpose |
|--------|---------|
| `neutral` | Text, backgrounds, borders, chrome |
| `accent` | Brand, primary actions, active states |
| `info` | Informational UI (badges, banners, tooltips) |
| `success` | Positive outcomes (confirmations, valid states) |
| `warning` | Caution (alerts, destructive-adjacent actions) |
| `danger` | Errors, destructive actions, invalid states |

### Two-layer color ramp

#### Layer 1: Raw tokens (1-11, mode-independent)

Steps 1-11 go from lightest to darkest. Step 6 is the anchor (peak chroma). These are raw oklch values that do not change between light and dark modes.

| Raw step | Lightness | Chroma | Semantic equivalent (light mode) | Semantic equivalent (dark mode) |
|----------|-----------|--------|----------------------------------|----------------------------------|
| 1 | L-max (lightest) | edge (lowest) | 050 | 950 |
| 2 | near-white | rising | 100 | 900 |
| 3 | light | mid-rising | 200 | 800 |
| 4 | light-mid | mid-rising | 300 | 700 |
| 5 | approaching anchor | near-vivid | 400 | 600 |
| 6 | anchor | vivid (peak) | 500 | 500 |
| 7 | darkening | near-vivid | 600 | 400 |
| 8 | dark | mid-falling | 700 | 300 |
| 9 | dark-mid | mid-falling | 800 | 200 |
| 10 | near-black | low | 900 | 100 |
| 11 | L-min (darkest) | edge (lowest) | 950 | 050 |

#### Layer 2: Semantic tokens (050-950, light-dark aware)

The semantic 050-950 tokens wrap raw tokens in `light-dark()`, so they auto-invert:

| Semantic step | Light mode resolves to | Dark mode resolves to | Typical use |
|---------------|------------------------|----------------------|-------------|
| 050 | raw 1 (lightest) | raw 11 (darkest) | Button text on solid bg |
| 100 | raw 2 | raw 10 | Subtle tints, hover states |
| 200-300 | raw 3-4 | raw 9-8 | Secondary fills, badges |
| 400 | raw 5 | raw 7 | Secondary emphasis |
| 500 | raw 6 (anchor) | raw 6 (anchor) | Primary emphasis, brand |
| 600 | raw 7 | raw 5 | Hover/active states |
| 700-800 | raw 8-9 | raw 4-3 | Headings, strong text |
| 900 | raw 10 | raw 2 | Heavy text |
| 950 | raw 11 (darkest) | raw 1 (lightest) | Body text |

Because semantic tokens auto-invert, you no longer need `light-dark()` wrappers in component code for standard foreground/background patterns -- just use the semantic step directly:

```css
/* Before: manual light-dark wrapping */
color: light-dark(var(--neutral-950), var(--neutral-050));

/* After: semantic tokens auto-invert */
color: var(--neutral-950);
```

---

## What NOT to consume

```css
/* WRONG -- internal derived vars (now use 1-11 numbering) */
color: oklch(var(--_L-accent-6) var(--_C-accent-6) var(--color-env-hue-accent));

/* RIGHT -- use the token */
color: var(--accent);
```

```css
/* WRONG -- env params in component code */
background: oklch(var(--color-env-lightness-max) var(--color-env-chroma) 225);

/* RIGHT -- use a bg token */
background: var(--neutral-lowest);
```

```css
/* WRONG -- hard-coded oklch values */
color: oklch(0.5 0.22 225);

/* RIGHT -- the system derives these for you */
color: var(--accent);
```

```css
/* WRONG -- referencing raw tokens when you want mode-awareness */
color: var(--neutral-11);  /* always dark, even in dark mode */

/* RIGHT -- use semantic tokens for auto light/dark behavior */
color: var(--neutral-950);  /* dark in light mode, light in dark mode */
```

---

## Mapping old patterns

### Hard-coded hex / hsl

```css
/* Before */
.btn-primary { background: #3b82f6; color: #fff; }
.btn-primary:hover { background: #2563eb; }

/* After */
.btn-primary { background: var(--accent); color: var(--accent-050); }
.btn-primary:hover { background: var(--accent-600); }
```

### Scattered color variables

```css
/* Before -- ad-hoc variables */
--color-primary: #3b82f6;
--color-primary-hover: #2563eb;
--color-bg: #ffffff;
--color-bg-dark: #1a1a1a;
--color-text: #111827;
--color-text-dark: #f3f4f6;
--color-border: rgba(0, 0, 0, 0.1);

/* After -- delete them all, use tokens */
/* background: var(--color-bg)       -> */ background: var(--neutral-base);
/* color: var(--color-text)          -> */ color: var(--neutral-950);  /* auto-inverts in dark mode */
/* border-color: var(--color-border) -> */ border-color: var(--neutral-300-scrim);
/* background: var(--color-primary)  -> */ background: var(--accent);
```

### Tailwind classes

```html
<!-- Before -->
<button class="bg-blue-500 hover:bg-blue-600 text-white">Save</button>

<!-- After -- use token-backed styles -->
<button style="background: var(--accent); color: var(--accent-050);">Save</button>
```

### Bootstrap / Material semantic colors

```css
/* Bootstrap $primary, $success, etc. map directly */
/* --bs-primary       -> */ var(--accent)
/* --bs-success       -> */ var(--success)
/* --bs-warning       -> */ var(--warning)
/* --bs-danger        -> */ var(--danger)
/* --bs-info          -> */ var(--info)
/* --bs-light         -> */ var(--neutral-050)  /* auto-inverts: light in light, dark in dark */
/* --bs-dark          -> */ var(--neutral-950)  /* auto-inverts: dark in light, light in dark */
/* --bs-body-bg       -> */ var(--neutral-base)
/* --bs-body-color    -> */ var(--neutral-950)  /* auto-inverts via light-dark() internally */
/* --bs-border-color  -> */ var(--neutral-300-scrim)
```

### Old direct oklch ramp tokens

If you were previously referencing the old mode-independent `--{fam}-050` through `--{fam}-950` tokens (which were direct `oklch()` values), be aware these are now `light-dark()` wrappers that auto-invert. If you need the fixed mode-independent tone, switch to the raw 1-11 tokens:

```css
/* Before: --accent-050 was always the lightest oklch tone */
/* Now: --accent-050 is lightest in light mode, darkest in dark mode */

/* If you need the fixed lightest tone regardless of mode: */
color: var(--accent-1);

/* If you need the fixed darkest tone regardless of mode: */
color: var(--accent-11);

/* If you want auto-inverting behavior (recommended): */
color: var(--accent-050);  /* lightest in light, darkest in dark */
```

---

## Dark mode migration

### Before: media queries or data attributes

```css
/* Before -- duplicated declarations */
:root { --bg: #fff; --text: #111; }
@media (prefers-color-scheme: dark) { :root { --bg: #111; --text: #eee; } }

/* Or */
[data-theme="dark"] { --bg: #111; --text: #eee; }
```

### After: delete all of that

```css
/* The token system handles it. Just use tokens. */
background: var(--neutral-base);
color: var(--neutral-950);  /* auto-inverts: dark text in light mode, light text in dark mode */
```

The system pivots on `color-scheme: light dark` -- no `@media` queries, no `data-*` attributes.

- **Semantic 050-950 tokens** use `light-dark()` internally and auto-invert between modes. This means `--neutral-950` is always "the darkest foreground" in the current mode -- dark in light mode, light in dark mode.
- **Raw 1-11 tokens** are mode-independent (fixed oklch values). Use these when you need a specific absolute tone.
- **Elevation/brightness tokens** use `light-dark()` internally (unchanged).

You no longer need manual `light-dark()` wrappers for standard foreground patterns:

```css
/* Before: manual wrapping required */
.text-primary { color: light-dark(var(--neutral-950), var(--neutral-050)); }

/* After: semantic tokens handle it */
.text-primary { color: var(--neutral-950); }
```

---

## Preview page

The `colors.html` preview page shows six swatch rows per family:

1. **Raw Solid (1–11)** — mode-independent oklch values
2. **Raw Scrim (1–11)** — mode-independent with alpha
3. **Semantic Solid (050–950)** — light-dark aware, auto-flips between modes
4. **Semantic Scrim (050–950)** — light-dark aware with alpha
5. **Scrim Tint (strongest–weakest)** — L+alpha graduated from anchor toward L-max
6. **Scrim Shade (strongest–weakest)** — L+alpha graduated from anchor toward L-min

This makes it easy to see both the underlying raw tones and how the semantic layer auto-inverts, as well as the new tint/shade overlay system for glass morphism and overlay effects.

---

## Adoption via constructed stylesheet

```ts
import { adoptTokens } from './colors.ts';

// Adopt onto document (idempotent)
adoptTokens();

// Or adopt onto a shadow root
adoptTokens(myElement.shadowRoot);
```

For plain HTML / CSS:

```html
<link rel="stylesheet" href="colors.css" />
```

---

## Common patterns

### Buttons

All five button variants (Primary, Neutral, Subtle, Ghost, Outline) now use per-family tokens via `${fam}`:

```css
/* Primary */
.btn-primary {
  background: var(--accent);
  color: var(--accent-050);
}
.btn-primary:hover { background: var(--accent-8); }  /* uses raw --{fam}-8 */

/* Neutral */
.btn-neutral {
  background: var(--neutral-high);
  color: var(--neutral);
}
.btn-neutral:hover { background: var(--neutral-8); }  /* uses raw --{fam}-8 */

/* Subtle */
.btn-subtle {
  background: var(--accent-high);
  color: var(--accent);
}
.btn-subtle:hover { background: var(--accent-high); }  /* uses --{fam}-high */

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--accent);
  border: 1px solid transparent;
}
.btn-ghost:hover { background: var(--accent-high); }  /* uses --{fam}-high */

/* Outline */
.btn-outline {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
}
.btn-outline:hover { background: var(--accent-high); }  /* uses --{fam}-high */
```

### Cards

```css
.card {
  background: var(--neutral-high);
  border: 1px solid var(--neutral-300-scrim);
  border-radius: 0.5rem;
}
```

### Status messages

```css
.alert-success {
  background: var(--success-high);
  color: var(--success-600);
  border: 1px solid var(--success-300-scrim);
}

.alert-danger {
  background: var(--danger-high);
  color: var(--danger-600);
  border: 1px solid var(--danger-300-scrim);
}
```

### Elevation stacking

```css
.page       { background: var(--neutral-lowest); }
.sidebar    { background: var(--neutral-low); }
.card       { background: var(--neutral-high); }
.modal      { background: var(--neutral-higher); }
.popover    { background: var(--neutral-highest); }
```

### Text hierarchy

```css
/* Semantic tokens auto-invert -- no manual light-dark() needed */
.text-primary   { color: var(--neutral-950); }
.text-secondary { color: var(--neutral-800); }
.text-muted     { color: var(--neutral-600); }
```

---

## Customization

Override family params in your own CSS to rebrand:

```css
:root {
  --color-env-hue-accent: 160;        /* teal brand */
  --color-env-chroma-accent: 0.8;     /* slightly desaturated */
  --color-env-lightness-accent: 0.55; /* brighter anchor */
}
```

The entire accent ramp (raw 1-11, semantic 050-950), scrims, and backgrounds recalculate automatically.

---

## Theme presets

Load `themes.css` after `colors.css` for built-in presets:

```html
<link rel="stylesheet" href="colors.css" />
<link rel="stylesheet" href="themes.css" />
```

Apply via attribute:

```html
<html theme="forest">
```

Available presets: `forest`, `rose`, `zinc`.

Themes use `:where([theme="..."])` -- zero specificity, easy to override. Create your own:

```css
:where([theme="ocean"]) {
  --color-env-hue-neutral: 200;
  --color-env-hue-accent: 190;
  --color-env-chroma-neutral: 0.3;
}
```

---

## Token layer summary

```
Internal derived vars (--_)
  --_L-{fam}-1 through --_L-{fam}-11    (lightness per raw step)
  --_C-{fam}-1 through --_C-{fam}-11    (chroma per raw step)
  --_C-{fam}-muted                       (flat chroma for surfaces)
  --_L-light-{1-7}, --_L-dark-{1-7}     (background lightness ramps)

Raw tokens (mode-independent)
  --{fam}-1 through --{fam}-11           (solid oklch)
  --{fam}-1-scrim through --{fam}-11-scrim (solid oklch with alpha)

Semantic tokens (light-dark wrappers)
  --{fam}-050 through --{fam}-950        (auto-inverting solid)
  --{fam}-050-scrim through --{fam}-950-scrim (auto-inverting scrim)

Anchor aliases
  --{fam}       = var(--{fam}-500)
  --{fam}-scrim = var(--{fam}-500-scrim)

Elevation aliases (light-dark, unchanged)
  --{fam}-lowest through --{fam}-highest

Brightness aliases (light-dark, unchanged)
  --{fam}-brightest through --{fam}-dimmest
```

---

## Checklist

1. Add `colors.css` (via `<link>` or `adoptTokens()`)
2. Search for hard-coded colors (`#`, `rgb(`, `hsl(`, `oklch(`) -- replace with tokens
3. Search for `@media (prefers-color-scheme` and `data-theme` -- delete, use semantic 050-950 tokens (they auto-invert)
4. Search for `--_` references -- replace with public tokens
5. Replace manual `light-dark(var(--{fam}-950), var(--{fam}-050))` patterns with just `var(--{fam}-950)` (semantic tokens auto-invert now)
6. If you relied on old mode-independent 050-950 tokens, switch to raw 1-11 tokens for fixed tones, or keep 050-950 for auto-inverting behavior
7. Verify in light and dark mode
8. Tune family params (hue, chroma, lightness) to match brand
