import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/register-all.ts';
import '../../chat/register.ts';
import { Kernel, resetKernel } from '../../../../../src/kernel/kernel.ts';
import { createA2UIAdapter } from '../protocol/a2ui-adapter.ts';
import { ClaudeGatewayAdapter } from '../../chat/gateway/adapter-claude.ts';

// ── Component map reference ──

const COMPONENT_MAP = [
  { type: 'Row',           tag: 'n-stack',          cat: 'layout',     props: 'gap, align' },
  { type: 'Column',        tag: 'n-stack',          cat: 'layout',     props: 'gap, align' },
  { type: 'Card',          tag: 'n-container',      cat: 'container',  props: 'children: Header, Body, Footer' },
  { type: 'Header',        tag: 'n-header',         cat: 'container',  props: 'text content' },
  { type: 'Body',          tag: 'n-body',           cat: 'container',  props: 'text content' },
  { type: 'Footer',        tag: 'n-footer',         cat: 'container',  props: 'text content' },
  { type: 'Modal',         tag: 'n-dialog',         cat: 'container',  props: 'title' },
  { type: 'Accordion',     tag: 'n-accordion',      cat: 'container',  props: 'children: AccordionItem[]' },
  { type: 'AccordionItem', tag: 'n-accordion-item', cat: 'container',  props: 'label' },
  { type: 'Text',          tag: 'span',             cat: 'display',    props: 'text, variant: h1|h2|h3|caption|body' },
  { type: 'Icon',          tag: 'n-icon',           cat: 'display',    props: 'name (phosphor icon)' },
  { type: 'Image',         tag: 'n-picture',        cat: 'display',    props: 'url, alt' },
  { type: 'Badge',         tag: 'n-badge',          cat: 'display',    props: 'text' },
  { type: 'Avatar',        tag: 'n-avatar',         cat: 'display',    props: 'src, alt' },
  { type: 'Divider',       tag: 'n-divider',        cat: 'display',    props: '' },
  { type: 'Progress',      tag: 'n-progress',       cat: 'display',    props: 'value, max' },
  { type: 'TextField',     tag: 'n-input',          cat: 'input',      props: 'label, placeholder, variant: obscured|number' },
  { type: 'TextArea',      tag: 'n-textarea',       cat: 'input',      props: 'label, placeholder' },
  { type: 'CheckBox',      tag: 'n-checkbox',       cat: 'input',      props: 'label' },
  { type: 'Switch',        tag: 'n-switch',         cat: 'input',      props: 'label' },
  { type: 'Select',        tag: 'n-select',         cat: 'input',      props: 'label, children: ListItem[]' },
  { type: 'Slider',        tag: 'n-range',          cat: 'input',      props: 'min, max, value, label' },
  { type: 'DateTimeInput', tag: 'n-input',          cat: 'input',      props: 'label, enableDate, enableTime' },
  { type: 'Tabs',          tag: 'n-tabs',           cat: 'nav',        props: 'children with label + value' },
  { type: 'List',          tag: 'n-listbox',        cat: 'nav',        props: 'children: ListItem[]' },
  { type: 'ListItem',      tag: 'n-option',         cat: 'nav',        props: 'label, value' },
  { type: 'Breadcrumb',    tag: 'n-breadcrumb',     cat: 'nav',        props: '' },
  { type: 'Button',        tag: 'n-button',         cat: 'action',     props: 'text, variant: primary|secondary|ghost|outline' },
  { type: 'Table',         tag: 'n-table',          cat: 'data',       props: 'columns, rows' },
  { type: 'Video',         tag: 'n-video',          cat: 'media',      props: 'src' },
  { type: 'AudioPlayer',   tag: 'n-audio',          cat: 'media',      props: 'src' },
  { type: 'Toast',         tag: 'n-toast',          cat: 'feedback',   props: 'text' },
];

// ── System prompt ──

const componentRef = COMPONENT_MAP.map(c =>
  `  - ${c.type} → <${c.tag}> [${c.cat}]${c.props ? ': ' + c.props : ''}`
).join('\n');

