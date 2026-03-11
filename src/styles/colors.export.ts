/**
 * Extract all --n-* custom property declarations from CSS source files,
 * resolve color tokens to final oklch() values via a probe element,
 * and generate a downloadable tokens-computed.css.
 */

const SOURCE_FILES = [
  './css/colors.computed.css',
  './css/colors.semantic.css',
];

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

export async function exportComputedTokens(): Promise<void> {
  const allNames: string[] = [];

  // Fetch and parse each source file
  for (const path of SOURCE_FILES) {
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

  // Create off-screen probe element for color resolution
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;';
  document.body.appendChild(probe);

  // Resolve color tokens only — skip anything that doesn't resolve to a color
  const entries: [string, string][] = [];
  for (const name of allNames) {
    const color = resolveColor(probe, name);
    if (!color) continue;
    const oklch = toOklch(probe, color);
    entries.push([name, oklch]);
  }

  probe.remove();

  // Group by prefix
  const groups = groupTokens(entries.map(([n]) => n));
  const valueMap = new Map(entries);

  // Build CSS output
  const lines: string[] = [
    '/* ════════════════════════════════════════════════════════════════',
    '   Computed Design Tokens (resolved to final values)',
    `   Generated: ${new Date().toISOString()}`,
    `   Color scheme: ${getComputedStyle(document.documentElement).colorScheme || 'light'}`,
    `   Theme: ${document.documentElement.getAttribute('theme') || 'default'}`,
    `   Tokens: ${entries.length}`,
    '   ════════════════════════════════════════════════════════════════ */',
    '',
    ':root {',
  ];

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

  lines.push('}', '');
  const css = lines.join('\n');

  // Download
  const blob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const scheme = getComputedStyle(document.documentElement).colorScheme?.includes('dark') ? 'dark' : 'light';
  const theme = document.documentElement.getAttribute('theme') || 'default';
  a.download = `tokens-computed-${theme}-${scheme}.css`;

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
