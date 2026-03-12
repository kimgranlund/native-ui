// ── A2UI Training Library — Demo Page ──

// Navigation + components
import '../../../../src/nav/native-dashboard.ts';
import '../../../../src/register-all.ts';

// Icons
import '../../../../src/icons/phosphor/x.ts';
import '../../../../src/icons/phosphor/arrow-clockwise.ts';
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
import '../../../../src/icons/phosphor/stack-simple.ts';

// Traits
import { CSSInspectController } from '../../../../packages/native-traits/src/traits/css-inspect/css-inspect-controller.ts';

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
let cssInspector: CSSInspectController | null = null;

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
const lightboxTitle = document.getElementById('lightbox-title')!;
const lightboxBadges = document.getElementById('lightbox-badges')!;
const lightboxPreview = document.getElementById('lightbox-preview')!;
const schemaEditor = document.getElementById('schema-editor') as HTMLTextAreaElement;
const outputPre = document.getElementById('output-pre')!;
const editorTabs = document.getElementById('editor-tabs')!;
const categoryFilter = document.getElementById('category-filter') as HTMLElement & { value: string };
const modelPicker = document.getElementById('tl-model') as HTMLElement & { value: string };
const tempRange = document.getElementById('tl-temperature') as HTMLInputElement;
const tokensRange = document.getElementById('tl-max-tokens') as HTMLInputElement;
const pipelineToggle = document.getElementById('tl-pipeline-toggle') as HTMLInputElement;
const tempVal = document.getElementById('temp-val')!;
const tokensVal = document.getElementById('tokens-val')!;
const insightsWrap = document.getElementById('insights-wrap')!;
const inspectToggleBtn = document.getElementById('inspect-toggle')!;
const btnRegenerate = document.getElementById('btn-regenerate')!;
const btnExport = document.getElementById('btn-export')!;
const btnClose = document.getElementById('lightbox-close')!;

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
      <div class="tl-card-preview"><div id="card-preview-${entry.id}"></div></div>
      <div class="tl-card-meta">
        <span class="tl-card-label">${entry.label}</span>
        <span class="tl-card-badge" data-tier="${entry.tier}">${entry.tier}</span>
        <span class="tl-card-badge" data-category>${entry.category}</span>
      </div>
      <div class="tl-card-overlay"><span>Edit</span></div>
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

    const adapter = createA2UIAdapter(kernel, {});
    adapter.receive(
      { updateComponents: { surfaceId: `card-${id}`, components: flattenComponents(pattern.components as Record<string, unknown>[]) } },
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

function onFilterChange(filter: string): void {
  activeFilter = filter as 'all' | 'micro' | 'block';
  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.toggleAttribute('data-active', btn.getAttribute('data-filter') === filter);
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

// ══════════════════════════════════════════════════════════════════
// Lightbox
// ══════════════════════════════════════════════════════════════════

async function openLightbox(id: string): Promise<void> {
  const pattern = await loadPattern(id);
  if (!pattern) return;

  currentPattern = pattern;
  originalSchema = structuredClone(pattern.components);

  // Title + badges
  lightboxTitle.textContent = pattern.label;
  lightboxBadges.innerHTML = `
    <span class="tl-card-badge" data-tier="${pattern.tier}">${pattern.tier}</span>
    <span class="tl-card-badge" data-category>${pattern.category}</span>
  `;

  // Schema editor
  schemaEditor.value = JSON.stringify(pattern, null, 2);

  // Render preview
  renderLightboxPreview(pattern.components as Record<string, unknown>[]);

  // Show schema tab
  showTab('schema');

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
    outputPre.textContent = lightboxPreview.innerHTML;
  });
}

function dismissInspector(): void {
  if (cssInspector) {
    cssInspector.dismiss();
    cssInspector.destroy();
    cssInspector = null;
    inspectToggleBtn.removeAttribute('data-active');
    inspectToggleBtn.removeAttribute('intent');
  }
}

function closeLightbox(): void {
  dismissInspector();
  dialog.close();
  lightboxAdapter?.destroy();
  lightboxAdapter = null;
  currentPattern = null;
  originalSchema = null;
  lightboxPreview.innerHTML = '';
}

// ── Tab switching ──

function showTab(tab: string): void {
  document.querySelectorAll('.tl-tab-panel').forEach((panel) => {
    (panel as HTMLElement).hidden = panel.getAttribute('data-tab') !== tab;
  });
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
        }
      }
    } catch {
      // Invalid JSON — ignore
    }
  }, 500);
}

// ── DOM Inspection ──