const DEFAULT_SYSTEM_PROMPT = `You are an A2UI schema generator and design collaborator. You help users build UIs through conversation — creating, refining, and remapping component schemas iteratively.

A2UI component reference (type → native tag [category]: properties):
${componentRef}

You MUST respond with ONLY a JSON object (no markdown fences). Choose one of these response types:

## 1. Generate or update a schema
When the user describes a new UI or asks to modify the current one:
{
  "type": "schema",
  "reply": "Brief description of what you built or changed",
  "concepts": ["ComponentType (detail)", ...],
  "schema": {
    "surfaceId": "preview",
    "components": [
      { "id": "root", "component": "Column", "children": ["child1", "child2"] },
      { "id": "child1", "component": "Text", "text": "Hello", "variant": "h3" }
    ]
  }
}

## 2. Ask a clarifying question
When the request is ambiguous or you need more detail:
{
  "type": "question",
  "reply": "Your clarifying question here",
  "concepts": ["ComponentType (likely candidates)", ...]
}

## 3. Remap a component type to a different native element
When the user wants to swap what native element an A2UI type renders as:
{
  "type": "remap",
  "reply": "Description of what was remapped",
  "remaps": [
    { "from": "Select", "to": "List", "reason": "Use a visible list instead of a dropdown" }
  ],
  "schema": { ... }
}
Include the updated schema with the remapped component types applied.

## Iterative refinement
After generating a schema, the user may ask to modify it. Common patterns:
- "Add a footer with a cancel button" → produce an updated schema with the addition
- "Change the password field to a textarea" → swap the component type in the schema
- "Make it horizontal instead of vertical" → change Column to Row
- "Remove the header" → produce schema without that component
- "Use switches instead of checkboxes" → remap CheckBox → Switch in the schema

When modifying, always return the COMPLETE updated schema (not a diff).
The current schema (if any) will be provided in the conversation as [CURRENT SCHEMA].

## When to ask follow-up questions
- The description is too vague (e.g. "make something cool", "a page")
- Multiple valid UI patterns could fit (e.g. "a list" — flat list, card list, table?)
- Key details are missing (e.g. "a form" — what fields? what action?)
- The user asks to remap but it's unclear which instances to change

## Schema rules
- The first component MUST have id "root" — it is the top-level container
- Every component needs a unique string id
- Parent components list child ids in their "children" array
- Use Card for bounded sections, Column/Row for layout
- Keep schemas practical — 5-20 components is ideal
- concepts should list the key A2UI types used with brief context`;

// ── Panel config ──

const PANELS = [
  { id: 'preview',  label: 'Preview',  icon: 'eye' },
  { id: 'concepts', label: 'Concepts', icon: 'tag' },
  { id: 'schema',   label: 'Schema',   icon: 'brackets-curly' },
  { id: 'map',      label: 'Map',      icon: 'squares-four' },
  { id: 'prompt',   label: 'Prompt',   icon: 'file-code' },
];

const activePanels = new Set(['preview', 'concepts']);

// ── LLM adapter ──

const apiKey = (import.meta as Record<string, Record<string, string>>).env?.VITE_ANTHROPIC_API_KEY
  || (import.meta as Record<string, Record<string, string>>).env?.VITE_CLAUDE_API_KEY
  || null;

let systemPrompt = DEFAULT_SYSTEM_PROMPT;

let llm: ClaudeGatewayAdapter | null = null;
if (apiKey) {
  llm = new ClaudeGatewayAdapter({
    clientId: 'a2ui-builder',
    baseUrl: '/api/anthropic',
    model: 'claude-haiku-4-5',
    maxTokens: 2048,
    system: systemPrompt,
    apiKey,
    anthropicVersion: '2023-06-01',
  });
} else {
  console.warn('[A2UI Builder] No API key found. Set VITE_ANTHROPIC_API_KEY in .env. Using mock responses.');
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

// Pane content containers
const previewMount = document.getElementById('preview-mount')!;
const conceptsWrap = document.getElementById('concepts-wrap')!;
const schemaPre = document.getElementById('schema-pre')!;
const mapTable = document.getElementById('map-table')!;
const promptEditor = document.getElementById('prompt-editor') as HTMLTextAreaElement;

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

function syncPanels() {
  // Clear explicit widths so flex redistributes
  for (const [_, el] of paneEls) {
    el.style.removeProperty('width');
    el.style.removeProperty('flex-grow');
  }
  for (const [id, el] of paneEls) el.hidden = !activePanels.has(id);
  for (const [id, chip] of chipEls) chip.toggleAttribute('data-active', activePanels.has(id));
}

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
  // Rebuild LLM adapter with updated prompt
  if (llm) {
    llm = new ClaudeGatewayAdapter({
      clientId: 'a2ui-builder',
      baseUrl: '/api/anthropic',
      model: 'claude-haiku-4-5',
      maxTokens: 2048,
      system: systemPrompt,
      apiKey: apiKey!,
      anthropicVersion: '2023-06-01',
    });
  }
});

