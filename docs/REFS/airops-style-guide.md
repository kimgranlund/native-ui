---
name: airops-brand
description: Apply AirOps brand guidelines to any output -- HTML/CSS components, copy, data visualizations, presentations, or documents. Use whenever the task requires on-brand visual design, writing in AirOps voice, or producing content that represents the AirOps brand.
---

# AirOps Brand System

## Overview

This skill encodes AirOps' complete brand system: colors, typography, voice, component patterns, and data viz rules. Apply it whenever producing anything that represents AirOps externally or internally.

**Keywords**: AirOps brand, on-brand, style guide, brand colors, typography, brand voice, AEO, Content Engineering, data viz, components, copy

---

## 1. Colors

### Primary Palette

| Token | Hex | Use |
|---|---|---|
| `--white` | `#ffffff` | Page backgrounds, card fills |
| `--off-white` | `#F8FFFA` | Subtle section backgrounds |
| `--near-black` | `#000d05` | Primary text on light |
| `--green-50` | `#f8fffb` | Lightest tint |
| `--green-100` | `#dfeae3` | Borders, dividers |
| `--green-200` | `#CCFFE0` | Highlight backgrounds |
| `--green-500` | `#008c44` | Primary brand green, CTAs |
| `--green-600` | `#002910` | Dark green, hero backgrounds |
| `--interaction` | `#00ff64` | Neon green -- hover states, interactive accents |
| `--accent-label` | `#EEFF8C` | Pill/tag labels, DM Mono text only |

### Text Colors

| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#09090b` | Body copy |
| `--text-secondary` | `#676c79` | Captions, metadata |
| `--text-tertiary` | `#a5aab6` | Disabled, placeholder |

### Strokes

| Token | Hex | Use |
|---|---|---|
| `--stroke-primary` | `#ecedef` | General borders |
| `--stroke-green` | `#d4e8da` | On-green-tinted surfaces |

### Dark Mode / Hero Surfaces

- Background: `#002910` (dark green -- use for ALL large background surfaces: heroes, full-bleed sections, footers, nav bars). **Never use `#0b0e16` or any near-black/blue-tinted color for large backgrounds.**
- Text on dark: `#ffffff`
- Accent on dark: `#00ff64` (interaction green) or `#EEFF8C` (label yellow)

---

## 2. Typography

### Typefaces

| Variable | Font | Fallback | Use |
|---|---|---|---|
| `--font-sans` | Saans | Helvetica Neue, sans-serif | UI, body copy, all running text |
| `--font-serif` | Serrif VF | Georgia, serif | Large editorial headlines only |
| `--font-mono` | Saans Mono | DM Mono, monospace | Labels, pills, tags, code, axis values |

> **Important:** Serrif VF is the licensed full font (not Trial). Always reference as `'Serrif VF'`.

### Type Scale

| Style | Font | Size | Weight | Tracking | Line Height |
|---|---|---|---|---|---|
| Display / H1 | Serrif VF | 96px | 400 | -0.02em | 1.0 |
| H2 | Serrif VF | 56px | 400 | -0.02em | 1.1 |
| H3 | Serrif VF | 40px | 400 | -0.02em | 1.04 |
| H4 / Section Title | Saans | 28px | 600 | -0.01em | 1.2 |
| H5 | Saans | 20px | 600 | 0 | 1.3 |
| Body Large | Saans | 18px | 400 | 0 | 1.6 |
| Body | Saans | 16px | 400 | 0 | 1.5 |
| Small / Caption | Saans | 14px | 400 | 0 | 1.4 |
| Label / Pill | Saans Mono / DM Mono | 11-12px | 500 | 0.08em | 1 |

### CSS Quick Reference

```css
/* Large Headlines -- Serrif VF */
.headline { font-family: 'Serrif VF', Georgia, serif; font-weight: 400; letter-spacing: -0.02em; }

/* UI / Body -- Saans */
.body { font-family: 'Saans', 'Helvetica Neue', sans-serif; }

/* Labels / Pills -- Saans Mono */
.label { font-family: 'Saans Mono', 'DM Mono', monospace; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
```

---

## 3. Voice & Copy

### Brand Personality

- **Direct** -- Say what you mean. No fluff, no filler. Lead with the value.
- **Sharp** -- Short sentences. Strong verbs. Active voice always.
- **Expert** -- We know AEO. Use the right terminology confidently.
- **Human** -- Warm but never corporate. We're people talking to people.

### Do / Don't

| Do | Don't |
|---|---|
| "See exactly where your content gets cited by AI." | "Leveraging next-generation AI-powered solutions..." |
| "AirOps tracks AI citations so you can optimize what actually matters." | "Our comprehensive, robust platform enables teams to synergize..." |
| "You're losing AI visibility. Here's why, and how to fix it." | "We are excited to announce our groundbreaking new feature..." |

### Punctuation & Formatting Rules

