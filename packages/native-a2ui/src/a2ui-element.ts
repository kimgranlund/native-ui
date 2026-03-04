/**
 * NA2UI — A2UI Protocol Workbench Element
 *
 * Layout: chip-toggled multi-panel — preview left, N resizable panes right.
 * Chips: JSON-IN, JSON-OUT, HTML, CSS, JS, COMPONENTS (multiple active at once).
 * Chrome & layout patterns mirror <native-playground> for a unified devtool look.
 *
 * Renders A2UI components directly (no iframe) using a local Kernel + A2UIAdapter.
 * Native-ui components must be registered on the page for rendering to work.
 *
 * @fires native:a2ui-action - When an action fires inside the preview
 * @fires native:a2ui-state  - When surface state updates after processing envelopes
 */

import { NativeElement, signal, ResizeController, PresentController } from '@nonoun/native-ui';
import type { Signal, Dispose } from '@nonoun/native-ui';
import {
  EditorView,
  Decoration,
  StateField,
  StateEffect,
} from '@nonoun/native-codemirror';
import type { NCodemirror } from '@nonoun/native-codemirror';
import type { DecorationSet } from '@nonoun/native-codemirror';
import { json } from '@codemirror/lang-json';
import '@nonoun/native-codemirror/register';

import { Kernel, resetKernel } from '@nonoun/native-ui/kernel';

import { createA2UIAdapter } from './protocol/a2ui-adapter.ts';
import type { A2UIAdapter } from './protocol/a2ui-adapter.ts';
import { PRESETS, PRESET_GROUPS } from './a2ui-presets.ts';

// ── Types ──

type PanelId = 'json-in' | 'json-out' | 'html' | 'css' | 'js' | 'components';

const PANEL_ORDER: readonly PanelId[] = ['json-in', 'json-out', 'html', 'css', 'js', 'components'];

const PANEL_LABELS: Record<PanelId, string> = {
  'json-in': 'IN',
  'json-out': 'OUT',
  'html': 'HTML',
  'css': 'CSS',
  'js': 'JS',
  'components': 'UI',
};

const PANEL_ICONS: Record<PanelId, string> = {
  'json-in': 'brackets-curly',
  'json-out': 'chat-circle-dots',
  'html': 'code',
  'css': 'palette',
  'js': 'terminal',
  'components': 'squares-four',
};

interface LogEntry {
  type: 'sent' | 'received' | 'action' | 'error' | 'info';
  data: unknown;
  timestamp: number;
}

interface EnvelopeInfo {
  text: string;
  startLine: number; // 1-based editor line
  endLine: number;   // 1-based, inclusive
}

// ── Line decoration effects for sent/next highlighting ──

const setDecorations = StateEffect.define<{
  sentUpToLine: number;
  nextFromLine: number;
  nextToLine: number;
}>();

const sentDeco = Decoration.line({ class: 'cm-a2ui-sent' });
const nextDeco = Decoration.line({ class: 'cm-a2ui-next' });

const sentLineField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setDecorations)) {
        const doc = tr.state.doc;
        const { sentUpToLine, nextFromLine, nextToLine } = e.value;
        const ranges = [];
        for (let i = 1; i <= Math.min(sentUpToLine, doc.lines); i++) {
          ranges.push(sentDeco.range(doc.line(i).from));
        }
        for (let i = nextFromLine; i <= Math.min(nextToLine, doc.lines); i++) {
          ranges.push(nextDeco.range(doc.line(i).from));
        }
        return Decoration.set(ranges, true);
      }
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Element ──

export class NA2UI extends NativeElement {

  // Signals
  #stream: Signal<string> = signal('');
  #cursor: Signal<number> = signal(0);
  #activePanels: Signal<Set<PanelId>> = signal(new Set<PanelId>(['json-in']));
  #inLog: Signal<LogEntry[]> = signal([]);
  #outLog: Signal<LogEntry[]> = signal([]);
  #jsLog: Signal<LogEntry[]> = signal([]);
  #lastState: Signal<unknown> = signal(null);
  #htmlState: Signal<string> = signal('');
  #cssState: Signal<unknown> = signal(null);
  #componentsSchema: Signal<unknown[]> = signal([]);
  #lastSurfaceId: Signal<string> = signal('demo');
  #suppressComponentsEffect = false;

