#!/usr/bin/env node
/**
 * Hydrate Figma color variables JSON with resolved values from tokens-computed-default.css.
 *
 * Usage:  node docs/REFS/hydrate-figma-colors.mjs
 * Output: docs/REFS/adia-color-variables-figma-hydrated.json
 *
 * Reads the computed CSS tokens (oklch values with light-dark()),
 * converts to hex, and maps to the Figma variable structure.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(__dirname, 'tokens-computed-default.css');
const OUT_PATH = resolve(__dirname, 'adia-color-variables-figma-hydrated.json');

// ── OKLCH → Hex ─────────────────────────────────────────────

/** OKLCH string → { L, C, H, alpha } */
function parseOklch(str) {
  // oklch(0.6 0.2 230) or oklch(0.6 0.2 230 / 0.85)
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return { L: +m[1], C: +m[2], H: +m[3], alpha: m[4] != null ? +m[4] : 1 };
}

/** OKLab → linear sRGB */
function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/** Linear → sRGB gamma */
function linearToSrgb(c) {
  return c >= 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
}

/** Clamp 0–255 */
function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/** OKLCH object → hex string (#rrggbb or #rrggbbaa) */
function oklchToHex({ L, C, H, alpha }) {
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
  const r = clamp255(linearToSrgb(lr));
  const g = clamp255(linearToSrgb(lg));
  const bl = clamp255(linearToSrgb(lb));

  const hex = '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
  if (alpha < 1) {
    const aa = clamp255(alpha);
    return hex + aa.toString(16).padStart(2, '0');
  }
  return hex;
}

/** Convert an oklch() string directly to hex */
function oklchStringToHex(str) {
  const parsed = parseOklch(str);
  if (!parsed) return null;
  return oklchToHex(parsed);
}

/** Handle rgb(...) too */
function rgbToHex(str) {
  const m = str.match(/rgb\(\s*([\d.]+),?\s*([\d.]+),?\s*([\d.]+)\s*\)/);
  if (!m) return null;
  const r = clamp255(+m[1] / 255);
  const g = clamp255(+m[2] / 255);
  const b = clamp255(+m[3] / 255);
  // Wait, clamp255 expects 0-1 input... let me fix
  return '#' + [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])]
    .map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function colorToHex(str) {
  str = str.trim();
  if (str.startsWith('oklch')) return oklchStringToHex(str);
  if (str.startsWith('rgb')) return rgbToHex(str);
  return null;
}

// ── Parse CSS Tokens ────────────────────────────────────────

const css = readFileSync(CSS_PATH, 'utf-8');

/**
 * Returns Map<tokenName, { light: hex, dark: hex }>
 */
function parseTokens() {
  const tokens = new Map();
  // Match lines like:   --n-ink-neutral:   light-dark(oklch(...), oklch(...));
  // or:                 --n-surface-neutral:   oklch(...);
  const re = /^\s*(--n-[\w-]+):\s*(.+?);/gm;
  let m;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    const value = m[2].trim();

    // light-dark(L, D)
    const ld = value.match(/^light-dark\((.+),\s*(.+)\)$/);
    if (ld) {
      const lightHex = colorToHex(ld[1]);
      const darkHex = colorToHex(ld[2]);
      if (lightHex && darkHex) {
        tokens.set(name, { light: lightHex, dark: darkHex });
      }
    } else {
      // Mode-independent
      const hex = colorToHex(value);
      if (hex) {
        tokens.set(name, { light: hex, dark: hex });
      }
    }
  }
  return tokens;
}

const tokens = parseTokens();
console.log(`Parsed ${tokens.size} color tokens from CSS`);

// ── Map tokens → Figma structure ────────────────────────────

const FAMILIES = ['neutral', 'accent', 'info', 'success', 'warning', 'danger'];

// Roles and their state keys. "color" = the base/default state in Figma.
// CSS token pattern: --n-{role}-{state?}-{family}
// Figma path:        {family}.{role}.{state}

