// ── A2UI Training Library — Demo Page ──

// Navigation + components
import '../../../../src/nav/native-dashboard.ts';
import '../../../../src/register-all.ts';

// Icons
import '../../../../src/icons/phosphor/x.ts';
import '../../../../src/icons/phosphor/copy.ts';
import '../../../../src/icons/phosphor/pencil-simple.ts';
import '../../../../src/icons/phosphor/caret-up-down.ts';
import '../../../../src/icons/phosphor/funnel.ts';
import '../../../../src/icons/phosphor/download-simple.ts';
import '../../../../src/icons/phosphor/play.ts';
import '../../../../src/icons/phosphor/check-circle.ts';
import '../../../../src/icons/phosphor/warning-circle.ts';
import '../../../../src/icons/phosphor/info.ts';
import '../../../../src/icons/phosphor/magnifying-glass.ts';
import '../../../../src/icons/phosphor/star-fill.ts';
import '../../../../src/icons/phosphor/star.ts';
import '../../../../src/icons/phosphor/heart.ts';
import '../../../../src/icons/phosphor/envelope.ts';
import '../../../../src/icons/phosphor/map-pin.ts';
import '../../../../src/icons/phosphor/user-plus.ts';
import '../../../../src/icons/phosphor/clock.ts';
import '../../../../src/icons/phosphor/eye.ts';
import '../../../../src/icons/phosphor/thumbs-up.ts';
import '../../../../src/icons/phosphor/share.ts';
import '../../../../src/icons/phosphor/trash.ts';
import '../../../../src/icons/phosphor/package.ts';
import '../../../../src/icons/phosphor/trend-up.ts';
import '../../../../src/icons/phosphor/trend-down.ts';
import '../../../../src/icons/phosphor/caret-right.ts';
import '../../../../src/icons/phosphor/caret-left.ts';
import '../../../../src/icons/phosphor/stack-simple.ts';
import '../../../../src/icons/phosphor/arrows-out-simple.ts';
import '../../../../src/icons/phosphor/floppy-disk.ts';
import '../../../../src/icons/phosphor/chat-dots.ts';
import '../../../../src/icons/phosphor/brackets-curly.ts';
import '../../../../src/icons/phosphor/brackets-angle.ts';
import '../../../../src/icons/phosphor/paint-brush.ts';
import '../../../../src/icons/phosphor/lightning.ts';
import '../../../../src/icons/phosphor/lightbulb.ts';

// LLM Chat
import '../chat/llm-chat/n-llm-chat-pane.ts';
import { LLMChatController } from '../chat/llm-chat/llm-chat-controller.ts';
import type { NLLMChatPane } from '../chat/llm-chat/llm-chat-pane-element.ts';

// Traits
import { CSSInspectController } from '../../../../packages/native-traits/src/traits/css-inspect/css-inspect-controller.ts';

// n-editor (CodeMirror)
import '../../../../packages/native-code/src/codemirror/register.ts';
import { json } from '@codemirror/lang-json';
import { html as htmlLang } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import type { EditorView } from '@codemirror/view';

// Kernel + A2UI
import { Kernel, resetKernel } from '@nonoun/native-kernel';
import { createA2UIAdapter } from './protocol/a2ui-adapter.ts';
import type { A2UIAdapter } from './protocol/a2ui-adapter.ts';
import {
  COMPONENT_MAP as REGISTRY,
  getComponentCategory,
} from './protocol/a2ui-component-map.ts';

// Pattern system
import { loadCatalog, loadPattern } from './patterns/pattern-loader.ts';
import type { CatalogEntry, Pattern } from './patterns/pattern-types.ts';

// Builder pipeline
import { PIPELINE_STEPS, runPipeline } from './builder/pipeline.ts';
import type { GatewayAdapter } from '../chat/gateway/adapter.ts';
import { isClaudeModel, createAdapter } from '../chat/gateway/model-registry.ts';
import { parseJsonFromResponse, stripFences } from '../chat/parsing/json-extractor.ts';
import promptJson from './builder/system-prompt.json' with { type: 'json' };

// ══════════════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════════════

const catalog = loadCatalog();
let activeFilter: 'all' | 'micro' | 'block' = 'all';
let activeCategory = '';
let currentPattern: Pattern | null = null;
let originalSchema: Pattern['components'] | null = null;
let lightboxAdapter: A2UIAdapter | null = null;
let currentModel = 'claude-haiku-4-5';
let temperature = 0.7;
let maxTokens = 4096;
let pipelineMode = false;
let regenerating = false;
let isDirty = false;
let showingOriginal = false;
let cssInspector: CSSInspectController | null = null;
let chatController: LLMChatController | null = null;