- **En dash** (--) for ranges and pauses: "10--20 citations". Never use em dash (--)
- **Sentence case** for headlines: "AEO is the new SEO" not "AEO Is The New SEO"
- **Oxford comma**: "ChatGPT, Gemini, and Perplexity"
- **Product names always capitalized**: AirOps, Page360, Citations360, Brand Kit, AEO, Offsite
- **CTA copy**: short imperatives -- "Get a demo" / "Start free" / "See it live" / "Book a call"
- **Never**: "Click here to learn more about our platform"
- **Banned words**: synergize, robust, comprehensive, seamless, leverage (as a verb), supercharge, groundbreaking, revolutionary

### Positioning Language

AirOps owns the **Content Engineering** and **Answer Engine Optimization (AEO)** categories. Always:
- Use "Content Engineer" to describe the role of AirOps customers
- Refer to AI search visibility as "AEO" not "AI SEO" or "LLM SEO"
- Lead with outcomes: citations, visibility, traffic -- not features

---

## 4. Components

### Pill / Label Tag

Sharp corners (no border-radius). `#EEFF8C` fill. DM Mono or Saans Mono, all-caps, 11px, weight 500. `#000d05` text.

```css
.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #EEFF8C;
  border: 1px solid #d4e8da;
  border-radius: 0;
  font-family: 'Saans Mono', 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #000d05;
}
```

### Cards

White background. 1px `#d4e8da` border. No border-radius (sharp corners). Subtle shadow optional: `0 1px 4px rgba(0,0,0,0.06)`.

```css
.card {
  background: #ffffff;
  border: 1px solid #d4e8da;
  border-radius: 0;
  padding: 24px;
}
```

### Buttons

- **Primary**: `#000d05` bg, `#ffffff` text, no radius
- **Secondary**: `#ffffff` bg, `#000d05` border + text, no radius
- **Accent**: `#00ff64` bg, `#000d05` text, no radius

```css
.btn-primary { background: #000d05; color: #fff; border: none; padding: 12px 24px; border-radius: 0; font-family: var(--font-sans); font-weight: 600; cursor: pointer; }
.btn-accent   { background: #00ff64; color: #000d05; border: none; padding: 12px 24px; border-radius: 0; font-weight: 600; cursor: pointer; }
```

---

## 5. Data Visualization

AirOps data viz has a strict rule set. **Never deviate.**

### Rules

1. **Sharp corners only** -- no rounded bars, no rounded chart containers
2. **Green spectrum palette** -- `#eef8f0` through `#0a2e14` for fills
3. **Accent highlight** -- `#00e676` for the primary data series or the most important value
4. **Label accent** -- `#EEFF8C` with `#000d05` text for pill callouts
5. **Georgia or Serrif VF** for chart headlines (40--56px, tracking -0.02em)
6. **DM Mono all-caps** for all axis labels, value callouts, tick marks, and pill tags
7. **White background** (`#ffffff`) for chart area
8. **1px `#d4e8da` border** on chart containers
9. **No gradients** in bars or lines -- flat fills only

### Color Ramp (light to dark)

```
#eef8f0  --  lightest tint (backgrounds)
#CCFFE0  --  light green
#00e676  --  accent / highlight series
#008c44  --  mid green
#005c2e  --  dark green
#002910  --  deepest green
#0a2e14  --  near black green
```

### CSS Template

```css
.chart-container {
  background: #ffffff;
  border: 1px solid #d4e8da;
  border-radius: 0;
  padding: 32px;
  font-family: 'DM Mono', monospace;
}
.chart-headline {
  font-family: 'Serrif VF', Georgia, serif;
  font-size: 40px;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: #000d05;
}
.chart-axis-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #676c79;
}
.chart-value-pill {
  background: #EEFF8C;
  color: #000d05;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 0;
}
```

---

## 6. Logo Usage

- **On white**: Full color AirOps wordmark (dark)
- **On dark**: White reversed wordmark
- **Minimum clear space**: equal to the height of the "A" in AirOps on all sides
- **Never**: stretch, rotate, recolor, add effects, or place on busy backgrounds

---

## 7. Spacing Scale

Base unit: 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

---

## How to Apply This Skill

**For HTML/CSS components**: Reference the color tokens, typography rules, and component patterns above. Always: sharp corners, green palette, Serrif VF for headlines, Saans for body, DM Mono for labels. Large background surfaces (heroes, nav, footers, full-bleed sections) must use `#002910` -- never `#0b0e16` or any near-black/blue tone.

**For copy**: Write direct, sharp, expert, human. Active voice. Sentence case. No em dashes. No banned words. Use AEO and Content Engineering category language.

**For data viz**: Strict green palette. Sharp corners. Georgia/Serrif VF headlines. DM Mono labels all-caps. #EEFF8C pill accents. White background. 1px green border.

**For presentations/documents**: Apply green palette and typography hierarchy. Use Serrif VF for cover/section headlines. Saans for body. Pill labels with #EEFF8C. No rounded corners on shapes.
