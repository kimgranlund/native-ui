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

// Icons used by the workbench toolbar
import '../../../src/icons/phosphor/caret-left.ts';
import '../../../src/icons/phosphor/caret-right.ts';
import '../../../src/icons/phosphor/arrow-counter-clockwise.ts';
import '../../../src/icons/phosphor/play-fill.ts';
import '../../../src/icons/phosphor/arrows-out-simple.ts';
import { createA2UIAdapter } from './protocol/a2ui-adapter.ts';
import type { A2UIAdapter } from './protocol/a2ui-adapter.ts';

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

interface LogEntry {
  type: 'sent' | 'received' | 'action' | 'error' | 'info';
  data: unknown;
  timestamp: number;
}

// ── Line decoration effects for sent/next highlighting ──

const setSentLines = StateEffect.define<{ upTo: number }>();

const sentDeco = Decoration.line({ class: 'cm-a2ui-sent' });
const nextDeco = Decoration.line({ class: 'cm-a2ui-next' });

const sentLineField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setSentLines)) {
        const doc = tr.state.doc;
        const upTo = Math.min(e.value.upTo, doc.lines);
        const ranges = [];
        for (let i = 1; i <= upTo; i++) {
          ranges.push(sentDeco.range(doc.line(i).from));
        }
        if (upTo < doc.lines) {
          ranges.push(nextDeco.range(doc.line(upTo + 1).from));
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

  // DOM references
  #editorEl: (HTMLElement & NCodemirror) | null = null;
  #jsEditorEl: (HTMLElement & NCodemirror) | null = null;
  #componentsEditorEl: (HTMLElement & NCodemirror) | null = null;
  #previewEl: HTMLDivElement | null = null;
  #previewRegionEl: HTMLDivElement | null = null;
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

    // Present controller — expand to full-viewport dialog
    this.#presentController = new PresentController(this as unknown as HTMLElement);

    // Wire resize controller on preview region
    if (this.#previewRegionEl) {
      this.#previewResize = new ResizeController(this.#previewRegionEl, {
        handleSelector: '.a2ui-resize-handle',
        axis: 'horizontal',
        min: 200,
      });
    }

    // Effect: panel visibility — toggle panes + chip pressed states + resize controllers
    this.addEffect(() => {
      const active = this.#activePanels.value;
      for (const [id, el] of this.#paneEls) {
        el.hidden = !active.has(id);
      }
      for (const [id, chip] of this.#chipEls) {
        chip.toggleAttribute('pressed', active.has(id));
      }
      this.#syncResizeControllers(active);
    });

    // Effect: render COMPONENTS pane (CodeMirror)
    this.addEffect(() => {
      const state = this.#lastState.value;
      if (!this.#componentsEditorEl) return;
      this.#componentsEditorEl.value = state !== null
        ? JSON.stringify(state, null, 2)
        : '';
    });

    // Effect: render JSON-OUT pane (protocol messages)
    this.addEffect(() => {
      const entries = this.#outLog.value;
      this.#renderLog(entries, this.#paneContentEls.get('json-out') ?? null);
    });

    // Effect: render JS pane (CodeMirror — bus action events)
    this.addEffect(() => {
      const entries = this.#jsLog.value;
      if (!this.#jsEditorEl) return;
      this.#jsEditorEl.value = entries.length > 0
        ? entries.map(e => JSON.stringify(e.data)).join('\n')
        : '';
    });

    // Effect: render HTML pane (preview innerHTML)
    this.addEffect(() => {
      const html = this.#htmlState.value;
      const el = this.#paneContentEls.get('html');
      if (!el) return;

      el.textContent = '';
      if (html) {
        const pre = document.createElement('pre');
        pre.textContent = html;
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
      if (view) {
        view.dispatch({
          effects: setSentLines.of({ upTo: cursor }),
        });
      }
    });

    // Content extraction
    this.deferChildren(() => {
      this.#extractContent();
      this.#createEditor();
    });
  }

  teardown(): void {
    this.#previewResize?.destroy();
    this.#previewResize = null;

    for (const [_id, ctrl] of this.#paneResizeMap) {
      ctrl.destroy();
    }
    this.#paneResizeMap.clear();

    this.#presentController?.destroy();
    this.#presentController = null;

    this.#previewRegionEl = null;
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
    // ── Header toolbar (chips + expand) ──
    const header = document.createElement('n-toolbar');
    header.className = 'a2ui-header';
    header.setAttribute('size', 'sm');
    header.setAttribute('variant', 'ghost');

    for (const id of PANEL_ORDER) {
      const chip = document.createElement('n-button');
      chip.setAttribute('variant', 'ghost');
      chip.setAttribute('size', 'sm');
      chip.textContent = PANEL_LABELS[id];
      if (this.#activePanels.value.has(id)) {
        chip.setAttribute('pressed', '');
      }
      chip.addEventListener('native:press', this.#onChipPress(id));
      header.appendChild(chip);
      this.#chipEls.set(id, chip);
    }

    const spacerHeader = document.createElement('span');
    spacerHeader.setAttribute('fill', '');
    header.appendChild(spacerHeader);

    const expandBtn = document.createElement('n-button');
    expandBtn.setAttribute('variant', 'ghost');
    expandBtn.setAttribute('size', 'sm');
    expandBtn.title = 'Expand';
    expandBtn.innerHTML = '<n-icon name="arrows-out-simple"></n-icon>';
    expandBtn.addEventListener('native:press', this.#onExpand);
    header.appendChild(expandBtn);

    // ── Split (preview + panes) ──
    const split = document.createElement('div');
    split.className = 'a2ui-split';

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

      // JSON-IN pane gets a playback toolbar
      if (id === 'json-in') {
        const toolbar = document.createElement('n-toolbar');
        toolbar.className = 'a2ui-toolbar';
        toolbar.setAttribute('variant', 'plain');
        toolbar.setAttribute('size', 'sm');
        toolbar.setAttribute('fill', '');

        const stepBackBtn = this.#createToolbarButton('', 'Step back', 'caret-left');
        stepBackBtn.addEventListener('native:press', this.#onStepBack);
        const resetBtn = this.#createToolbarButton('', 'Reset', 'arrow-counter-clockwise');
        resetBtn.addEventListener('native:press', this.#onReset);
        const stepBtn = this.#createToolbarButton('', 'Step forward', 'caret-right');
        stepBtn.addEventListener('native:press', this.#onStep);

        const playBtn = this.#createToolbarButton('a2ui-btn-run', 'Play all', 'play', true);
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
    this.append(header, split);
  }

  #createToolbarButton(className: string, title: string, icon: string, iconFill = false): HTMLElement {
    const btn = document.createElement('n-button');
    btn.className = className;
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

    // JS + COMPONENTS editors — JSON syntax highlighting
    if (this.#jsEditorEl) this.#jsEditorEl.extensions = [json()];
    if (this.#componentsEditorEl) this.#componentsEditorEl.extensions = [json()];
  }

  // ── JSONL helpers ──

  #getLines(): string[] {
    return this.#stream.value
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('//'));
  }

  // ── Playback ──

  #playAll(): void {
    const lines = this.#getLines();
    if (!this.#adapter || !this.#previewEl) return;

    for (let i = this.#cursor.value; i < lines.length; i++) {
      const line = lines[i];
      try {
        const envelope = JSON.parse(line);
        this.#appendInLog('sent', envelope);
        this.#adapter.receive(envelope, this.#previewEl);
      } catch (err) {
        this.#appendInLog('error', { line: i + 1, message: String(err), raw: line });
      }
    }

    this.#cursor.value = lines.length;
    this.#updateInspector();
    this.#updateHTML();
    this.#updateCSS();
  }

  #step(): void {
    const lines = this.#getLines();
    if (!this.#adapter || !this.#previewEl) return;

    const idx = this.#cursor.value;
    if (idx >= lines.length) return;

    const line = lines[idx];
    try {
      const envelope = JSON.parse(line);
      this.#appendInLog('sent', envelope);
      this.#adapter.receive(envelope, this.#previewEl);
    } catch (err) {
      this.#appendInLog('error', { line: idx + 1, message: String(err), raw: line });
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
    this.#initAdapter();

    // Replay up to targetCursor
    this.#cursor.value = 0;
    const lines = this.#getLines();
    if (!this.#adapter || !this.#previewEl) return;

    for (let i = 0; i < targetCursor; i++) {
      const line = lines[i];
      try {
        const envelope = JSON.parse(line);
        this.#appendInLog('sent', envelope);
        this.#adapter.receive(envelope, this.#previewEl);
      } catch (err) {
        this.#appendInLog('error', { line: i + 1, message: String(err), raw: line });
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

  #onExpand = (): void => {
    this.#presentController?.present();
  };

  #onPlayAll = (): void => { this.#playAll(); };
  #onStep = (): void => { this.#step(); };
  #onStepBack = (): void => { this.#stepBack(); };
  #onReset = (): void => { this.#reset(); };

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