// ── Panel system (builder-style toggle-able panes) ──

const PANELS = [
  { id: 'preview' },
  { id: 'schema' },
  { id: 'html' },
  { id: 'css' },
  { id: 'js' },
  { id: 'insights' },
  { id: 'chat' },
];

const activePanels = new Set(['preview', 'schema']);
const paneEls = new Map<string, HTMLElement>();
const chipEls = new Map<string, HTMLElement>();

// Rendered card tracking
const renderedCards = new Set<string>();

// System prompt + component reference (same as builder)
const systemPrompt = (promptJson as { content: string }).content ?? JSON.stringify(promptJson);
const componentRef = Array.from(REGISTRY.values())
  .map((m) => {
    const cat = getComponentCategory(m.a2uiType);
    const props = m.properties?.map((p: { attr: string }) => p.attr).join(', ') || '';
    return `  - ${m.a2uiType} → <${m.nativeTag}> [${cat}]${props ? ': ' + props : ''}`;
  })
  .join('\n');

// ══════════════════════════════════════════════════════════════════
// DOM refs
// ══════════════════════════════════════════════════════════════════

const grid = document.getElementById('pattern-grid')!;
const countEl = document.getElementById('pattern-count')!;
const dialog = document.getElementById('editor-lightbox') as HTMLDialogElement;
const lightboxPreview = document.getElementById('lightbox-preview')!;
type NEditor = HTMLElement & { value: string; extensions: unknown[]; editorView: EditorView | null };
const schemaEditor = document.getElementById('schema-editor') as NEditor;
const outputPre = document.getElementById('output-pre') as NEditor;
const cssEditor = document.getElementById('css-editor') as NEditor;
const jsEditor = document.getElementById('js-editor') as NEditor;
const categoryFilter = document.getElementById('category-filter') as HTMLElement & { value: string };
const insightsWrap = document.getElementById('insights-wrap')!;
const inspectToggleBtn = document.getElementById('inspect-toggle')!;
const fullscreenToggleBtn = document.getElementById('fullscreen-toggle')!;
const btnSave = document.getElementById('btn-save')!;
const viewSelect = document.getElementById('tl-view-select') as HTMLElement & { value: string };
const actionsMenu = document.getElementById('tl-actions-menu') as HTMLElement & { value: string };
const compareToggle = document.getElementById('compare-toggle') as HTMLElement & { value: string };
const chatToggle = document.getElementById('chat-toggle')!;
const chatPane = document.getElementById('llm-chat-pane') as HTMLElement & NLLMChatPane;
const btnPrev = document.getElementById('btn-prev')!;
const btnNext = document.getElementById('btn-next')!;

// Set language modes on editors after CE upgrade
customElements.whenDefined('n-editor').then(() => {
  schemaEditor.extensions = [json()];
  outputPre.extensions = [htmlLang()];
  cssEditor.extensions = [cssLang()];
  jsEditor.extensions = [javascript()];
});

// ══════════════════════════════════════════════════════════════════
// Kernel
// ══════════════════════════════════════════════════════════════════

resetKernel();
const kernel = new Kernel({ allowUnregistered: true });

// ══════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════

/** Flatten pattern JSON `properties` sub-objects to top-level A2UI component shape. */
function flattenComponents(comps: Record<string, unknown>[]): Record<string, unknown>[] {
  return comps.map((c) => {
    if (c.properties && typeof c.properties === 'object' && !Array.isArray(c.properties)) {
      const { properties, ...rest } = c;
      return { ...rest, ...(properties as Record<string, unknown>) };
    }
    return c;
  });
}

// ══════════════════════════════════════════════════════════════════
// Grid Rendering
// ══════════════════════════════════════════════════════════════════

function getFilteredPatterns(): CatalogEntry[] {
  return catalog.patterns.filter((p) => {
    if (activeFilter !== 'all' && p.tier !== activeFilter) return false;
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  });
}