  // DOM references
  #editorEl: (HTMLElement & NCodemirror) | null = null;
  #jsEditorEl: (HTMLElement & NCodemirror) | null = null;
  #componentsEditorEl: (HTMLElement & NCodemirror) | null = null;
  #previewEl: HTMLDivElement | null = null;
  #previewRegionEl: HTMLDivElement | null = null;
  #splitEl: HTMLDivElement | null = null;
  #paneEls: Map<PanelId, HTMLDivElement> = new Map();
  #paneContentEls: Map<PanelId, HTMLDivElement> = new Map();
  #chipEls: Map<PanelId, HTMLElement> = new Map();

  // Kernel + Adapter
  #kernel: InstanceType<typeof Kernel> | null = null;
  #adapter: A2UIAdapter | null = null;
  #busDisposer: Dispose | null = null;

  // Resize + Present
  #previewResize: ResizeController | null = null;
  #paneResizeMap: Map<PanelId, ResizeController> = new Map();
  #presentController: PresentController | null = null;
  #expandBtn: HTMLElement | null = null;

  // ── Public API ──

  get stream(): string { return this.#stream.value; }
  set stream(val: string) {
    this.#stream.value = val;
    if (this.#editorEl) {
      this.#editorEl.value = val;
    }
  }

  playAll(): void { this.#playAll(); }
  step(): void { this.#step(); }
  stepBack(): void { this.#stepBack(); }
  reset(): void { this.#reset(); }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.#buildDOM();
    this.#initAdapter();

    // Present controller — expand to full-viewport dialog (no built-in close — header handles it)
    this.#presentController = new PresentController(this as unknown as HTMLElement, { closeButton: false });

    // Sync expand icon with present/dismiss state
    this.addEventListener('native:present', this.#onPresent);
    this.addEventListener('native:dismiss', this.#onDismiss);

    // Wire resize controller on preview region
    if (this.#previewRegionEl) {
      this.#previewResize = new ResizeController(this.#previewRegionEl, {
        handleSelector: '.a2ui-resize-handle',
        axis: 'horizontal',
        min: 200,
      });

      // Lock proportion after resize: convert pixel width → percentage
      this.#previewRegionEl.addEventListener('native:resize-end', this.#onPreviewResizeEnd);
    }

    // Effect: panel visibility — toggle panes + chip active states + resize controllers
    // WHY: Use [data-active] instead of [pressed] — n-button's PressController
    // toggles [pressed] on click, which races with our effect.
    this.addEffect(() => {
      const active = this.#activePanels.value;
      for (const [id, el] of this.#paneEls) {
        el.hidden = !active.has(id);
      }
      for (const [id, chip] of this.#chipEls) {
        chip.toggleAttribute('data-active', active.has(id));
      }
      this.#syncResizeControllers(active);
    });

    // Effect: render COMPONENTS/UI pane (CodeMirror — editable component schema)
    this.addEffect(() => {
      const components = this.#componentsSchema.value;
      if (!this.#componentsEditorEl || this.#suppressComponentsEffect) {
        this.#suppressComponentsEffect = false;
        return;
      }
      this.#componentsEditorEl.value = components.length > 0
        ? JSON.stringify(components, null, 2)
        : '';
    });

    // Effect: render JSON-OUT pane (protocol messages)
    this.addEffect(() => {
      const entries = this.#outLog.value;
      this.#renderLog(entries, this.#paneContentEls.get('json-out') ?? null);
    });

    // Effect: render JS pane (CodeMirror — bus action events, 2-space formatted)
    this.addEffect(() => {
      const entries = this.#jsLog.value;
      if (!this.#jsEditorEl) return;
      this.#jsEditorEl.value = entries.length > 0
        ? entries.map(e => JSON.stringify(e.data, null, 2)).join('\n\n')
        : '';
    });

    // Effect: render HTML pane (preview innerHTML, formatted with 2-space indent)
    this.addEffect(() => {
      const html = this.#htmlState.value;
      const el = this.#paneContentEls.get('html');
      if (!el) return;

      el.textContent = '';
      if (html) {
        const pre = document.createElement('pre');
        pre.textContent = formatHTML(html);
        el.appendChild(pre);
      } else {
        const span = document.createElement('span');
        span.style.opacity = '0.5';
        span.textContent = 'No HTML yet. Play messages to render surfaces.';
        el.appendChild(span);
      }
    });

    // Effect: render CSS pane (computed tokens + surface themes)
    this.addEffect(() => {
      const styles = this.#cssState.value;
      const el = this.#paneContentEls.get('css');
      if (!el) return;

      el.textContent = '';
      if (styles !== null && typeof styles === 'object' && Object.keys(styles as Record<string, unknown>).length > 0) {
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(styles, null, 2);
        el.appendChild(pre);
      } else {
        const span = document.createElement('span');
        span.style.opacity = '0.5';
        span.textContent = 'No styles yet. Play messages to render surfaces.';
        el.appendChild(span);
      }
    });

    // Effect: update editor line decorations when cursor changes
    this.addEffect(() => {
      const cursor = this.#cursor.value;
      const view = this.#editorEl?.editorView;
      if (!view) return;

      const envelopes = this.#getEnvelopes();
      let sentUpToLine = 0;
      let nextFromLine = 0;
      let nextToLine = 0;

      for (let i = 0; i < envelopes.length; i++) {
        if (i < cursor) {
          sentUpToLine = envelopes[i].endLine;
        } else if (i === cursor) {
          nextFromLine = envelopes[i].startLine;
          nextToLine = envelopes[i].endLine;
          break;
        }
      }

      view.dispatch({
        effects: setDecorations.of({ sentUpToLine, nextFromLine, nextToLine }),
      });
    });

    // Content extraction + default preset
    this.deferChildren(() => {
      this.#extractContent();
      this.#createEditor();

      // If no embedded stream content, auto-load the default preset
      if (!this.#stream.value) {
        this.#loadPreset('card');
      }
    });
  }

  teardown(): void {
    this.#previewResize?.destroy();
    this.#previewResize = null;

    for (const [_id, ctrl] of this.#paneResizeMap) {
      ctrl.destroy();
    }
    this.#paneResizeMap.clear();

    this.removeEventListener('native:present', this.#onPresent);
    this.removeEventListener('native:dismiss', this.#onDismiss);
    this.#presentController?.destroy();
    this.#presentController = null;
    this.#expandBtn = null;

    this.#previewRegionEl?.removeEventListener('native:resize-end', this.#onPreviewResizeEnd);
    this.#previewRegionEl = null;
    this.#splitEl = null;
    this.#paneEls.clear();
    this.#paneContentEls.clear();
    this.#chipEls.clear();

    this.#destroyAdapter();

    this.#editorEl = null;
    this.#jsEditorEl = null;
    this.#componentsEditorEl = null;
    this.#previewEl = null;

    super.teardown();
  }

  // ── Adapter lifecycle ──

  #initAdapter(): void {
    resetKernel();
    this.#kernel = new Kernel({ allowUnregistered: true });
    this.#adapter = createA2UIAdapter(this.#kernel, {
      onClientMessage: (msg) => {
        this.#appendOutLog('received', msg);
      },
      onRender: (surfaceId) => {
        this.#appendOutLog('info', { message: `Surface ${surfaceId} rendered` });
        this.#updateInspector();
        this.#updateHTML();
        this.#updateCSS();
      },
    });

    this.#busDisposer = this.#kernel.bus.on(
      (cmd: { type: string }) => cmd.type.startsWith('a2ui:'),
      (cmd: { type: string; payload?: unknown }) => {
        this.#appendJsLog('action', { action: cmd.type, payload: cmd.payload });
        this.dispatchEvent(new CustomEvent('native:a2ui-action', {
          bubbles: true,
          detail: { type: cmd.type, payload: cmd.payload },
        }));
      },
    );
  }

  #destroyAdapter(): void {
    this.#busDisposer?.();
    this.#busDisposer = null;
    try { this.#adapter?.destroy(); } catch (_e) { /* ignore */ }
    this.#adapter = null;
    this.#kernel = null;
  }

  // ── Inspector state (COMPONENTS pane) ──

  #updateInspector(): void {
    if (!this.#adapter) return;

    const ids = this.#adapter.getSurfaceIds();
    const surfaces: Record<string, unknown> = {};
    for (const id of ids) {
      const surface = this.#adapter.getSurface(id);
      const dataModel = this.#adapter.getDataModel(id);
      surfaces[id] = {
        surfaceId: id,
        rendered: surface?.rendered ?? false,
        dataModel: dataModel ?? {},
      };
    }

    const state = { surfaces, surfaceCount: ids.length };
    this.#lastState.value = state;
    this.dispatchEvent(new CustomEvent('native:a2ui-state', {
      bubbles: true,
      detail: state,
    }));
  }

  // ── HTML state (HTML pane) ──

  #updateHTML(): void {
    if (!this.#previewEl) return;
    this.#htmlState.value = this.#previewEl.innerHTML;
  }

  // ── CSS state (CSS pane) ──

  #updateCSS(): void {
    if (!this.#adapter || !this.#previewEl) return;

    const ids = this.#adapter.getSurfaceIds();
    const styles: Record<string, unknown> = {};

    // Surface themes
    for (const id of ids) {
      const surface = this.#adapter.getSurface(id);
      if (surface?.theme) styles[`${id}/theme`] = surface.theme;
    }

    // Key tokens from preview container
    const cs = getComputedStyle(this.#previewEl);
    const tokens = [
      '--n-ink', '--n-background', '--n-border-color', '--n-ground',
      '--n-panel', '--n-control', '--n-body', '--n-card',
      '--n-ink-strong', '--n-ink-muted', '--n-border-muted',
    ];
    const computed: Record<string, string> = {};
    for (const t of tokens) {
      const v = cs.getPropertyValue(t).trim();
      if (v) computed[t] = v;
    }
    if (Object.keys(computed).length) styles['computed'] = computed;

    this.#cssState.value = styles;
  }

  // ── Resize controller sync ──

  #syncResizeControllers(active: Set<PanelId>): void {
    const visible = PANEL_ORDER.filter(id => active.has(id));
    const lastId = visible.length > 0 ? visible[visible.length - 1] : null;

    // Destroy controllers for hidden panels or the new last panel, clear explicit widths
    for (const [id, ctrl] of this.#paneResizeMap) {
      if (!active.has(id) || id === lastId) {
        ctrl.destroy();
        this.#paneResizeMap.delete(id);
        this.#paneEls.get(id)?.style.removeProperty('width');
      }
    }

    // Create controllers for visible non-last panels
    for (const id of visible) {
      if (id !== lastId && !this.#paneResizeMap.has(id)) {
        const el = this.#paneEls.get(id);
        if (el) {
          this.#paneResizeMap.set(id, new ResizeController(el, {
            handleSelector: '.a2ui-resize-handle',
            axis: 'horizontal',
            min: 150,
          }));
        }
      }
    }
  }

