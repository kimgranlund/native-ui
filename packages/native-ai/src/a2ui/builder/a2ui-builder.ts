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
import { ConfettiController } from '../../../../../src/traits/confetti/confetti-controller.ts';
import { Kernel, resetKernel } from '../../../../../src/kernel/kernel.ts';
import { createA2UIAdapter } from '../protocol/a2ui-adapter.ts';
import { COMPONENT_MAP as REGISTRY, getComponentCategory } from '../protocol/a2ui-component-map.ts';
import type { EventSpec, PropertySpec, MethodSpec } from '../protocol/a2ui-component-map.ts';
import { ClaudeGatewayAdapter } from '../../chat/gateway/adapter-claude.ts';
import { OpenAiGatewayAdapter } from '../../chat/gateway/adapter-chatgpt.ts';
import type { GatewayAdapter } from '../../chat/gateway/adapter.ts';
import { GatewayRequestError } from '../../chat/gateway/runtime.ts';
import promptJson from './system-prompt.json';

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
  { id: 'concepts', label: 'Concepts', icon: 'tag' },
  { id: 'schema',   label: 'Schema',   icon: 'brackets-curly' },
  { id: 'html',     label: 'HTML',     icon: 'brackets-angle' },
  { id: 'css',      label: 'CSS',      icon: 'paint-brush' },
  { id: 'js',       label: 'JS',       icon: 'lightning' },
  { id: 'map',      label: 'Map',      icon: 'squares-four' },
  { id: 'prompt',   label: 'Prompt',   icon: 'file-code' },
];

const activePanels = new Set(['preview', 'concepts']);

// ── LLM adapter ──

const anthropicKey = (import.meta as Record<string, Record<string, string>>).env?.VITE_ANTHROPIC_API_KEY
  || (import.meta as Record<string, Record<string, string>>).env?.VITE_CLAUDE_API_KEY
  || null;

const openaiKey = (import.meta as Record<string, Record<string, string>>).env?.VITE_OPENAI_API_KEY
  || null;

let systemPrompt = DEFAULT_SYSTEM_PROMPT;

function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-') || ['opus-4.6', 'sonnet-4.6', 'haiku-4.5'].includes(model);
}

function buildAdapter(model: string): GatewayAdapter | null {
  if (model === 'human') return null;

  if (isClaudeModel(model)) {
    if (!anthropicKey) return null;
    return new ClaudeGatewayAdapter({
      clientId: 'a2ui-builder',
      baseUrl: '/api/anthropic',
      model,
      maxTokens: 4096,
      system: systemPrompt,
      apiKey: anthropicKey,
      anthropicVersion: '2023-06-01',
    });
  }

  // OpenAI models (gpt-*)
  if (!openaiKey) return null;
  return new OpenAiGatewayAdapter({
    clientId: 'a2ui-builder',
    baseUrl: '/api/openai',
    model,
    maxTokens: 4096,
    system: systemPrompt,
    apiKey: openaiKey,
  });
}

let currentModel = 'claude-haiku-4-5';
let llm: GatewayAdapter | null = buildAdapter(currentModel);

if (!llm && currentModel !== 'human') {
  console.warn('[A2UI Builder] No API key found. Set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in .env. Using mock responses.');
}

interface Message {
  role: string;
  message: string;
}

