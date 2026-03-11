---
name: adia-brand
description: Apply Adia Health brand guidelines to any output -- HTML/CSS components, copy, data visualizations, presentations, or documents. Use whenever the task requires on-brand visual design, writing in Adia voice, or producing content that represents the Adia Health brand.
---

# Adia Health Brand System

## Overview

This guide encodes Adia Health's complete brand system: colors, typography, voice, component patterns, and data viz rules. Apply it whenever producing anything that represents Adia externally or internally.

**Keywords**: Adia Health, adia.ai, healthcare AI, clinical intelligence, brand colors, typography, brand voice, OKLCH, design tokens

---

## 1. Colors

Adia's color system is built on OKLCH color science with six intent families. All tokens use `light-dark()` for automatic mode adaptation. The accent hue (230) provides a calm, clinical blue.

### Primary Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `--n-color-accent-500` | `oklch(0.6 0.2 230)` | `oklch(0.6 0.2 230)` | Primary brand blue, CTAs, active states |
| `--n-color-accent-300` | `oklch(0.8 0.086 230)` | `oklch(0.45 0.124 230)` | Highlight backgrounds, hover tints |
| `--n-color-accent-700` | `oklch(0.45 0.124 230)` | `oklch(0.733 0.124 230)` | Heading accents, emphasis text |
| `--n-color-accent-050` | `oklch(0.933 0.01 230)` | `oklch(0.225 0.01 230)` | Lightest tint, subtle backgrounds |
| `--n-color-accent-950` | `oklch(0.225 0.01 230)` | `oklch(0.933 0.01 230)` | Near-black, primary text on light |

### Clinical Intent Colors

| Family | Hue | Token (500) | Use |
|---|---|---|---|
| **Accent** | 230 (blue) | `oklch(0.6 0.2 230)` | Primary actions, navigation, brand identity |
| **Success** | 150 (green) | `oklch(0.55 0.15 150)` | Clinical confirmations, positive outcomes, vitals normal |
| **Info** | 250 (indigo) | `oklch(0.6 0.12 250)` | Informational notices, knowledge base, references |
| **Warning** | 80 (amber) | `oklch(0.75 0.19 80)` | Clinical alerts, pending actions, care gaps |
| **Danger** | 20 (red) | `oklch(0.5 0.17 20)` | Critical alerts, contraindications, urgent flags |
| **Neutral** | 230 (cool gray) | `oklch(0.5 0.025 230)` | Structural chrome, borders, secondary text |

### Ground Surfaces (Elevation Stack)

| Token | Role | Use |
|---|---|---|
| `--n-doc-neutral` | Document ground | Page canvas, app background |
| `--n-body-neutral` | Body ground | Content area, scrollable regions |
| `--n-panel-neutral` | Panel ground | Sidebars, toolbars, navigation |
| `--n-card-neutral` | Card ground | Floating cards, dialogs, popovers |
| `--n-modal-neutral` | Modal ground | Modal dialogs, blocking overlays |
| `--n-control-neutral` | Control ground | Inputs, selects, form fields |
| `--n-button-neutral` | Button ground | Default button variant fill |

### Text Colors

| Token | Use |
|---|---|
| `--n-ink-strong-neutral` | Headings, emphasis, primary text |
| `--n-ink-neutral` | Body copy, standard text |
| `--n-ink-muted-neutral` | Captions, metadata, secondary text |
| `--n-ink-placeholder-neutral` | Placeholder text, disabled states |
| `--n-ink-accent` | Links, interactive text, brand accents |

### Borders

| Token | Use |
|---|---|
| `--n-border-neutral` | General borders, dividers |
| `--n-border-muted-neutral` | Subtle container borders |
| `--n-border-accent` | Focused fields, active borders |

### Dark Mode

Dark mode is automatic via `light-dark()` in all tokens. Set `color-scheme: dark` on `:root`. Key principles:

- Surfaces invert (light grounds become dark, preserving elevation hierarchy)
- Accent hues remain constant -- only lightness inverts
- Ink lightness flips to maintain contrast
- Alpha-channel borders maintain consistency across modes

---

## 2. Typography

### Typefaces

| Variable | Font | Fallback | Use |
|---|---|---|---|
| `--font-sans` | Suisse Int'l | system-ui, sans-serif | UI, body copy, all running text |
| `--font-mono` | Suisse Int'l Mono | ui-monospace, monospace | Clinical codes, lab values, timestamps |

> Suisse Int'l is the sole typeface. No serif face -- clinical interfaces favor clarity over editorial expression.

### Type Scale