  // ── DOM construction ──

  #buildDOM(): void {
    // ── Header (n-header > n-toolbar) ──
    const headerWrap = document.createElement('n-header');

    const header = document.createElement('n-toolbar');
    header.setAttribute('size', 'sm');
    header.setAttribute('variant', 'ghost');

    // Preset select (leading slot) — manual mode with grouped options
    const presetSelect = document.createElement('n-select');
    presetSelect.setAttribute('size', 'sm');
    presetSelect.setAttribute('inline', '');
    presetSelect.setAttribute('slot', 'leading');

    const trigger = document.createElement('n-button');
    trigger.setAttribute('justify', 'spread');
    trigger.innerHTML = '<span slot="label">Presets</span><n-icon name="caret-up-down" slot="trailing"></n-icon>';
    presetSelect.appendChild(trigger);

    const listbox = document.createElement('n-listbox');
    listbox.setAttribute('popover', '');

    for (const group of PRESET_GROUPS) {
      const groupEntries = Object.entries(PRESETS).filter(([_, e]) => e.group === group.id);
      if (groupEntries.length === 0) continue;

      const optGroup = document.createElement('n-option-group');
      const heading = document.createElement('n-option-group-header');
      heading.textContent = group.label;
      optGroup.appendChild(heading);

      for (const [key, entry] of groupEntries) {
        const opt = document.createElement('n-option');
        opt.setAttribute('value', key);
        opt.setAttribute('label', entry.label);
        opt.textContent = entry.label;
        optGroup.appendChild(opt);
      }

      listbox.appendChild(optGroup);
    }

