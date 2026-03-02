import type { NTokensVariable } from './tokens-variable-element.ts';
import type { NTokensColors } from './tokens-colors-element.ts';

/* ── Config (matches colors.html) ── */

const themes = [
  { name: 'Default', value: '' },
  { name: 'Forest', value: 'forest' },
  { name: 'Rose', value: 'rose' },
  { name: 'Zinc', value: 'zinc' },
];

const envParams = [
  { name: 'L min', token: '--n-env-lightness-min', value: 0.15, step: 0.01, min: 0, max: 1, group: 'Lightness' },
  { name: 'L max', token: '--n-env-lightness-max', value: 1.00, step: 0.01, min: 0, max: 1, group: 'Lightness' },
  { name: 'L delta', token: '--n-env-lightness-delta', value: 0.015, step: 0.005, min: 0, max: 0.15, group: 'Lightness' },
  { name: 'Chroma', token: '--n-env-chroma', value: 0.20, step: 0.005, min: 0, max: 0.5, group: 'Chroma' },
  { name: 'C muted', token: '--n-env-chroma-k-muted', value: 0.125, step: 0.01, min: 0, max: 1, group: 'Chroma' },
  { name: 'C vivid', token: '--n-env-chroma-k-vivid', value: 1.00, step: 0.01, min: 0, max: 1, group: 'Chroma' },
  { name: 'C edge', token: '--n-env-chroma-k-edge', value: 0.05, step: 0.01, min: 0, max: 1, group: 'Chroma' },
  { name: 'Alpha', token: '--n-env-alpha', value: 0.85, step: 0.01, min: 0, max: 1, group: 'Alpha' },
  { name: 'A delta', token: '--n-env-alpha-delta', value: 0.02, step: 0.005, min: 0, max: 0.15, group: 'Alpha' },
];

const families = ['neutral', 'accent', 'info', 'success', 'warning', 'danger'] as const;