| Style | Size | Weight | Tracking | Line Height |
|---|---|---|---|---|
| Display / H1 | 2.5rem (40px) | 600 | -0.02em | 1.1 |
| H2 | 1.75rem (28px) | 600 | -0.01em | 1.2 |
| H3 | 1.25rem (20px) | 600 | 0 | 1.3 |
| H4 / Section Title | 1rem (16px) | 600 | 0 | 1.4 |
| Body Large | 1.125rem (18px) | 400 | 0 | 1.6 |
| Body | 1rem (16px) | 400 | 0 | 1.5 |
| Small / Caption | 0.875rem (14px) | 400 | 0 | 1.4 |
| Label | 0.75rem (12px) | 500 | 0.04em | 1 |
| Mono / Code | 0.8125rem (13px) | 400 | 0 | 1.5 |

### CSS Quick Reference

```css
/* Headings -- Suisse Int'l Semibold */
.heading {
  font-family: "Suisse Intl, Suisse Int'l", system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* Body -- Suisse Int'l Regular */
.body {
  font-family: "Suisse Intl, Suisse Int'l", system-ui, sans-serif;
  font-weight: 400;
  line-height: 1.5;
}

/* Labels / Clinical Codes */
.label {
  font-family: "Suisse Intl, Suisse Int'l", system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Monospace -- lab values, ICD codes, timestamps */
.mono {
  font-family: "Suisse Intl Mono, Suisse Int'l Mono", ui-monospace, monospace;
  font-size: 0.8125rem;
}
```

---

## 3. Voice & Copy

### Brand Personality

- **Clear** -- Clinical language demands precision. Say what you mean. No ambiguity.
- **Calm** -- Healthcare is stressful enough. The interface should reduce anxiety, not add to it.
- **Confident** -- We know clinical AI. State facts directly. Back claims with evidence.
- **Human** -- Behind every data point is a patient. Write for people, not systems.

### Three Pillars (inform all copy)

1. **Clinical Accuracy & Trust** -- Safe, explainable intelligence that clinicians and systems can trust.
2. **Personal & Proactive Health** -- Care that adapts to each person while strengthening communities.
3. **Intelligence & Infrastructure** -- The connected, intelligent platform that powers healthcare at scale.

### Do / Don't

| Do | Don't |
|---|---|
| "See how the differential diagnosis evolved with each new result." | "Our revolutionary AI-powered platform leverages cutting-edge..." |
| "Adia tracks clinical decisions so your team can learn from outcomes." | "Comprehensive, robust solution that seamlessly integrates..." |
| "3 care gaps identified. Here's the recommended action for each." | "We are excited to announce our groundbreaking new feature..." |
| "Lab results updated the working diagnosis from 30% to 85% confidence." | "Utilizing next-generation machine learning algorithms..." |

### Punctuation & Formatting Rules

- **En dash** (--) for ranges and pauses: "95--99% accuracy"
- **Sentence case** for headlines: "Clinical context that learns" not "Clinical Context That Learns"
- **Oxford comma**: "patients, providers, and systems"
- **Product names capitalized**: Adia Health, Clinical Context Graph, Decision Trace
- **CTA copy**: short imperatives -- "See the demo" / "Start a pilot" / "Talk to us" / "Learn more"
- **Never**: "Click here to learn more about our platform"
- **Banned words**: synergize, robust, comprehensive, seamless, leverage (as a verb), supercharge, groundbreaking, revolutionary, disrupt, game-changing

### Clinical Terminology

- Use standard clinical terms correctly: DDx (differential diagnosis), ICD, CPT, FHIR, HL7
- Spell out on first use in consumer-facing copy, abbreviate freely in clinical interfaces
- "Decision trace" (not "audit log") -- this is our term for captured clinical reasoning
- "Clinical Context Graph" -- our structured knowledge representation
- "Care gap" (not "compliance gap") -- patient-centered framing

---

## 4. Components

### Cards

Subtle elevation, rounded corners (use design token radius). Neutral ground fill with muted border.

```css
.card {
  background: var(--n-card-neutral);
  border: 1px solid var(--n-border-muted-neutral);
  border-radius: var(--n-radius, 0.5rem);
  padding: 1.5rem;
  color: var(--n-ink-neutral);
}
```

### Buttons

- **Primary**: Accent surface fill, white text
- **Secondary**: Neutral button ground, accent ink
- **Outline**: Transparent with accent border
- **Ghost**: No fill, accent text

```css
.btn-primary {
  background: var(--n-surface-accent);
  color: var(--n-surface-ink-accent);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--n-radius, 0.5rem);
  font-family: "Suisse Intl, Suisse Int'l", system-ui, sans-serif;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover {
  background: var(--n-surface-hover-accent);
}
```

### Badges / Pills

