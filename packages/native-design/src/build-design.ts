/* ── Schema Types ── */

/** A variable slider: name, CSS custom property, default value, and range. */
export interface TokenVariable {
  type: 'variable';
  name: string;
  token: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
}

/** A labeled row of color swatches. */
export interface TokenStrip {
  type: 'strip';
  label: string;
  colors: Array<{ name: string; token: string }>;
}

/** One item inside a section — either a slider or a color strip. */
export type TokenSectionItem = TokenVariable | TokenStrip;

/** A titled group of items, optionally tagged with a family for filtering. */
export interface TokenSection {
  title: string;
  family?: string;
  items: TokenSectionItem[];
}

/** Top-level schema describing the full token inspector content. */
export interface TokenSchema {
  sections: TokenSection[];
}

/* ── Config ── */

/** Available theme presets. */
export const themes = [
  { name: 'Default', value: '' },
  { name: 'Forest', value: 'forest' },
  { name: 'Rose', value: 'rose' },
  { name: 'Zinc', value: 'zinc' },
] as const;

/** Color family names. */
export const families = ['neutral', 'accent', 'info', 'success', 'warning', 'danger'] as const;

/** Pre-built options for a family filter `<n-select>`. */
export const familyFilterOptions = [
  { value: 'all', label: 'All Families' },
  ...families.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) })),
];

/* ── Default Schema ── */

const envParams: TokenVariable[] = [
  { type: 'variable', name: 'L min', token: '--n-env-lightness-min', value: 0.15, step: 0.01, min: 0, max: 1 },
  { type: 'variable', name: 'L max', token: '--n-env-lightness-max', value: 1.00, step: 0.01, min: 0, max: 1 },
  { type: 'variable', name: 'L delta', token: '--n-env-lightness-delta', value: 0.015, step: 0.005, min: 0, max: 0.15 },
  { type: 'variable', name: 'Chroma', token: '--n-env-chroma', value: 0.20, step: 0.005, min: 0, max: 0.5 },
  { type: 'variable', name: 'C muted', token: '--n-env-chroma-k-muted', value: 0.125, step: 0.01, min: 0, max: 1 },
  { type: 'variable', name: 'C vivid', token: '--n-env-chroma-k-vivid', value: 1.00, step: 0.01, min: 0, max: 1 },
  { type: 'variable', name: 'C edge', token: '--n-env-chroma-k-edge', value: 0.05, step: 0.01, min: 0, max: 1 },
  { type: 'variable', name: 'Alpha', token: '--n-env-alpha', value: 0.85, step: 0.01, min: 0, max: 1 },
  { type: 'variable', name: 'A delta', token: '--n-env-alpha-delta', value: 0.02, step: 0.005, min: 0, max: 0.15 },
];