const elevations = ['lowest', 'lower', 'low', 'base', 'high', 'higher', 'highest'];
const brightnesses = ['brightest', 'brighter', 'bright', 'base', 'dim', 'dimmer', 'dimmest'];
const solidSteps = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const semanticSteps = ['050', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const scrimStrengths = ['strongest', 'stronger', 'strong', 'base', 'weak', 'weaker', 'weakest'];

/* ── Builder helpers ── */

function createSection(title: string, family?: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'native-tokens-section';
  if (family) section.dataset.family = family;
  const h = document.createElement('h3');
  h.className = 'native-tokens-heading';
  h.textContent = title;
  section.appendChild(h);
  return section;
}

function createSubHeading(text: string): HTMLElement {
  const h = document.createElement('h4');
  h.className = 'native-tokens-subheading';
  h.textContent = text;
  return h;
}

function createColorStrip(data: Array<{ name: string; token: string }>): HTMLElement {
  const el = document.createElement('native-tokens-colors');
  el.setAttribute('data', JSON.stringify(data));
  return el;
}

function createVariable(param: { name: string; token: string; value: number; step?: number; min?: number; max?: number }): HTMLElement {
  const el = document.createElement('native-tokens-variable');
  el.setAttribute('data', JSON.stringify({
    name: param.name,
    type: 'number',
    token: param.token,
    value: param.value,
    step: param.step,
    min: param.min,
    max: param.max,
  }));
  return el;
}

/* ── Main builder ── */

export function buildTokens(container: HTMLElement): void {
  // ── Toolbar (Theme + Family filter side-by-side) ──
  const toolbar = document.createElement('div');
  toolbar.className = 'native-tokens-toolbar';

  const themesEl = document.createElement('native-tokens-themes');
  themesEl.setAttribute('data', JSON.stringify(themes));
  toolbar.appendChild(themesEl);

  const filterOptions = [
    { value: 'all', label: 'All Families' },
    ...families.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) })),
  ];

  const filterCtrl = document.createElement('n-select');
  filterCtrl.setAttribute('size', 'xs');
  filterCtrl.setAttribute('placeholder', 'Family...');
  filterCtrl.setAttribute('options', JSON.stringify(filterOptions));
  filterCtrl.setAttribute('value', 'all');

  toolbar.appendChild(filterCtrl);
  container.appendChild(toolbar);

  // ── Environment Parameters ──
  let currentGroup = '';
  let currentSection: HTMLElement | null = null;

  for (const param of envParams) {
    if (param.group !== currentGroup) {
      currentGroup = param.group;
      currentSection = createSection(param.group, 'env');
      container.appendChild(currentSection);
    }
    currentSection!.appendChild(createVariable(param));
  }

  // ── Per-Family Parameters + Color Strips ──
  for (const family of families) {
    const section = createSection(family.charAt(0).toUpperCase() + family.slice(1), family);

    // Family sliders
    section.appendChild(createVariable({
      name: 'Hue', token: `--n-env-hue-${family}`, value: 230, step: 1, min: 0, max: 360,
    }));
    section.appendChild(createVariable({
      name: 'Chroma', token: `--n-env-chroma-${family}`, value: 0.5, step: 0.01, min: 0, max: 1,
    }));
    section.appendChild(createVariable({
      name: 'Lightness', token: `--n-env-lightness-${family}`, value: 0.5, step: 0.01, min: 0, max: 1,
    }));

    // Surfaces
    section.appendChild(createSubHeading('Elevation'));
    section.appendChild(createColorStrip(
      elevations.map(e => ({ name: e, token: `--n-color-${family}-${e}` }))
    ));

    section.appendChild(createSubHeading('Brightness'));
    section.appendChild(createColorStrip(
      brightnesses.map(b => ({ name: b, token: `--n-color-${family}-${b}` }))
    ));

    // Solids (raw 11-step ramp)
    section.appendChild(createSubHeading('Solid'));
    section.appendChild(createColorStrip(
      solidSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}` }))
    ));

    // Scrims (raw 11-step with alpha)
    section.appendChild(createSubHeading('Scrim'));
    section.appendChild(createColorStrip(
      solidSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}-scrim` }))
    ));

    // Semantic (light-dark aware 11-step)
    section.appendChild(createSubHeading('Semantic'));
    section.appendChild(createColorStrip(
      semanticSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}` }))
    ));

    // Semantic Scrims
    section.appendChild(createSubHeading('Semantic Scrim'));
    section.appendChild(createColorStrip(
      semanticSteps.map(s => ({ name: s, token: `--n-color-${family}-${s}-scrim` }))
    ));

    // Scrim Palette — Tint
    section.appendChild(createSubHeading('Tint'));
    section.appendChild(createColorStrip(
      scrimStrengths.map(s => ({ name: s, token: `--n-color-${family}-scrim-tint-${s}` }))
    ));

    // Scrim Palette — Shade
    section.appendChild(createSubHeading('Shade'));
    section.appendChild(createColorStrip(
      scrimStrengths.map(s => ({ name: s, token: `--n-color-${family}-scrim-shade-${s}` }))
    ));

    container.appendChild(section);
  }

  // ── Family filter logic ──
  filterCtrl.addEventListener('native:change', ((e: CustomEvent) => {
    const selected = e.detail.value as string;
    const sections = container.querySelectorAll<HTMLElement>('.native-tokens-section[data-family]');
    for (const section of sections) {
      const family = section.dataset.family!;
      if (selected === 'all') {
        section.hidden = false;
      } else if (family === 'env') {
        // Env params visible when "All" or any single family
        section.hidden = false;
      } else {
        section.hidden = family !== selected;
      }
    }
    // Refresh visible color strips after filter change
    requestAnimationFrame(() => {
      container.querySelectorAll<NTokensColors>('native-tokens-colors').forEach(c => c.refresh());
    });
  }) as EventListener);

  // ── Global sync: theme change → sync all native-tokens-variable sliders ──
  container.addEventListener('native-tokens-theme-change', () => {
    requestAnimationFrame(() => {
      container.querySelectorAll<NTokensVariable>('native-tokens-variable').forEach(v => v.sync());
    });
  });
}
