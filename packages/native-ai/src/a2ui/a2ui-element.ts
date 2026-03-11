/**
 * NA2UI — A2UI Protocol Workbench Element
 *
 * Layout: chip-toggled multi-panel — preview left, N resizable panes right.
 * Chips: JSON-IN, JSON-OUT, HTML, CSS, JS, COMPONENTS (multiple active at once).
 * Chrome & layout patterns mirror <n-playground> for a unified devtool look.
 *
 * Renders A2UI components directly (no iframe) using a local Kernel + A2UIAdapter.
 * Native-ui components must be registered on the page for rendering to work.
 *
 * @attr {string} stream - JSONL envelope stream content
 * @fires native:a2ui-action - When an action fires inside the preview
 * @fires native:a2ui-state  - When surface state updates after processing envelopes
 */

import { NativeElement, signal } from '@nonoun/native-core';
import type { Signal, Dispose } from '@nonoun/native-core';
import { ResizeController, PresentController } from '@nonoun/native-traits';
import {
  EditorView,
  keymap,
  Decoration,
  StateField,
  StateEffect,
} from '@nonoun/native-code';
import type { NCodeEditor } from '@nonoun/native-code';
import type { DecorationSet } from '@nonoun/native-code';
import { json } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import '@nonoun/native-code/register';

import { a2uiLinter } from './a2ui-diagnostics.ts';

import { Kernel, resetKernel } from '@nonoun/native-kernel';

import { createA2UIAdapter } from './protocol/a2ui-adapter.ts';
import type { A2UIAdapter } from './protocol/a2ui-adapter.ts';
import { PRESETS, PRESET_GROUPS } from './a2ui-presets.ts';
import { ComponentRegistry, defaultRegistry } from './protocol/a2ui-component-map.ts';


// ── Types ──

type PanelId = 'json-in' | 'json-out' | 'html' | 'css' | 'js' | 'components' | 'schema';

const PANEL_ORDER: readonly PanelId[] = ['json-in', 'json-out', 'html', 'css', 'js', 'components', 'schema'];

const PANEL_LABELS: Record<PanelId, string> = {
  'json-in': 'IN',
  'json-out': 'OUT',
  'html': 'HTML',
  'css': 'CSS',
  'js': 'JS',
  'components': 'UI',
  'schema': 'SCHEMA',
};

const PANEL_ICONS: Record<PanelId, string> = {
  'json-in': 'brackets-curly',
  'json-out': 'chat-circle-dots',
  'html': 'code',
  'css': 'palette',
  'js': 'terminal',
  'components': 'squares-four',
  'schema': 'file-code',
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
  update(value: DecorationSet, tr: import('@codemirror/state').Transaction) {
    for (const e of tr.effects) {
      if (e.is(setDecorations)) {
        const doc = tr.state.doc;
        const { sentUpToLine, nextFromLine, nextToLine } = e.value as { sentUpToLine: number; nextFromLine: number; nextToLine: number };
        const ranges = [];
        for (let i = 1; i <= Math.min(sentUpToLine, doc.lines); i++) {
          ranges.push(sentDeco.range(doc.line(i).from));
        }
        for (let i = Math.max(1, nextFromLine); i <= Math.min(nextToLine, doc.lines); i++) {
          ranges.push(nextDeco.range(doc.line(i).from));
        }
        return Decoration.set(ranges, true);
      }
    }
    return value;
  },
  provide: (f: import('@codemirror/state').StateField<DecorationSet>) => EditorView.decorations.from(f),
});

// ── Element ──

export class NA2UI extends NativeElement {
  static observedAttributes = ['stream'];

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
  #activeA2UITypes: Signal<Set<string>> = signal(new Set<string>());
  #lastSurfaceId: Signal<string> = signal('demo');
  #autoPlay: Signal<boolean> = signal(false);
  #jsLogCursor = 0;

  // DOM references
  #editorEl: (HTMLElement & NCodeEditor) | null = null;
  #jsEditorEl: (HTMLElement & NCodeEditor) | null = null;
  #htmlEditorEl: (HTMLElement & NCodeEditor) | null = null;
  #cssEditorEl: (HTMLElement & NCodeEditor) | null = null;
  #componentEditorEl: (HTMLElement & NCodeEditor) | null = null;
  #componentMapEl: HTMLElement | null = null;
  #schemaEditorEl: (HTMLElement & NCodeEditor) | null = null;
  #previewEl: HTMLDivElement | null = null;
  #previewRegionEl: HTMLDivElement | null = null;
  #splitEl: HTMLDivElement | null = null;
  #paneEls: Map<PanelId, HTMLElement> = new Map();
  #paneContentEls: Map<PanelId, HTMLElement> = new Map();
  #chipEls: Map<PanelId, HTMLElement> = new Map();

  // Registry
  #registry: ComponentRegistry = defaultRegistry.clone();

  // Kernel + Adapter
  #kernel: InstanceType<typeof Kernel> | null = null;
  #adapter: A2UIAdapter | null = null;
  #busDisposer: Dispose | null = null;

  // Resize + Present
  #previewResize: ResizeController | null = null;
  #presentController: PresentController | null = null;
  #expandBtn: HTMLElement | null = null;
  #autoPlayChip: HTMLElement | null = null;