    presetSelect.appendChild(listbox);
    presetSelect.addEventListener('native:change', this.#onPresetChange);
    headerWrap.appendChild(presetSelect);

    // Panel toggle chips + expand (trailing slot)
    header.setAttribute('slot', 'trailing');
    for (const id of PANEL_ORDER) {
      const chip = document.createElement('n-button');
      chip.setAttribute('variant', 'ghost');
      chip.setAttribute('size', 'sm');
      chip.textContent = PANEL_LABELS[id];
      if (this.#activePanels.value.has(id)) {
        chip.toggleAttribute('data-active', true);
      }
      chip.addEventListener('native:press', this.#onChipPress(id));
      header.appendChild(chip);
      this.#chipEls.set(id, chip);
    }

    // Expand/close toggle (far right)
    const expandBtn = document.createElement('n-button');
    expandBtn.setAttribute('variant', 'ghost');
    expandBtn.setAttribute('size', 'sm');
    expandBtn.title = 'Expand';
    expandBtn.innerHTML = '<n-icon name="arrows-out-simple"></n-icon>';
    expandBtn.addEventListener('native:press', this.#onExpandToggle);
    header.appendChild(expandBtn);
    this.#expandBtn = expandBtn;

    // ── Split (preview + panes) ──
    const split = document.createElement('div');
    split.className = 'a2ui-split';
    this.#splitEl = split;

    // Preview (left side)
    const preview = document.createElement('div');
    preview.className = 'a2ui-preview';
    this.#previewRegionEl = preview;

    const previewContent = document.createElement('div');
    previewContent.className = 'a2ui-preview-content';
    preview.appendChild(previewContent);
    this.#previewEl = previewContent;

    const previewHandle = document.createElement('div');
    previewHandle.className = 'a2ui-resize-handle';
    preview.appendChild(previewHandle);

    split.appendChild(preview);

    // ── Panes ──

    for (const id of PANEL_ORDER) {
      const pane = document.createElement('div');
      pane.className = 'a2ui-pane';
      pane.dataset.panel = id;
      if (!this.#activePanels.value.has(id)) {
        pane.hidden = true;
      }

      // Pane header: [icon] [label] ... [X]
      const paneHeader = document.createElement('n-header');
      paneHeader.setAttribute('size', 'sm');

      const headerIcon = document.createElement('n-icon');
      headerIcon.setAttribute('name', PANEL_ICONS[id]);
      headerIcon.setAttribute('slot', 'leading');
      paneHeader.appendChild(headerIcon);

      const headerLabel = document.createElement('span');
      headerLabel.setAttribute('slot', 'label');
      headerLabel.textContent = PANEL_LABELS[id];
      paneHeader.appendChild(headerLabel);

      const closeBtn = document.createElement('n-button');
      closeBtn.setAttribute('variant', 'ghost');
      closeBtn.setAttribute('size', 'sm');
      closeBtn.setAttribute('slot', 'trailing');
      closeBtn.title = 'Close pane';
      closeBtn.innerHTML = '<n-icon name="x"></n-icon>';
      closeBtn.addEventListener('native:press', this.#onChipPress(id));
      paneHeader.appendChild(closeBtn);

      pane.appendChild(paneHeader);

      // JSON-IN pane gets a playback toolbar below the header
      if (id === 'json-in') {
        const toolbar = document.createElement('n-toolbar');
        toolbar.setAttribute('variant', 'plain');
        toolbar.setAttribute('size', 'sm');
        toolbar.setAttribute('fill', '');

        const stepBackBtn = this.#createToolbarButton('Step back', 'caret-left');
        stepBackBtn.addEventListener('native:press', this.#onStepBack);
        const resetBtn = this.#createToolbarButton('Reset', 'arrow-counter-clockwise');
        resetBtn.addEventListener('native:press', this.#onReset);
        const stepBtn = this.#createToolbarButton('Step forward', 'caret-right');
        stepBtn.addEventListener('native:press', this.#onStep);

        const playBtn = this.#createToolbarButton('Play all', 'play', true);
        playBtn.dataset.role = 'run';
        playBtn.addEventListener('native:press', this.#onPlayAll);

        toolbar.append(stepBackBtn, resetBtn, stepBtn, playBtn);
        pane.appendChild(toolbar);
      }

      // Content area
      const content = document.createElement('div');
      content.className = 'a2ui-pane-content';
      pane.appendChild(content);
      this.#paneContentEls.set(id, content);

      // CodeMirror editors
      if (id === 'json-in' || id === 'js' || id === 'components') {
        const editorEl = document.createElement('native-codemirror') as HTMLElement & NCodemirror;
        editorEl.setAttribute('line-numbers', 'false');
        content.appendChild(editorEl);
        if (id === 'json-in') this.#editorEl = editorEl;
        else if (id === 'js') this.#jsEditorEl = editorEl;
        else this.#componentsEditorEl = editorEl;
      }

      // Resize handle (every pane gets one; controller created only for non-last visible)
      const handle = document.createElement('div');
      handle.className = 'a2ui-resize-handle';
      pane.appendChild(handle);

      split.appendChild(pane);
      this.#paneEls.set(id, pane);
    }

    // Assemble
    headerWrap.appendChild(header);
    this.append(headerWrap, split);
  }

  #createToolbarButton(title: string, icon: string, iconFill = false): HTMLElement {
    const btn = document.createElement('n-button');
    btn.title = title;
    btn.setAttribute('variant', 'ghost');
    btn.innerHTML = `<n-icon name="${icon}"${iconFill ? ' weight="fill"' : ''}></n-icon>`;
    return btn;
  }

  // ── Content extraction ──

  #extractContent(): void {
    const script = this.querySelector<HTMLScriptElement>('script[type="a2ui/stream"]');
    if (script) {
      const content = (script.textContent ?? '').trim();
      this.#stream.value = content;
      script.remove();
    }
  }

  // ── Editor creation ──

  #createEditor(): void {
    if (!this.#editorEl) return;

    this.#editorEl.value = this.#stream.value;
    this.#editorEl.extensions = [json(), sentLineField];

    this.#editorEl.addEventListener('native:input', (e: Event) => {
      this.#stream.value = (e as CustomEvent).detail.value;
    });

    // JS editor — JSON syntax highlighting (read-only display)
    if (this.#jsEditorEl) this.#jsEditorEl.extensions = [json()];

    // COMPONENTS/UI editor — JSON syntax highlighting + bidirectional editing
    if (this.#componentsEditorEl) {
      this.#componentsEditorEl.extensions = [json()];
      this.#componentsEditorEl.addEventListener('native:input', this.#onComponentsEdit);
    }
  }

  // ── JSONL helpers ──

  /** Parse JSON envelopes from the editor stream (supports multi-line formatted JSON). */
  #getEnvelopes(): EnvelopeInfo[] {
    const text = this.#stream.value;
    if (!text.trim()) return [];

    const result: EnvelopeInfo[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          const startLine = text.substring(0, start).split('\n').length;
          const endLine = text.substring(0, i + 1).split('\n').length;
          result.push({ text: text.substring(start, i + 1), startLine, endLine });
          start = -1;
        }
      }
    }

    return result;
  }

  // ── Playback ──

  #playAll(): void {
    const envelopes = this.#getEnvelopes();
    if (!this.#adapter || !this.#previewEl) return;

    for (let i = this.#cursor.value; i < envelopes.length; i++) {
      try {
        const envelope = JSON.parse(envelopes[i].text);
        this.#appendInLog('sent', envelope);
        this.#adapter.receive(envelope, this.#previewEl);
        this.#trackComponents(envelope);
      } catch (err) {
        this.#appendInLog('error', { envelope: i + 1, message: String(err), raw: envelopes[i].text });
      }
    }

    this.#cursor.value = envelopes.length;
    this.#updateInspector();
    this.#updateHTML();
    this.#updateCSS();
  }

  #step(): void {
    const envelopes = this.#getEnvelopes();
    if (!this.#adapter || !this.#previewEl) return;

    const idx = this.#cursor.value;
    if (idx >= envelopes.length) return;

    try {
      const envelope = JSON.parse(envelopes[idx].text);
      this.#appendInLog('sent', envelope);
      this.#adapter.receive(envelope, this.#previewEl);
      this.#trackComponents(envelope);
    } catch (err) {
      this.#appendInLog('error', { envelope: idx + 1, message: String(err), raw: envelopes[idx].text });
    }

    this.#cursor.value = idx + 1;
    this.#updateInspector();
    this.#updateHTML();
    this.#updateCSS();
  }

  #stepBack(): void {
    if (this.#cursor.value <= 0) return;
    const targetCursor = this.#cursor.value - 1;

    // Reset adapter + preview
    this.#destroyAdapter();
    if (this.#previewEl) this.#previewEl.textContent = '';
    this.#inLog.value = [];
    this.#outLog.value = [];
    this.#jsLog.value = [];
    this.#lastState.value = null;
    this.#htmlState.value = '';
    this.#cssState.value = null;
    this.#componentsSchema.value = [];
    this.#lastSurfaceId.value = 'demo';
    this.#initAdapter();

    // Replay up to targetCursor
    this.#cursor.value = 0;
    const envelopes = this.#getEnvelopes();
    if (!this.#adapter || !this.#previewEl) return;

    for (let i = 0; i < targetCursor; i++) {
      try {
        const envelope = JSON.parse(envelopes[i].text);
        this.#appendInLog('sent', envelope);
        this.#adapter.receive(envelope, this.#previewEl);
        this.#trackComponents(envelope);
      } catch (err) {
        this.#appendInLog('error', { envelope: i + 1, message: String(err), raw: envelopes[i].text });
      }
    }

    this.#cursor.value = targetCursor;
    this.#updateInspector();
    this.#updateHTML();
    this.#updateCSS();
  }

  #reset(): void {
    this.#destroyAdapter();

    if (this.#previewEl) {
      this.#previewEl.textContent = '';
    }

    this.#cursor.value = 0;
    this.#inLog.value = [];
    this.#outLog.value = [];
    this.#jsLog.value = [];
    this.#lastState.value = null;
    this.#htmlState.value = '';
    this.#cssState.value = null;
    this.#componentsSchema.value = [];
    this.#lastSurfaceId.value = 'demo';

    this.#initAdapter();
  }

  // ── Log management ──

  #appendInLog(type: LogEntry['type'], data: unknown): void {
    this.#inLog.value = [...this.#inLog.value, { type, data, timestamp: Date.now() }];
  }

  #appendOutLog(type: LogEntry['type'], data: unknown): void {
    this.#outLog.value = [...this.#outLog.value, { type, data, timestamp: Date.now() }];
  }

