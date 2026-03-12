import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/register-all.ts';
import '../../chat/register.ts';

// Icons used in builder UI
import '../../../../../src/icons/phosphor/eye.ts';
import '../../../../../src/icons/phosphor/brackets-curly.ts';
import '../../../../../src/icons/phosphor/tree-structure.ts';
import '../../../../../src/icons/phosphor/terminal.ts';
import '../../../../../src/icons/phosphor/moon.ts';
import '../../../../../src/icons/phosphor/sun.ts';
import '../../../../../src/icons/phosphor/x.ts';
import '../../../../../src/icons/phosphor/caret-up-down.ts';
import '../../../../../src/icons/phosphor/brain.ts';
import '../../../../../src/icons/phosphor/sliders.ts';
import '../../../../../src/icons/phosphor/clock.ts';
import '../../../../../src/icons/phosphor/sparkle.ts';
import '../../../../../src/icons/phosphor/plus.ts';
import '../../../../../src/icons/phosphor/magnifying-glass.ts';
import '../../../../../src/icons/phosphor/compass.ts';
import '../../../../../src/icons/phosphor/flask.ts';
import '../../../../../src/icons/phosphor/record.ts';
import '../../../../../src/icons/phosphor/microphone.ts';
import '../../../../../src/icons/phosphor/arrow-up.ts';
import '../../../../../src/icons/phosphor/lightbulb.ts';
import '../../../../../src/icons/phosphor/crosshair.ts';
import '../../../../../src/icons/phosphor/list-checks.ts';
import '../../../../../src/icons/phosphor/pencil-simple.ts';
import '../../../../../src/icons/phosphor/chat-dots.ts';
import '../../../../../src/icons/phosphor/user.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/arrow-clockwise.ts';
import '../../../../../src/icons/phosphor/brackets-angle.ts';
import '../../../../../src/icons/phosphor/paint-brush.ts';
import '../../../../../src/icons/phosphor/lightning.ts';
import '../../../../../src/icons/phosphor/play.ts';
import '../../../../../src/icons/phosphor/stack-simple.ts';
import { ConfettiController, CSSInspectController } from '@nonoun/native-traits';
import { Kernel, resetKernel } from '@nonoun/native-kernel';
import { createA2UIAdapter } from '../protocol/a2ui-adapter.ts';
import { COMPONENT_MAP as REGISTRY, getComponentCategory } from '../protocol/a2ui-component-map.ts';
import type { EventSpec, PropertySpec, MethodSpec } from '../protocol/a2ui-component-map.ts';
import type { GatewayAdapter } from '../../chat/gateway/adapter.ts';
import { GatewayRequestError } from '../../chat/gateway/runtime.ts';
import { isClaudeModel, createAdapter } from '../../chat/gateway/model-registry.ts';
import { parseJsonFromResponse, stripFences } from '../../chat/parsing/json-extractor.ts';
import { matchPatterns } from '../patterns/pattern-loader.ts';
import type { CatalogEntry } from '../patterns/pattern-types.ts';
import promptJson from './system-prompt.json';
import { PIPELINE_STEPS, runPipeline, shouldSkipEarlySteps } from './pipeline.ts';
import type { PipelineStep, PipelineCallbacks } from './pipeline.ts';

import '../../../../native-code/src/codemirror/register.ts';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { css as cssLang } from '@codemirror/lang-css';
import { html as htmlLang } from '@codemirror/lang-html';

// ── System prompt ──

const componentRef = Array.from(REGISTRY.values()).map(m => {
  const cat = getComponentCategory(m.a2uiType);
  const props = m.properties?.map(p => p.attr).join(', ') || '';
  return `  - ${m.a2uiType} → <${m.nativeTag}> [${cat}]${props ? ': ' + props : ''}`;
}).join('\n');

const DEFAULT_SYSTEM_PROMPT = (promptJson as { prompt: string }).prompt
  .replace('{{COMPONENT_REF}}', componentRef);

// ── Panel config ──

const PANELS = [
  { id: 'preview',  label: 'Preview',  icon: 'eye' },
  { id: 'concepts', label: 'Reasoning', icon: 'lightbulb' },
  { id: 'schema',   label: 'Schema',   icon: 'brackets-curly' },
  { id: 'html',     label: 'HTML',     icon: 'brackets-angle' },
  { id: 'css',      label: 'CSS',      icon: 'paint-brush' },
  { id: 'js',       label: 'JS',       icon: 'lightning' },
  { id: 'map',      label: 'Map',      icon: 'squares-four' },
  { id: 'prompt',   label: 'Prompt',   icon: 'file-code' },
];

const activePanels = new Set(['preview']);

// ── LLM adapter ──

const anthropicKey = (import.meta as Record<string, Record<string, string>>).env?.VITE_ANTHROPIC_API_KEY
  || (import.meta as Record<string, Record<string, string>>).env?.VITE_CLAUDE_API_KEY
  || null;

const openaiKey = (import.meta as Record<string, Record<string, string>>).env?.VITE_OPENAI_API_KEY
  || null;

let systemPrompt = DEFAULT_SYSTEM_PROMPT;

function getApiKey(model: string): string | null {
  return isClaudeModel(model) ? anthropicKey : openaiKey;
}

function getBaseUrl(model: string): string {
  return isClaudeModel(model) ? '/api/anthropic' : '/api/openai';
}

function buildAdapter(model: string): GatewayAdapter | null {
  return createAdapter({
    clientId: 'a2ui-builder',
    baseUrl: getBaseUrl(model),
    model,
    maxTokens: 4096,
    system: systemPrompt,
    apiKey: getApiKey(model),
  });
}

function buildStepAdapter(stepSystemPrompt: string, maxTokens: number): GatewayAdapter | null {
  return createAdapter({
    clientId: 'a2ui-builder-step',
    baseUrl: getBaseUrl(currentModel),
    model: currentModel,
    maxTokens,
    system: stepSystemPrompt,
    apiKey: getApiKey(currentModel),
  });
}

let currentModel = 'claude-haiku-4-5';
let llm: GatewayAdapter | null = buildAdapter(currentModel);

if (!llm) {
  console.warn('[A2UI Builder] No API key found. Set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in .env. Using mock responses.');
}

interface Message {
  role: string;
  message: string;
}

const messages: Message[] = [];
let pipelineMode = false;

// ── Mock fallback ──

interface SeedOption {
  value: string;
  label: string;
}

interface MockResult {
  type: string;
  reply: string;
  concepts: string[];
  suggestions?: SeedOption[];
  schema?: {
    surfaceId: string;
    components: Record<string, unknown>[];
  };
  remaps?: { from: string; to: string; reason: string }[];
  questions?: string[];
  prompt?: string;
  gaps?: { component: string; need: string; context: string; impact: string; suggestion: string }[];
  partial?: { canGenerate: string; cannotGenerate: string };
  css?: string;
  js?: string;
}

let currentSchema: MockResult['schema'] | null = null;

