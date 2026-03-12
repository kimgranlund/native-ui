/**
 * Extract all --n-* custom property declarations from CSS source files,
 * resolve color tokens to final oklch() values via a probe element,
 * and generate a downloadable tokens-computed.css.
 */


/** Parse CSS text for custom property declarations on :root. */
function extractPropertyNames(css: string): string[] {
  const names: string[] = [];
  const re = /(--n-[a-zA-Z0-9_-]+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

/** Group token names by prefix for readable output sections. */
function groupTokens(names: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const parts = name.replace(/^--n-/, '').split('-');
    const prefix = parts[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(name);
  }
  return groups;
}

/** Documentation for each token group — why, how, where. */
const GROUP_DOCS: Record<string, string[]> = {
  color: [
    'Color Primitives (colors.computed.css)',
    'The foundational OKLCH color ramp for each family (neutral, accent, info, success, warning, danger).',
    'Three sub-scales: 11-step raw (1–11), 11-step semantic (050–950, light-dark aware),',
    'elevation (lowest→highest), brightness (dimmest→brightest), and scrim (alpha) variants.',
    'Used everywhere — semantic tokens, components, and consumer code all reference these.',
    'Defined in: src/styles/css/colors.computed.css  •  Layer: @layer colors',
  ],
  doc: [
    'Document Ground (colors.semantic.css)',
    'Lowest-elevation background — the page/app canvas behind everything.',
    'Applied to <html> or <body> as the root background color.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  body: [
    'Body Ground (colors.semantic.css)',
    'Content-area background — sits on top of the document ground.',
    'Used by <n-body>, scrollable content regions, and main content areas.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  panel: [
    'Panel Ground (colors.semantic.css)',
    'Mid-elevation surface — sidebar panels, toolbars, secondary containers.',
    'Used by <n-pane>, <n-container data-kind="panel">, and similar structural surfaces.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  control: [
    'Control Ground (colors.semantic.css)',
    'Form control background — inputs, selects, textareas, and other interactive fields.',
    'Used by <n-input>, <n-select>, <n-textarea>, and form-associated components.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  button: [
    'Button Ground (colors.semantic.css)',
    'Button fill for the "default" variant — neutral chrome with intent-colored text.',
    'Used by <n-button variant="default"> and similar button-like controls.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  card: [
    'Card Ground (colors.semantic.css)',
    'Highest-elevation opaque surface — floating cards, dialogs, popovers.',
    'Used by <n-container data-kind="card">, <n-dialog>, popover surfaces.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  modal: [
    'Modal Ground (colors.semantic.css)',
    'Top-layer surface — modal dialogs and blocking overlays.',
    'Used by <n-dialog modal>, command palettes, and full-screen overlays.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  ink: [
    'Ink (colors.semantic.css)',
    'Text and icon colors on ground surfaces — the primary readable content color.',
    'Modifiers: strong (headings, emphasis), muted (secondary text), inverse (on dark fills),',
    'placeholder (input placeholders). State variants: hover, active, disabled.',
    'Used by all text-bearing components; --n-ink-{family} resolves via intent inheritance.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  border: [
    'Border / Stroke (colors.semantic.css)',
    'Borders and dividers on ground surfaces — typically low-alpha scrims.',
    'Modifiers: muted (subtle dividers, container borders).',
    'State variants: hover, active, disabled.',
    'Used by component borders, <hr>, container outlines, and form field borders.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  surface: [
    'Surface (colors.semantic.css)',
    'Interactive element fills — buttons (primary/secondary variants), badges, chips, toggles.',
    'These sit on top of grounds and need contrast against both ground and their own ink.',
    'State variants: hover, active, disabled.',
    'Used by <n-button variant="primary|secondary">, <n-badge>, <n-switch> thumb, etc.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
  outline: [
    'Outline (colors.semantic.css)',
    'Borders on surface fills — higher-contrast than ground borders for legibility on colored fills.',
    'Used by <n-button variant="outline">, outlined badges, and ring-style focus indicators.',
    'State variants: hover, active, disabled.',
    'Defined in: src/styles/css/colors.semantic.css  •  Layer: @layer tokens',
  ],
};

/**
 * Resolve a custom property to its final computed color.
 * Sets the property as background-color on a probe element, then reads
 * the computed result — the browser fully resolves var(), light-dark(),
 * oklch(), etc. into a concrete color value.
 */
function resolveColor(probe: HTMLElement, name: string): string | null {
  probe.style.backgroundColor = '';
  probe.style.backgroundColor = `var(${name})`;
  const val = getComputedStyle(probe).backgroundColor;
  // Browsers return 'rgba(0, 0, 0, 0)' or 'transparent' for invalid/non-color values
  if (!val || val === 'rgba(0, 0, 0, 0)' || val === 'transparent') return null;
  return val;
}

/** Convert an rgb/rgba color string to oklch via canvas + CSS. */
function toOklch(probe: HTMLElement, color: string): string {
  // Use CSS computed style to convert: set as color, read back with forced oklch
  probe.style.color = color;
  const computed = getComputedStyle(probe).color;
  // Modern browsers may already return oklch; if not, return as-is
  return computed;
}

/** Wait for styles to recompute after a color-scheme change. */
function waitForRepaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Resolve token names to computed values for the current color scheme. */
function resolveEntries(probe: HTMLElement, names: string[]): [string, string][] {
  const entries: [string, string][] = [];
  for (const name of names) {
    const color = resolveColor(probe, name);
    if (!color) continue;
    const oklch = toOklch(probe, color);
    entries.push([name, oklch]);
  }
  return entries;
}

/** Build a CSS :root block from resolved entries. */
function buildCssBlock(entries: [string, string][], scheme: string): string[] {
  const groups = groupTokens(entries.map(([n]) => n));
  const valueMap = new Map(entries);
  const lines: string[] = [];

  lines.push(`  /* ── ${scheme} ── */`);

  let first = true;
  for (const [prefix, names] of groups) {
    if (!first) lines.push('');
    first = false;

    const doc = GROUP_DOCS[prefix];
    if (doc) {
      lines.push('  /* ────────────────────────────────────────────────────');
      for (const line of doc) lines.push(`     ${line}`);
      lines.push('     ──────────────────────────────────────────────────── */');
    } else {
      lines.push(`  /* ── ${prefix} ── */`);
    }

    const maxLen = Math.max(...names.map(n => n.length));

    for (const name of names) {
      const val = valueMap.get(name);
      if (!val) continue;
      const pad = ' '.repeat(maxLen - name.length);
      lines.push(`  ${name}:${pad} ${val};`);
    }
  }

  return lines;
}

/**
 * Resolve tokens from CSS source files for both light and dark schemes,
 * then download a single CSS file with both modes.
 */
async function resolveAndDownload(paths: string[], filenamePrefix: string): Promise<void> {
  const allNames: string[] = [];

  for (const path of paths) {
    try {
      const res = await fetch(path);
      const css = await res.text();
      const names = extractPropertyNames(css);
      for (const n of names) {
        if (!allNames.includes(n)) allNames.push(n);
      }
    } catch (err) {
      console.warn(`Failed to fetch ${path}:`, err);
    }
  }

  if (allNames.length === 0) {
    console.error('No tokens found');
    return;
  }

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;';
  document.body.appendChild(probe);

  const root = document.documentElement;
  const originalScheme = root.style.colorScheme;

  // Resolve light
  root.style.colorScheme = 'light';
  await waitForRepaint();
  const lightEntries = resolveEntries(probe, allNames);

  // Resolve dark
  root.style.colorScheme = 'dark';
  await waitForRepaint();
  const darkEntries = resolveEntries(probe, allNames);

  // Restore
  root.style.colorScheme = originalScheme;
  probe.remove();

  const theme = root.getAttribute('theme') || 'default';
  const totalTokens = new Set([...lightEntries.map(([n]) => n), ...darkEntries.map(([n]) => n)]).size;

  const lines: string[] = [
    '/* ════════════════════════════════════════════════════════════════',
    `   ${filenamePrefix} (resolved to final values)`,
    `   Generated: ${new Date().toISOString()}`,
    `   Theme: ${theme}`,
    `   Tokens: ${totalTokens} per mode`,
    '   ════════════════════════════════════════════════════════════════ */',
    '',
    '/* ── Light Mode ── */',
    '@media (prefers-color-scheme: light) {',
    ':root {',
    ...buildCssBlock(lightEntries, 'light'),
    '}',
    '}',
    '',
    '/* ── Dark Mode ── */',
    '@media (prefers-color-scheme: dark) {',
    ':root {',
    ...buildCssBlock(darkEntries, 'dark'),
    '}',
    '}',
    '',
  ];

  const css = lines.join('\n');
  const blob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${theme}.css`;

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download resolved CSS tokens for the given source files. */
export function exportCss(paths: string[], filenamePrefix: string): Promise<void> {
  return resolveAndDownload(paths, filenamePrefix);
}

// ── Figma Variables Export ──

const FAMILIES = ['neutral', 'accent', 'info', 'success', 'warning', 'danger'] as const;

/**
 * Mapping from CSS token patterns to Figma variable paths.
 *
 * CSS: --n-{role}-{modifier?}-{family}
 * Figma: {family}.{figmaRole}.{figmaModifier}
 *
 * Each entry: [cssPrefix, figmaPath]
 * {f} = family placeholder, replaced at runtime.
 */
const TOKEN_TO_FIGMA: [string, string][] = [
  // Ink
  ['ink-{f}',              '{f}.ink.color'],
  ['ink-strong-{f}',       '{f}.ink.strong'],
  ['ink-inverse-{f}',      '{f}.ink.inverse'],
  ['ink-muted-{f}',        '{f}.ink.muted'],
  ['ink-placeholder-{f}',  '{f}.ink.placeholder'],
  ['ink-hover-{f}',        '{f}.ink.hover'],
  ['ink-active-{f}',       '{f}.ink.active'],
  ['ink-disabled-{f}',     '{f}.ink.disabled'],

  // Surface (primary fill)
  ['surface-{f}',          '{f}.surface.color'],
  ['surface-hover-{f}',    '{f}.surface.hover'],
  ['surface-active-{f}',   '{f}.surface.active'],
  ['surface-disabled-{f}', '{f}.surface.disabled'],

  // Surface ink (text on surface fills)
  ['surface-ink-{f}',          '{f}.surface.ink.color'],
  ['surface-ink-hover-{f}',    '{f}.surface.ink.hover'],
  ['surface-ink-active-{f}',   '{f}.surface.ink.active'],
  ['surface-ink-disabled-{f}', '{f}.surface.ink.disabled'],

  // Grounds (nested under surface in Figma)
  ['doc-{f}',              '{f}.surface.doc.color'],
  ['doc-hover-{f}',        '{f}.surface.doc.hover'],
  ['doc-active-{f}',       '{f}.surface.doc.active'],
  ['doc-disabled-{f}',     '{f}.surface.doc.disabled'],

  ['body-{f}',              '{f}.surface.body.color'],
  ['body-hover-{f}',        '{f}.surface.body.hover'],
  ['body-active-{f}',       '{f}.surface.body.active'],
  ['body-disabled-{f}',     '{f}.surface.body.disabled'],

  ['panel-{f}',              '{f}.surface.panel.color'],
  ['panel-hover-{f}',        '{f}.surface.panel.hover'],
  ['panel-active-{f}',       '{f}.surface.panel.active'],
  ['panel-disabled-{f}',     '{f}.surface.panel.disabled'],

  ['control-{f}',              '{f}.surface.control.color'],
  ['control-hover-{f}',        '{f}.surface.control.hover'],
  ['control-active-{f}',       '{f}.surface.control.active'],
  ['control-disabled-{f}',     '{f}.surface.control.disabled'],

  ['button-{f}',              '{f}.surface.button.color'],
  ['button-hover-{f}',        '{f}.surface.button.hover'],
  ['button-active-{f}',       '{f}.surface.button.active'],
  ['button-disabled-{f}',     '{f}.surface.button.disabled'],

  ['card-{f}',              '{f}.surface.card.color'],
  ['card-hover-{f}',        '{f}.surface.card.hover'],
  ['card-active-{f}',       '{f}.surface.card.active'],
  ['card-disabled-{f}',     '{f}.surface.card.disabled'],

  ['modal-{f}',              '{f}.surface.modal.color'],
  ['modal-hover-{f}',        '{f}.surface.modal.hover'],
  ['modal-active-{f}',       '{f}.surface.modal.active'],
  ['modal-disabled-{f}',     '{f}.surface.modal.disabled'],

  // Border
  ['border-{f}',           '{f}.border.color'],
  ['border-muted-{f}',     '{f}.border.muted'],
  ['border-hover-{f}',     '{f}.border.hover'],
  ['border-active-{f}',    '{f}.border.active'],
  ['border-disabled-{f}',  '{f}.border.disabled'],
];

/** Convert a computed color string to hex via canvas. */
function toHex(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  const r = d[0], g = d[1], b = d[2], a = d[3];

  const rh = r.toString(16).padStart(2, '0');
  const gh = g.toString(16).padStart(2, '0');
  const bh = b.toString(16).padStart(2, '0');

  if (a < 255) {
    return `#${rh}${gh}${bh}${a.toString(16).padStart(2, '0')}`;
  }
  return `#${rh}${gh}${bh}`;
}

/** Set a deeply nested key on an object, creating intermediary objects as needed. */
function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

/** Skip intermediate/math tokens that aren't actual colors. */
const SKIP_PREFIXES = ['--n-env-', '--n-C-', '--n-L-'];

const ELEVATION = ['lowest', 'lower', 'low', 'base', 'high', 'higher', 'highest'];
const BRIGHTNESS = ['brightest', 'brighter', 'bright', 'dim', 'dimmer', 'dimmest'];

/**
 * Convert a CSS token name to a Figma variable path with nested folders.
 *
 * Source (raw 1–11):
 *   --n-color-{f}-{N}        → color.source.{f}.{N}
 *   --n-color-{f}-{N}-scrim  → color.source.{f}.scrim.{N}
 *
 * Semantic (050–950):
 *   --n-color-{f}-{NNN}       → color.{f}.{NNN}
 *   --n-color-{f}-{NNN}-scrim → color.{f}.scrim.{NNN}
 *
 * Named scales:
 *   --n-color-{f}-scrim-tint-{s}  → color.{f}.scrim-tint.{s}
 *   --n-color-{f}-scrim-shade-{s} → color.{f}.scrim-shade.{s}
 *   --n-color-{f}-{elevation}     → color.{f}.elevation.{elevation}
 *   --n-color-{f}-{brightness}    → color.{f}.brightness.{brightness}
 *
 * Base aliases:
 *   --n-color-{f}       → color.{f}.color
 *   --n-color-{f}-scrim → color.{f}.scrim.color
 */
function tokenToFigmaPath(name: string): string | null {
  const bare = name.replace(/^--n-/, '');

  for (const family of FAMILIES) {
    const prefix = `color-${family}`;
    if (!bare.startsWith(prefix)) continue;

    // Exact match: base alias
    if (bare === prefix) return `color.${family}.color`;

    const suffix = bare.slice(prefix.length + 1); // everything after "color-{family}-"

    // Base scrim alias
    if (suffix === 'scrim') return `color.${family}.scrim.color`;

    // Scrim-tint / scrim-shade sub-scales
    const tintMatch = suffix.match(/^scrim-tint-(.+)$/);
    if (tintMatch) return `color.${family}.scrim-tint.${tintMatch[1]}`;

    const shadeMatch = suffix.match(/^scrim-shade-(.+)$/);
    if (shadeMatch) return `color.${family}.scrim-shade.${shadeMatch[1]}`;

    // Source raw steps: 1–11 (single/double digit, no leading zero)
    const sourceMatch = suffix.match(/^(\d{1,2})$/);
    if (sourceMatch && +sourceMatch[1] >= 1 && +sourceMatch[1] <= 11) {
      return `color.source.${family}.${sourceMatch[1]}`;
    }

    // Source raw scrims: 1-scrim through 11-scrim
    const sourceScrimMatch = suffix.match(/^(\d{1,2})-scrim$/);
    if (sourceScrimMatch && +sourceScrimMatch[1] >= 1 && +sourceScrimMatch[1] <= 11) {
      return `color.source.${family}.scrim.${sourceScrimMatch[1]}`;
    }

    // Semantic steps: 050–950
    const semanticMatch = suffix.match(/^(0\d{2}|\d{3})$/);
    if (semanticMatch) return `color.${family}.${semanticMatch[1]}`;

    // Semantic scrims: 050-scrim through 950-scrim
    const semanticScrimMatch = suffix.match(/^(0\d{2}|\d{3})-scrim$/);
    if (semanticScrimMatch) return `color.${family}.scrim.${semanticScrimMatch[1]}`;

    // Elevation scale
    if (ELEVATION.includes(suffix)) return `color.${family}.elevation.${suffix}`;

    // Brightness scale
    if (BRIGHTNESS.includes(suffix)) return `color.${family}.brightness.${suffix}`;

    // Fallback: keep as leaf under family
    return `color.${family}.${suffix}`;
  }

  // Non-color tokens: split on hyphens
  return bare.replace(/-/g, '.');
}

/** Resolve tokens into a Figma-structured mode object. Uses TOKEN_TO_FIGMA for family-based semantic tokens, and falls back to smart path mapping for color primitives. */
function resolveFigmaMode(probe: HTMLElement, tokenNames: string[]): Record<string, unknown> {
  const modeData: Record<string, unknown> = {};
  const handled = new Set<string>();

  // Map family-based semantic tokens via TOKEN_TO_FIGMA
  for (const family of FAMILIES) {
    for (const [cssPattern, figmaPattern] of TOKEN_TO_FIGMA) {
      const cssName = `--n-${cssPattern.replace('{f}', family)}`;
      if (!tokenNames.includes(cssName)) continue;

      const figmaPath = figmaPattern.replace('{f}', family);
      const color = resolveColor(probe, cssName);
      if (!color) continue;

      handled.add(cssName);
      setNested(modeData, figmaPath, {
        $scopes: ['ALL_SCOPES'],
        $type: 'color',
        $value: toHex(color),
      });
    }
  }

  // Remaining tokens → smart path mapping
  for (const name of tokenNames) {
    if (handled.has(name)) continue;
    if (SKIP_PREFIXES.some(p => name.startsWith(p))) continue;

    const color = resolveColor(probe, name);
    if (!color) continue;

    const figmaPath = tokenToFigmaPath(name);
    if (!figmaPath) continue;

    setNested(modeData, figmaPath, {
      $scopes: ['ALL_SCOPES'],
      $type: 'color',
      $value: toHex(color),
    });
  }

  return modeData;
}

/**
 * Resolve tokens from CSS source files, then map to Figma Variables JSON and
 * export with both light and dark modes. Also includes any non-family tokens
 * from the source files as flat Figma variables.
 */
export async function exportFigma(paths: string[]): Promise<void> {
  // Collect all token names from the source files
  const allNames: string[] = [];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      const css = await res.text();
      for (const n of extractPropertyNames(css)) {
        if (!allNames.includes(n)) allNames.push(n);
      }
    } catch (err) {
      console.warn(`Failed to fetch ${path}:`, err);
    }
  }

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;';
  document.body.appendChild(probe);

  const root = document.documentElement;
  const originalScheme = root.style.colorScheme;

  // Resolve light mode
  root.style.colorScheme = 'light';
  await waitForRepaint();
  const lightData = resolveFigmaMode(probe, allNames);

  // Resolve dark mode
  root.style.colorScheme = 'dark';
  await waitForRepaint();
  const darkData = resolveFigmaMode(probe, allNames);

  // Restore original
  root.style.colorScheme = originalScheme;
  probe.remove();

  const output = [{
    Colors: {
      modes: {
        light: lightData,
        dark: darkData,
      },
    },
  }];

  const json = JSON.stringify(output, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const theme = root.getAttribute('theme') || 'default';
  a.download = `figma-variables-${theme}.json`;

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