function renderGrid(): void {
  const entries = getFilteredPatterns();
  countEl.textContent = `${entries.length} pattern${entries.length !== 1 ? 's' : ''}`;
  grid.innerHTML = '';

  for (const entry of entries) {
    const card = document.createElement('article');
    card.className = 'tl-card';
    card.dataset.patternId = entry.id;

    card.innerHTML = `
      <div class="tl-card-preview"><div id="card-preview-${entry.id}" inert></div></div>
      <div class="tl-card-meta">
        <span class="tl-card-label">${entry.label}</span>
        <span class="tl-card-badge" data-tier="${entry.tier}">${entry.tier}</span>
        <span class="tl-card-badge" data-category>${entry.category}</span>
      </div>
      <div class="tl-card-overlay"><n-button variant="primary" intent="accent" size="sm" ><n-icon name="pencil-simple" slot="leading"></n-icon>Edit</n-button></div>
    `;

    grid.appendChild(card);
  }

  // Lazy render previews
  observeCards();
}

// ── Lazy rendering with IntersectionObserver ──

let observer: IntersectionObserver | null = null;

function observeCards(): void {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .map((e) => (e.target as HTMLElement).dataset.patternId!)
        .filter((id) => !renderedCards.has(id));

      if (visible.length) renderBatch(visible);
    },
    { rootMargin: '200px' },
  );

  grid.querySelectorAll('.tl-card').forEach((card) => observer!.observe(card));
}