const messages: Message[] = [];

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
    fallback.suggestions = [
      { value: 'A login form with email and password', label: 'Login form' },
      { value: 'A settings page with toggles and dropdowns', label: 'Settings page' },
      { value: 'A dashboard with stat cards and badges', label: 'Dashboard' },
      { value: 'A contact form', label: 'Contact form' },
    ];
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
const schemaPre = document.getElementById('schema-pre')!;
const htmlPre = document.getElementById('html-pre')!;
const cssEditor = document.getElementById('css-editor') as HTMLTextAreaElement;
const jsEditor = document.getElementById('js-editor') as HTMLTextAreaElement;
const mapTable = document.getElementById('map-table')!;
const promptEditor = document.getElementById('prompt-editor') as HTMLTextAreaElement;
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
    const wrapper = `(function(preview){
  var $ = function(sel){ return preview.querySelector(sel); };
  var $$ = function(sel){ return preview.querySelectorAll(sel); };
${js}
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

cssEditor.addEventListener('input', debouncedCSSApply);
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
  const paneEl = document.querySelector(`.builder-pane[data-panel="${panel.id}"]`) as HTMLElement | null;
  if (paneEl) {
    paneEls.set(panel.id, paneEl);
    paneEl.hidden = !activePanels.has(panel.id);
  }

  const chipEl = document.querySelector(`n-button[data-chip="${panel.id}"]`) as HTMLElement | null;
  if (chipEl) {
    chipEls.set(panel.id, chipEl);
    chipEl.toggleAttribute('data-active', activePanels.has(panel.id));

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
for (const btn of document.querySelectorAll('[data-close-panel]')) {
  btn.addEventListener('native:press', () => {
    const id = (btn as HTMLElement).getAttribute('data-close-panel');
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
  // Clear explicit widths so flex redistributes
  for (const [_, el] of paneEls) {
    el.style.removeProperty('width');
    el.style.removeProperty('flex-grow');
  }
  for (const [id, el] of paneEls) el.hidden = !activePanels.has(id);
  for (const [id, chip] of chipEls) chip.toggleAttribute('data-active', activePanels.has(id));
}

// ── Lightbox toggle (light/dark preview) ──

const lightboxBtn = document.getElementById('lightbox-toggle');
const previewContent = document.querySelector('.builder-pane[data-panel="preview"] .builder-pane-content') as HTMLElement | null;
let darkPreview = false;

lightboxBtn?.addEventListener('native:press', () => {
  darkPreview = !darkPreview;
  if (previewContent) {
    previewContent.style.colorScheme = darkPreview ? 'dark' : 'light';
  }
  const icon = lightboxBtn.querySelector('n-icon');
  if (icon) icon.setAttribute('name', darkPreview ? 'sun' : 'moon');
  lightboxBtn.toggleAttribute('data-active', darkPreview);
});

// ── Coordinated resize ──

const splitEl = document.querySelector('.builder-split') as HTMLElement;
const chatEl = document.querySelector('.builder-chat') as HTMLElement;
const PANEL_ORDER = PANELS.map(p => p.id);

interface ResizeDrag {
  type: 'chat' | 'pane';
  startX: number;
  chatStartW?: number;
  sourceId?: string;
  sourceStartW?: number;
  targetId: string;
  targetStartW: number;
}

let resizeDrag: ResizeDrag | null = null;

function getVisiblePanes() {
  return PANEL_ORDER.filter(id => activePanels.has(id));
}

splitEl.addEventListener('pointerdown', (e: PointerEvent) => {
  if (e.button !== 0) return;
  const handle = (e.target as HTMLElement).closest?.('.resize-handle');
  if (!handle) return;

  const parent = handle.parentElement!;
  e.preventDefault();

  const CHAT_MIN = 280;
  const PANE_MIN = 150;

  if (parent === chatEl) {
    const visible = getVisiblePanes();
    if (!visible.length) return;

    const firstPaneEl = paneEls.get(visible[0]);
    if (!firstPaneEl) return;

    resizeDrag = {
      type: 'chat',
      startX: e.clientX,
      chatStartW: chatEl.offsetWidth,
      targetId: visible[0],
      targetStartW: firstPaneEl.offsetWidth,
    };
  } else if (parent.classList.contains('builder-pane')) {
    const panelId = (parent as HTMLElement).dataset.panel!;
    const visible = getVisiblePanes();
    const idx = visible.indexOf(panelId);
    if (idx === -1 || idx >= visible.length - 1) return;

    const nextId = visible[idx + 1];
    const nextEl = paneEls.get(nextId);
    if (!nextEl) return;

    resizeDrag = {
      type: 'pane',
      startX: e.clientX,
      sourceId: panelId,
      sourceStartW: parent.offsetWidth,
      targetId: nextId,
      targetStartW: nextEl.offsetWidth,
    };
  } else {
    return;
  }

  // Freeze all widths
  chatEl.style.width = `${chatEl.offsetWidth}px`;
  for (const id of getVisiblePanes()) {
    const el = paneEls.get(id);
    if (el) {
      el.style.width = `${el.offsetWidth}px`;
      el.style.removeProperty('flex-grow');
    }
  }

  parent.setAttribute('data-resizing', '');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  document.addEventListener('pointermove', onResizeMove);
  document.addEventListener('pointerup', onResizeUp);
});

function onResizeMove(e: PointerEvent) {
  if (!resizeDrag) return;
  const CHAT_MIN = 280;
  const PANE_MIN = 150;
  const dx = e.clientX - resizeDrag.startX;

  if (resizeDrag.type === 'chat') {
    const newChatW = Math.max(CHAT_MIN, resizeDrag.chatStartW! + dx);
    const newPaneW = Math.max(PANE_MIN, resizeDrag.targetStartW - (newChatW - resizeDrag.chatStartW!));
    chatEl.style.width = `${newChatW}px`;
    const paneEl = paneEls.get(resizeDrag.targetId);
    if (paneEl) paneEl.style.width = `${newPaneW}px`;
  } else {
    const sourceEl = paneEls.get(resizeDrag.sourceId!);
    const targetEl = paneEls.get(resizeDrag.targetId);
    if (!sourceEl || !targetEl) return;
    const newSourceW = Math.max(PANE_MIN, resizeDrag.sourceStartW! + dx);
    const newTargetW = Math.max(PANE_MIN, resizeDrag.targetStartW - (newSourceW - resizeDrag.sourceStartW!));
    sourceEl.style.width = `${newSourceW}px`;
    targetEl.style.width = `${newTargetW}px`;
  }
}

function onResizeUp() {
  if (!resizeDrag) return;

  // Convert pixel widths → flex-grow ratios
  const visible = getVisiblePanes();
  const widths = visible.map(id => paneEls.get(id)?.offsetWidth ?? 0);
  const total = widths.reduce((s, w) => s + w, 0);
  if (total > 0) {
    for (let i = 0; i < visible.length; i++) {
      const el = paneEls.get(visible[i]);
      if (el) {
        el.style.flexGrow = String((widths[i] / total) * visible.length);
        el.style.removeProperty('width');
      }
    }
  }

  // Convert chat to percentage
  if (splitEl.offsetWidth > 0) {
    const ratio = chatEl.offsetWidth / splitEl.offsetWidth;
    chatEl.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  // Clean up
  document.querySelectorAll('[data-resizing]').forEach(el => el.removeAttribute('data-resizing'));
  document.body.style.removeProperty('cursor');
  document.body.style.removeProperty('user-select');
  document.removeEventListener('pointermove', onResizeMove);
  document.removeEventListener('pointerup', onResizeUp);
  resizeDrag = null;
}

// ── Populate static panels ──

// Prompt editor — editable textarea
promptEditor.value = DEFAULT_SYSTEM_PROMPT;
promptEditor.addEventListener('input', () => {
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

/**
 * Extract a JSON object from an LLM response that may contain surrounding
 * text, markdown fences, or other non-JSON content.
 */
function parseJSON(raw: string | undefined): MockResult {
  const text = raw?.trim();
  if (!text) throw new Error('Empty response from LLM');

  // 1. Direct parse — response is pure JSON
  try { return JSON.parse(text); } catch { /* fall through */ }

  // 2. Markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ }
  }

  // 3. Extract first { ... } span (greedy — outermost braces)
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.slice(braceStart, braceEnd + 1)); } catch { /* fall through */ }
  }

  // 4. Nothing worked — show truncated response for debugging
  const preview = text.length > 200 ? text.slice(0, 200) + '…' : text;
  throw new Error(`Could not parse JSON from response:\n${preview}`);
}

function addMessage(role: string, text: string, type?: string) {
  const msgId = `msg-${++msgCounter}`;

  // Reuse the last group if same role and it's not separated by seeds
  let group = lastMessageGroup;
  if (!group || lastMessageRole !== role) {
    group = document.createElement('n-chat-messages');
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

  const message = document.createElement('n-chat-message');
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

  const group = document.createElement('n-chat-messages');
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

function renderConcepts(concepts?: string[]) {
  conceptsWrap.innerHTML = '';
  if (!concepts?.length) return;
  for (const c of concepts) {
    const badge = document.createElement('n-badge');
    badge.textContent = c;
    conceptsWrap.appendChild(badge);
  }
}

function renderSchema(schema: MockResult['schema']) {
  schemaPre.textContent = JSON.stringify(schema, null, 2);
}

function renderPreview(schema: MockResult['schema']) {
  if (currentAdapter) {
    currentAdapter.destroy();
    currentAdapter = null;
  }
  previewMount.innerHTML = '';
  previewStyle = null; // Reset — will be recreated if CSS is applied
  currentAdapter = createA2UIAdapter(kernel, {
    onClientMessage: (msg: unknown) => console.log('[A2UI Builder →]', msg),
  });
  currentAdapter.receive({ updateComponents: schema }, previewMount);

  // Extract rendered HTML after adapter finishes rendering
  queueMicrotask(() => {
    htmlPre.textContent = previewMount.innerHTML;
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
  renderConcepts(result.concepts);

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

  // Apply CSS/JS from LLM response and auto-open panes
  if (result.css !== undefined) {
    cssEditor.value = result.css;
    applyCSSToPreview(result.css);
    if (!activePanels.has('css')) { activePanels.add('css'); syncPanels(); }
  }
  if (result.js !== undefined) {
    jsEditor.value = result.js;
    if (!activePanels.has('js')) { activePanels.add('js'); syncPanels(); }
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

// ── Send handler ──

async function sendMessage(value: string) {
  // Clear any existing seed chips
  clearSeeds();

  addMessage('user', value);

  // Inject current schema context so the LLM can refine it
  const userMessage = currentSchema
    ? `[CURRENT SCHEMA]\n${JSON.stringify(currentSchema, null, 2)}\n[/CURRENT SCHEMA]\n\n${value}`
    : value;
  messages.push({ role: 'user', message: userMessage });

  if (!llm) {
    setTimeout(() => applyResult(mockResponse(value)), 300);
    return;
  }

  chatComposer.busy = true;

  // Typing indicator breaks grouping
  lastMessageGroup = null;
  lastMessageRole = null;

  // Show multi-step progress indicator
  const progressEl = document.createElement('div');
  progressEl.className = 'builder-progress';
  chatFeed.appendChild(progressEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  const steps = ['Thinking', 'Concept Mapping', 'Creating UI'];
  let stepIndex = 0;
  let elapsed = 0;

  // Create a line element for each step
  const lines: HTMLDivElement[] = [];
  function addStep(index: number) {
    const line = document.createElement('div');
    line.className = 'builder-progress-step';
    line.textContent = steps[index];
    progressEl.appendChild(line);
    lines.push(line);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function updateThinkingTime() {
    if (lines[0]) lines[0].textContent = `${steps[0]} ${elapsed}s`;
  }

  addStep(0);
  updateThinkingTime();

  const tickTimer = setInterval(() => {
    elapsed++;
    updateThinkingTime();
  }, 1000);

  // Advance to next step after delays — previous steps stay visible
  const stepTimers = [
    setTimeout(() => { stepIndex = 1; addStep(1); }, 2000),
    setTimeout(() => { stepIndex = 2; addStep(2); }, 4000),
  ];

  function clearProgress() {
    clearInterval(tickTimer);
    for (const t of stepTimers) clearTimeout(t);
    progressEl.remove();
  }

  try {
    const response = await llm.sendMessage({
      id: crypto.randomUUID(),
      messages,
      query: value,
    });

    clearProgress();

    const raw = (response as Record<string, unknown>).message as string | undefined;
    const trimmed = raw?.trim();
    const result = parseJSON(trimmed);

    if (!result.type) result.type = result.gaps?.length ? 'gap' : result.prompt ? 'prompt' : result.schema ? 'schema' : 'question';
    if (result.schema && !result.schema.surfaceId) {
      result.schema.surfaceId = 'preview';
    }

    messages.push({ role: 'assistant', message: trimmed! });
    applyResult(result);

  } catch (err) {
    clearProgress();
    if (err instanceof GatewayRequestError && err.kind === 'auth') {
      addMessage('assistant', `API key error — check that your API key is valid and the proxy endpoint is configured. The Anthropic API is not available in all regions — if you are outside the US, you may need to use a proxy or VPN. (${err.status}: ${err.message})`);
    } else {
      addMessage('assistant', `Error: ${(err as Error).message}`);
    }
    console.error('[A2UI Builder]', err);
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
const starters = [
  { value: 'A login form with email and password', label: 'Login form' },
  { value: 'A settings page with toggles and dropdowns', label: 'Settings page' },
  { value: 'A dashboard with stat cards and badges', label: 'Dashboard' },
  { value: 'A contact form', label: 'Contact form' },
];
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
const textarea = document.querySelector<HTMLElement>('.builder-chat n-textarea');
if (textarea) {
  const onFirstInput = () => {
    dismissWelcome();
    textarea.removeEventListener('focus', onFirstInput);
    textarea.removeEventListener('keydown', onFirstInput);
  };
  textarea.addEventListener('focus', onFirstInput, { once: true });
  textarea.addEventListener('keydown', onFirstInput, { once: true });
}