const MOCK_EXAMPLES: { keywords: string[]; result: MockResult }[] = [
  {
    keywords: ['login', 'sign in'],
    result: {
      type: 'schema',
      reply: "I'll build a login form with email and password fields.",
      concepts: ['Card', 'TextField (email)', 'TextField (password)', 'Button (submit)'],
      schema: {
        surfaceId: 'preview',
        components: [
          { id: 'root', component: 'Card', children: ['heading', 'col'] },
          { id: 'heading', component: 'Text', text: 'Sign In', variant: 'h3' },
          { id: 'col', component: 'Column', children: ['email', 'pass', 'submit'] },
          { id: 'email', component: 'TextField', label: 'Email', placeholder: 'you@example.com' },
          { id: 'pass', component: 'TextField', label: 'Password', placeholder: 'Enter password', variant: 'obscured' },
          { id: 'submit', component: 'Button', text: 'Sign In', variant: 'primary' },
        ],
      },
    },
  },
  {
    keywords: ['settings', 'preferences'],
    result: {
      type: 'schema',
      reply: "Here's a settings page with toggles and a dropdown.",
      concepts: ['Column', 'Tabs', 'Switch (notifications)', 'Switch (dark mode)', 'Select (language)'],
      schema: {
        surfaceId: 'preview',
        components: [
          { id: 'root', component: 'Column', children: ['heading', 'tabs'] },
          { id: 'heading', component: 'Text', text: 'Settings', variant: 'h2' },
          { id: 'tabs', component: 'Tabs', children: ['general', 'appearance'] },
          { id: 'general', component: 'Column', label: 'General', value: 'general', children: ['notif', 'autosave', 'lang'] },
          { id: 'notif', component: 'Switch', label: 'Notifications' },
          { id: 'autosave', component: 'Switch', label: 'Auto-save' },
          { id: 'lang', component: 'Select', label: 'Language', children: ['en', 'es', 'fr'] },
          { id: 'en', component: 'ListItem', label: 'English', value: 'en' },
          { id: 'es', component: 'ListItem', label: 'Spanish', value: 'es' },
          { id: 'fr', component: 'ListItem', label: 'French', value: 'fr' },
          { id: 'appearance', component: 'Column', label: 'Appearance', value: 'appearance', children: ['dark'] },
          { id: 'dark', component: 'Switch', label: 'Dark mode' },
        ],
      },
    },
  },
  {
    keywords: ['dashboard', 'stats', 'metrics'],
    result: {
      type: 'schema',
      reply: 'A dashboard stats card with key metrics.',
      concepts: ['Card', 'Row', 'Text (value)', 'Badge (status)'],
      schema: {
        surfaceId: 'preview',
        components: [
          { id: 'root', component: 'Column', children: ['heading', 'row'] },
          { id: 'heading', component: 'Text', text: 'Dashboard', variant: 'h2' },
          { id: 'row', component: 'Row', children: ['card1', 'card2', 'card3'] },
          { id: 'card1', component: 'Card', children: ['c1-label', 'c1-value', 'c1-badge'] },
          { id: 'c1-label', component: 'Text', text: 'Revenue', variant: 'caption' },
          { id: 'c1-value', component: 'Text', text: '$12,450', variant: 'h2' },
          { id: 'c1-badge', component: 'Badge', text: '+12%', variant: 'solid' },
          { id: 'card2', component: 'Card', children: ['c2-label', 'c2-value'] },
          { id: 'c2-label', component: 'Text', text: 'Users', variant: 'caption' },
          { id: 'c2-value', component: 'Text', text: '3,842', variant: 'h2' },
          { id: 'card3', component: 'Card', children: ['c3-label', 'c3-value'] },
          { id: 'c3-label', component: 'Text', text: 'Orders', variant: 'caption' },
          { id: 'c3-value', component: 'Text', text: '284', variant: 'h2' },
        ],
      },
    },
  },
  {
    keywords: ['form', 'contact'],
    result: {
      type: 'question',
      reply: 'What fields should the form include? And should it have a submit button or auto-save?',
      concepts: ['Card (form container)', 'TextField (text inputs)', 'TextArea (message)', 'Select (dropdown)', 'Button (submit)'],
      suggestions: [
        { value: 'A contact form with name, email, and message', label: 'Contact form' },
        { value: 'A signup form with name, email, password, and confirm', label: 'Signup form' },
        { value: 'A feedback form with rating, category dropdown, and comments', label: 'Feedback form' },
      ],
    },
  },
];

function mockResponse(input: string): MockResult {
  const lower = input.toLowerCase();

  // ── Refinement patterns (when a schema already exists) ──
  if (currentSchema) {
    if (lower.includes('add') && (lower.includes('footer') || lower.includes('button'))) {
      const schema = JSON.parse(JSON.stringify(currentSchema));
      const root = schema.components.find((c: Record<string, unknown>) => c.id === 'root');
      if (root) {
        schema.components.push(
          { id: 'added-footer', component: 'Footer', children: ['cancel-btn', 'ok-btn'] },
          { id: 'cancel-btn', component: 'Button', text: 'Cancel', variant: 'ghost' },
          { id: 'ok-btn', component: 'Button', text: 'OK', variant: 'primary' },
        );
        root.children = [...(root.children as string[] || []), 'added-footer'];
      }
      return {
        type: 'schema',
        reply: 'Added a footer with Cancel and OK buttons.',
        concepts: ['Footer', 'Button (cancel)', 'Button (ok)'],
        schema,
      };
    }

    if (lower.includes('horizontal') || lower.includes('row')) {
      const schema = JSON.parse(JSON.stringify(currentSchema));
      for (const c of schema.components) {
        if (c.component === 'Column') c.component = 'Row';
      }
      return {
        type: 'schema',
        reply: 'Changed the layout from vertical (Column) to horizontal (Row).',
        concepts: ['Row (horizontal layout)'],
        schema,
      };
    }

    if (lower.includes('switch') && lower.includes('instead')) {
      const schema = JSON.parse(JSON.stringify(currentSchema));
      for (const c of schema.components) {
        if (c.component === 'CheckBox') c.component = 'Switch';
      }
      return {
        type: 'remap',
        reply: 'Swapped all CheckBox components to Switch.',
        remaps: [{ from: 'CheckBox', to: 'Switch', reason: 'User prefers toggle switches' }],
        concepts: ['Switch (toggle)'],
        schema,
      };
    }

    if (lower.includes('remove') || lower.includes('delete')) {
      const schema = JSON.parse(JSON.stringify(currentSchema));
      if (schema.components.length > 2) {
        const removed = schema.components.pop();
        for (const c of schema.components) {
          if (c.children) c.children = c.children.filter((id: string) => id !== removed.id);
        }
        return {
          type: 'schema',
          reply: `Removed the "${removed.component}" component (${removed.id}).`,
          concepts: schema.components
            .map((c: Record<string, unknown>) => c.component as string)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
          schema,
        };
      }
    }
  }

  // ── Initial patterns ──
  const match = MOCK_EXAMPLES.find(ex => ex.keywords.some(kw => lower.includes(kw)));
  if (match) return match.result;
  const fallback: MockResult = {
    type: 'question',
    reply: currentSchema
      ? 'How would you like to modify the current schema?'
      : 'What kind of UI would you like to build?',
    concepts: [],
  };

  if (currentSchema) {
    fallback.suggestions = [
      { value: 'Add a footer with cancel and submit buttons', label: 'Add footer' },
      { value: 'Make it horizontal instead of vertical', label: 'Make horizontal' },
      { value: 'Remove the last component', label: 'Remove last' },
    ];
  } else {
    fallback.suggestions = pickRandomSeeds(4);
  }

  return fallback;
}

// ── Boot ──

resetKernel();
const kernel = new Kernel({ allowUnregistered: true });
let currentAdapter: ReturnType<typeof createA2UIAdapter> | null = null;

// ── DOM refs ──

const chipEls = new Map<string, HTMLElement>();
const paneEls = new Map<string, HTMLElement>();

const chatFeed = document.getElementById('chat-feed') as HTMLElement;
const chatComposer = document.getElementById('chat-composer') as HTMLElement & { busy: boolean };
let msgCounter = 0;
const messageTextMap = new Map<string, string>();

// Pane content containers
const previewMount = document.getElementById('preview-mount')!;
const conceptsWrap = document.getElementById('concepts-wrap')!;
const schemaPre = document.getElementById('schema-pre') as HTMLElement & { value: string; extensions: unknown[] };
const htmlPre = document.getElementById('html-pre') as HTMLElement & { value: string; extensions: unknown[] };
const cssEditor = document.getElementById('css-editor') as HTMLElement & { value: string; extensions: unknown[] };
const jsEditor = document.getElementById('js-editor') as HTMLElement & { value: string; extensions: unknown[] };
const mapTable = document.getElementById('map-table')!;
const promptEditor = document.getElementById('prompt-editor') as HTMLElement & { value: string; extensions: unknown[] };