async function renderBatch(ids: string[]): Promise<void> {
  // Render in batches of 6
  for (let i = 0; i < ids.length; i += 6) {
    const batch = ids.slice(i, i + 6);
    await Promise.all(batch.map(renderCardPreview));
    // Yield between batches
    if (i + 6 < ids.length) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
}

async function renderCardPreview(id: string): Promise<void> {
  if (renderedCards.has(id)) return;
  renderedCards.add(id);

  const mount = document.getElementById(`card-preview-${id}`);
  if (!mount) return;

  try {
    const pattern = await loadPattern(id);
    if (!pattern) return;

    const flat = flattenComponents(pattern.components as Record<string, unknown>[]);
    const adapter = createA2UIAdapter(kernel, {});
    adapter.receive(
      { updateComponents: { surfaceId: `card-${id}`, components: flat } },
      mount,
    );
    // Keep adapter alive — kernel owns the surface
  } catch {
    mount.textContent = '⚠ Render failed';
  }
}

// ══════════════════════════════════════════════════════════════════
// Filters
// ══════════════════════════════════════════════════════════════════

/** Update dirty state. */
function setDirty(dirty: boolean): void {
  isDirty = dirty;
}

/** Toggle a button between ghost (off) and primary+accent (on). */
function setChipActive(btn: Element, active: boolean): void {
  btn.setAttribute('variant', active ? 'primary' : 'ghost');
  if (active) btn.setAttribute('intent', 'accent');
  else btn.removeAttribute('intent');
}

function onFilterChange(filter: string): void {
  activeFilter = filter as 'all' | 'micro' | 'block';
  document.querySelectorAll('[data-filter]').forEach((btn) => {
    setChipActive(btn, btn.getAttribute('data-filter') === filter);
  });
  renderGrid();
}

function onCategoryChange(category: string): void {
  activeCategory = category;
  renderGrid();
}

function populateCategoryFilter(): void {
  const listbox = categoryFilter.querySelector('n-listbox');
  if (!listbox) return;
  for (const cat of Object.keys(catalog.categories).sort()) {
    const option = document.createElement('n-option');
    option.setAttribute('value', cat);
    option.textContent = cat;
    listbox.appendChild(option);
  }
}

/** Populate the view select with all pattern entries. */
function populateViewSelect(): void {
  const listbox = viewSelect.querySelector('n-listbox');
  if (!listbox) return;
  for (const entry of catalog.patterns) {
    const option = document.createElement('n-option');
    option.setAttribute('value', entry.id);
    option.textContent = entry.label;
    listbox.appendChild(option);
  }
}

// ══════════════════════════════════════════════════════════════════
// Lightbox
// ══════════════════════════════════════════════════════════════════

async function openLightbox(id: string): Promise<void> {
  let pattern = await loadPattern(id);
  if (!pattern) return;

  // Load saved version from localStorage if present
  const saved = localStorage.getItem(`tl-pattern-${id}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Pattern;
      if (parsed.components) pattern = parsed;
    } catch { /* ignore corrupt data */ }
  }

  currentPattern = pattern;
  originalSchema = structuredClone(pattern.components);

  // Sync view select to current pattern
  viewSelect.value = id;

  // Apply recommended temperature from pattern (default 0.7 if unspecified)
  temperature = pattern.temperature ?? 0.7;

  // Schema editor
  schemaEditor.value = JSON.stringify(pattern, null, 2);

  // Render preview
  renderLightboxPreview(pattern.components as Record<string, unknown>[]);

  // Reset state
  setDirty(false);
  showingOriginal = false;
  compareToggle.value = 'edited';
  lightboxPreview.removeAttribute('data-compare');

  // Create LLM chat controller bound to this pattern
  chatController?.destroy();
  chatController = new LLMChatController({
    systemPrompt,
    model: currentModel,
    createAdapter: (system, _model, tokens) => buildLLMAdapter(system, tokens),
    contexts: [{
      id: 'pattern-schema',
      label: pattern.label,
      element: lightboxPreview,
      read: () => JSON.stringify(currentPattern, null, 2),
      apply: (output) => {
        const parsed = parseJsonFromResponse(output);
        if (parsed?.components) applyRegenResult(parsed.components);
        else if (parsed?.schema?.components) applyRegenResult(parsed.schema.components);
      },
      systemPromptFragment: `You are editing an A2UI pattern schema. The pattern uses a flat adjacency list of components.\nComponent reference:\n${componentRef}\n\nRespond with valid JSON containing a "components" array.`,
      icon: 'brackets-curly',
    }],
  });
  // Bind to chat pane
  if (chatPane) chatPane.controller = chatController;

  // Ensure default panels are open
  activePanels.add('preview');
  activePanels.add('schema');
  syncPanels();

  dialog.showModal();
}

function renderLightboxPreview(components: Record<string, unknown>[]): void {
  // Destroy old adapter
  lightboxAdapter?.destroy();
  lightboxPreview.innerHTML = '';

  const flat = flattenComponents(components);
  lightboxAdapter = createA2UIAdapter(kernel, {});
  lightboxAdapter.receive(
    { updateComponents: { surfaceId: 'lightbox', components: flat } },
    lightboxPreview,
  );

  // Update output tab
  requestAnimationFrame(() => {
    outputPre.value = formatHtml(lightboxPreview.innerHTML);
  });
}

/** Indent HTML for legibility — lightweight, no external deps. */
function formatHtml(raw: string): string {
  const tokens = raw.replace(/></g, '>\n<').split('\n');
  let indent = 0;
  const lines: string[] = [];
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const isClosing = /^<\//.test(trimmed);
    const isSelfClosing = /\/>$/.test(trimmed) || /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i.test(trimmed);
    if (isClosing) indent = Math.max(0, indent - 1);
    lines.push('  '.repeat(indent) + trimmed);
    if (!isClosing && !isSelfClosing && /^<[a-z]/i.test(trimmed)) indent++;
  }
  return lines.join('\n');
}

function dismissInspector(): void {
  if (cssInspector) {
    cssInspector.dismiss();
    cssInspector.destroy();
    cssInspector = null;
  }
}

// ── Panel toggle (builder-style) ──

function syncPanels(): void {
  // Clear inline flex so CSS defaults redistribute
  for (const [_, el] of paneEls) el.style.removeProperty('flex');
  for (const [id, el] of paneEls) el.hidden = !activePanels.has(id);
  for (const [id, chip] of chipEls) chip.toggleAttribute('force-active', activePanels.has(id));
}

/** Ensure a panel is visible (open it if hidden). */
function showPanel(id: string): void {
  if (!activePanels.has(id)) {
    activePanels.add(id);
    syncPanels();
  }
}

// ── Schema editor live update ──

let schemaDebounce: ReturnType<typeof setTimeout> | undefined;

function onSchemaInput(): void {
  clearTimeout(schemaDebounce);
  schemaDebounce = setTimeout(() => {
    try {
      const parsed = JSON.parse(schemaEditor.value);
      const components = parsed.components ?? parsed;
      if (Array.isArray(components)) {
        renderLightboxPreview(components as Record<string, unknown>[]);
        if (currentPattern) {
          currentPattern = { ...currentPattern, components };
          setDirty(true);
        }
        // Exit compare mode on edit
        if (showingOriginal) {
          showingOriginal = false;
          compareToggle.value = 'edited';
          lightboxPreview.removeAttribute('data-compare');
        }
      }
    } catch {
      // Invalid JSON — ignore
    }
  }, 500);
}

// ── DOM ↔ Schema bidirectional highlighting ──

function clearHighlights(): void {
  lightboxPreview.querySelectorAll('[data-highlight]').forEach((el) => {
    el.removeAttribute('data-highlight');
  });
}

/** Select a range in a CodeMirror editor and scroll it into view. */
function selectRange(editor: NEditor, from: number, to: number): void {
  const view = editor.editorView;
  if (!view) return;
  view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
  view.focus();
}

/**
 * Find the enclosing JSON object boundaries for a `"id": "value"` match.
 * Walks outward from the match position counting braces to find `{…}`.
 */
function findEnclosingObject(text: string, matchPos: number): { from: number; to: number } | null {
  // Walk backward to opening `{`
  let depth = 0;
  let from = matchPos;
  for (let i = matchPos; i >= 0; i--) {
    if (text[i] === '}') depth++;
    if (text[i] === '{') {
      if (depth === 0) { from = i; break; }
      depth--;
    }
  }
  // Walk forward to closing `}`
  depth = 0;
  let to = matchPos;
  for (let i = matchPos; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      if (depth === 1) { to = i + 1; break; }
      depth--;
    }
  }
  return { from, to };
}

/** Find an HTML element's opening tag in formatted HTML text. */
function findHtmlTag(text: string, id: string): { from: number; to: number } | null {
  // Match id="value" or id='value'
  const pattern = new RegExp(`id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`);
  const match = pattern.exec(text);
  if (!match) return null;
  // Walk backward to `<`
  let from = match.index;
  for (let i = match.index; i >= 0; i--) {
    if (text[i] === '<') { from = i; break; }
  }
  // Walk forward to `>` (end of opening tag)
  let to = match.index + match[0].length;
  for (let i = to; i < text.length; i++) {
    if (text[i] === '>') { to = i + 1; break; }
  }
  return { from, to };
}

/** Which editor pane is currently visible? */
function activeEditorPanel(): string {
  if (activePanels.has('schema')) return 'schema';
  if (activePanels.has('html')) return 'html';
  if (activePanels.has('css')) return 'css';
  if (activePanels.has('js')) return 'js';
  return 'schema';
}

/** Try to select the clicked id in the schema editor. Returns true on match. */
function highlightInSchema(clickedId: string): boolean {
  const text = schemaEditor.value;
  const pattern = new RegExp(`"id"\\s*:\\s*"${clickedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
  const match = pattern.exec(text);
  if (!match) return false;
  const obj = findEnclosingObject(text, match.index);
  if (!obj) return false;
  selectRange(schemaEditor, obj.from, obj.to);
  return true;
}

/** Try to select the clicked id in the output HTML editor. Returns true on match. */
function highlightInOutput(clickedId: string): boolean {
  const text = outputPre.value;
  const tag = findHtmlTag(text, clickedId);
  if (!tag) return false;
  selectRange(outputPre, tag.from, tag.to);
  return true;
}

/** Preview → editor: click element highlights it in the current tab's editor (or falls back). */
function onPreviewClick(e: Event): void {
  const target = e.target as HTMLElement;
  clearHighlights();

  const el = target.closest('[id]') as HTMLElement | null;
  if (!el || el === lightboxPreview) return;
  const clickedId = el.id;

  el.setAttribute('data-highlight', '');

  const tab = activeEditorPanel();

  // If already on a highlightable tab, try that first
  if (tab === 'schema' && highlightInSchema(clickedId)) return;
  if (tab === 'html' && highlightInOutput(clickedId)) return;

  // Fall back to whichever editor has a match
  if (highlightInSchema(clickedId)) { showPanel('schema'); return; }
  if (highlightInOutput(clickedId)) { showPanel('html'); return; }
}

// ══════════════════════════════════════════════════════════════════
// Insights Pane
// ══════════════════════════════════════════════════════════════════

let insightCounter = 0;

/** Map step id → its DOM entry (so we can replace placeholder with content). */
const insightEntries = new Map<string, HTMLElement>();

function clearInsights(): void {
  insightsWrap.innerHTML = '';
  insightCounter = 0;
  insightEntries.clear();
}

function appendInsightEntry(label: string, stepId?: string): HTMLElement {
  insightCounter++;
  const entry = document.createElement('div');
  entry.className = 'tl-insight-entry';

  const header = document.createElement('div');
  header.className = 'tl-insight-header';
  const num = document.createElement('span');
  num.className = 'tl-insight-num';
  num.textContent = `#${insightCounter}`;
  header.appendChild(num);
  const title = document.createElement('span');
  title.className = 'tl-insight-label';
  title.textContent = label;
  header.appendChild(title);
  entry.appendChild(header);

  insightsWrap.appendChild(entry);
  insightsWrap.scrollTop = insightsWrap.scrollHeight;

  if (stepId) insightEntries.set(stepId, entry);
  return entry;
}

function appendInsightText(parent: HTMLElement, text: string, muted = false): void {
  const el = document.createElement('span');
  el.className = 'tl-insight-text';
  if (muted) el.setAttribute('data-muted', '');
  el.textContent = text;
  parent.appendChild(el);
}

function appendInsightBadges(parent: HTMLElement, items: string[], intent?: string): void {
  const wrap = document.createElement('div');
  wrap.className = 'tl-insight-badges';
  for (const item of items) {
    const badge = document.createElement('n-badge');
    if (intent) badge.setAttribute('intent', intent);
    badge.textContent = item;
    wrap.appendChild(badge);
  }
  parent.appendChild(wrap);
}

function appendInsightPlaceholder(entry: HTMLElement, stepLabel: string): HTMLElement {
  const placeholder = document.createElement('span');
  placeholder.className = 'tl-insight-placeholder';
  placeholder.textContent = `[Reasoning state: ${stepLabel}]`;
  entry.appendChild(placeholder);
  return placeholder;
}

function appendInterpretation(entry: HTMLElement, output: string): void {
  // Remove placeholder
  entry.querySelector('.tl-insight-placeholder')?.remove();

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

function appendConcepts(entry: HTMLElement, output: string): void {
  entry.querySelector('.tl-insight-placeholder')?.remove();

  try {
    const data = JSON.parse(stripFences(output));

    for (const c of data.concepts ?? []) {
      const item = document.createElement('div');
      item.className = 'tl-insight-concept';
      const name = document.createElement('span');
      name.className = 'tl-insight-concept-name';
      name.textContent = c.pattern;
      item.appendChild(name);
      if (c.rationale) appendInsightText(item, c.rationale, true);
      entry.appendChild(item);
    }

    if (data.interactions?.length) {
      appendInsightBadges(entry, data.interactions, 'accent');
    }
    if (data.dataFlow) appendInsightText(entry, data.dataFlow);
    if (data.stateModel) appendInsightText(entry, data.stateModel, true);
  } catch {
    appendInsightText(entry, output.slice(0, 300), true);
  }
}

function appendPlan(entry: HTMLElement, output: string): void {
  entry.querySelector('.tl-insight-placeholder')?.remove();

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

function appendConstruct(entry: HTMLElement, _output: string): void {
  entry.querySelector('.tl-insight-placeholder')?.remove();
  appendInsightText(entry, 'Schema constructed — see Schema tab for full output.');
}

// ══════════════════════════════════════════════════════════════════
// LLM Regeneration
// ══════════════════════════════════════════════════════════════════

function getApiKey(model: string): string | null {
  if (isClaudeModel(model)) {
    return (import.meta as Record<string, Record<string, string>>).env?.VITE_ANTHROPIC_API_KEY
      ?? (import.meta as Record<string, Record<string, string>>).env?.VITE_CLAUDE_API_KEY
      ?? null;
  }
  return (import.meta as Record<string, Record<string, string>>).env?.VITE_OPENAI_API_KEY ?? null;
}

function getBaseUrl(model: string): string {
  return isClaudeModel(model) ? '/api/anthropic' : '/api/openai';
}

function buildLLMAdapter(system: string, tokens: number): GatewayAdapter | null {
  return createAdapter({
    clientId: 'tl-regen',
    baseUrl: getBaseUrl(currentModel),
    model: currentModel,
    maxTokens: tokens,
    temperature,
    system,
    apiKey: getApiKey(currentModel),
  });
}

async function handleRegenerate(): Promise<void> {
  if (!currentPattern || regenerating) return;
  regenerating = true;

  const query = `Regenerate this UI pattern with improved structure and styling.

Pattern: ${currentPattern.label}
Tier: ${currentPattern.tier}
Category: ${currentPattern.category}
Description: ${currentPattern.description}

Current schema:
${JSON.stringify({ surfaceId: 'lightbox', components: currentPattern.components }, null, 2)}`;

  try {
    if (pipelineMode) {
      await regeneratePipeline(query);
    } else {
      await regenerateDirect(query);
    }
  } catch (err) {
    console.error('Regeneration failed:', err);
  } finally {
    regenerating = false;
  }
}

async function regenerateDirect(query: string): Promise<void> {
  const adapter = buildLLMAdapter(systemPrompt, maxTokens);
  if (!adapter) {
    schemaEditor.value = '// No API key configured. Set VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY.';
    return;
  }

  const now = Date.now();
  const response = await adapter.sendMessage({
    id: crypto.randomUUID(),
    messages: [],
    query,
    datetime: now,
  });

  if (!response?.message) return;

  const parsed = parseJsonFromResponse(response.message);
  if (parsed?.schema?.components) {
    applyRegenResult(parsed.schema.components);
  } else if (parsed?.components) {
    applyRegenResult(parsed.components);
  }
}

async function regeneratePipeline(query: string): Promise<void> {
  // Clear and switch to insights tab
  clearInsights();
  showPanel('insights');

  const ctx = {
    query,
    currentSchema: currentPattern
      ? { surfaceId: 'lightbox', components: currentPattern.components }
      : null,
    componentRef,
    conversationHistory: [] as Array<{ role: string; message: string }>,
  };

  const stepLabels: Record<string, string> = {
    interpret: 'Interpretation',
    concepts: 'Concept Mapping',
    plan: 'Planning',
    construct: 'Constructing',
  };

  const callbacks = {
    onStepStart(step: (typeof PIPELINE_STEPS)[number], _idx: number) {
      const entry = appendInsightEntry(stepLabels[step.id] ?? step.label, step.id);
      appendInsightPlaceholder(entry, step.activeLabel);
    },
    onStepComplete(step: (typeof PIPELINE_STEPS)[number], _idx: number, output: string) {
      const entry = insightEntries.get(step.id);
      if (!entry) return;

      if (step.id === 'interpret') appendInterpretation(entry, output);
      else if (step.id === 'concepts') appendConcepts(entry, output);
      else if (step.id === 'plan') appendPlan(entry, output);
      else if (step.id === 'construct') appendConstruct(entry, output);
    },
    onStreamChunk(_delta: string, fullMessage: string) {
      schemaEditor.value = fullMessage;
    },
    onError(step: (typeof PIPELINE_STEPS)[number], _idx: number, error: Error) {
      const entry = insightEntries.get(step.id);
      if (entry) {
        entry.querySelector('.tl-insight-placeholder')?.remove();
        appendInsightText(entry, `Error: ${error.message}`, true);
      }
      schemaEditor.value = `// Error in ${step.label}: ${error.message}`;
    },
  };

  const buildStepAdapter = (system: string, tokens: number) =>
    buildLLMAdapter(system, tokens);

  const result = await runPipeline(ctx, callbacks, buildStepAdapter, systemPrompt);

  // Parse final output
  const parsed = parseJsonFromResponse(result.raw);
  if (parsed?.schema?.components) {
    applyRegenResult(parsed.schema.components);
  }
}

function applyRegenResult(components: Record<string, unknown>[]): void {
  if (!currentPattern) return;
  currentPattern = { ...currentPattern, components: components as Pattern['components'] };
  schemaEditor.value = JSON.stringify(currentPattern, null, 2);
  renderLightboxPreview(components);
  setDirty(true);
  showPanel('schema');
}

// ══════════════════════════════════════════════════════════════════
// CRUD — Reset, Download, Save
// ══════════════════════════════════════════════════════════════════

function handleReset(): void {
  if (!currentPattern || !originalSchema) return;
  currentPattern = { ...currentPattern, components: structuredClone(originalSchema) };
  schemaEditor.value = JSON.stringify(currentPattern, null, 2);
  renderLightboxPreview(originalSchema as Record<string, unknown>[]);
  setDirty(false);
  // Exit compare mode
  if (showingOriginal) {
    showingOriginal = false;
    compareToggle.value = 'edited';
    lightboxPreview.removeAttribute('data-compare');
  }
}

function handleExportJson(): void {
  if (!currentPattern) return;
  const blob = new Blob([JSON.stringify(currentPattern, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentPattern.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleDuplicate(): void {
  if (!currentPattern) return;
  const dup = structuredClone(currentPattern);
  dup.id = `${dup.id}-copy`;
  dup.label = `${dup.label} (Copy)`;
  schemaEditor.value = JSON.stringify(dup, null, 2);
  currentPattern = dup;
  setDirty(true);
}

function handleSave(): void {
  if (!currentPattern || !isDirty) return;
  localStorage.setItem(`tl-pattern-${currentPattern.id}`, JSON.stringify(currentPattern));
  setDirty(false);
  // Flash confirmation on save button
  btnSave.setAttribute('intent', 'success');
  setTimeout(() => btnSave.removeAttribute('intent'), 1200);
}

// ══════════════════════════════════════════════════════════════════
// Before / After Compare
// ══════════════════════════════════════════════════════════════════

function setCompareMode(mode: 'edited' | 'original'): void {
  if (!currentPattern || !originalSchema) return;
  showingOriginal = mode === 'original';
  compareToggle.value = mode;

  if (showingOriginal) {
    lightboxPreview.setAttribute('data-compare', 'original');
    renderLightboxPreview(originalSchema as Record<string, unknown>[]);
  } else {
    lightboxPreview.removeAttribute('data-compare');
    renderLightboxPreview(currentPattern.components as Record<string, unknown>[]);
  }
}


// ══════════════════════════════════════════════════════════════════
// Event Wiring
// ══════════════════════════════════════════════════════════════════

// Filter chips
document.querySelectorAll('[data-filter]').forEach((btn) => {
  btn.addEventListener('pointerup', () => {
    onFilterChange(btn.getAttribute('data-filter')!);
  });
});

// Category filter
categoryFilter.addEventListener('native:change', () => {
  onCategoryChange(categoryFilter.value);
});

// Card clicks (delegated)
grid.addEventListener('pointerup', (e) => {
  const card = (e.target as HTMLElement).closest('.tl-card') as HTMLElement | null;
  if (card?.dataset.patternId) openLightbox(card.dataset.patternId);
});

// Lightbox close (Escape key / backdrop)
dialog.addEventListener('close', () => {
  dismissInspector();
  chatController?.destroy();
  chatController = null;
  // Reset panels to default state
  activePanels.clear();
  activePanels.add('preview');
  activePanels.add('schema');
  syncPanels();
  dialog.removeAttribute('data-fullscreen');
  lightboxAdapter?.destroy();
  lightboxAdapter = null;
  currentPattern = null;
  originalSchema = null;
  lightboxPreview.innerHTML = '';
});

// Main toolbar — Save
btnSave.addEventListener('pointerup', handleSave);

// Main toolbar — View select (pattern picker)
viewSelect.addEventListener('native:change', () => {
  const id = viewSelect.value;
  if (id && id !== 'examples') openLightbox(id);
});

// Main toolbar — Actions dropdown
actionsMenu.addEventListener('native:change', () => {
  const action = actionsMenu.value;
  // Reset select so it can be re-triggered
  requestAnimationFrame(() => { actionsMenu.value = ''; });
  if (action === 'reset') handleReset();
  else if (action === 'export-json') handleExportJson();
  else if (action === 'duplicate') handleDuplicate();
  else if (action === 'regenerate') handleRegenerate();
});

// ── Init pane refs + chips (builder-style) ──

for (const panel of PANELS) {
  const paneEl = dialog.querySelector(`n-pane[data-panel-id="${panel.id}"]`) as HTMLElement | null;
  if (paneEl) {
    paneEls.set(panel.id, paneEl);
    paneEl.hidden = !activePanels.has(panel.id);
  }

  const chipEl = dialog.querySelector(`n-button[data-chip="${panel.id}"]`) as HTMLElement | null;
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
for (const btn of dialog.querySelectorAll('[data-close-panel-id]')) {
  btn.addEventListener('native:press', () => {
    const id = (btn as HTMLElement).getAttribute('data-close-panel-id');
    if (id) activePanels.delete(id);
    syncPanels();
  });
}

// CSS Inspector toggle
inspectToggleBtn.addEventListener('pointerup', () => {
  if (cssInspector) {
    dismissInspector();
  } else {
    cssInspector = new CSSInspectController(lightboxPreview, { pick: true, labels: true });
  }
});

// Sync button state if inspector dismisses itself (e.g. Escape key)
lightboxPreview.addEventListener('native:inspect', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (!detail?.active && cssInspector) {
    cssInspector = null;
  }
});

// Chat toggle — show/hide the docked chat pane
chatToggle.addEventListener('pointerup', () => {
  if (activePanels.has('chat')) {
    activePanels.delete('chat');
  } else {
    activePanels.add('chat');
  }
  syncPanels();
});

// Fullscreen toggle
fullscreenToggleBtn.addEventListener('pointerup', () => {
  dialog.toggleAttribute('data-fullscreen');
});

// Compare control
compareToggle.addEventListener('native:change', (e) => {
  setCompareMode((e as CustomEvent).detail?.value ?? 'edited');
});

// Schema editor — live update
schemaEditor.addEventListener('native:input', onSchemaInput);

// Preview click inspection
lightboxPreview.addEventListener('click', onPreviewClick);

// Surface steppers (prev/next)
btnPrev.addEventListener('pointerup', () => {
  // TODO: step through surfaces when multi-surface patterns exist
});
btnNext.addEventListener('pointerup', () => {
  // TODO: step through surfaces when multi-surface patterns exist
});

// ══════════════════════════════════════════════════════════════════
// Boot
// ══════════════════════════════════════════════════════════════════

populateCategoryFilter();
populateViewSelect();
renderGrid();