  // Coordinated pane resize state
  #resizeDrag: {
    targetId: PanelId;      // pane to the RIGHT of the handle (the one being resized)
    startX: number;
    previewStartW: number;
    targetStartW: number;
    leftPanes: { id: PanelId; startW: number }[];  // panes between preview and target
  } | null = null;

  // ── Public API ──

  get stream(): string { return this.#stream.value; }
  set stream(val: string) {
    this.#stream.value = val;
    if (this.#editorEl) {
      this.#editorEl.value = val;
    }
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'stream') {
      this.#stream.value = val ?? '';
      if (this.#editorEl) this.#editorEl.value = val ?? '';
    }
    super.attributeChangedCallback?.(name, old, val);
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

    // Wire coordinated pane resize on split container
    if (this.#splitEl) {
      this.#splitEl.addEventListener('pointerdown', this.#onPanePointerDown);
      this.#splitEl.addEventListener('dblclick', this.#onPaneHandleDblClick);
    }

    // Effect: panel visibility — toggle panes + chip active states
    // WHY: Use [data-active] instead of [pressed] — n-button's PressController
    // toggles [pressed] on click, which races with our effect.
    this.addEffect(() => {
      const active = this.#activePanels.value;
      // Clear stale pixel widths (from interrupted drags) but preserve flex-grow
      // ratios — they redistribute proportionally when panels are added/removed.
      for (const [_, el] of this.#paneEls) el.style.removeProperty('width');
      for (const [id, el] of this.#paneEls) {
        el.hidden = !active.has(id);
      }
      for (const [id, chip] of this.#chipEls) {
        chip.toggleAttribute('data-active', active.has(id));
      }
    });

    // Effect: render COMPONENTS/UI pane (component mapping table)
    this.addEffect(() => {
      this.#registry.version.value; // track registry mutations
      const activeTypes = this.#activeA2UITypes.value;
      if (!this.#componentMapEl) return;
      this.#renderComponentMap(this.#componentMapEl, activeTypes);
    });

    // Effect: init + sync SCHEMA pane editor
    this.addEffect(() => {
      const ver = this.#registry.version.value; // track registry mutations
      const editor = this.#schemaEditorEl;
      if (!editor) return;
      // Init extensions once
      if (!editor.extensions?.length) {
        requestAnimationFrame(() => {
          editor.extensions = [json()];
          editor.value = JSON.stringify(this.#registry.toJSON(), null, 2);
        });
        return;
      }
      // Sync: update content when registry changes (but not if editor is focused)
      const root = editor.shadowRoot ?? editor;
      if (root.querySelector('.cm-focused')) return; // don't clobber mid-edit
      editor.value = JSON.stringify(this.#registry.toJSON(), null, 2);
      void ver; // suppress unused
    });

    // Effect: render JSON-OUT pane (protocol messages)
    this.addEffect(() => {
      const entries = this.#outLog.value;
      this.#renderLog(entries, this.#paneContentEls.get('json-out') ?? null);
    });

    // Effect: append new action events to JS pane (preserves user edits)
    this.addEffect(() => {
      const entries = this.#jsLog.value;
      if (!this.#jsEditorEl) return;
      // Only append entries we haven't seen yet
      const newEntries = entries.slice(this.#jsLogCursor);
      if (newEntries.length === 0) return;
      this.#jsLogCursor = entries.length;
      const formatted = newEntries.map(e => JSON.stringify(e.data, null, 2)).join('\n\n');
      const current = this.#jsEditorEl.value;
      this.#jsEditorEl.value = current
        ? current + '\n\n' + formatted
        : formatted;
    });

    // Effect: render HTML pane
    this.addEffect(() => {
      const html = this.#htmlState.value;
      if (!this.#htmlEditorEl) return;
      this.#htmlEditorEl.value = html ? formatHTML(html) : '';
    });

    // Effect: render CSS pane
    this.addEffect(() => {
      const styles = this.#cssState.value;
      if (!this.#cssEditorEl) return;
      if (styles !== null && typeof styles === 'object' && Object.keys(styles as Record<string, unknown>).length > 0) {
        this.#cssEditorEl.value = JSON.stringify(styles, null, 2);
      } else {
        this.#cssEditorEl.value = '';
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

    this.removeEventListener('native:present', this.#onPresent);
    this.removeEventListener('native:dismiss', this.#onDismiss);
    this.#presentController?.destroy();
    this.#presentController = null;
    this.#expandBtn = null;
    this.#autoPlayChip = null;

    this.#previewRegionEl?.removeEventListener('native:resize-end', this.#onPreviewResizeEnd);
    this.#splitEl?.removeEventListener('pointerdown', this.#onPanePointerDown);
    this.#splitEl?.removeEventListener('dblclick', this.#onPaneHandleDblClick);
    document.removeEventListener('pointermove', this.#onPanePointerMove);
    document.removeEventListener('pointerup', this.#onPanePointerUp);
    this.#resizeDrag = null;
    this.#previewRegionEl = null;
    this.#splitEl = null;
    this.#paneEls.clear();
    this.#paneContentEls.clear();
    this.#chipEls.clear();

    this.#destroyAdapter();

    this.#editorEl = null;
    this.#jsEditorEl = null;
    this.#htmlEditorEl = null;
    this.#cssEditorEl = null;
    this.#componentEditorEl = null;
    this.#componentMapEl = null;
    this.#schemaEditorEl = null;
    this.#previewEl = null;

    super.teardown();
  }

  // ── Adapter lifecycle ──

  #initAdapter(): void {
    resetKernel();
    this.#kernel = new Kernel({ allowUnregistered: true });
    this.#adapter = createA2UIAdapter(this.#kernel, {
      registry: this.#registry,
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

  /** Destroy and recreate adapter (after registry swap). */
  #reinitAdapter(): void {
    const savedStream = this.#stream.value;
    this.#destroyAdapter();
    this.#initAdapter();
    if (savedStream) {
      // Reset playback state so #playAll replays from the start
      this.#cursor.value = 0;
      if (this.#previewEl) this.#previewEl.textContent = '';
      this.stream = savedStream;
      this.#playAll();
    }
  }

  // ── Schema pane actions ──

  #applySchema(): void {
    const editor = this.#schemaEditorEl;
    if (!editor) return;
    let data: unknown;
    try { data = JSON.parse(editor.value); } catch { return; }
    if (!data || typeof data !== 'object') return;
    this.#registry = ComponentRegistry.fromJSON(data as ReturnType<ComponentRegistry['toJSON']>);
    this.#reinitAdapter();
    if (this.#componentMapEl) {
      this.#renderComponentMap(this.#componentMapEl, this.#activeA2UITypes.value);
    }
  }

  #formatSchema(): void {
    const editor = this.#schemaEditorEl;
    if (!editor) return;
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed, null, 2);
    } catch { /* invalid JSON — leave as-is */ }
  }

  #resetSchema(): void {
    this.#registry = defaultRegistry.clone();
    this.#reinitAdapter();
    if (this.#schemaEditorEl) {
      this.#schemaEditorEl.value = JSON.stringify(this.#registry.toJSON(), null, 2);
    }
    if (this.#componentMapEl) {
      this.#renderComponentMap(this.#componentMapEl, this.#activeA2UITypes.value);
    }
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

  /** Cmd+S in the HTML pane: write edited HTML back to preview. */
  #applyHTML(): void {
    if (!this.#htmlEditorEl || !this.#previewEl) return;
    this.#previewEl.innerHTML = this.#htmlEditorEl.value;
    // Re-read computed state so CSS pane refreshes
    this.#updateCSS();
  }

  /** Cmd+S in the CSS pane: apply edited custom properties to the preview element. */
  #applyCSS(): void {
    if (!this.#cssEditorEl || !this.#previewEl) return;
    try {
      const obj = JSON.parse(this.#cssEditorEl.value) as Record<string, unknown>;
      // Apply computed tokens as inline styles on preview
      const computed = obj['computed'] as Record<string, string> | undefined;
      if (computed) {
        for (const [prop, val] of Object.entries(computed)) {
          if (prop.startsWith('--')) this.#previewEl.style.setProperty(prop, val);
        }
      }
    } catch { /* invalid JSON — no-op */ }
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

  // ── Coordinated pane resize ──
  // Handle between pane N and pane N+1 controls the left boundary of pane N+1.
  // Drag LEFT  → target (N+1) grows, preview absorbs, then left panes compress.
  // Drag RIGHT → target (N+1) shrinks, preview gets space back.

  /** Get visible pane IDs in DOM order. */
  #getVisiblePanes(): PanelId[] {
    const active = this.#activePanels.value;
    return PANEL_ORDER.filter(id => active.has(id));
  }

  #onPanePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const handle = (e.target as HTMLElement).closest?.('.a2ui-resize-handle') as HTMLElement | null;
    if (!handle) return;

    // Find owning pane (must be a pane, not the preview)
    const pane = handle.parentElement;
    if (!pane?.matches('n-pane')) return;
    const handlePaneId = pane.dataset.panel as PanelId | undefined;
    if (!handlePaneId) return;

    // Handle belongs to pane N; the TARGET is pane N+1 (to the right of the handle)
    const visible = this.#getVisiblePanes();
    const handleIdx = visible.indexOf(handlePaneId);
    if (handleIdx === -1 || handleIdx >= visible.length - 1) return;

    const targetId = visible[handleIdx + 1];
    const targetEl = this.#paneEls.get(targetId);
    if (!targetEl) return;

    e.preventDefault();

    // Snapshot widths
    const previewStartW = this.#previewRegionEl?.offsetWidth ?? 0;
    const targetStartW = targetEl.offsetWidth;

    // Left panes = everything from pane 0 through pane N (handle owner)
    const leftPanes: { id: PanelId; startW: number }[] = [];
    for (let i = 0; i <= handleIdx; i++) {
      const el = this.#paneEls.get(visible[i]);
      if (el) leftPanes.push({ id: visible[i], startW: el.offsetWidth });
    }

    // Freeze all visible pane widths + preview so flex doesn't redistribute.
    // Clear flex-grow first — inline flex-grow would beat the stylesheet's
    // [style*="width"] { flex: none } and cause a layout jump.
    for (const id of visible) {
      const el = this.#paneEls.get(id);
      if (el) {
        el.style.width = `${el.offsetWidth}px`;
        el.style.removeProperty('flex-grow');
      }
    }
    if (this.#previewRegionEl) {
      this.#previewRegionEl.style.width = `${previewStartW}px`;
    }

    this.#resizeDrag = { targetId, startX: e.clientX, previewStartW, targetStartW, leftPanes };

    // Visual feedback + prevent text selection
    targetEl.setAttribute('resizing', '');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', this.#onPanePointerMove);
    document.addEventListener('pointerup', this.#onPanePointerUp);
  };

  #onPanePointerMove = (e: PointerEvent): void => {
    const drag = this.#resizeDrag;
    if (!drag) return;

    const PANE_MIN = 150;
    const PREVIEW_MIN = 200;

    const dx = e.clientX - drag.startX;
    // Handle moved right by dx → target's left edge moved right → target shrinks
    const newTargetW = Math.max(PANE_MIN, drag.targetStartW - dx);
    const delta = newTargetW - drag.targetStartW; // positive = target growing

    const leftWidths: number[] = drag.leftPanes.map(p => p.startW);
    let newPreviewW = drag.previewStartW;
    let clampedTargetW = newTargetW;

    if (delta > 0) {
      // ── Target growing (user dragged left) ── preview absorbs, then left panes
      newPreviewW = Math.max(PREVIEW_MIN, drag.previewStartW - delta);
      const absorbed = drag.previewStartW - newPreviewW;
      let remaining = delta - absorbed;

      if (remaining > 0) {
        const totalShrinkable = drag.leftPanes.reduce(
          (sum, p) => sum + Math.max(0, p.startW - PANE_MIN), 0,
        );
        const shrinkAmount = Math.min(remaining, totalShrinkable);

        for (let i = 0; i < drag.leftPanes.length; i++) {
          const share = totalShrinkable > 0
            ? (Math.max(0, drag.leftPanes[i].startW - PANE_MIN) / totalShrinkable) * shrinkAmount
            : 0;
          leftWidths[i] = Math.max(PANE_MIN, drag.leftPanes[i].startW - share);
        }
        remaining -= shrinkAmount;
      }

      // Clamp target if not enough space
      clampedTargetW = newTargetW - Math.max(0, remaining);

    } else if (delta < 0) {
      // ── Target shrinking (user dragged right) ── handle owner (left neighbor) grows
      const ownerIdx = drag.leftPanes.length - 1;
      if (ownerIdx >= 0) {
        leftWidths[ownerIdx] = drag.leftPanes[ownerIdx].startW + (-delta);
      } else {
        // No left pane — first handle edge case: preview gets space back
        newPreviewW = drag.previewStartW + (-delta);
      }
    }

    // Apply widths
    if (this.#previewRegionEl) this.#previewRegionEl.style.width = `${newPreviewW}px`;
    const targetEl = this.#paneEls.get(drag.targetId);
    if (targetEl) targetEl.style.width = `${clampedTargetW}px`;
    for (let i = 0; i < drag.leftPanes.length; i++) {
      const el = this.#paneEls.get(drag.leftPanes[i].id);
      if (el) el.style.width = `${leftWidths[i]}px`;
    }
  };

  #onPanePointerUp = (_e: PointerEvent): void => {
    const drag = this.#resizeDrag;
    if (!drag) return;

    // Convert preview to percentage for proportional scaling
    if (this.#previewRegionEl && this.#splitEl) {
      const splitW = this.#splitEl.offsetWidth;
      if (splitW > 0) {
        const ratio = this.#previewRegionEl.offsetWidth / splitW;
        this.#previewRegionEl.style.width = `${(ratio * 100).toFixed(2)}%`;
      }
    }

    // Convert pane pixel widths → flex-grow ratios so proportions adapt
    // when panels are added/removed. With flex-basis: 0%, flex-grow ratios
    // directly correspond to width ratios.
    const visible = this.#getVisiblePanes();
    const widths: number[] = [];
    for (const id of visible) {
      const el = this.#paneEls.get(id);
      widths.push(el?.offsetWidth ?? 0);
    }
    const total = widths.reduce((s, w) => s + w, 0);
    if (total > 0) {
      for (let i = 0; i < visible.length; i++) {
        const el = this.#paneEls.get(visible[i]);
        if (el) {
          // Normalize so average = 1 (e.g. 3 panes: [1.5, 0.8, 0.7])
          el.style.flexGrow = String((widths[i] / total) * visible.length);
          el.style.removeProperty('width');
        }
      }
    }

    // Clean up
    const targetEl = this.#paneEls.get(drag.targetId);
    targetEl?.removeAttribute('resizing');
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    document.removeEventListener('pointermove', this.#onPanePointerMove);
    document.removeEventListener('pointerup', this.#onPanePointerUp);
    this.#resizeDrag = null;
  };

  #onPaneHandleDblClick = (e: MouseEvent): void => {
    const handle = (e.target as HTMLElement).closest?.('.a2ui-resize-handle') as HTMLElement | null;
    if (!handle) return;
    const pane = handle.parentElement;
    if (!pane?.matches('n-pane')) return;
    // Clear all explicit sizing — returns everything to default flex distribution
    if (this.#previewRegionEl) this.#previewRegionEl.style.removeProperty('width');
    for (const [_, el] of this.#paneEls) {
      el.style.removeProperty('width');
      el.style.removeProperty('flex-grow');
    }
  };

  // ── DOM construction ──

  #buildDOM(): void {
    // ── Header (header > n-toolbar) ──
    const headerWrap = document.createElement('n-header');

    const header = document.createElement('n-toolbar');
    header.setAttribute('size', 'sm');
    header.setAttribute('variant', 'ghost');

    // Preset select (leading slot) — manual mode with grouped options
    // WHY: n-select IS the trigger — no child n-button needed.
    // Placeholder text becomes the label; caret icon is auto-stamped.
    const presetSelect = document.createElement('n-select');
    presetSelect.setAttribute('size', 'sm');
    presetSelect.setAttribute('inline', '');
    presetSelect.setAttribute('placeholder', 'Presets');

    const listbox = document.createElement('n-listbox');
    listbox.setAttribute('popover', '');

    for (const group of PRESET_GROUPS) {
      if ('hidden' in group && group.hidden) continue;
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
    header.appendChild(presetSelect);

    // Panel toggle chips + expand
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

    // Auto-play toggle
    const autoPlayChip = document.createElement('n-button');
    autoPlayChip.setAttribute('variant', 'ghost');
    autoPlayChip.setAttribute('size', 'sm');
    autoPlayChip.title = 'Auto-play presets on load';
    autoPlayChip.innerHTML = '<n-icon name="lightning"></n-icon>';
    autoPlayChip.addEventListener('native:press', this.#onAutoPlayToggle);
    header.appendChild(autoPlayChip);
    this.#autoPlayChip = autoPlayChip;

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
      const pane = document.createElement('n-pane');
      pane.dataset.panel = id;
      if (!this.#activePanels.value.has(id)) {
        pane.hidden = true;
      }

      // Pane header: [icon] [label] ... [X]
      const paneHeader = document.createElement('n-header');

      const leading = document.createElement('nav');
      const headerIcon = document.createElement('n-icon');
      headerIcon.setAttribute('name', PANEL_ICONS[id]);
      leading.appendChild(headerIcon);
      paneHeader.appendChild(leading);

      const headerLabel = document.createElement('span');
      headerLabel.textContent = PANEL_LABELS[id];
      paneHeader.appendChild(headerLabel);

      // Trailing actions — aside wraps action buttons
      const trailing = document.createElement('aside');

      // Reset button for editable panes (JS, HTML, CSS) — restores computed content
      if (id === 'js' || id === 'html' || id === 'css') {
        const resetBtn = document.createElement('n-button');
        resetBtn.setAttribute('variant', 'ghost');
        resetBtn.setAttribute('size', 'sm');
        resetBtn.title = 'Reset to computed';
        resetBtn.innerHTML = '<n-icon name="arrow-counter-clockwise"></n-icon>';
        resetBtn.addEventListener('native:press', this.#onPaneReset(id));
        trailing.appendChild(resetBtn);
      }

      const closeBtn = document.createElement('n-button');
      closeBtn.setAttribute('variant', 'ghost');
      closeBtn.setAttribute('size', 'sm');
      closeBtn.title = 'Close pane';
      closeBtn.innerHTML = '<n-icon name="x"></n-icon>';
      closeBtn.addEventListener('native:press', this.#onChipPress(id));
      trailing.appendChild(closeBtn);
      paneHeader.appendChild(trailing);

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

        // Divider
        const sep = document.createElement('n-divider');
        sep.setAttribute('orientation', 'vertical');

        // Lifecycle insert buttons
        const addSurfaceBtn = this.#createToolbarButton('Insert createSurface', 'plus-circle');
        addSurfaceBtn.addEventListener('native:press', this.#onInsertEnvelope('createSurface'));
        const addComponentsBtn = this.#createToolbarButton('Insert updateComponents', 'squares-four');
        addComponentsBtn.addEventListener('native:press', this.#onInsertEnvelope('updateComponents'));
        const addDataBtn = this.#createToolbarButton('Insert updateDataModel', 'database');
        addDataBtn.addEventListener('native:press', this.#onInsertEnvelope('updateDataModel'));
        const addDeleteBtn = this.#createToolbarButton('Insert deleteSurface', 'minus-circle');
        addDeleteBtn.addEventListener('native:press', this.#onInsertEnvelope('deleteSurface'));

        toolbar.append(stepBackBtn, resetBtn, stepBtn, playBtn, sep, addSurfaceBtn, addComponentsBtn, addDataBtn, addDeleteBtn);
        pane.appendChild(toolbar);
      }

      // SCHEMA pane gets an action toolbar
      if (id === 'schema') {
        const toolbar = document.createElement('n-toolbar');
        toolbar.setAttribute('variant', 'plain');
        toolbar.setAttribute('size', 'sm');
        toolbar.setAttribute('fill', '');

        const applyBtn = this.#createToolbarButton('Apply schema', 'play', true);
        applyBtn.addEventListener('native:press', () => this.#applySchema());

        const formatBtn = this.#createToolbarButton('Format JSON', 'text-align-left');
        formatBtn.addEventListener('native:press', () => this.#formatSchema());

        const sep = document.createElement('n-divider');
        sep.setAttribute('orientation', 'vertical');

        const resetBtn = this.#createToolbarButton('Reset to defaults', 'arrow-counter-clockwise');
        resetBtn.addEventListener('native:press', () => this.#resetSchema());

        toolbar.append(applyBtn, formatBtn, sep, resetBtn);
        pane.appendChild(toolbar);
      }

      // Content area
      const content = document.createElement('n-body');
      pane.appendChild(content);
      this.#paneContentEls.set(id, content);

      // CodeMirror editors for all code panes; component map table for components
      if (id === 'json-in' || id === 'js' || id === 'html' || id === 'css') {
        const editorEl = document.createElement('n-editor') as HTMLElement & NCodeEditor;
        editorEl.setAttribute('line-numbers', 'false');
        content.appendChild(editorEl);
        if (id === 'json-in') this.#editorEl = editorEl;
        else if (id === 'js') this.#jsEditorEl = editorEl;
        else if (id === 'html') this.#htmlEditorEl = editorEl;
        else if (id === 'css') this.#cssEditorEl = editorEl;
      } else if (id === 'components') {
        this.#componentMapEl = content;
      } else if (id === 'schema') {
        const schemaEditor = document.createElement('n-editor') as HTMLElement & NCodeEditor;
        schemaEditor.setAttribute('line-numbers', 'false');
        content.appendChild(schemaEditor);
        this.#schemaEditorEl = schemaEditor;
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
    this.#editorEl.extensions = [json(), sentLineField, linter(a2uiLinter)];

    this.#editorEl.addEventListener('native:input', (e: Event) => {
      this.#stream.value = (e as CustomEvent).detail.value;
    });

    // Cmd+S keybinding — apply edits back to preview
    const saveHtmlKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => { this.#applyHTML(); return true; },
    }]);
    const saveCssKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => { this.#applyCSS(); return true; },
    }]);

    // JS editor — JSON syntax highlighting
    if (this.#jsEditorEl) this.#jsEditorEl.extensions = [json()];

    // HTML + CSS editors — editable with Cmd+S to apply
    if (this.#htmlEditorEl) this.#htmlEditorEl.extensions = [saveHtmlKeymap];
    if (this.#cssEditorEl) this.#cssEditorEl.extensions = [json(), saveCssKeymap];
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
    this.#activeA2UITypes.value = new Set();
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
    this.#jsLogCursor = 0;
    this.#inLog.value = [];
    this.#outLog.value = [];
    this.#jsLog.value = [];
    if (this.#jsEditorEl) this.#jsEditorEl.value = '';
    this.#lastState.value = null;
    this.#htmlState.value = '';
    this.#cssState.value = null;
    this.#activeA2UITypes.value = new Set();
    this.#selectedType = null;
    this.#detailTab = 'info';
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

  #renderLog(entries: LogEntry[], el: HTMLElement | null): void {
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
      typeSpan.className = `badge a2ui-log-type a2ui-log-type--${entry.type}`;
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

  /** Render the A2UI → native-ui component mapping table. */
  #selectedType: string | null = null;
  #detailTab: 'info' | 'json' = 'info';

  #renderComponentMap(el: HTMLElement, activeTypes: Set<string>): void {
    el.textContent = '';

    // Detail panel (shown when a type is selected)
    if (this.#selectedType) {
      this.#renderComponentDetail(el, this.#selectedType, activeTypes);
      return;
    }

    const table = document.createElement('table');
    table.className = 'a2ui-component-map';

    // Header
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Type', 'Tag', 'Category']) {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    for (const [_key, mapping] of this.#registry) {
      const row = document.createElement('tr');
      row.className = 'a2ui-map-row';
      if (activeTypes.has(mapping.a2uiType)) {
        row.classList.add('a2ui-map-active');
      }

      const tdType = document.createElement('td');
      tdType.textContent = mapping.a2uiType;
      tdType.className = 'a2ui-map-type';

      const tdTag = document.createElement('td');
      const code = document.createElement('code');
      code.textContent = mapping.nativeTag;
      tdTag.appendChild(code);

      const tdCat = document.createElement('td');
      tdCat.textContent = this.#registry.getComponentCategory(mapping.a2uiType);
      tdCat.className = 'a2ui-map-category';

      row.append(tdType, tdTag, tdCat);
      row.addEventListener('click', () => {
        this.#selectedType = mapping.a2uiType;
        this.#renderComponentMap(el, activeTypes);
      });
      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    // Summary
    const summary = document.createElement('div');
    summary.className = 'a2ui-map-summary';
    summary.textContent = activeTypes.size > 0
      ? `${activeTypes.size} of ${this.#registry.size} types active`
      : `${this.#registry.size} supported component types`;

    el.append(summary, table);
  }

  #renderComponentDetail(el: HTMLElement, type: string, activeTypes: Set<string>): void {
    const mapping = this.#registry.get(type);
    if (!mapping) return;

    // Header: [< Type] ... [Info | JSON]
    const headerRow = document.createElement('n-header');
    headerRow.className = 'a2ui-map-detail-header';

    const backNav = document.createElement('nav');
    const backBtn = document.createElement('n-button');
    backBtn.setAttribute('variant', 'ghost');
    backBtn.setAttribute('size', 'sm');
    backBtn.className = 'a2ui-map-back';
    backBtn.innerHTML = `<n-icon name="caret-left"></n-icon> ${mapping.a2uiType}`;
    backBtn.addEventListener('native:press', () => {
      this.#selectedType = null;
      this.#detailTab = 'info';
      this.#componentEditorEl = null;
      this.#renderComponentMap(el, activeTypes);
    });
    backNav.appendChild(backBtn);
    headerRow.appendChild(backNav);

    // Tab bar
    const instances = this.#getComponentInstances(type);
    const hasInstances = instances.length > 0;

    const detailTrailing = document.createElement('aside');
    const tabBar = document.createElement('n-segmented-control') as HTMLElement & { value: string | null };
    tabBar.className = 'a2ui-map-tab-bar';
    tabBar.setAttribute('size', 'xs');
    tabBar.setAttribute('inline', '');
    tabBar.value = this.#detailTab;

    const infoTab = document.createElement('n-segment');
    infoTab.setAttribute('value', 'info');
    infoTab.textContent = 'Info';

    const jsonTab = document.createElement('n-segment');
    jsonTab.setAttribute('value', 'json');
    jsonTab.textContent = hasInstances ? `JSON (${instances.length})` : 'JSON';
    if (!hasInstances) jsonTab.setAttribute('disabled', '');

    tabBar.append(infoTab, jsonTab);
    tabBar.addEventListener('native:change', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.value === 'info' || detail?.value === 'json') {
        this.#detailTab = detail.value;
        this.#renderComponentMap(el, activeTypes);
      }
    });
    detailTrailing.appendChild(tabBar);
    headerRow.appendChild(detailTrailing);
    el.appendChild(headerRow);

    // ── Info tab content ──
    if (this.#detailTab === 'info') {
      this.#componentEditorEl = null;

      const detail = document.createElement('div');
      detail.className = 'a2ui-map-detail';

      const props: [string, string][] = [
        ['Tag', mapping.nativeTag],
        ['Children', mapping.childStrategy],
        ['Category', this.#registry.getComponentCategory(mapping.a2uiType)],
      ];
      if (mapping.actionEvent) props.push(['Action', mapping.actionEvent]);
      if (mapping.defaultAttributes) {
        props.push(['Defaults', Object.entries(mapping.defaultAttributes).map(([k, v]) => `${k}="${v}"`).join(', ')]);
      }
      if (mapping.propertyMap) {
        props.push(['Props', Object.entries(mapping.propertyMap).map(([k, v]) => `${k} → ${v}`).join(', ')]);
      }
      if (mapping.variantMap) {
        props.push(['Variants', Object.keys(mapping.variantMap).join(', ')]);
      }

      for (const [label, value] of props) {
        const row = document.createElement('div');
        row.className = 'a2ui-map-detail-row';
        const labelEl = document.createElement('span');
        labelEl.className = 'a2ui-map-detail-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('code');
        valueEl.textContent = value;
        row.append(labelEl, valueEl);
        detail.appendChild(row);
      }

      el.appendChild(detail);

      // Compatible alternatives
      const compatible = this.#registry.getCompatibleTypes(mapping.a2uiType).filter(t => t !== type);
      const isSwappable = activeTypes.has(type);
      if (compatible.length > 0) {
        const altSection = document.createElement('div');
        altSection.className = 'a2ui-map-alternatives';

        const altTitle = document.createElement('div');
        altTitle.className = 'a2ui-map-alt-title';
        altTitle.textContent = isSwappable ? 'Swap To' : 'Compatible Alternatives';
        altSection.appendChild(altTitle);

        for (const altType of compatible) {
          const altMapping = this.#registry.get(altType);
          if (!altMapping) continue;

          const altRow = document.createElement('div');
          altRow.className = 'a2ui-map-alt-row';
          if (activeTypes.has(altType)) altRow.classList.add('a2ui-map-active');

          // Swap icon (only when current type is active in the stream)
          if (isSwappable) {
            const swapIcon = document.createElement('n-icon');
            swapIcon.setAttribute('name', 'arrows-left-right');
            swapIcon.className = 'a2ui-map-swap-icon';
            altRow.appendChild(swapIcon);
          }

          const name = document.createElement('span');
          name.className = 'a2ui-map-type';
          name.textContent = altType;

          const tag = document.createElement('code');
          tag.textContent = altMapping.nativeTag;

          altRow.append(name, tag);

          if (isSwappable) {
            // Swap in the preview and navigate to the new type
            altRow.addEventListener('click', () => {
              this.#swapComponent(type, altType);
              this.#selectedType = altType;
              this.#detailTab = 'info';
              this.#componentEditorEl = null;
              this.#renderComponentMap(el, this.#activeA2UITypes.value);
            });
          } else {
            // Just navigate to the alternative's detail view
            altRow.addEventListener('click', () => {
              this.#selectedType = altType;
              this.#detailTab = 'info';
              this.#componentEditorEl = null;
              this.#renderComponentMap(el, activeTypes);
            });
          }
          altSection.appendChild(altRow);
        }

        el.appendChild(altSection);
      }

      return;
    }

    // ── JSON tab content ──
    if (this.#detailTab === 'json') {
      const editorSection = document.createElement('div');
      editorSection.className = 'a2ui-map-editor-section';

      const editorToolbar = document.createElement('n-toolbar');
      editorToolbar.className = 'a2ui-map-editor-toolbar';

      const applyBtn = document.createElement('n-button');
      applyBtn.setAttribute('variant', 'ghost');
      applyBtn.setAttribute('size', 'sm');
      applyBtn.title = 'Apply changes to stream';
      applyBtn.innerHTML = '<n-icon name="play" weight="fill"></n-icon>';
      applyBtn.addEventListener('native:press', () => this.#applyComponentEdits(type));
      editorToolbar.appendChild(applyBtn);

      editorSection.appendChild(editorToolbar);

      const editorEl = document.createElement('n-editor') as HTMLElement & NCodeEditor;
      editorEl.setAttribute('line-numbers', 'false');
      editorSection.appendChild(editorEl);
      this.#componentEditorEl = editorEl;

      requestAnimationFrame(() => {
        editorEl.extensions = [json()];
        editorEl.value = JSON.stringify(instances, null, 2);
      });

      el.appendChild(editorSection);
      return;
    }

  }

  /** Extract all component instances of a given A2UI type from the current envelopes. */
  #getComponentInstances(type: string): Record<string, unknown>[] {
    const envelopes = this.#getEnvelopes();
    const instances: Record<string, unknown>[] = [];
    for (const env of envelopes) {
      try {
        const parsed = JSON.parse(env.text);
        const uc = parsed.updateComponents as { components?: Record<string, unknown>[] } | undefined;
        if (uc?.components) {
          for (const comp of uc.components) {
            if (comp.component === type) instances.push(comp);
          }
        }
      } catch { /* skip unparseable */ }
    }
    return instances;
  }

  /** Apply edited component JSON back into the stream envelopes and replay. */
  #applyComponentEdits(type: string): void {
    if (!this.#componentEditorEl) return;
    let edited: Record<string, unknown>[];
    try {
      edited = JSON.parse(this.#componentEditorEl.value);
    } catch {
      return; // invalid JSON — don't apply
    }
    if (!Array.isArray(edited)) return;

    // Build a lookup by component id for the edited instances
    const editedById = new Map<string, Record<string, unknown>>();
    for (const comp of edited) {
      if (comp.id && typeof comp.id === 'string') editedById.set(comp.id, comp);
    }

    // Walk envelopes and replace matching components in-place
    const envelopes = this.#getEnvelopes();
    const parts: string[] = [];
    for (const env of envelopes) {
      try {
        const parsed = JSON.parse(env.text);
        const uc = parsed.updateComponents as { components?: Record<string, unknown>[] } | undefined;
        if (uc?.components) {
          for (let i = 0; i < uc.components.length; i++) {
            const comp = uc.components[i];
            if (comp.component === type && typeof comp.id === 'string') {
              const replacement = editedById.get(comp.id as string);
              if (replacement) uc.components[i] = replacement;
            }
          }
        }
        parts.push(JSON.stringify(parsed, null, 2));
      } catch {
        parts.push(env.text);
      }
    }

    const newStream = parts.join('\n\n');
    const savedType = this.#selectedType;
    this.#reset();
    this.#selectedType = savedType;
    this.stream = newStream;
    this.#playAll();

    // Refresh the editor with the applied instances
    if (this.#componentEditorEl) {
      const refreshed = this.#getComponentInstances(type);
      this.#componentEditorEl.value = JSON.stringify(refreshed, null, 2);
    }
  }

  /** Swap all instances of one A2UI component type for another in the stream and replay. */
  #swapComponent(fromType: string, toType: string): void {
    const envelopes = this.#getEnvelopes();
    if (envelopes.length === 0) return;

    const parts: string[] = [];
    for (const env of envelopes) {
      try {
        const parsed = JSON.parse(env.text);
        const uc = parsed.updateComponents;
        if (uc?.components && Array.isArray(uc.components)) {
          for (const comp of uc.components) {
            if (comp.component === fromType) {
              comp.component = toType;
            }
          }
        }
        parts.push(JSON.stringify(parsed, null, 2));
      } catch {
        parts.push(env.text);
      }
    }

    const newStream = parts.join('\n\n');
    const savedType = this.#selectedType;
    this.#reset();
    this.#selectedType = savedType;
    this.stream = newStream;
    this.#playAll();
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

    const preset = PRESETS[key];
    const stream = preset.envelopes
      .map(env => JSON.stringify(env, null, 2))
      .join('\n\n');

    this.#reset();
    this.stream = stream;
    this.#playAll();
  }

  #onPlayAll = (): void => { this.#playAll(); };
  #onStep = (): void => { this.#step(); };
  #onStepBack = (): void => { this.#stepBack(); };
  #onReset = (): void => { this.#reset(); };

  /** Insert a lifecycle envelope template at the end of the editor stream. */
  #onInsertEnvelope = (kind: 'createSurface' | 'updateComponents' | 'updateDataModel' | 'deleteSurface') => (): void => {
    const sid = this.#lastSurfaceId.value;
    const templates: Record<string, Record<string, unknown>> = {
      createSurface: {
        createSurface: { surfaceId: sid },
        version: '0.9',
      },
      updateComponents: {
        updateComponents: {
          surfaceId: sid,
          components: [
            { id: 'root', component: 'Column', children: ['item1'] },
            { id: 'item1', component: 'Text', text: 'Hello' },
          ],
        },
        version: '0.9',
      },
      updateDataModel: {
        updateDataModel: { surfaceId: sid, path: '/', value: { key: 'value' } },
        version: '0.9',
      },
      deleteSurface: {
        deleteSurface: { surfaceId: sid },
        version: '0.9',
      },
    };

    const envelope = templates[kind];
    const formatted = JSON.stringify(envelope, null, 2);
    const current = this.#stream.value.trimEnd();
    const newStream = current ? current + '\n\n' + formatted : formatted;
    this.stream = newStream;

    // Scroll editor to the new content
    const view = this.#editorEl?.editorView;
    if (view) {
      const lastLine = view.state.doc.lines;
      view.dispatch({ selection: { anchor: view.state.doc.line(lastLine).from } });
      view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.line(lastLine).from) });
    }
  };

  #onPreviewResizeEnd = (): void => {
    if (!this.#previewRegionEl || !this.#splitEl) return;
    const splitWidth = this.#splitEl.offsetWidth;
    if (splitWidth <= 0) return;
    const ratio = this.#previewRegionEl.offsetWidth / splitWidth;
    this.#previewRegionEl.style.width = `${(ratio * 100).toFixed(2)}%`;
  };

  /** Track A2UI component types used in updateComponents envelopes. */
  #trackComponents(envelope: Record<string, unknown>): void {
    const uc = envelope.updateComponents as { surfaceId?: string; components?: unknown[] } | undefined;
    if (uc?.components) {
      if (uc.surfaceId) this.#lastSurfaceId.value = uc.surfaceId;
      const current = new Set(this.#activeA2UITypes.value);
      for (const comp of uc.components) {
        if (comp && typeof comp === 'object' && 'component' in comp) {
          current.add((comp as { component: string }).component);
        }
      }
      this.#activeA2UITypes.value = current;
    }
  }

  #onAutoPlayToggle = (): void => {
    this.#autoPlay.value = !this.#autoPlay.value;
    this.#autoPlayChip?.toggleAttribute('data-active', this.#autoPlay.value);
  };

  /** Reset an editable pane to its computed/generated content. */
  #onPaneReset = (panelId: PanelId) => (): void => {
    if (panelId === 'js') {
      if (!this.#jsEditorEl) return;
      const entries = this.#jsLog.value;
      this.#jsEditorEl.value = entries.length > 0
        ? entries.map(e => JSON.stringify(e.data, null, 2)).join('\n\n')
        : '';
      this.#jsLogCursor = entries.length;
    } else if (panelId === 'html') {
      if (!this.#htmlEditorEl) return;
      const html = this.#htmlState.value;
      this.#htmlEditorEl.value = html ? formatHTML(html) : '';
    } else if (panelId === 'css') {
      if (!this.#cssEditorEl) return;
      const styles = this.#cssState.value;
      if (styles !== null && typeof styles === 'object' && Object.keys(styles as Record<string, unknown>).length > 0) {
        this.#cssEditorEl.value = JSON.stringify(styles, null, 2);
      } else {
        this.#cssEditorEl.value = '';
      }
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