// Set language modes on editors after CE upgrade
customElements.whenDefined('n-editor').then(() => {
  schemaPre.extensions = [json()];
  htmlPre.extensions = [htmlLang()];
  cssEditor.extensions = [cssLang()];
  jsEditor.extensions = [javascript()];
});
const modelPicker = document.getElementById('model-picker') as HTMLElement & { value: string };

// ── CSS/JS live apply ──

let previewStyle: HTMLStyleElement | null = null;

/** Scope CSS rules under #preview-mount so they don't leak into the builder UI. */
function scopeCSS(css: string): string {
  // If the user already scoped to #preview-mount, pass through
  if (css.includes('#preview-mount')) return css;
  // Wrap each rule: add #preview-mount prefix to every selector
  return css.replace(
    /([^{}@]+)\{/g,
    (_match, selectors: string) => {
      const scoped = selectors
        .split(',')
        .map((s: string) => `#preview-mount ${s.trim()}`)
        .join(', ');
      return `${scoped} {`;
    },
  );
}

function applyCSSToPreview(css: string): void {
  if (!previewStyle) {
    previewStyle = document.createElement('style');
    previewStyle.dataset.builder = 'custom';
    previewMount.prepend(previewStyle);
  }
  previewStyle.textContent = scopeCSS(css);
}

/** Wait for custom elements inside the preview to upgrade, then two rAFs. */
async function waitForPreviewReady(): Promise<void> {
  const tags = new Set<string>();
  for (const el of previewMount.querySelectorAll('*')) {
    if (el.localName.includes('-')) tags.add(el.localName);
  }
  // Only wait for tags that are actually registered (or will be soon).
  // CSS-only undefined CEs (n-stack, n-body, n-header, etc.) never register
  // so whenDefined() would hang forever. Use a short timeout as a race.
  const TIMEOUT = 500;
  const withTimeout = (p: Promise<unknown>) =>
    Promise.race([p, new Promise(r => setTimeout(r, TIMEOUT))]);
  const defined = [...tags].filter(t => customElements.get(t));
  const pending = [...tags].filter(t => !customElements.get(t));
  await Promise.all([
    ...defined.map(t => customElements.whenDefined(t)),
    ...pending.map(t => withTimeout(customElements.whenDefined(t))),
  ]);
  // Two rAFs — first for CE upgrade, second for child rendering
  await new Promise(r => requestAnimationFrame(r as FrameRequestCallback));
  await new Promise(r => requestAnimationFrame(r as FrameRequestCallback));
}

function applyJSToPreview(js: string): void {
  if (!previewMount.children.length) return;

  try {
    // Wrap generated code in try/catch so async callbacks (event listeners)
    // don't throw uncaught errors from LLM-generated code.
    const wrapper = `(function(preview){
  var $ = function(sel){ return preview.querySelector(sel); };
  var $$ = function(sel){ return preview.querySelectorAll(sel); };
  var _origAEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, fn, opts) {
    var safeFn = typeof fn === 'function' ? function() {
      try { return fn.apply(this, arguments); }
      catch(e) { console.warn('[A2UI Preview] JS callback error:', e); }
    } : fn;
    return _origAEL.call(this, type, safeFn, opts);
  };
  try {
${js}
  } finally { EventTarget.prototype.addEventListener = _origAEL; }
}(__mount__))`;
    const fn = new Function('__mount__', wrapper);
    fn(previewMount);
  } catch (err) {
    console.error('[A2UI Builder] JS error:', err);
    addMessage('assistant', `JS Error: ${(err as Error).message}`);
  }
}

// CSS editor — debounced input + Cmd/Ctrl-S
let cssDebounce: ReturnType<typeof setTimeout> | null = null;
function debouncedCSSApply(): void {
  if (cssDebounce) clearTimeout(cssDebounce);
  cssDebounce = setTimeout(() => applyCSSToPreview(cssEditor.value), 300);
}

cssEditor.addEventListener('native:input', debouncedCSSApply);
cssEditor.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (cssDebounce) clearTimeout(cssDebounce);
    applyCSSToPreview(cssEditor.value);
  }
});

// JS apply — Play button (pointerup delegation) + Cmd/Ctrl-S
let jsRunning = false;
function runJS(): void {
  const js = jsEditor.value.trim();
  if (!js || jsRunning) return;
  jsRunning = true;
  waitForPreviewReady().then(() => {
    applyJSToPreview(js);
    jsRunning = false;
  });
}

document.addEventListener('pointerup', (e) => {
  // Walk composedPath to cross shadow DOM boundaries
  for (const node of e.composedPath()) {
    if (node instanceof HTMLElement && node.matches('[data-role="apply-js"]')) {
      runJS();
      break;
    }
  }
});
jsEditor.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    runJS();
  }
});

// Wire model picker → rebuild adapter on change
modelPicker.addEventListener('native:change', () => {
  currentModel = modelPicker.value;
  llm = buildAdapter(currentModel);
});

// ── Init pane refs + chips ──

for (const panel of PANELS) {
  const paneEl = document.querySelector(`n-pane[data-panel-id="${panel.id}"]`) as HTMLElement | null;
  if (paneEl) {
    paneEls.set(panel.id, paneEl);
    paneEl.hidden = !activePanels.has(panel.id);
  }

  const chipEl = document.querySelector(`n-button[data-chip="${panel.id}"]`) as HTMLElement | null;
  if (chipEl) {
    chipEls.set(panel.id, chipEl);
    chipEl.toggleAttribute('force-active', activePanels.has(panel.id));

    chipEl.addEventListener('native:press', () => {
      if (activePanels.has(panel.id)) {
        activePanels.delete(panel.id);
      } else {
        activePanels.add(panel.id);
      }
      syncPanels();
    });
  }
}

// Pane close buttons
for (const btn of document.querySelectorAll('[data-close-panel-id]')) {
  btn.addEventListener('native:press', () => {
    const id = (btn as HTMLElement).getAttribute('data-close-panel-id');
    if (id) activePanels.delete(id);
    syncPanels();
  });
}

// Sliders button → toggle Concepts + Schema together
const inspectorBtn = document.querySelector('[data-role="toggle-inspector"]');
inspectorBtn?.addEventListener('native:press', () => {
  const inspectorPanels = ['concepts', 'schema'];
  const allOpen = inspectorPanels.every(id => activePanels.has(id));
  for (const id of inspectorPanels) {
    if (allOpen) activePanels.delete(id); else activePanels.add(id);
  }
  syncPanels();
});

function syncPanels() {
  // Clear inline flex so CSS defaults redistribute
  for (const [_, el] of paneEls) {
    el.style.removeProperty('flex');
  }
  for (const [id, el] of paneEls) el.hidden = !activePanels.has(id);
  for (const [id, chip] of chipEls) chip.toggleAttribute('force-active', activePanels.has(id));
}

// ── Lightbox toggle (light/dark preview) ──

const previewBody = document.querySelector('n-pane[data-panel-id="preview"] > n-body') as HTMLElement | null;
const colorSchemeBtn = document.getElementById('lightbox-toggle');
let userOverride: boolean | null = null; // null = inherit from context