const ROLE_STATES = {
  ink: ['color', 'strong', 'inverse', 'muted', 'placeholder', 'hover', 'active', 'disabled'],
  surface: ['color', 'hover', 'active', 'disabled'],
  'surface-ink': ['color', 'hover', 'active', 'disabled'],
  border: ['color', 'muted', 'hover', 'active', 'disabled'],
  outline: ['color', 'muted', 'hover', 'active', 'disabled'],
};

// Ground surfaces nest under surface.{ground} in Figma
const GROUND_ROLES = {
  doc: ['color', 'hover', 'active', 'disabled'],
  body: ['color', 'hover', 'active', 'disabled'],
  panel: ['color', 'hover', 'active', 'disabled'],
  control: ['color', 'hover', 'active', 'disabled'],
  button: ['color', 'hover', 'active', 'disabled'],
  card: ['color', 'hover', 'active', 'disabled'],
  modal: ['color', 'hover', 'active', 'disabled'],
};

/**
 * Build the CSS token name from role + state + family.
 * "color" state = base (no state modifier in the CSS name).
 *
 * Examples:
 *   ink, color, neutral     → --n-ink-neutral
 *   ink, strong, neutral    → --n-ink-strong-neutral
 *   surface, color, accent  → --n-surface-accent
 *   surface-ink, color, neutral → --n-surface-ink-neutral
 */
function cssTokenName(role, state, family) {
  const parts = ['--n'];
  parts.push(...role.split('-'));  // 'surface-ink' → ['surface', 'ink']
  if (state !== 'color') parts.push(state);
  parts.push(family);
  return parts.join('-');
}

function makeEntry(hex) {
  return {
    $scopes: ['ALL_SCOPES'],
    $type: 'color',
    $value: hex,
  };
}

function buildMode(mode) {
  const result = {};

  for (const family of FAMILIES) {
    const fam = {};

    for (const [role, states] of Object.entries(ROLE_STATES)) {
      // surface-ink and ground roles nest under surface — handled below
      if (role === 'surface-ink') continue;

      const group = {};
      for (const state of states) {
        const tokenName = cssTokenName(role, state, family);
        const token = tokens.get(tokenName);
        if (token) {
          group[state] = makeEntry(token[mode]);
        }
      }

      // Nest sub-groups under surface
      if (role === 'surface') {
        // surface.ink — text on surfaces
        const inkStates = ROLE_STATES['surface-ink'];
        const inkGroup = {};
        for (const state of inkStates) {
          const tokenName = cssTokenName('surface-ink', state, family);
          const token = tokens.get(tokenName);
          if (token) {
            inkGroup[state] = makeEntry(token[mode]);
          }
        }
        if (Object.keys(inkGroup).length > 0) {
          group.ink = inkGroup;
        }

        // Ground surfaces: surface.doc, surface.body, surface.panel, etc.
        for (const [ground, groundStates] of Object.entries(GROUND_ROLES)) {
          const groundGroup = {};
          for (const state of groundStates) {
            const tokenName = cssTokenName(ground, state, family);
            const token = tokens.get(tokenName);
            if (token) {
              groundGroup[state] = makeEntry(token[mode]);
            }
          }
          if (Object.keys(groundGroup).length > 0) {
            group[ground] = groundGroup;
          }
        }
      }

      if (Object.keys(group).length > 0) {
        fam[role] = group;
      }
    }

    if (Object.keys(fam).length > 0) {
      result[family] = fam;
    }
  }

  return result;
}

const output = [
  {
    Colors: {
      modes: {
        light: buildMode('light'),
        dark: buildMode('dark'),
      },
    },
  },
];

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${OUT_PATH}`);

// Stats
let lightCount = 0;
const countEntries = (obj) => {
  for (const v of Object.values(obj)) {
    if (v.$type === 'color') lightCount++;
    else if (typeof v === 'object') countEntries(v);
  }
};
countEntries(output[0].Colors.modes.light);
console.log(`${lightCount} color entries per mode (${lightCount * 2} total)`);