function onPreviewClick(e: Event): void {
  const target = e.target as HTMLElement;

  // Clear previous highlights
  lightboxPreview.querySelectorAll('[data-highlight]').forEach((el) => {
    el.removeAttribute('data-highlight');
  });

  // Find nearest element with an ID
  const el = target.closest('[id]') as HTMLElement | null;
  if (!el || el === lightboxPreview) return;

  el.setAttribute('data-highlight', '');

  // Find ID in schema editor
  const searchStr = `"id": "${el.id}"`;
  const idx = schemaEditor.value.indexOf(searchStr);
  if (idx >= 0) {
    schemaEditor.focus();
    schemaEditor.setSelectionRange(idx, idx + searchStr.length);
    // Scroll into view
    const linesBefore = schemaEditor.value.substring(0, idx).split('\n').length;
    const lineHeight = 11 * 1.6; // 0.6875rem * 1.6 line-height ≈ 17.6px
    schemaEditor.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
  }

  showTab('schema');
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
    system,
    apiKey: getApiKey(currentModel),
  });
}

async function handleRegenerate(): Promise<void> {
  if (!currentPattern || regenerating) return;
  regenerating = true;
  btnRegenerate.setAttribute('disabled', '');

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
    btnRegenerate.removeAttribute('disabled');
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
  showTab('insights');

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
  showTab('schema');
}

// ══════════════════════════════════════════════════════════════════
// Export Improvement
// ══════════════════════════════════════════════════════════════════

function handleExport(): void {
  if (!currentPattern) return;

  const folder = currentPattern.tier === 'micro' ? 'micro' : 'blocks';
  const md = `# Pattern Improvement: ${currentPattern.label}

## Pattern
- **ID:** ${currentPattern.id}
- **Tier:** ${currentPattern.tier}
- **Category:** ${currentPattern.category}
- **Description:** ${currentPattern.description}
- **Concepts:** ${currentPattern.concepts.join(', ')}

## LLM Settings Used
- **Model:** ${currentModel}
- **Temperature:** ${temperature}
- **Max Tokens:** ${maxTokens}
- **Pipeline:** ${pipelineMode ? 'multi-step (4 stages)' : 'direct (single-shot)'}

## Original Schema
\`\`\`json
${JSON.stringify(originalSchema, null, 2)}
\`\`\`

## Updated Schema
\`\`\`json
${JSON.stringify(currentPattern.components, null, 2)}
\`\`\`

## Instruction for Claude Code
Update the pattern file at \`packages/native-ai/src/a2ui/patterns/${folder}/${currentPattern.id}.json\`
with the full updated pattern JSON below. Verify it renders correctly in the A2UI Training Library.

\`\`\`json
${JSON.stringify(currentPattern, null, 2)}
\`\`\`
`;

  // Download
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pattern-improvement-${currentPattern.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
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

// Lightbox close
btnClose.addEventListener('pointerup', closeLightbox);
dialog.addEventListener('close', () => {
  dismissInspector();
  lightboxAdapter?.destroy();
  lightboxAdapter = null;
  currentPattern = null;
  originalSchema = null;
});

// CSS Inspector toggle
inspectToggleBtn.addEventListener('pointerup', () => {
  if (cssInspector) {
    dismissInspector();
  } else {
    cssInspector = new CSSInspectController(lightboxPreview, { pick: true, labels: true });
    inspectToggleBtn.setAttribute('data-active', '');
    inspectToggleBtn.setAttribute('intent', 'accent');
  }
});

// Sync button state if inspector dismisses itself (e.g. Escape key)
lightboxPreview.addEventListener('native:inspect', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (!detail?.active && cssInspector) {
    cssInspector = null;
    inspectToggleBtn.removeAttribute('data-active');
    inspectToggleBtn.removeAttribute('intent');
  }
});

// Tabs
editorTabs.addEventListener('native:change', (e) => {
  const tab = (e as CustomEvent).detail?.value ?? (e.target as HTMLElement & { value: string }).value;
  if (tab) showTab(tab);
});

// Schema editor
schemaEditor.addEventListener('input', onSchemaInput);

// Preview click inspection
lightboxPreview.addEventListener('click', onPreviewClick);

// Regenerate + Export
btnRegenerate.addEventListener('pointerup', handleRegenerate);
btnExport.addEventListener('pointerup', handleExport);

// Settings controls
modelPicker?.addEventListener('native:change', () => {
  currentModel = modelPicker.value;
});

tempRange?.addEventListener('input', () => {
  temperature = parseFloat(tempRange.value);
  tempVal.textContent = String(temperature);
});

tokensRange?.addEventListener('input', () => {
  maxTokens = parseInt(tokensRange.value, 10);
  tokensVal.textContent = String(maxTokens);
});

pipelineToggle?.addEventListener('native:change', () => {
  pipelineMode = (pipelineToggle as unknown as { checked: boolean }).checked;
});

// ══════════════════════════════════════════════════════════════════
// Boot
// ══════════════════════════════════════════════════════════════════

populateCategoryFilter();
renderGrid();