  #appendJsLog(type: LogEntry['type'], data: unknown): void {
    this.#jsLog.value = [...this.#jsLog.value, { type, data, timestamp: Date.now() }];
  }

  #renderLog(entries: LogEntry[], el: HTMLDivElement | null): void {
    if (!el) return;

    el.textContent = '';

    if (entries.length === 0) {
      const span = document.createElement('span');
      span.style.opacity = '0.5';
      span.textContent = 'No messages yet.';
      el.appendChild(span);
      return;
    }

    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'a2ui-log-entry';

      const typeSpan = document.createElement('span');
      typeSpan.className = `a2ui-log-type a2ui-log-type--${entry.type}`;
      typeSpan.textContent = entry.type.toUpperCase();

      const timeSpan = document.createElement('span');
      timeSpan.style.cssText = 'opacity: 0.5; margin-left: 0.5rem; font-size: 0.75rem;';
      const d = new Date(entry.timestamp);
      timeSpan.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;

      const dataEl = document.createElement('pre');
      dataEl.style.cssText = 'margin: 0.25rem 0 0; white-space: pre-wrap; word-break: break-all;';
      dataEl.textContent = JSON.stringify(entry.data, null, 2);

      row.append(typeSpan, timeSpan, dataEl);
      el.appendChild(row);
    }

    el.scrollTop = el.scrollHeight;
  }

  // ── Event handlers (arrow properties for stable references) ──

  #onExpandToggle = (): void => { this.#presentController?.toggle(); };

  #onPresent = (): void => {
    if (this.#expandBtn) {
      this.#expandBtn.innerHTML = '<n-icon name="x"></n-icon>';
      this.#expandBtn.title = 'Close';
    }
  };

  #onDismiss = (): void => {
    if (this.#expandBtn) {
      this.#expandBtn.innerHTML = '<n-icon name="arrows-out-simple"></n-icon>';
      this.#expandBtn.title = 'Expand';
    }
  };

  #onPresetChange = (e: Event): void => {
    const key = (e as CustomEvent).detail?.value;
    if (!key) return;
    this.#loadPreset(key);
  };

  #loadPreset(key: string): void {
    if (!PRESETS[key]) return;

    const envelope = PRESETS[key].envelope;
    // Build JSONL: createSurface + updateComponents
    const surfaceId = (envelope.updateComponents as { surfaceId?: string })?.surfaceId ?? 'demo';
    const blocks = [
      JSON.stringify({ createSurface: { surfaceId }, version: '0.9' }, null, 2),
      JSON.stringify({ ...envelope, version: '0.9' }, null, 2),
    ];
    const stream = blocks.join('\n\n');

    // Reset, load into editor, auto-play
    this.#reset();
    this.stream = stream;
    this.#playAll();
  }

  #onPlayAll = (): void => { this.#playAll(); };
  #onStep = (): void => { this.#step(); };
  #onStepBack = (): void => { this.#stepBack(); };
  #onReset = (): void => { this.#reset(); };

  #onPreviewResizeEnd = (): void => {
    if (!this.#previewRegionEl || !this.#splitEl) return;
    const splitWidth = this.#splitEl.offsetWidth;
    if (splitWidth <= 0) return;
    const ratio = this.#previewRegionEl.offsetWidth / splitWidth;
    this.#previewRegionEl.style.width = `${(ratio * 100).toFixed(2)}%`;
  };

  /** Track last updateComponents envelope for the UI pane. */
  #trackComponents(envelope: Record<string, unknown>): void {
    const uc = envelope.updateComponents as { surfaceId?: string; components?: unknown[] } | undefined;
    if (uc?.components) {
      this.#componentsSchema.value = uc.components;
      if (uc.surfaceId) this.#lastSurfaceId.value = uc.surfaceId;
    }
  }

  /** Handle user edits in the COMPONENTS/UI pane — send updateComponents to adapter. */
  #onComponentsEdit = (e: Event): void => {
    const value = (e as CustomEvent).detail?.value;
    if (!value || !this.#adapter || !this.#previewEl) return;

    try {
      const components = JSON.parse(value);
      if (!Array.isArray(components)) return;

      this.#suppressComponentsEffect = true;
      this.#componentsSchema.value = components;

      this.#adapter.receive(
        { updateComponents: { surfaceId: this.#lastSurfaceId.value, components }, version: '0.9' },
        this.#previewEl,
      );
      this.#updateHTML();
      this.#updateCSS();
    } catch (_e) {
      // Invalid JSON — ignore until user finishes editing
    }
  };

  #onChipPress = (panelId: PanelId) => (): void => {
    const current = new Set(this.#activePanels.value);
    if (current.has(panelId)) {
      current.delete(panelId);
    } else {
      current.add(panelId);
    }
    this.#activePanels.value = current;
  };
}

// ═══════════════════════════════════════════════════════
// HTML formatter — 2-space indented pretty-print
// ═══════════════════════════════════════════════════════

function formatHTML(html: string): string {
  let result = '';
  let depth = 0;
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) break;
      const tag = html.substring(i, end + 1);
      const isClosing = tag.startsWith('</');
      const isSelfClosing = tag.endsWith('/>');

      if (isClosing) depth--;
      result += '  '.repeat(Math.max(0, depth)) + tag + '\n';
      if (!isClosing && !isSelfClosing) depth++;

      i = end + 1;
    } else {
      let textEnd = html.indexOf('<', i);
      if (textEnd === -1) textEnd = html.length;
      const text = html.substring(i, textEnd).trim();
      if (text) {
        result += '  '.repeat(Math.max(0, depth)) + text + '\n';
      }
      i = textEnd;
    }
  }

  return result.trimEnd();
}