// Component map table
const tbody = mapTable.querySelector('tbody')!;
for (const c of COMPONENT_MAP) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="map-type">${c.type}</td><td><code>&lt;${c.tag}&gt;</code></td><td class="map-category">${c.cat}</td>`;
  tbody.appendChild(tr);
}

// ── Render helpers ──

function addMessage(role: string, text: string, type?: string) {
  const msgId = `msg-${++msgCounter}`;

  // Create message group: n-chat-messages > n-chat-avatar + n-chat-message > n-chat-message-text
  const group = document.createElement('n-chat-messages');
  group.setAttribute('role', role);
  group.setAttribute('sender', role === 'user' ? 'You' : 'Builder');

  const avatar = document.createElement('n-chat-avatar');
  if (role === 'assistant') {
    avatar.setAttribute('icon', 'chat-dots');
  } else {
    avatar.setAttribute('name', 'You');
  }
  group.appendChild(avatar);

  const message = document.createElement('n-chat-message');
  message.setAttribute('role', role);
  message.setAttribute('message-id', msgId);
  if (type) message.setAttribute('data-type', type);

  const messageText = document.createElement('n-chat-message-text') as HTMLElement & { content: string };
  messageText.setAttribute('format', 'plain');
  messageText.content = text;

  message.appendChild(messageText);
  group.appendChild(message);
  chatFeed.appendChild(group);

  // Scroll to bottom
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function addSeedChips(options: SeedOption[]) {
  const group = document.createElement('n-chat-messages');
  group.setAttribute('role', 'assistant');
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
  currentAdapter = createA2UIAdapter(kernel, {
    onClientMessage: (msg: unknown) => console.log('[A2UI Builder →]', msg),
  });
  currentAdapter.receive({ updateComponents: schema }, previewMount);
}

function applyResult(result: MockResult) {
  const isQuestion = result.type === 'question';
  const isRemap = result.type === 'remap';
  addMessage('assistant', result.reply, isQuestion ? 'question' : isRemap ? 'remap' : undefined);
  renderConcepts(result.concepts);

  // Handle remaps
  if (isRemap && result.remaps?.length) {
    for (const r of result.remaps) {
      const entry = COMPONENT_MAP.find(c => c.type === r.from);
      if (entry) {
        const target = COMPONENT_MAP.find(c => c.type === r.to);
        if (target) {
          addMessage('assistant', `Remapped ${r.from} → ${r.to}${r.reason ? ': ' + r.reason : ''}`, 'remap');
        }
      }
    }
  }

  if (result.schema) {
    currentSchema = result.schema;
    renderSchema(result.schema);
    renderPreview(result.schema);
  }

  // Show suggestion chips after questions
  if (result.suggestions?.length) {
    addSeedChips(result.suggestions);
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

  // Show typing indicator using chat activity component
  const typingGroup = document.createElement('n-chat-messages');
  typingGroup.setAttribute('role', 'assistant');
  typingGroup.setAttribute('sender', 'Builder');
  const typingAvatar = document.createElement('n-chat-avatar');
  typingAvatar.setAttribute('icon', 'chat-dots');
  typingGroup.appendChild(typingAvatar);
  const typingMsg = document.createElement('n-chat-message');
  typingMsg.setAttribute('role', 'assistant');
  const typingActivity = document.createElement('n-chat-message-activity');
  typingActivity.setAttribute('type', 'typing');
  typingActivity.setAttribute('active', '');
  typingMsg.appendChild(typingActivity);
  typingGroup.appendChild(typingMsg);
  chatFeed.appendChild(typingGroup);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  try {
    const response = await llm.sendMessage({
      id: crypto.randomUUID(),
      messages,
      query: value,
    });

    typingGroup.remove();

    const raw = (response as Record<string, unknown>).message as string | undefined;
    const trimmed = raw?.trim();
    let result: MockResult;
    try {
      result = JSON.parse(trimmed!);
    } catch {
      const fenced = trimmed?.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced) {
        result = JSON.parse(fenced[1].trim());
      } else {
        throw new Error('Could not parse JSON from response');
      }
    }

    if (!result.type) result.type = result.schema ? 'schema' : 'question';
    if (result.schema && !result.schema.surfaceId) {
      result.schema.surfaceId = 'preview';
    }

    messages.push({ role: 'assistant', message: trimmed! });
    applyResult(result);

  } catch (err) {
    typingGroup.remove();
    addMessage('assistant', `Error: ${(err as Error).message}`);
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

// ── Initial state ──

const mode = llm ? 'Connected to Claude Haiku.' : 'No API key — using mock responses.';
addMessage('assistant', `${mode} Describe a UI you'd like to build, or pick a starter below.`);
addSeedChips([
  { value: 'A login form with email and password', label: 'Login form' },
  { value: 'A settings page with toggles and dropdowns', label: 'Settings page' },
  { value: 'A dashboard with stat cards and badges', label: 'Dashboard' },
  { value: 'A contact form', label: 'Contact form' },
]);
