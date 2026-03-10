// ── Copy buttons ──

for (const btn of document.querySelectorAll('.copy-btn')) {
  btn.addEventListener('click', async () => {
    const code = btn.closest('.demo-code')?.querySelector('code');
    if (!code) return;
    await navigator.clipboard.writeText(code.textContent);
    const icon = btn.querySelector('n-icon');
    if (icon) {
      icon.setAttribute('name', 'check');
      setTimeout(() => { icon.setAttribute('name', 'copy'); }, 1500);
    }
  });
}

// ── Color signature database ──
// Each component → array of { state, bg, color, borderColor }
// Values are CSS token names (not resolved values), used for matching.

const components = [
  {
    name: 'n-button',
    category: 'interactive',
    states: [
      { state: 'rest (default)', bg: '--n-button', color: '--n-ink', border: '--n-border-muted-neutral', group: 'interaction' },
      { state: ':hover', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: '--n-border-hover-neutral', group: 'interaction' },
      { state: ':active', bg: '--n-panel-active-neutral', color: '--n-ink-active', border: '--n-border-active-neutral', group: 'interaction' },
      { state: ':focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: ':disabled', bg: '--n-panel-disabled-neutral', color: '--n-ink-disabled', border: '--n-border-muted-neutral', group: 'interaction' },
    ]
  },
  {
    name: 'native:input',
    category: 'interactive',
    states: [
      { state: 'rest (empty)', bg: '--n-control', color: '--n-ink', border: '--n-color-neutral-highest', group: 'interaction' },
      { state: ':hover', bg: '--n-control-hover', color: '--n-ink-hover', border: '--n-border-muted', group: 'interaction' },
      { state: 'filled', bg: '--n-panel', color: '--n-ink-strong', border: 'transparent', group: 'value' },
      { state: 'filled:hover', bg: '--n-panel-hover', color: '--n-ink-strong', border: 'transparent', group: 'value' },
      { state: ':focus', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[disabled]', bg: '--n-control-disabled', color: '--n-ink-disabled', border: '--n-border-disabled', group: 'interaction' },
    ]
  },
  {
    name: 'n-textarea',
    category: 'interactive',
    states: [
      { state: 'rest (empty)', bg: '--n-control', color: '--n-ink', border: '--n-color-neutral-highest', group: 'interaction' },
      { state: ':hover', bg: '--n-control-hover', color: '--n-ink-hover', border: '--n-border-muted', group: 'interaction' },
      { state: 'filled', bg: '--n-panel', color: '--n-ink-strong', border: 'transparent', group: 'value' },
      { state: 'filled:hover', bg: '--n-panel-hover', color: '--n-ink-strong', border: 'transparent', group: 'value' },
      { state: ':focus', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[disabled]', bg: '--n-control-disabled', color: '--n-ink-disabled', border: '--n-border-disabled', group: 'interaction' },
    ]
  },
  {
    name: 'n-listbox',
    category: 'interactive',
    states: [
      { state: 'container', bg: '--n-control', color: '--n-ink', border: '--n-color-neutral-highest', group: 'interaction' },
      { state: '[aria-disabled]', bg: 'opacity: 0.6', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-option',
    category: 'interactive',
    states: [
      { state: 'rest', bg: 'transparent', color: '--n-ink', border: 'none', group: 'interaction' },
      { state: ':hover', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: ':active', bg: '--n-panel-active-neutral', color: '--n-ink-active', border: 'none', group: 'interaction' },
      { state: '[active]', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: ':focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[aria-selected]', bg: 'white', color: '--n-ink-inverse', border: 'none', group: 'selection' },
      { state: '[aria-disabled]', bg: 'transparent', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-command',
    category: 'composite',
    states: [
      { state: 'container', bg: '--n-control', color: '--n-ink', border: '--n-color-neutral-highest', group: 'interaction' },
    ]
  },
  {
    name: 'n-command-item',
    category: 'interactive',
    states: [
      { state: 'rest', bg: 'transparent', color: '--n-ink', border: 'none', group: 'interaction' },
      { state: ':hover', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: ':active', bg: '--n-panel-active-neutral', color: '--n-ink-active', border: 'none', group: 'interaction' },
      { state: '[active]', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: ':focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[aria-selected]', bg: 'white', color: '--n-ink-inverse', border: 'none', group: 'selection' },
      { state: '[aria-disabled]', bg: 'transparent', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-select',
    category: 'coordinator',
    states: [
      { state: '(coordinator)', bg: 'display: contents', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-combobox',
    category: 'coordinator',
    states: [
      { state: '(coordinator)', bg: 'display: contents', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-checkbox',
    category: 'widget',
    states: [
      { state: 'rest (unchecked)', bg: '--n-widget', color: '--n-ink', border: '--n-border-muted', group: 'interaction' },
      { state: ':hover', bg: '--n-widget-hover', color: '--n-ink-hover', border: '--n-border-hover', group: 'interaction' },
      { state: '[pressed]', bg: '--n-widget-active', color: '(unchanged)', border: '--n-border-active', group: 'interaction' },
      { state: '[aria-checked] box', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: '--n-surface-accent', group: 'selection' },
      { state: 'checked:hover box', bg: '--n-surface-hover-accent', color: '--n-surface-ink-accent', border: '--n-surface-hover-accent', group: 'selection' },
      { state: '[aria-checked=mixed]', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: '--n-surface-accent', group: 'selection' },
      { state: '[aria-disabled]', bg: '--n-widget-disabled', color: '--n-ink-disabled', border: '--n-border-disabled', group: 'interaction' },
    ]
  },
  {
    name: 'n-switch',
    category: 'widget',
    states: [
      { state: 'rest (off)', bg: '--n-widget', color: '--n-ink', border: '--n-border-muted', group: 'interaction' },
      { state: ':hover track', bg: '--n-widget-hover', color: '--n-ink-hover', border: '--n-border-hover', group: 'interaction' },
      { state: '[pressed] track', bg: '--n-widget-active', color: '(unchanged)', border: '--n-border-active', group: 'interaction' },
      { state: '[aria-checked] track', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: '--n-surface-accent', group: 'selection' },
      { state: 'checked:hover', bg: '--n-surface-hover-accent', color: '--n-surface-ink-accent', border: '--n-surface-hover-accent', group: 'selection' },
      { state: '[aria-disabled]', bg: '--n-widget-disabled', color: '--n-ink-disabled', border: '--n-border-disabled', group: 'interaction' },
    ]
  },
  {
    name: 'n-radio',
    category: 'widget',
    states: [
      { state: 'rest (unchecked)', bg: '--n-widget', color: '--n-ink', border: '--n-border-muted', group: 'interaction' },
      { state: ':hover', bg: '--n-widget-hover', color: '--n-ink-hover', border: '--n-border-hover', group: 'interaction' },
      { state: '[pressed]', bg: '--n-widget-active', color: '(unchanged)', border: '--n-border-active', group: 'interaction' },
      { state: '[aria-checked] circle', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: '--n-surface-accent', group: 'selection' },
      { state: 'checked:hover circle', bg: '--n-surface-hover-accent', color: '--n-surface-ink-accent', border: '--n-surface-hover-accent', group: 'selection' },
      { state: '[aria-disabled]', bg: '--n-widget-disabled', color: '--n-ink-disabled', border: '--n-border-disabled', group: 'interaction' },
    ]
  },
  {
    name: 'n-range',
    category: 'widget',
    states: [
      { state: 'track bg', bg: '--n-widget', color: '—', border: '--n-border-muted', group: 'interaction' },
      { state: 'fill', bg: '--n-surface-accent', color: '—', border: 'none', group: 'selection' },
      { state: 'fill:hover', bg: '--n-surface-hover-accent', color: '—', border: 'none', group: 'selection' },
      { state: 'fill [pressed]', bg: '--n-surface-active-accent', color: '—', border: 'none', group: 'selection' },
      { state: 'thumb', bg: '--n-surface-ink-accent', color: '—', border: '--n-surface-accent', group: 'selection' },
      { state: '[aria-disabled]', bg: 'opacity: 0.5', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-tab',
    category: 'interactive',
    states: [
      { state: 'rest', bg: 'transparent', color: '--n-ink-muted', border: 'none', group: 'interaction' },
      { state: ':hover', bg: 'transparent', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: '[pressed]', bg: 'transparent', color: '--n-ink-active', border: 'none', group: 'interaction' },
      { state: '[aria-selected]', bg: 'transparent', color: '--n-surface-ink', border: 'none', group: 'selection' },
      { state: '[aria-disabled]', bg: 'transparent', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-segment',
    category: 'interactive',
    states: [
      { state: 'rest', bg: 'transparent', color: '--n-ink-muted', border: 'none', group: 'interaction' },
      { state: ':hover', bg: 'transparent', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: '[pressed]', bg: 'transparent', color: '--n-ink-active', border: 'none', group: 'interaction' },
      { state: '[aria-checked] + pill', bg: 'white', color: '--n-ink-inverse', border: 'shadow', group: 'selection' },
      { state: '[aria-disabled]', bg: 'transparent', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-segmented-control',
    category: 'composite',
    states: [
      { state: 'container', bg: '--n-control', color: '(inherit)', border: '--n-color-neutral-highest', group: 'interaction' },
    ]
  },
  {
    name: 'n-table',
    category: 'composite',
    states: [
      { state: 'container', bg: '(transparent)', color: '--n-ink', border: '--n-border-muted', group: 'interaction' },
      { state: 'header row', bg: '--n-panel', color: '--n-ink-strong', border: '--n-border-color', group: 'interaction' },
      { state: 'body row:hover', bg: '--n-panel-hover', color: '(inherit)', border: '(inherit)', group: 'interaction' },
      { state: 'header:focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: 'row:focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: 'row [selected]', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: '(inherit)', group: 'selection' },
      { state: 'row [selected]:hover', bg: '--n-surface-hover-accent', color: '--n-surface-ink-hover-accent', border: '(inherit)', group: 'selection' },
    ]
  },
  {
    name: 'n-calendar',
    category: 'composite',
    states: [
      { state: 'container', bg: '--n-panel', color: '--n-ink', border: '--n-border-muted', group: 'interaction' },
      { state: 'cell:hover', bg: '--n-panel-hover', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: '[data-selected]', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: 'none', group: 'selection' },
      { state: '[data-in-range]', bg: '--n-surface-accent', color: '--n-surface-ink-accent', border: 'none', group: 'selection' },
      { state: '[data-today]', bg: '(transparent)', color: '(inherit)', border: 'inset --n-border-muted', group: 'value' },
      { state: 'cell:disabled', bg: '(transparent)', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-tree-item',
    category: 'composite',
    states: [
      { state: 'rest', bg: 'transparent', color: '--n-ink', border: 'none', group: 'interaction' },
      { state: ':hover', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: ':focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[selected]', bg: '--n-surface', color: '--n-surface-ink', border: 'none', group: 'selection' },
      { state: '[disabled]', bg: '(transparent)', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-tree',
    category: 'composite',
    states: [
      { state: '[aria-disabled]', bg: 'opacity: 0.6', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-accordion-item',
    category: 'composite',
    states: [
      { state: 'summary rest', bg: 'transparent', color: '--n-ink-strong', border: 'none', group: 'interaction' },
      { state: 'summary:hover', bg: '--n-panel-hover', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: 'summary:focus-visible', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[aria-disabled]', bg: '(transparent)', color: '--n-ink-disabled', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-accordion',
    category: 'composite',
    states: [
      { state: '[aria-disabled]', bg: 'opacity: 0.6', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-breadcrumb-item',
    category: 'interactive',
    states: [
      { state: 'rest', bg: 'transparent', color: '--n-ink-muted', border: 'none', group: 'interaction' },
      { state: ':hover', bg: 'transparent', color: '--n-ink', border: 'none', group: 'interaction' },
      { state: '[current]', bg: 'transparent', color: '--n-ink-strong', border: 'none', group: 'value' },
    ]
  },
  {
    name: 'n-pagination',
    category: 'composite',
    states: [
      { state: '[aria-current=page]', bg: '--n-surface', color: '--n-surface-ink', border: 'none', group: 'selection' },
    ]
  },
  {
    name: 'n-dialog',
    category: 'coordinator',
    states: [
      { state: '(coordinator)', bg: 'display: contents', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-drawer',
    category: 'coordinator',
    states: [
      { state: '[side] (structural)', bg: 'native dialog', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-tooltip',
    category: 'display',
    states: [
      { state: 'popover', bg: '--n-modal-neutral', color: '--n-ink-strong-neutral', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-avatar',
    category: 'display',
    states: []
  },
  {
    name: 'n-badge',
    category: 'display',
    states: [
      { state: 'rest', bg: '--n-surface', color: '--n-surface-ink', border: 'none', group: 'interaction' },
    ]
  },
  {
    name: 'n-slideshow',
    category: 'composite',
    states: [
      { state: 'prev/next:hover', bg: '--n-panel-hover-neutral', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: 'dot [active]', bg: '--n-ink', color: '—', border: 'none', group: 'selection' },
      { state: '[aria-disabled]', bg: 'opacity: 0.6', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'n-input-otp',
    category: 'widget',
    states: [
      { state: 'cell rest', bg: '--n-control', color: '--n-ink', border: '--n-color-neutral-highest', group: 'interaction' },
      { state: 'cell:hover', bg: '--n-control-hover', color: '--n-ink-hover', border: 'none', group: 'interaction' },
      { state: 'cell:focus', bg: '(unchanged)', color: '(unchanged)', border: 'outline: --n-focus-ring', group: 'interaction' },
      { state: '[aria-disabled]', bg: 'opacity: 0.5', color: '—', border: '—', group: 'interaction' },
    ]
  },
  {
    name: 'article',
    category: 'container',
    states: [
      { state: '[interactive]:hover', bg: '(inherit)', color: '(inherit)', border: 'outline: --n-focus-ring', group: 'interaction' },
    ]
  },
  {
    name: 'n-field',
    category: 'interactive',
    states: [
      { state: '[invalid]', bg: '(unchanged)', color: 'error slot shown', border: '(unchanged)', group: 'value' },
      { state: '[required]', bg: '(unchanged)', color: '* shown', border: '(unchanged)', group: 'value' },
      { state: '[disabled]', bg: '(unchanged)', color: '--n-ink-muted', border: '(unchanged)', group: 'interaction' },
    ]
  },
];

// ── Token-to-swatch color mapping ──
const tokenColors: Record<string, string> = {
  '--n-button': 'var(--n-color-neutral-higher)',
  '--n-control': 'var(--n-control-neutral)',
  '--n-control-hover': 'var(--n-control-hover-neutral)',
  '--n-control-disabled': 'var(--n-control-disabled-neutral)',
  '--n-widget': 'var(--n-control-neutral)',
  '--n-widget-hover': 'var(--n-control-hover-neutral)',
  '--n-widget-active': 'var(--n-control-active-neutral)',
  '--n-widget-disabled': 'var(--n-control-disabled-neutral)',
  '--n-panel': 'var(--n-panel-neutral)',
  '--n-panel-hover': 'var(--n-panel-hover-neutral)',
  '--n-panel-disabled': 'var(--n-panel-disabled-neutral)',
  '--n-panel-hover-neutral': 'var(--n-panel-hover-neutral)',
  '--n-panel-active-neutral': 'var(--n-panel-active-neutral)',
  '--n-panel-disabled-neutral': 'var(--n-panel-disabled-neutral)',
  '--n-ink': 'var(--n-ink-neutral)',
  '--n-ink-hover': 'var(--n-ink-hover-neutral)',
  '--n-ink-active': 'var(--n-ink-active-neutral)',
  '--n-ink-strong': 'var(--n-ink-strong-neutral)',
  '--n-ink-muted': 'var(--n-ink-muted-neutral)',
  '--n-ink-inverse': 'var(--n-ink-inverse-neutral)',
  '--n-ink-disabled': 'var(--n-ink-disabled-neutral)',
  '--n-ink-placeholder': 'var(--n-ink-placeholder-neutral)',
  '--n-surface': 'var(--n-surface-accent)',
  '--n-surface-hover': 'var(--n-surface-hover-accent)',
  '--n-surface-ink': 'var(--n-surface-ink-accent)',
  '--n-surface-ink-hover': 'var(--n-surface-ink-hover-accent)',
  '--n-surface-accent': 'var(--n-surface-accent)',
  '--n-surface-hover-accent': 'var(--n-surface-hover-accent)',
  '--n-surface-active-accent': 'var(--n-surface-active-accent)',
  '--n-surface-ink-accent': 'var(--n-surface-ink-accent)',
  '--n-surface-ink-hover-accent': 'var(--n-surface-ink-hover-accent)',
  '--n-border-muted': 'var(--n-border-muted-neutral)',
  '--n-border-hover': 'var(--n-border-hover-neutral)',
  '--n-border-active': 'var(--n-border-active-neutral)',
  '--n-border-disabled': 'var(--n-border-disabled-neutral)',
  '--n-border': 'var(--n-border-neutral)',
  '--n-border-muted-neutral': 'var(--n-border-muted-neutral)',
  '--n-border-hover-neutral': 'var(--n-border-hover-neutral)',
  '--n-border-active-neutral': 'var(--n-border-active-neutral)',
  '--n-color-neutral-highest': 'var(--n-color-neutral-highest)',
  '--n-focus-ring': 'var(--n-color-accent-600-scrim)',
  '--n-modal-neutral': 'var(--n-modal-neutral)',
  '--n-ink-strong-neutral': 'var(--n-ink-strong-neutral)',
  '--n-border-color': 'var(--n-border-muted-neutral)',
  'white': 'white',
  'transparent': 'transparent',
  'none': 'transparent',
};

// Reverse lookup: local token → resolved semantic token
const tokenResolutions: Record<string, string> = {
  '--n-button': '--n-color-neutral-higher',
  '--n-control': '--n-control-neutral',
  '--n-control-hover': '--n-control-hover-neutral',
  '--n-control-disabled': '--n-control-disabled-neutral',
  '--n-widget': '--n-control-neutral',
  '--n-widget-hover': '--n-control-hover-neutral',
  '--n-widget-active': '--n-control-active-neutral',
  '--n-widget-disabled': '--n-control-disabled-neutral',
  '--n-panel': '--n-panel-neutral',
  '--n-panel-hover': '--n-panel-hover-neutral',
  '--n-panel-disabled': '--n-panel-disabled-neutral',
  '--n-ink': '--n-ink-neutral',
  '--n-ink-hover': '--n-ink-hover-neutral',
  '--n-ink-active': '--n-ink-active-neutral',
  '--n-ink-strong': '--n-ink-strong-neutral',
  '--n-ink-muted': '--n-ink-muted-neutral',
  '--n-ink-inverse': '--n-ink-inverse-neutral',
  '--n-ink-disabled': '--n-ink-disabled-neutral',
  '--n-ink-placeholder': '--n-ink-placeholder-neutral',
  '--n-surface': '--n-surface-accent',
  '--n-surface-hover': '--n-surface-hover-accent',
  '--n-surface-ink': '--n-surface-ink-accent',
  '--n-surface-ink-hover': '--n-surface-ink-hover-accent',
  '--n-border-muted': '--n-border-muted-neutral',
  '--n-border-hover': '--n-border-hover-neutral',
  '--n-border-active': '--n-border-active-neutral',
  '--n-border-disabled': '--n-border-disabled-neutral',
  '--n-border': '--n-border-neutral',
  '--n-focus-ring': '--n-color-accent-600-scrim',
  '--n-border-color': '--n-border-muted-neutral',
};

function getSwatchColor(token: string): string | null {
  if (!token || token.startsWith('(') || token === '—' || token.startsWith('outline:') || token.startsWith('inset') || token.startsWith('shadow') || token.startsWith('display:') || token.startsWith('opacity:') || token.startsWith('native') || token.startsWith('error') || token.startsWith('*')) {
    return null;
  }
  return tokenColors[token] || null;
}

function createSwatch(token: string): string {
  const color = getSwatchColor(token);
  if (!color) return '';
  const isTrans = token === 'transparent' || token === 'none';
  const style = isTrans
    ? 'background: repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 0.25rem 0.25rem;'
    : `background: ${color};`;
  return `<span class="swatch" style="${style}"></span>`;
}

function resolvedNote(token: string): string {
  const res = tokenResolutions[token];
  return res ? ` <span class="tt-resolved">\u2192 ${res}</span>` : '';
}

// ── Build match key for highlighting ──
function normalizeToken(t: string): string | null {
  if (!t || t.startsWith('(') || t === '—') return null;
  return t;
}

function matchKey(s: { bg: string; color: string; border: string }): string | null {
  const bg = normalizeToken(s.bg);
  const color = normalizeToken(s.color);
  const border = normalizeToken(s.border);
  if (!bg && !color && !border) return null;
  return `${bg || '_'}|${color || '_'}|${border || '_'}`;
}

// ── Build index: matchKey → [{compName, stateName}] ──
const matchIndex = new Map<string, Array<{ comp: string; state: string }>>();
for (const comp of components) {
  for (const s of comp.states) {
    const key = matchKey(s);
    if (!key) continue;
    if (!matchIndex.has(key)) matchIndex.set(key, []);
    matchIndex.get(key)!.push({ comp: comp.name, state: s.state });
  }
}

// ── Category filter ──
const catFilterControl = document.getElementById('cat-filters')!;
const categoryLabels: Record<string, string> = {
  all: 'All',
  interactive: 'Interactive',
  widget: 'Widget',
  composite: 'Composite',
  coordinator: 'Coordinator',
  display: 'Display',
  container: 'Container',
};

let activeCat = 'all';

catFilterControl.addEventListener('native:change', (e) => {
  activeCat = (e as CustomEvent).detail.value;
  applyCategoryFilter();
});

function applyCategoryFilter() {
  for (const card of allCards) {
    const cat = (card as HTMLElement).dataset.category;
    if (activeCat === 'all' || cat === activeCat) {
      card.classList.remove('cat-hidden');
    } else {
      card.classList.add('cat-hidden');
    }
  }
}

// ── State text filter ──
const stateFilterInput = document.getElementById('state-filter')!;
let stateFilterText = '';

stateFilterInput.addEventListener('native:input', (e) => {
  stateFilterText = ((e as CustomEvent).detail.value || '').trim().toLowerCase();
  applyStateFilter();
});

function applyStateFilter() {
  for (const pill of allPills) {
    if (!stateFilterText || (pill as HTMLElement).dataset.state!.toLowerCase().includes(stateFilterText)) {
      pill.classList.remove('filter-dim');
    } else {
      pill.classList.add('filter-dim');
    }
  }
}

// ── Render grid ──
const grid = document.getElementById('grid')!;
const tooltip = document.getElementById('tooltip')!;
const allCards: Element[] = [];
const allPills: Element[] = [];

const categoryIntents: Record<string, string> = {
  interactive: 'accent',
  widget: 'success',
  composite: 'warning',
  coordinator: 'info',
  display: '',
  container: '',
};

for (const comp of components) {
  const card = document.createElement('article');
  card.dataset.comp = comp.name;
  card.dataset.category = comp.category;

  let bodyHTML = '';
  const groups: Record<string, typeof comp.states> = {};
  for (const s of comp.states) {
    const g = s.group || 'other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(s);
  }

  const groupOrder = ['interaction', 'selection', 'value', 'other'];
  const groupLabels: Record<string, string> = { interaction: 'Interaction', selection: 'Selection', value: 'Value', other: 'Other' };

  let hasStates = false;
  for (const g of groupOrder) {
    if (!groups[g]) continue;
    hasStates = true;
    bodyHTML += `<div class="state-group-label">${groupLabels[g]}</div>`;
    bodyHTML += '<div class="state-row">';
    for (const s of groups[g]) {
      const key = matchKey(s);
      const bgSwatch = createSwatch(s.bg);
      const colorSwatch = createSwatch(s.color);
      bodyHTML += `<span class="state-pill" tabindex="0" data-group="${s.group}" data-key="${key || ''}" data-comp="${comp.name}" data-state="${s.state}" data-bg="${s.bg}" data-color="${s.color}" data-border="${s.border}">${bgSwatch}${colorSwatch}${s.state}</span>`;
    }
    bodyHTML += '</div>';
  }

  if (!hasStates) {
    bodyHTML = '<span class="no-states">No CSS states</span>';
  }

  const badgeIntent = categoryIntents[comp.category];
  const badgeAttr = badgeIntent ? ` intent="${badgeIntent}"` : '';

  card.innerHTML = `
    <div slot="header">
      <span class="comp-card-name">${comp.name}</span>
      <n-badge size="xs"${badgeAttr}>${categoryLabels[comp.category]}</n-badge>
    </div>
    <div class="comp-card-body">${bodyHTML}</div>
  `;

  grid.appendChild(card);
  allCards.push(card);
}

// Collect all pills
document.querySelectorAll('.state-pill').forEach(p => allPills.push(p));

// ── Highlight logic ──
let lockedKey: string | null = null;
let lockedPill: Element | null = null;

function highlight(key: string, _sourcePill: Element) {
  if (!key) return clearHighlight();

  const matches = matchIndex.get(key) || [];
  const matchedComps = new Set(matches.map(m => m.comp));

  for (const card of allCards) {
    const name = (card as HTMLElement).dataset.comp;
    if (matchedComps.has(name!)) {
      card.classList.add('highlighted');
      card.classList.remove('dimmed');
    } else {
      card.classList.remove('highlighted');
      card.classList.add('dimmed');
    }
  }

  for (const pill of allPills) {
    if ((pill as HTMLElement).dataset.key === key) {
      pill.classList.add('active-highlight');
    } else {
      pill.classList.remove('active-highlight');
    }
  }
}

function clearHighlight() {
  lockedKey = null;
  if (lockedPill) {
    lockedPill.classList.remove('locked-source');
    lockedPill = null;
  }
  for (const card of allCards) {
    card.classList.remove('highlighted', 'dimmed');
  }
  for (const pill of allPills) {
    pill.classList.remove('active-highlight');
  }
  tooltip.classList.remove('visible');
}

function lockHighlight(pill: Element) {
  const key = (pill as HTMLElement).dataset.key;
  if (!key) return;

  // Toggle off if already locked on this pill
  if (lockedPill === pill) {
    clearHighlight();
    return;
  }

  // Clear previous lock
  if (lockedPill) {
    lockedPill.classList.remove('locked-source');
  }

  lockedKey = key;
  lockedPill = pill;
  pill.classList.add('locked-source');
  highlight(key, pill);
  showTooltip(pill);
}

function showTooltip(pill: Element) {
  const el = pill as HTMLElement;
  const bg = el.dataset.bg!;
  const color = el.dataset.color!;
  const border = el.dataset.border!;
  const comp = el.dataset.comp!;
  const state = el.dataset.state!;

  const key = el.dataset.key!;
  const matches = key ? (matchIndex.get(key) || []) : [];
  const otherMatches = matches.filter(m => m.comp !== comp || m.state !== state);
  const totalMatches = matches.length;

  let html = `<div style="font-weight:600;margin-bottom:calc(var(--n-space) * 1.5);">${comp} \u2192 ${state}</div>`;

  if (totalMatches > 1) {
    html += `<div class="tt-match-header">Shared by ${totalMatches} component states</div>`;
  }

  html += `<div class="tt-row"><span class="tt-label">background:</span> ${createSwatch(bg)} <span class="tt-value">${bg}</span>${resolvedNote(bg)}</div>`;
  html += `<div class="tt-row"><span class="tt-label">color:</span> ${createSwatch(color)} <span class="tt-value">${color}</span>${resolvedNote(color)}</div>`;
  html += `<div class="tt-row"><span class="tt-label">border:</span> ${createSwatch(border)} <span class="tt-value">${border}</span>${resolvedNote(border)}</div>`;

  if (otherMatches.length > 0) {
    html += `<div style="margin-top:calc(var(--n-space) * 2);border-top:1px solid var(--n-border-muted-neutral);padding-top:calc(var(--n-space) * 1.5);">`;
    for (const m of otherMatches.slice(0, 8)) {
      html += `<div class="tt-row"><span class="tt-value">${m.comp} \u2192 ${m.state}</span></div>`;
    }
    if (otherMatches.length > 8) {
      html += `<div class="tt-row" style="color:var(--n-ink-muted-neutral)">+${otherMatches.length - 8} more</div>`;
    }
    html += '</div>';
  }

  tooltip.innerHTML = html;

  // Position — measure AFTER setting innerHTML
  requestAnimationFrame(() => {
    tooltip.classList.add('visible');
    const rect = pill.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 8;

    if (x + ttRect.width > window.innerWidth - 16) {
      x = window.innerWidth - ttRect.width - 16;
    }
    if (y + ttRect.height > window.innerHeight - 16) {
      y = rect.top - ttRect.height - 8;
    }

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  });
}

// ── Event delegation ──
grid.addEventListener('pointerenter', e => {
  const pill = (e.target as Element).closest('.state-pill');
  if (!pill || lockedKey) return;
  const key = (pill as HTMLElement).dataset.key!;
  highlight(key, pill);
  showTooltip(pill);
}, true);

grid.addEventListener('pointerleave', e => {
  const pill = (e.target as Element).closest('.state-pill');
  if (!pill || lockedKey) return;
  clearHighlight();
}, true);

// Click to lock
grid.addEventListener('click', e => {
  const pill = (e.target as Element).closest('.state-pill');
  if (!pill) return;
  lockHighlight(pill);
});

// Keyboard: Enter/Space to lock, Escape to clear
grid.addEventListener('keydown', e => {
  const pill = (e.target as Element).closest('.state-pill');
  if (!pill) return;
  if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
    e.preventDefault();
    lockHighlight(pill);
  }
});

// Focus shows tooltip (for keyboard nav)
grid.addEventListener('focusin', e => {
  const pill = (e.target as Element).closest('.state-pill');
  if (!pill || lockedKey) return;
  const key = (pill as HTMLElement).dataset.key!;
  highlight(key, pill);
  showTooltip(pill);
});

grid.addEventListener('focusout', e => {
  const pill = (e.target as Element).closest('.state-pill');
  if (!pill || lockedKey) return;
  clearHighlight();
});

// Escape clears lock + filter
document.addEventListener('keydown', e => {
  if ((e as KeyboardEvent).key === 'Escape') {
    if (lockedKey) {
      clearHighlight();
    } else if (stateFilterText) {
      stateFilterInput.setAttribute('value', '');
      stateFilterText = '';
      applyStateFilter();
    }
  }
});

// Click on empty space clears lock
document.addEventListener('click', e => {
  if (!lockedKey) return;
  if (!(e.target as Element).closest('.state-pill') && !(e.target as Element).closest('.hover-tooltip')) {
    clearHighlight();
  }
});