function resolvePreviewDark(): boolean {
  if (userOverride !== null) return userOverride;
  // Check computed color-scheme on the preview or its ancestors
  if (previewBody) {
    const computed = getComputedStyle(previewBody).colorScheme;
    if (computed === 'dark') return true;
    if (computed === 'light') return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncColorSchemeIcon(): void {
  const dark = resolvePreviewDark();
  const icon = colorSchemeBtn?.querySelector('n-icon');
  if (icon) icon.setAttribute('name', dark ? 'sun' : 'moon');
}

// Sync icon to initial context
syncColorSchemeIcon();

colorSchemeBtn?.addEventListener('native:press', () => {
  const wasDark = resolvePreviewDark();
  userOverride = !wasDark;
  if (previewBody) {
    previewBody.style.colorScheme = userOverride ? 'dark' : 'light';
  }
  syncColorSchemeIcon();
});

// ── CSS Inspector toggle ──

const inspectToggleBtn = document.getElementById('inspect-toggle');
let cssInspector: CSSInspectController | null = null;

inspectToggleBtn?.addEventListener('native:press', () => {
  if (cssInspector) {
    cssInspector.dismiss();
    cssInspector.destroy();
    cssInspector = null;
    inspectToggleBtn.removeAttribute('force-active');
  } else {
    cssInspector = new CSSInspectController(previewMount, { pick: true, labels: true });
    inspectToggleBtn.setAttribute('force-active', '');
  }
});

// Clean up inspector when preview content changes
previewMount.addEventListener('native:inspect', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (!detail.active && cssInspector) {
    // Inspector dismissed itself (e.g. Escape) — sync button state
    inspectToggleBtn?.removeAttribute('force-active');
  }
});

// ── Preview canvas panning (infinite, translate-based) ──

if (previewBody && previewMount) {
  let panX = 0;
  let panY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;

  function applyTransform() {
    previewMount.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`;
  }

  previewBody.addEventListener('pointerdown', (e: PointerEvent) => {
    // Only pan when clicking on the canvas background, not on the artifact or pane grippers
    const target = e.target as HTMLElement;
    if (target.closest('#preview-mount')) return;
    if (target.closest('n-gripper')) return;
    if (e.button !== 0) return;

    panStartX = e.clientX;
    panStartY = e.clientY;
    panOriginX = panX;
    panOriginY = panY;
    previewBody.setAttribute('data-panning', '');
    previewBody.setPointerCapture(e.pointerId);
  });

  previewBody.addEventListener('pointermove', (e: PointerEvent) => {
    if (!previewBody.hasAttribute('data-panning')) return;
    panX = panOriginX + (e.clientX - panStartX);
    panY = panOriginY + (e.clientY - panStartY);
    applyTransform();
  });

  previewBody.addEventListener('pointerup', () => {
    previewBody.removeAttribute('data-panning');
  });

  previewBody.addEventListener('lostpointercapture', () => {
    previewBody.removeAttribute('data-panning');
  });

  // Re-center preview when pane resizes (reset pan offset)
  new ResizeObserver(() => {
    panX = 0;
    panY = 0;
    applyTransform();
  }).observe(previewBody);
}

// ── Lightbox mode (fullscreen overlay) ──

const lightboxModeBtn = document.getElementById('lightbox-btn');
const builderEl = document.querySelector('.builder') as HTMLElement | null;
let lightboxMode = false;

lightboxModeBtn?.addEventListener('native:press', () => {
  if (!builderEl) return;
  lightboxMode = !lightboxMode;
  if (lightboxMode) {
    builderEl.setAttribute('popover', 'manual');
    builderEl.showPopover();
  } else {
    builderEl.hidePopover();
    builderEl.removeAttribute('popover');
  }
  builderEl.toggleAttribute('data-lightbox', lightboxMode);
  lightboxModeBtn.toggleAttribute('force-active', lightboxMode);
  const icon = lightboxModeBtn.querySelector('n-icon');
  if (icon) icon.setAttribute('name', lightboxMode ? 'arrows-in-simple' : 'arrows-out-simple');
});

// ── Pipeline mode toggle (Flask button) ──

const pipelineBtn = document.querySelector('[data-role="toggle-pipeline"]') as HTMLElement | null;
pipelineBtn?.addEventListener('native:press', () => {
  pipelineMode = !pipelineMode;
  pipelineBtn.toggleAttribute('force-active', pipelineMode);
  if (pipelineMode) {
    pipelineBtn.setAttribute('intent', 'accent');
  } else {
    pipelineBtn.removeAttribute('intent');
  }
});

// ── Pane layout (resize handled by n-panes component) ──

// ── Populate static panels ──

// Prompt editor — editable textarea
promptEditor.value = DEFAULT_SYSTEM_PROMPT;
promptEditor.addEventListener('native:input', () => {
  systemPrompt = promptEditor.value;
  llm = buildAdapter(currentModel);
});

// Component map table — populated from protocol registry
const tbody = mapTable.querySelector('tbody')!;

function renderPropsTable(props: readonly PropertySpec[]): string {
  if (!props.length) return '';
  const rows = props.map(p => {
    const reactive = p.reactive ? '<span class="map-reactive">reactive</span>' : '';
    const note = p.note ? ` <span class="map-note">${p.note}</span>` : '';
    return `<tr><td><code>${p.attr}</code></td><td>${p.type}</td><td>${reactive}${note}</td></tr>`;
  }).join('');
  return `<div class="map-detail-section"><div class="map-detail-label">Properties</div><table><thead><tr><th>Attr</th><th>Type</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderEventsTable(events: readonly EventSpec[]): string {
  if (!events.length) return '';
  const rows = events.map(e => {
    const detail = e.detail ? Object.entries(e.detail).map(([k, v]) => `${k}: ${v}`).join(', ') : '—';
    return `<tr><td><code>${e.event}</code></td><td>${detail}</td><td>${e.description}</td></tr>`;
  }).join('');
  return `<div class="map-detail-section"><div class="map-detail-label">Events</div><table><thead><tr><th>Event</th><th>Detail</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderMethodsTable(methods: readonly MethodSpec[]): string {
  if (!methods.length) return '';
  const rows = methods.map(m => {
    const params = m.params ? Object.entries(m.params).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
    const sig = `${m.name}(${params})`;
    return `<tr><td><code>${sig}</code></td><td>${m.returns ?? 'void'}</td><td>${m.description}</td></tr>`;
  }).join('');
  return `<div class="map-detail-section"><div class="map-detail-label">Methods</div><table><thead><tr><th>Method</th><th>Returns</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

for (const mapping of REGISTRY.values()) {
  const cat = getComponentCategory(mapping.a2uiType);
  const hasApi = (mapping.events?.length ?? 0) > 0 || (mapping.properties?.length ?? 0) > 0 || (mapping.methods?.length ?? 0) > 0;

  // Summary row
  const tr = document.createElement('tr');
  tr.className = 'map-summary';
  tr.innerHTML = `<td class="map-chevron">${hasApi ? '▸' : ''}</td><td class="map-type">${mapping.a2uiType}</td><td><code>&lt;${mapping.nativeTag}&gt;</code></td><td class="map-category">${cat}</td>`;

  // Detail row
  const detailTr = document.createElement('tr');
  detailTr.className = 'map-detail';
  detailTr.hidden = true;
  const detailTd = document.createElement('td');
  detailTd.colSpan = 4;

  if (hasApi) {
    let html = '';
    if (mapping.properties?.length) html += renderPropsTable(mapping.properties);
    if (mapping.events?.length) html += renderEventsTable(mapping.events);
    if (mapping.methods?.length) html += renderMethodsTable(mapping.methods);
    detailTd.innerHTML = html;
  } else {
    detailTd.innerHTML = '<span class="map-no-api">No API surface</span>';
  }
  detailTr.appendChild(detailTd);

  // Toggle on click
  tr.addEventListener('click', () => {
    detailTr.hidden = !detailTr.hidden;
    const chevron = tr.querySelector('.map-chevron');
    if (chevron) chevron.textContent = detailTr.hidden ? '▸' : '▾';
  });

  tbody.appendChild(tr);
  tbody.appendChild(detailTr);
}

// ── Render helpers ──

let lastMessageGroup: HTMLElement | null = null;
let lastMessageRole: string | null = null;

/** Parse JSON from LLM response, typed as MockResult. */
const parseJSON = (raw: string | undefined): MockResult => parseJsonFromResponse<MockResult>(raw);

function addMessage(role: string, text: string, type?: string) {
  const msgId = `msg-${++msgCounter}`;

  // Reuse the last group if same role and it's not separated by seeds
  let group = lastMessageGroup;
  if (!group || lastMessageRole !== role) {
    group = document.createElement('n-agent-dialogue');
    group.setAttribute('data-role', role);
    group.setAttribute('sender', role === 'user' ? 'You' : 'Builder');

    const avatar = document.createElement('n-chat-avatar');
    if (role === 'assistant') {
      avatar.setAttribute('icon', 'chat-dots');
    } else {
      avatar.setAttribute('icon', 'user');
    }
    group.appendChild(avatar);
    chatFeed.appendChild(group);
    lastMessageGroup = group;
    lastMessageRole = role;
  }

  const message = document.createElement('n-agent-dialogue-item');
  message.setAttribute('data-role', role);
  message.setAttribute('message-id', msgId);
  message.setAttribute('actions', role === 'assistant' ? 'copy,retry' : 'copy');
  if (type) message.setAttribute('data-type', type);

  const messageText = document.createElement('n-chat-message-text') as HTMLElement & { content: string };
  messageText.setAttribute('format', 'markdown');
  messageText.content = text;

  message.appendChild(messageText);
  group.appendChild(message);

  // Store text for copy/retry
  messageTextMap.set(msgId, text);

  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function addSeedChips(options: SeedOption[]) {
  // Seeds break message grouping — next message must start a new group
  lastMessageGroup = null;
  lastMessageRole = null;

  const group = document.createElement('n-agent-dialogue');
  group.setAttribute('data-role', 'assistant');
  group.setAttribute('sender', 'Builder');
  group.setAttribute('data-seeds', '');

  const seed = document.createElement('n-chat-message-seed') as HTMLElement & { options: SeedOption[] };
  seed.options = options;
  group.appendChild(seed);
  chatFeed.appendChild(group);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function clearSeeds() {
  for (const el of chatFeed.querySelectorAll('[data-seeds]')) el.remove();
  // Seed removal invalidates grouping — force new group for next message
  lastMessageGroup = null;
  lastMessageRole = null;
}


// ── Reasoning pane (accumulating reasoning log) ──

// stripFences imported from '../../chat/parsing/json-extractor.ts'

let insightCounter = 0;

/** Map step id → its DOM entry (so we can replace placeholder with content). */
const insightEntries = new Map<string, HTMLElement>();

const stepLabels: Record<string, string> = {
  interpret: 'Interpretation',
  concepts: 'Concepts',
  plan: 'Plan',
  construct: 'Construction',
};

function separateInsights(): void {
  if (conceptsWrap.children.length > 0) {
    conceptsWrap.appendChild(document.createElement('hr'));
  }
  insightEntries.clear();
}

function appendInsightEntry(label: string, stepId?: string): HTMLElement {
  insightCounter++;
  const entry = document.createElement('div');
  entry.className = 'insight-entry';

  const header = document.createElement('div');
  header.className = 'insight-header';
  const num = document.createElement('span');
  num.className = 'insight-num';
  num.textContent = `#${insightCounter}`;
  header.appendChild(num);
  const title = document.createElement('span');
  title.className = 'insight-label';
  title.textContent = label;
  header.appendChild(title);
  entry.appendChild(header);

  conceptsWrap.appendChild(entry);
  scrollReasoningToBottom();

  if (stepId) insightEntries.set(stepId, entry);
  return entry;
}

function appendInsightPlaceholder(parent: HTMLElement, text: string): void {
  const el = document.createElement('span');
  el.className = 'insight-placeholder';
  el.textContent = text;
  parent.appendChild(el);
}

function appendInsightText(parent: HTMLElement, text: string, muted = false): void {
  const el = document.createElement('span');
  el.className = 'insight-text';
  if (muted) el.setAttribute('data-muted', '');
  el.textContent = text;
  parent.appendChild(el);
}

function appendInsightBadges(parent: HTMLElement, items: string[], intent?: string): void {
  const wrap = document.createElement('div');
  wrap.className = 'insight-badges';
  for (const item of items) {
    const badge = document.createElement('n-badge');
    if (intent) badge.setAttribute('intent', intent);
    badge.textContent = item;
    wrap.appendChild(badge);
  }
  parent.appendChild(wrap);
}

function fillTemplates(parent: HTMLElement, entries: CatalogEntry[]): void {
  for (const e of entries) {
    const row = document.createElement('div');
    row.className = 'insight-template';
    const name = document.createElement('span');
    name.className = 'insight-template-name';
    name.textContent = e.label;
    row.appendChild(name);
    const meta = document.createElement('span');
    meta.className = 'insight-template-meta';
    meta.textContent = `${e.tier} · ${e.category} · ${e.componentCount} components`;
    row.appendChild(meta);
    parent.appendChild(row);
  }
}

function fillInterpretation(entry: HTMLElement, output: string): void {
  entry.querySelector('.insight-placeholder')?.remove();
  try {
    const data = JSON.parse(stripFences(output));
    if (data.intent) appendInsightText(entry, data.intent);
    const meta: string[] = [];
    if (data.uiKind) meta.push(data.uiKind);
    if (meta.length) appendInsightBadges(entry, meta);
    if (data.assumptions?.length) {
      for (const a of data.assumptions) appendInsightText(entry, `→ ${a}`, true);
    }
  } catch {
    appendInsightText(entry, output.slice(0, 300), true);
  }
}

function fillConcepts(entry: HTMLElement, output: string): void {
  entry.querySelector('.insight-placeholder')?.remove();
  try {
    const data = JSON.parse(stripFences(output));

    // Design patterns as highlighted items
    for (const c of data.concepts ?? []) {
      const item = document.createElement('div');
      item.className = 'insight-concept';
      const name = document.createElement('span');
      name.className = 'insight-concept-name';
      name.textContent = c.pattern;
      item.appendChild(name);
      if (c.rationale) appendInsightText(item, c.rationale, true);
      entry.appendChild(item);
    }

    // Interactions as accent badges
    if (data.interactions?.length) {
      appendInsightBadges(entry, data.interactions, 'accent');
    }

    // Data flow + state model as text
    if (data.dataFlow) appendInsightText(entry, data.dataFlow);
    if (data.stateModel) appendInsightText(entry, data.stateModel, true);
  } catch {
    appendInsightText(entry, output.slice(0, 300), true);
  }
}

function fillPlan(entry: HTMLElement, output: string): void {
  entry.querySelector('.insight-placeholder')?.remove();
  try {
    const data = JSON.parse(stripFences(output));
    if (data.layout) appendInsightText(entry, data.layout);
    if (data.hierarchy) appendInsightText(entry, data.hierarchy, true);

    const traits = data.traits ?? [];
    if (traits.length) appendInsightBadges(entry, traits);

    const notes: string[] = [];
    if (data.cssNeeded && data.cssNotes) notes.push(`CSS: ${data.cssNotes}`);
    if (data.jsNeeded && data.jsNotes) notes.push(`JS: ${data.jsNotes}`);
    for (const n of notes) appendInsightText(entry, n, true);
  } catch {
    appendInsightText(entry, output.slice(0, 300), true);
  }
}

function fillConstruct(entry: HTMLElement, output: string): void {
  entry.querySelector('.insight-placeholder')?.remove();
  try {
    const data = JSON.parse(stripFences(output));

    // Detect response type — the construct step may produce questions instead of a schema
    const type: string = data.type ?? (data.schema ? 'schema' : data.components ? 'schema' : data.questions ? 'question' : '');

    if (type === 'question' || (!data.components && !data.schema && data.reply)) {
      appendInsightText(entry, 'Asked clarifying questions');
      // Update header label from "Construction" to "Outcome"
      const label = entry.querySelector('.insight-label');
      if (label) label.textContent = 'Outcome';
      return;
    }

    const components = data.components ?? data.schema?.components ?? [];
    const count = Array.isArray(components) ? components.length : 0;
    if (count > 0) {
      appendInsightText(entry, `Built ${count} component${count !== 1 ? 's' : ''}`);
    } else {
      appendInsightText(entry, 'Responded (no schema)', true);
      const label = entry.querySelector('.insight-label');
      if (label) label.textContent = 'Outcome';
    }
    const surfaceId = data.surfaceId ?? data.schema?.surfaceId;
    if (surfaceId) appendInsightBadges(entry, [surfaceId]);
  } catch {
    // Raw text output — likely a question or error, not a schema
    if (output.includes('?') || output.length < 200) {
      appendInsightText(entry, 'Responded', true);
      const label = entry.querySelector('.insight-label');
      if (label) label.textContent = 'Outcome';
    } else {
      appendInsightText(entry, 'Schema constructed', true);
    }
  }
}

/** Scroll the Reasoning pane's n-body to bottom. */
function scrollReasoningToBottom(): void {
  const scrollParent = conceptsWrap.closest('n-body') as HTMLElement | null ?? conceptsWrap;
  scrollParent.scrollTop = scrollParent.scrollHeight;
}

/** Populate reasoning from a single-shot (non-pipeline) response,
 *  revealing each step progressively with placeholder → fill transitions. */
function populateInsightsFromResult(result: MockResult): void {
  separateInsights();

  const effectiveType = result.type ?? (result.schema ? 'schema' : 'question');
  const isSchema = effectiveType === 'schema' && !!result.schema;

  type InsightStep = { label: string; placeholder: string; fill: (entry: HTMLElement) => void };
  const steps: InsightStep[] = [];

  // Always show the response summary
  if (result.reply) {
    steps.push({
      label: isSchema ? 'Response' : 'Clarification',
      placeholder: isSchema ? 'Composing response…' : 'Thinking…',
      fill(entry) { appendInsightText(entry, result.reply); },
    });
  }

  // Concepts + templates — only for schema results
  if (isSchema && result.concepts?.length) {
    steps.push({
      label: 'Concepts',
      placeholder: 'Mapping concepts…',
      fill(entry) {
        for (const c of result.concepts) {
          const item = document.createElement('div');
          item.className = 'insight-concept';
          const name = document.createElement('span');
          name.className = 'insight-concept-name';
          name.textContent = c;
          item.appendChild(name);
          entry.appendChild(item);
        }
      },
    });

    // Match concepts against pattern catalog
    const matched = matchPatterns(result.concepts, { limit: 3 });
    if (matched.length) {
      steps.push({
        label: 'Templates',
        placeholder: 'Matching templates…',
        fill(entry) { fillTemplates(entry, matched); },
      });
    }
  }

  // Construction — only when a schema was actually built
  if (isSchema && result.schema) {
    steps.push({
      label: 'Construction',
      placeholder: 'Building schema…',
      fill(entry) {
        const count = result.schema!.components?.length ?? 0;
        appendInsightText(entry, `Built ${count} component${count !== 1 ? 's' : ''}`);
        if (result.schema!.surfaceId) appendInsightBadges(entry, [result.schema!.surfaceId]);
      },
    });
  }

  // Non-schema type badges (question, gap, remap, prompt)
  if (!isSchema && effectiveType !== 'question') {
    const typeLabels: Record<string, string> = {
      gap: 'Gap Analysis',
      remap: 'Component Remap',
      prompt: 'Prompt Generated',
    };
    steps.push({
      label: typeLabels[effectiveType] ?? 'Outcome',
      placeholder: 'Processing…',
      fill(entry) { appendInsightBadges(entry, [effectiveType]); },
    });
  }

  const extras: string[] = [];
  if (result.css !== undefined) extras.push('Custom CSS');
  if (result.js !== undefined) extras.push('Custom JS');
  if (extras.length) {
    steps.push({
      label: 'Extras',
      placeholder: 'Applying extras…',
      fill(entry) { appendInsightBadges(entry, extras, 'accent'); },
    });
  }

  if (result.gaps?.length) {
    steps.push({
      label: 'Gaps',
      placeholder: 'Analyzing gaps…',
      fill(entry) {
        for (const g of result.gaps!) {
          const item = document.createElement('div');
          item.className = 'insight-concept';
          const name = document.createElement('span');
          name.className = 'insight-concept-name';
          name.textContent = g.component;
          item.appendChild(name);
          appendInsightText(item, g.need, true);
          entry.appendChild(item);
        }
      },
    });
  }

  // Progressive reveal: placeholder first, then fill after a short delay
  const STEP_DELAY = 400;
  const FILL_DELAY = 300;

  steps.forEach((step, i) => {
    setTimeout(() => {
      const entry = appendInsightEntry(step.label);
      appendInsightPlaceholder(entry, step.placeholder);

      setTimeout(() => {
        entry.querySelector('.insight-placeholder')?.remove();
        step.fill(entry);
        scrollReasoningToBottom();
      }, FILL_DELAY);
    }, i * STEP_DELAY);
  });
}

function renderSchema(schema: MockResult['schema']) {
  schemaPre.value = JSON.stringify(schema, null, 2);
}

function renderPreview(schema: MockResult['schema']) {
  if (currentAdapter) {
    currentAdapter.destroy();
    currentAdapter = null;
  }
  // Dismiss CSS inspector if active
  if (cssInspector) {
    cssInspector.dismiss();
    cssInspector.destroy();
    cssInspector = null;
    inspectToggleBtn?.removeAttribute('force-active');
  }

  // Animate: shrink out → rebuild → grow in
  previewMount.classList.add('entering');
  previewMount.classList.remove('entered');

  previewMount.innerHTML = '';
  previewStyle = null; // Reset — will be recreated if CSS is applied
  currentAdapter = createA2UIAdapter(kernel, {
    onClientMessage: (msg: unknown) => console.log('[A2UI Builder →]', msg),
  });
  currentAdapter.receive({ updateComponents: schema }, previewMount);

  // Re-center with transition after content renders
  requestAnimationFrame(() => {
    previewMount.classList.remove('entering');
    previewMount.classList.add('entered');
  });

  // Extract rendered HTML after adapter finishes rendering
  queueMicrotask(() => {
    htmlPre.value = previewMount.innerHTML;
  });
}

function formatGapReport(gaps: MockResult['gaps'], partial?: MockResult['partial']): string {
  if (!gaps?.length) return '';
  const lines: string[] = ['## API Gaps Found\n'];
  for (const g of gaps) {
    lines.push(`**${g.component}**`);
    lines.push(`- **Need:** ${g.need}`);
    lines.push(`- **Context:** ${g.context}`);
    lines.push(`- **Impact:** ${g.impact}`);
    lines.push(`- **Suggestion:** ${g.suggestion} *(UNVERIFIED)*\n`);
  }
  if (partial) {
    lines.push('---');
    lines.push(`**Can generate:** ${partial.canGenerate}`);
    lines.push(`**Cannot generate:** ${partial.cannotGenerate}`);
  }
  return lines.join('\n');
}

function applyResult(result: MockResult) {
  const isQuestion = result.type === 'question';
  const isRemap = result.type === 'remap';
  const isPrompt = result.type === 'prompt';
  const isGap = result.type === 'gap';
  const tag = isQuestion ? 'question' : isRemap ? 'remap' : isPrompt ? 'prompt' : isGap ? 'gap' : undefined;
  // Safety net: if LLM splits questions into a separate array, merge them into reply
  let reply = result.reply;
  if (result.questions?.length) {
    reply += '\n' + result.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  }
  addMessage('assistant', reply, tag);

  // Handle remaps
  if (isRemap && result.remaps?.length) {
    for (const r of result.remaps) {
      if (REGISTRY.has(r.from) && REGISTRY.has(r.to)) {
        addMessage('assistant', `Remapped ${r.from} → ${r.to}${r.reason ? ': ' + r.reason : ''}`, 'remap');
      }
    }
  }

  // Handle Claude Code prompt — download as .md file
  if (isPrompt && result.prompt) {
    const blob = new Blob([result.prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'claude-code-prompt.md';
    link.click();
    URL.revokeObjectURL(url);
    addMessage('assistant', 'Prompt downloaded as `claude-code-prompt.md`');
  }

  // Handle gap reports — render as structured markdown + celebrate the signal
  if (result.gaps?.length) {
    const report = formatGapReport(result.gaps, result.partial);
    if (report) addMessage('assistant', report, 'gap');
    const confetti = new ConfettiController(chatFeed, { trigger: 'manual', count: 40, spread: 120, colors: ['#f59e0b', '#f97316', '#ef4444', '#eab308', '#fbbf24'] });
    confetti.fire();
    setTimeout(() => confetti.destroy(), 3000);
  }

  if (result.schema) {
    currentSchema = result.schema;
    renderSchema(result.schema);
    renderPreview(result.schema);
  }

  // Apply CSS/JS from LLM response (don't auto-toggle panes)
  if (result.css !== undefined) {
    cssEditor.value = result.css;
    applyCSSToPreview(result.css);
  }
  if (result.js !== undefined) {
    jsEditor.value = result.js;
    // Defer JS execution — wait for all custom elements in preview to upgrade
    waitForPreviewReady().then(() => applyJSToPreview(result.js!));
  }

  // Show suggestion chips after questions
  if (result.suggestions?.length) {
    // LLM returns { label, prompt } — map to SeedOption { label, value }
    const seeds: SeedOption[] = result.suggestions.map(s => ({
      label: s.label,
      value: (s as Record<string, string>).prompt ?? (s as Record<string, string>).value ?? s.label,
    }));
    addSeedChips(seeds);
  }
}

// ── Progress step classification (single-shot mode) ──

function classifySteps(query: string, isIterating: boolean): [string, string, string] {
  const q = query.toLowerCase();
  if (/\b(style|color|theme|dark|light|background|font|spacing|padding|margin|border|shadow|round|gradient)\b/.test(q))
    return ['Thinking', 'Analyzing Styles', 'Styling UI'];
  if (/\b(click|event|handler|interact|button press|toggle|animate|show|hide|submit|validate)\b/.test(q))
    return ['Thinking', 'Planning Logic', 'Wiring Events'];
  if (/\b(layout|grid|stack|column|row|sidebar|header|footer|responsive|mobile|split|arrange|reorder|move)\b/.test(q))
    return ['Thinking', 'Planning Layout', 'Restructuring UI'];
  if (/^(what|how|why|can you|is it|explain|tell me|describe)\b/.test(q))
    return ['Thinking', 'Analyzing', 'Composing Response'];
  if (/\b(remove|delete|simplify|strip|clean|fewer|less|minimal)\b/.test(q))
    return ['Thinking', 'Reviewing Structure', 'Simplifying UI'];
  if (isIterating) return ['Thinking', 'Reviewing Changes', 'Updating UI'];
  return ['Thinking', 'Concept Mapping', 'Creating UI'];
}

// ── Single-shot send (one LLM call, timer-based progress) ──

async function sendSingleShot(value: string) {
  const progressEl = document.createElement('div');
  progressEl.className = 'builder-progress';
  chatFeed.appendChild(progressEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  const steps = classifySteps(value, !!currentSchema);
  let elapsed = 0;

  const lines: HTMLDivElement[] = [];
  function addStep(index: number) {
    const prev = lines[lines.length - 1];
    if (prev) prev.removeAttribute('data-active');
    const line = document.createElement('div');
    line.className = 'builder-progress-step';
    line.setAttribute('data-active', '');
    line.textContent = steps[index];
    progressEl.appendChild(line);
    lines.push(line);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  addStep(0);
  const tickTimer = setInterval(() => {
    elapsed++;
    if (lines[0]) lines[0].textContent = `Thinking ${elapsed}s`;
  }, 1000);
  const stepTimers = [
    setTimeout(() => addStep(1), 2000),
    setTimeout(() => addStep(2), 4000),
  ];

  function clearProgress(summaryVerb?: string) {
    clearInterval(tickTimer);
    for (const t of stepTimers) clearTimeout(t);
    const label = summaryVerb ?? steps[steps.length - 1];
    progressEl.textContent = '';
    progressEl.className = 'builder-progress-summary';
    progressEl.textContent = `Thought for ${elapsed}s · ${label}`;
  }

  try {
    const response = await llm!.sendMessage({
      id: crypto.randomUUID(),
      messages,
      query: value,
    });

    const raw = (response as Record<string, unknown>).message as string | undefined;
    const trimmed = raw?.trim();
    const result = parseJSON(trimmed);

    if (!result.type) result.type = result.gaps?.length ? 'gap' : result.prompt ? 'prompt' : result.schema ? 'schema' : 'question';
    if (result.schema && !result.schema.surfaceId) result.schema.surfaceId = 'preview';

    const summaryVerbs: Record<string, string> = {
      schema: currentSchema ? 'Updated UI' : 'Created UI',
      question: 'Responded',
      gap: 'Found Gaps',
      remap: 'Remapped Components',
      prompt: 'Generated Prompt',
    };
    clearProgress(summaryVerbs[result.type ?? '']);

    messages.push({ role: 'assistant', message: trimmed! });
    populateInsightsFromResult(result);
    applyResult(result);
  } catch (err) {
    clearProgress('Error');
    if (err instanceof GatewayRequestError && err.kind === 'auth') {
      addMessage('assistant', `API key error — check that your API key is valid and the proxy endpoint is configured. The Anthropic API is not available in all regions — if you are outside the US, you may need to use a proxy or VPN. (${(err as GatewayRequestError).status}: ${(err as Error).message})`);
    } else {
      addMessage('assistant', `Error: ${(err as Error).message}`);
    }
    console.error('[A2UI Builder]', err);
  }
}

// ── Pipeline send (multi-step LLM calls, real progress) ──

async function sendPipeline(value: string) {
  const progressEl = document.createElement('div');
  progressEl.className = 'builder-progress';
  chatFeed.appendChild(progressEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  const skip = shouldSkipEarlySteps(value, !!currentSchema);
  const visibleSteps = skip ? PIPELINE_STEPS.slice(2) : PIPELINE_STEPS;

  const stepLines = new Map<string, HTMLDivElement>();
  for (const step of visibleSteps) {
    const line = document.createElement('div');
    line.className = 'builder-progress-step';
    line.setAttribute('data-pending', '');
    line.textContent = step.label;
    progressEl.appendChild(line);
    stepLines.set(step.id, line);
  }

  let elapsed = 0;
  const tickTimer = setInterval(() => { elapsed++; }, 1000);

  separateInsights();

  const callbacks: PipelineCallbacks = {
    onStepStart(step: PipelineStep, _index: number) {
      const line = stepLines.get(step.id);
      if (!line) return;
      line.removeAttribute('data-pending');
      line.setAttribute('data-active', '');
      line.textContent = step.activeLabel;
      chatFeed.scrollTop = chatFeed.scrollHeight;

      // Create placeholder insight entry
      const entry = appendInsightEntry(stepLabels[step.id] ?? step.label, step.id);
      appendInsightPlaceholder(entry, step.activeLabel);
    },
    onStepComplete(step: PipelineStep, _index: number, output: string) {
      const line = stepLines.get(step.id);
      if (line) {
        line.removeAttribute('data-active');
        line.setAttribute('data-done', '');
        line.textContent = step.doneLabel;
      }

      const entry = insightEntries.get(step.id);
      if (!entry) return;

      if (step.id === 'interpret') fillInterpretation(entry, output);
      else if (step.id === 'concepts') {
        fillConcepts(entry, output);
        // Extract concept names and match against pattern catalog
        try {
          const data = JSON.parse(stripFences(output));
          const names = (data.concepts ?? []).map((c: { pattern: string }) => c.pattern);
          const matched = matchPatterns(names, { limit: 3 });
          if (matched.length) {
            const tplEntry = appendInsightEntry('Templates');
            fillTemplates(tplEntry, matched);
          }
        } catch { /* concepts parse failed — skip template matching */ }
      }
      else if (step.id === 'plan') fillPlan(entry, output);
      else if (step.id === 'construct') {
        fillConstruct(entry, output);
        schemaPre.value = output;
      }
      scrollReasoningToBottom();
    },
    onStreamChunk(_delta: string, fullMessage: string) {
      schemaPre.value = fullMessage;
    },
    onError(step: PipelineStep, _index: number, error: Error) {
      const line = stepLines.get(step.id);
      if (line) {
        line.removeAttribute('data-active');
        line.style.color = 'var(--n-ink-danger)';
        line.textContent = `${step.label} — Error`;
      }
      const entry = insightEntries.get(step.id);
      if (entry) {
        entry.querySelector('.insight-placeholder')?.remove();
        appendInsightText(entry, `Error: ${error.message}`, true);
      }
    },
  };

  try {
    const pipelineResult = await runPipeline(
      { query: value, currentSchema, componentRef, conversationHistory: messages },
      callbacks,
      buildStepAdapter,
      systemPrompt,
    );

    clearInterval(tickTimer);

    const trimmed = pipelineResult.raw?.trim();
    const result = parseJSON(trimmed);

    if (!result.type) result.type = result.gaps?.length ? 'gap' : result.prompt ? 'prompt' : result.schema ? 'schema' : 'question';
    if (result.schema && !result.schema.surfaceId) result.schema.surfaceId = 'preview';

    const summaryVerbs: Record<string, string> = {
      schema: currentSchema ? 'Updated UI' : 'Created UI',
      question: 'Responded',
      gap: 'Found Gaps',
      remap: 'Remapped Components',
      prompt: 'Generated Prompt',
    };
    const label = summaryVerbs[result.type ?? ''] ?? 'Done';
    progressEl.textContent = '';
    progressEl.className = 'builder-progress-summary';
    progressEl.textContent = `Thought for ${elapsed}s · ${label}`;

    // If result isn't a schema, fix the construct step label in progress + reasoning
    if (result.type !== 'schema') {
      const constructLine = stepLines.get('construct');
      if (constructLine) constructLine.textContent = summaryVerbs[result.type ?? ''] ?? 'Responded';
    }

    messages.push({ role: 'assistant', message: trimmed! });
    applyResult(result);
  } catch (err) {
    clearInterval(tickTimer);
    progressEl.textContent = '';
    progressEl.className = 'builder-progress-summary';
    progressEl.textContent = `Thought for ${elapsed}s · Error`;

    if (err instanceof GatewayRequestError && err.kind === 'auth') {
      addMessage('assistant', `API key error — check that your API key is valid and the proxy endpoint is configured. The Anthropic API is not available in all regions — if you are outside the US, you may need to use a proxy or VPN. (${(err as GatewayRequestError).status}: ${(err as Error).message})`);
    } else {
      addMessage('assistant', `Error: ${(err as Error).message}`);
    }
    console.error('[A2UI Builder]', err);
  }
}

// ── Send handler ──

async function sendMessage(value: string) {
  clearSeeds();
  addMessage('user', value);
  dismissWelcome();

  const userMessage = currentSchema
    ? `[CURRENT SCHEMA]\n${JSON.stringify(currentSchema, null, 2)}\n[/CURRENT SCHEMA]\n\n${value}`
    : value;
  messages.push({ role: 'user', message: userMessage });

  if (!llm) {
    setTimeout(() => {
      const result = mockResponse(value);
      populateInsightsFromResult(result);
      applyResult(result);
    }, 300);
    return;
  }

  chatComposer.busy = true;
  lastMessageGroup = null;
  lastMessageRole = null;

  try {
    if (pipelineMode) {
      await sendPipeline(value);
    } else {
      await sendSingleShot(value);
    }
  } finally {
    chatComposer.busy = false;
  }
}

// Composer submit
chatComposer.addEventListener('native:send', (e: Event) => {
  const value = (e as CustomEvent).detail?.value;
  if (value) sendMessage(value);
});

// Seed chip selection → auto-submit
chatFeed.addEventListener('native:seed-select', (e: Event) => {
  const value = (e as CustomEvent).detail?.value;
  if (value) sendMessage(value);
});

// Message actions (copy, retry)
chatFeed.addEventListener('native:message-action', (e: Event) => {
  const { action, messageId } = (e as CustomEvent).detail ?? {};
  const text = messageTextMap.get(messageId);

  if (action === 'copy' && text) {
    navigator.clipboard.writeText(text);
  }

  if (action === 'retry' && messageId) {
    // Find the user message that preceded this assistant message
    // Walk back through messages array to find the last user message
    let lastUserMsg: string | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsg = messages[i].message;
        break;
      }
    }
    if (lastUserMsg) {
      // Strip [CURRENT SCHEMA] wrapper if present
      const clean = lastUserMsg.replace(/\[CURRENT SCHEMA\][\s\S]*?\[\/CURRENT SCHEMA\]\s*/g, '').trim();
      if (clean) sendMessage(clean);
    }
  }
});

// ── Welcome screen (centered, fades on first interaction) ──

const welcomeEl = document.createElement('div');
welcomeEl.className = 'builder-welcome';
welcomeEl.innerHTML = `
  <h1 class="builder-welcome-heading">Got UI?</h1>
  <div class="builder-welcome-chips"></div>
`;

const welcomeChips = welcomeEl.querySelector('.builder-welcome-chips')!;

const SEED_POOL: SeedOption[] = [
  { value: 'A tic-tac-toe game with a 3x3 grid', label: 'Tic Tac Toe Game' },
  { value: 'An ontology object card with properties, relations, and metadata', label: 'Ontology Object Card' },
  { value: 'A battleship game with a 10x10 grid and ship placement', label: 'Battle Ship Game' },
  { value: 'A user details card with avatar, bio, stats, and action buttons', label: 'User Details Card' },
  { value: 'An OTP verification form with 6 digit inputs and a resend button', label: 'Auth OTP' },
  { value: 'A product showcase with 4 Unsplash images in a slideshow, size/add-on selectors, and add-to-cart button', label: 'Product Showcase' },
  { value: 'A login form with email and password', label: 'Login Form' },
  { value: 'A settings page with toggles and dropdowns', label: 'Settings Page' },
  { value: 'A dashboard with stat cards and badges', label: 'Dashboard' },
  { value: 'A contact form with name, email, and message', label: 'Contact Form' },
  { value: 'A kanban board with three columns: To Do, In Progress, Done', label: 'Kanban Board' },
  { value: 'A music player with album art, progress bar, and playback controls', label: 'Music Player' },
  { value: 'A weather widget with temperature, conditions, and 5-day forecast', label: 'Weather Widget' },
  { value: 'A chat message thread with avatars, timestamps, and reactions', label: 'Chat Thread' },
  { value: 'A pricing table with three tiers and feature comparison', label: 'Pricing Table' },
  { value: 'A file upload dropzone with progress indicators', label: 'File Upload' },
  { value: 'A calendar month view with event indicators', label: 'Calendar View' },
  { value: 'A notification center with read/unread states and dismiss', label: 'Notification Center' },
];

function pickRandomSeeds(count: number): SeedOption[] {
  const pool = [...SEED_POOL];
  const picks: SeedOption[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

const starters = pickRandomSeeds(4);
for (const s of starters) {
  const btn = document.createElement('n-button');
  btn.setAttribute('variant', 'outlined');
  btn.setAttribute('radius', 'pill');
  btn.setAttribute('size', 'sm');

  btn.textContent = s.label;
  btn.addEventListener('click', () => {
    dismissWelcome();
    sendMessage(s.value);
  });
  welcomeChips.appendChild(btn);
}

chatFeed.appendChild(welcomeEl);

function dismissWelcome() {
  if (!welcomeEl.parentNode) return;
  welcomeEl.classList.add('builder-welcome-out');
  welcomeEl.addEventListener('transitionend', () => welcomeEl.remove(), { once: true });
  // Fallback removal if transition doesn't fire
  setTimeout(() => welcomeEl.remove(), 400);
}

// Dismiss on first user input (textarea focus or keydown)
const textarea = document.querySelector<HTMLElement>('[data-panel-id="agent-chat"] n-textarea');
if (textarea) {
  const onFirstInput = () => {
    dismissWelcome();
    textarea.removeEventListener('focus', onFirstInput);
    textarea.removeEventListener('keydown', onFirstInput);
  };
  textarea.addEventListener('focus', onFirstInput, { once: true });
  textarea.addEventListener('keydown', onFirstInput, { once: true });
}