const elevations = ['lowest', 'lower', 'low', 'base', 'high', 'higher', 'highest'];
const brightnesses = ['brightest', 'brighter', 'bright', 'base', 'dim', 'dimmer', 'dimmest'];
const solidSteps = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const semanticSteps = ['050', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const scrimStrengths = ['strongest', 'stronger', 'strong', 'base', 'weak', 'weaker', 'weakest'];

/** Group env params into titled sections by their logical group. */
function buildEnvSections(): TokenSection[] {
  const groups: Record<string, TokenVariable[]> = {};

  for (const p of envParams) {
    // Derive group from token name: --n-env-{group}-*
    const group = p.token.startsWith('--n-env-lightness') ? 'Lightness'
      : p.token.startsWith('--n-env-chroma') ? 'Chroma'
      : 'Alpha';
    (groups[group] ??= []).push(p);
  }

  return Object.entries(groups).map(([title, items]) => ({
    title,
    family: 'env',
    items,
  }));
}

/** Build the items array for a single color family. */
function buildFamilyItems(family: string): TokenSectionItem[] {
  return [
    // Family env sliders
    { type: 'variable', name: 'Hue', token: `--n-env-hue-${family}`, value: 230, step: 1, min: 0, max: 360 },
    { type: 'variable', name: 'Chroma', token: `--n-env-chroma-${family}`, value: 0.5, step: 0.01, min: 0, max: 1 },
    { type: 'variable', name: 'Lightness', token: `--n-env-lightness-${family}`, value: 0.5, step: 0.01, min: 0, max: 1 },
    // Surfaces
    { type: 'strip', label: 'Elevation', colors: elevations.map(e => ({ name: e, token: `--n-color-${family}-${e}` })) },
    { type: 'strip', label: 'Brightness', colors: brightnesses.map(b => ({ name: b, token: `--n-color-${family}-${b}` })) },
    // Solids
    { type: 'strip', label: 'Solid', colors: solidSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}` })) },
    { type: 'strip', label: 'Scrim', colors: solidSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}-scrim` })) },
    // Semantic
    { type: 'strip', label: 'Semantic', colors: semanticSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}` })) },
    { type: 'strip', label: 'Semantic Scrim', colors: semanticSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}-scrim` })) },
    // Scrim palette
    { type: 'strip', label: 'Tint', colors: scrimStrengths.map(s => ({ name: s, token: `--n-color-${family}-scrim-tint-${s}` })) },
    { type: 'strip', label: 'Shade', colors: scrimStrengths.map(s => ({ name: s, token: `--n-color-${family}-scrim-shade-${s}` })) },
  ];
}

/**
 * Returns the default token schema — all env params + all 6 color families
 * with their full ramp of surfaces, solids, semantics, and scrims.
 *
 * Hosts can call this, mutate the result (drop sections, reorder, add custom
 * tokens), and pass the modified schema to `<native-design>`.
 */
export function createDefaultSchema(): TokenSchema {
  return {
    sections: [
      ...buildEnvSections(),
      ...families.map(f => ({
        title: f.charAt(0).toUpperCase() + f.slice(1),
        family: f,
        items: buildFamilyItems(f),
      })),
    ],
  };
}

/* ── DOM Helpers ── */

function createSectionEl(title: string, family?: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'native-design-section';
  if (family) section.dataset.family = family;
  const h = document.createElement('h3');
  h.className = 'native-design-heading';
  h.textContent = title;
  section.appendChild(h);
  return section;
}

function createSubHeading(text: string): HTMLElement {
  const h = document.createElement('h4');
  h.className = 'native-design-subheading';
  h.textContent = text;
  return h;
}

function createColorStrip(data: Array<{ name: string; token: string }>): HTMLElement {
  const el = document.createElement('native-design-colors');
  el.setAttribute('data', JSON.stringify(data));
  return el;
}

function createVariableEl(item: TokenVariable): HTMLElement {
  const el = document.createElement('native-design-variable');
  el.setAttribute('data', JSON.stringify({
    name: item.name,
    type: 'number',
    token: item.token,
    value: item.value,
    step: item.step,
    min: item.min,
    max: item.max,
  }));
  return el;
}

/* ── Renderer ── */

/**
 * Stamps token sections into `container` from the given schema.
 * Falls back to `createDefaultSchema()` when no schema is provided.
 *
 * This is a pure renderer — no header, filter, or theme controls.
 * The host provides those and wires them to the `<native-design>` element's
 * `family` attribute and the `native-design-theme-change` event.
 */
export function buildTokens(container: HTMLElement, schema?: TokenSchema): void {
  const { sections } = schema ?? createDefaultSchema();

  for (const section of sections) {
    const sectionEl = createSectionEl(section.title, section.family);

    for (const item of section.items) {
      if (item.type === 'variable') {
        sectionEl.appendChild(createVariableEl(item));
      } else {
        sectionEl.appendChild(createSubHeading(item.label));
        sectionEl.appendChild(createColorStrip(item.colors));
      }
    }

    container.appendChild(sectionEl);
  }
}