Intent-colored labels for clinical status.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: var(--n-radius, 0.375rem);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.badge-success {
  background: var(--n-panel-success);
  color: var(--n-ink-success);
  border: 1px solid var(--n-border-muted-success);
}
.badge-warning {
  background: var(--n-panel-warning);
  color: var(--n-ink-warning);
  border: 1px solid var(--n-border-muted-warning);
}
.badge-danger {
  background: var(--n-panel-danger);
  color: var(--n-ink-danger);
  border: 1px solid var(--n-border-muted-danger);
}
```

### Clinical Alerts

Use intent families to encode severity:

| Intent | Clinical Use | Example |
|---|---|---|
| `success` | Normal results, resolved conditions | "HbA1c within target range" |
| `info` | Informational, reference data | "New lab results available" |
| `warning` | Requires attention, care gaps | "Overdue for colonoscopy screening" |
| `danger` | Critical, contraindications | "Drug interaction: warfarin + aspirin" |

---

## 5. Data Visualization

### Rules

1. **Use intent colors** -- success for positive trends, danger for negative, accent for neutral series
2. **Suisse Int'l only** -- no serif in charts. Mono for axis labels and values.
3. **Token-based fills** -- all chart colors reference `--n-color-{family}-{step}` tokens
4. **Respect color-scheme** -- charts must work in both light and dark mode
5. **No gradients** in bars or area fills -- flat OKLCH colors only
6. **Rounded corners** on chart containers match `--n-radius`
7. **Subtle grid lines** use `--n-border-muted-neutral`

### Chart Color Ramp (accent family, light mode)

```
--n-color-accent-050   oklch(0.933 0.01 230)    lightest tint (backgrounds)
--n-color-accent-200   oklch(0.8 0.086 230)     light series fill
--n-color-accent-400   oklch(0.667 0.162 230)   secondary series
--n-color-accent-500   oklch(0.6 0.2 230)       primary series / highlight
--n-color-accent-700   oklch(0.45 0.124 230)    dark series
--n-color-accent-950   oklch(0.225 0.01 230)    near-black (labels)
```

### CSS Template

```css
.chart-container {
  background: var(--n-card-neutral);
  border: 1px solid var(--n-border-muted-neutral);
  border-radius: var(--n-radius, 0.5rem);
  padding: 2rem;
}
.chart-headline {
  font-family: "Suisse Intl, Suisse Int'l", system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-ink-strong-neutral);
}
.chart-axis-label {
  font-family: "Suisse Intl Mono, Suisse Int'l Mono", ui-monospace, monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--n-ink-muted-neutral);
}
.chart-grid-line {
  stroke: var(--n-border-muted-neutral);
  stroke-width: 1;
}
```

---

## 6. Logo Usage

### Wordmark

- **On light surfaces**: Full color Adia wordmark (dark fill)
- **On dark surfaces**: White reversed wordmark
- **On accent surfaces**: White wordmark
- **Adaptive**: `fill: var(--n-ink-strong)` -- follows color-scheme automatically
- **Minimum clear space**: Equal to the cap height of the "A" in Adia on all sides
- **Minimum display width**: 120px (below this, letterforms lose legibility)

### App Icon

Square mark with rounded corners (8px radius). White wordmark on solid fill. The "A" negative-space triangle is preserved at icon scale.

| Variant | Background | Wordmark | Use |
|---|---|---|---|
| Default | Black | White | Primary app icon, favicons |
| Brand dark | `oklch(0.15 0.003 230)` | White | Dark-themed contexts |
| Accent | `oklch(0.6 0.2 230)` | White | Brand-colored contexts |
| Inverted | White (with muted border) | Black | Light OS themes, documents |

### Rules

- The "A" contains a negative-space triangle -- never fill, crop, or obscure it
- Icon minimum size: 32px. Wordmark minimum width: 120px.
- **Never**: stretch, rotate, recolor to off-brand colors, add effects, or place on busy backgrounds

---

## 7. Spacing Scale

Base unit: 4px. All spacing references the design token scale.

```css
--n-space-1:   0.25rem;   /*  4px */
--n-space-2:   0.5rem;    /*  8px */
--n-space-3:   0.75rem;   /* 12px */
--n-space-4:   1rem;      /* 16px */
--n-space-6:   1.5rem;    /* 24px */
--n-space-8:   2rem;      /* 32px */
--n-space-12:  3rem;      /* 48px */
--n-space-16:  4rem;      /* 64px */
--n-space-24:  6rem;      /* 96px */
--n-space-32:  8rem;      /* 128px */
```

---

## How to Apply This Guide

**For HTML/CSS components**: Reference OKLCH design tokens via `var(--n-*)`. Use Suisse Int'l for all text. Intent colors encode clinical meaning. All surfaces use the ground elevation stack. Components inherit `color-scheme` for automatic light/dark.

**For copy**: Write clear, calm, confident, human. Active voice. Sentence case. No banned words. Lead with clinical outcomes, not features. Use the three-pillar framework.

**For data viz**: Token-based colors only. Suisse Int'l throughout. Mono for labels. Intent families for clinical meaning. Both modes must work.

**For presentations**: Apply OKLCH palette and typography hierarchy. Suisse Int'l for all slides. Use intent colors to encode clinical severity. Pill labels with success/warning/danger fills.
