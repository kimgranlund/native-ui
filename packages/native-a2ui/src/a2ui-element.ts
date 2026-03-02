/**
 * NA2UI — A2UI Protocol Workbench Element
 *
 * Interactive JSONL editor, sandboxed kernel preview, and protocol inspector.
 * Content is sourced from a <script type="a2ui/stream"> child at setup time.
 *
 * @attr {string} layout - Grid layout mode: "2/1" (default) | "1+1+1"
 *
 * @fires native:a2ui-action - When an action is received from the preview iframe
 * @fires native:a2ui-state  - When state is updated from the preview iframe
 */

import { NativeElement, signal } from '@nonoun/native-ui';
import type { Signal } from '@nonoun/native-ui';
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

// ── Log entry type ──

interface LogEntry {
  type: 'sent' | 'received' | 'error' | 'info';
  data: unknown;
  timestamp: number;
}

// ── Iframe srcdoc template ──

const SRCDOC = `<!DOCTYPE html>
<html><head>
<style>body { margin: 0; padding: 1rem; font-family: system-ui; }</style>
</head><body>
<script type="module">
window.addEventListener('message', (e) => {
  const { type, payload } = e.data;
  if (type === 'a2ui:envelope') {
    window.parent.postMessage({ type: 'a2ui:state', payload: { surfaces: [], errors: [] } }, '*');
  }
  if (type === 'a2ui:reset') {
    document.body.innerHTML = '';
    window.parent.postMessage({ type: 'a2ui:reset-ack' }, '*');
  }
});
window.parent.postMessage({ type: 'a2ui:ready' }, '*');
<\/script>
</body></html>`;

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
        // Mark sent lines
        for (let i = 1; i <= upTo; i++) {
          ranges.push(sentDeco.range(doc.line(i).from));
        }
        // Mark next line
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
  static observedAttributes = ['layout'];

  // Signals
  #stream: Signal<string> = signal('');
  #cursor: Signal<number> = signal(0);
  #layout: Signal<'2/1' | '1+1+1'> = signal('2/1');
  #tab: Signal<'tree' | 'log'> = signal('tree');
  #log: Signal<LogEntry[]> = signal([]);
  #lastState: Signal<unknown> = signal(null);
  #iframeReady: Signal<boolean> = signal(false);

  // DOM references
  #editorEl: (HTMLElement & NCodemirror) | null = null;
  #iframe: HTMLIFrameElement | null = null;
  #treeEl: HTMLDivElement | null = null;
  #logEl: HTMLDivElement | null = null;
  #treeTabBtn: HTMLButtonElement | null = null;
  #logTabBtn: HTMLButtonElement | null = null;

  // ── Public API ──

  get stream(): string { return this.#stream.value; }
  set stream(val: string) {
    this.#stream.value = val;
    if (this.#editorEl) {
      this.#editorEl.value = val;
    }
  }

  get layout(): string { return this.#layout.value; }
  set layout(val: string) {
    if (val === '2/1' || val === '1+1+1') {
      this.#layout.value = val;
      this.setAttribute('layout', val);
    }
  }

  playAll(): void {
    this.#playAll();
  }

  step(): void {
    this.#step();
  }

  reset(): void {
    this.#reset();
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'layout') {
      if (val === '2/1' || val === '1+1+1') {
        this.#layout.value = val;
      }
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Seed from attributes
    const layoutAttr = this.getAttribute('layout');
    if (layoutAttr === '2/1' || layoutAttr === '1+1+1') {
      this.#layout.value = layoutAttr;
    }

    // Build DOM
    this.#buildDOM();

    // Listen for iframe messages
    window.addEventListener('message', this.#messageHandler);

    // Effect: layout attribute sync
    this.addEffect(() => {
      const layout = this.#layout.value;
      this.setAttribute('layout', layout);
    });

    // Effect: inspector tab toggle
    this.addEffect(() => {
      const tab = this.#tab.value;
      if (this.#treeEl) this.#treeEl.hidden = tab !== 'tree';
      if (this.#logEl) this.#logEl.hidden = tab !== 'log';
      if (this.#treeTabBtn) this.#treeTabBtn.classList.toggle('a2ui-tab--active', tab === 'tree');
      if (this.#logTabBtn) this.#logTabBtn.classList.toggle('a2ui-tab--active', tab === 'log');
    });

    // Effect: render tree view when state changes
    this.addEffect(() => {
      const state = this.#lastState.value;
      if (this.#treeEl) {
        this.#treeEl.textContent = '';
        if (state !== null) {
          const pre = document.createElement('pre');
          pre.textContent = JSON.stringify(state, null, 2);
          this.#treeEl.appendChild(pre);
        } else {
          const span = document.createElement('span');
          span.style.opacity = '0.5';
          span.textContent = 'No state received yet. Press Play or Step to send envelopes.';
          this.#treeEl.appendChild(span);
        }
      }
    });

    // Effect: render log entries
    this.addEffect(() => {
      const entries = this.#log.value;
      this.#renderLog(entries);
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

    // Content extraction: read <script type="a2ui/stream"> children
    this.deferChildren(() => {
      this.#extractContent();
      this.#createEditor();
    });
  }

  teardown(): void {
    window.removeEventListener('message', this.#messageHandler);

    this.#editorEl = null;
    this.#iframe = null;
    this.#treeEl = null;
    this.#logEl = null;
    this.#treeTabBtn = null;
    this.#logTabBtn = null;

    super.teardown();
  }

  // ── DOM construction ──

  #buildDOM(): void {
    // ── Toolbar ──
    const toolbar = document.createElement('div');
    toolbar.className = 'a2ui-toolbar';

    // Layout toggle buttons
    const layoutBtnA = document.createElement('button');
    layoutBtnA.className = 'a2ui-layout-btn';
    layoutBtnA.textContent = '2/1';
    layoutBtnA.title = 'Editor + Preview on top, Inspector below';
    layoutBtnA.addEventListener('click', this.#onLayoutA);

    const layoutBtnB = document.createElement('button');
    layoutBtnB.className = 'a2ui-layout-btn';
    layoutBtnB.textContent = '1+1+1';
    layoutBtnB.title = 'Three equal columns';
    layoutBtnB.addEventListener('click', this.#onLayoutB);

    const spacer = document.createElement('div');
    spacer.style.flex = '1';

    toolbar.append(layoutBtnA, layoutBtnB, spacer);

    // ── Layout ──
    const layout = document.createElement('div');
    layout.className = 'a2ui-layout';

    // ── Editor region ──
    const editorRegion = document.createElement('div');
    editorRegion.className = 'a2ui-region a2ui-region-editor';

    const editorEl = document.createElement('native-codemirror') as HTMLElement & NCodemirror;
    editorEl.className = 'a2ui-editor';
    editorEl.setAttribute('line-numbers', 'false');
    editorRegion.appendChild(editorEl);
    this.#editorEl = editorEl;

    // ── Preview region ──
    const previewRegion = document.createElement('div');
    previewRegion.className = 'a2ui-region a2ui-region-preview';

    // Preview toolbar
    const previewToolbar = document.createElement('div');
    previewToolbar.className = 'a2ui-preview-toolbar';

    const playBtn = this.#createButton('Play All', this.#onPlayAll);
    const stepBtn = this.#createButton('Step', this.#onStep);
    const resetBtn = this.#createButton('Reset', this.#onReset);
    const previewSpacer = document.createElement('div');
    previewSpacer.style.flex = '1';

    previewToolbar.append(playBtn, stepBtn, resetBtn, previewSpacer);
    previewRegion.appendChild(previewToolbar);

    // Iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'a2ui-preview-iframe';
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', 'A2UI Preview');
    iframe.srcdoc = SRCDOC;
    previewRegion.appendChild(iframe);
    this.#iframe = iframe;

    // ── Inspector region ──
    const inspectorRegion = document.createElement('div');
    inspectorRegion.className = 'a2ui-region a2ui-region-inspector';

    const inspector = document.createElement('div');
    inspector.className = 'a2ui-inspector';

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';

    const treeTab = document.createElement('button');
    treeTab.className = 'a2ui-tab a2ui-tab--active';
    treeTab.textContent = 'Tree';
    treeTab.addEventListener('click', this.#onTreeTab);
    this.#treeTabBtn = treeTab;

    const logTab = document.createElement('button');
    logTab.className = 'a2ui-tab';
    logTab.textContent = 'Log';
    logTab.addEventListener('click', this.#onLogTab);
    this.#logTabBtn = logTab;

    tabBar.append(treeTab, logTab);
    inspector.appendChild(tabBar);

    // Tree view
    const treeView = document.createElement('div');
    treeView.className = 'a2ui-tree';
    inspector.appendChild(treeView);
    this.#treeEl = treeView;

    // Log view
    const logView = document.createElement('div');
    logView.className = 'a2ui-log';
    logView.hidden = true;
    inspector.appendChild(logView);
    this.#logEl = logView;

    inspectorRegion.appendChild(inspector);

    // Assemble layout
    layout.append(editorRegion, previewRegion, inspectorRegion);

    // Append to host
    this.append(toolbar, layout);
  }

  #createButton(label: string, handler: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'background: none; border: 1px solid var(--n-border-muted-neutral, #3e4451); color: inherit; padding: 0.125rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;';
    btn.addEventListener('click', handler);
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

    // Set initial value and extensions
    this.#editorEl.value = this.#stream.value;
    this.#editorEl.extensions = [json(), sentLineField];

    // Sync editor changes back to stream signal
    this.#editorEl.addEventListener('native:input', (e: Event) => {
      this.#stream.value = (e as CustomEvent).detail.value;
    });
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
    const iframe = this.#iframe;
    if (!iframe?.contentWindow) return;

    for (let i = this.#cursor.value; i < lines.length; i++) {
      const line = lines[i];
      try {
        const envelope = JSON.parse(line);
        iframe.contentWindow.postMessage({ type: 'a2ui:envelope', payload: envelope }, '*');
        this.#appendLog('sent', envelope);
      } catch (err) {
        this.#appendLog('error', { line: i + 1, message: String(err), raw: line });
      }
    }

    this.#cursor.value = lines.length;
  }

  #step(): void {
    const lines = this.#getLines();
    const iframe = this.#iframe;
    if (!iframe?.contentWindow) return;

    const idx = this.#cursor.value;
    if (idx >= lines.length) return;

    const line = lines[idx];
    try {
      const envelope = JSON.parse(line);
      iframe.contentWindow.postMessage({ type: 'a2ui:envelope', payload: envelope }, '*');
      this.#appendLog('sent', envelope);
    } catch (err) {
      this.#appendLog('error', { line: idx + 1, message: String(err), raw: line });
    }

    this.#cursor.value = idx + 1;
  }

  #reset(): void {
    const iframe = this.#iframe;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'a2ui:reset' }, '*');
    }

    this.#cursor.value = 0;
    this.#log.value = [];
    this.#lastState.value = null;
    this.#iframeReady.value = false;

    // Reset iframe srcdoc to get a fresh context
    if (iframe) {
      iframe.srcdoc = SRCDOC;
    }

    this.#appendLog('info', { message: 'Reset' });
  }

  // ── Log management ──

  #appendLog(type: LogEntry['type'], data: unknown): void {
    this.#log.value = [...this.#log.value, { type, data, timestamp: Date.now() }];
  }

  #renderLog(entries: LogEntry[]): void {
    const el = this.#logEl;
    if (!el) return;

    el.textContent = '';

    if (entries.length === 0) {
      const span = document.createElement('span');
      span.style.opacity = '0.5';
      span.textContent = 'No log entries yet.';
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

    // Auto-scroll to bottom
    el.scrollTop = el.scrollHeight;
  }

  // ── Event handlers (arrow properties for stable references) ──

  #onPlayAll = (): void => {
    this.#playAll();
  };

  #onStep = (): void => {
    this.#step();
  };

  #onReset = (): void => {
    this.#reset();
  };

  #onLayoutA = (): void => {
    this.layout = '2/1';
  };

  #onLayoutB = (): void => {
    this.layout = '1+1+1';
  };

  #onTreeTab = (): void => {
    this.#tab.value = 'tree';
  };

  #onLogTab = (): void => {
    this.#tab.value = 'log';
  };

  #messageHandler = (e: MessageEvent): void => {
    // Only accept messages from our iframe
    if (e.source !== this.#iframe?.contentWindow) return;

    const data = e.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'a2ui:ready':
        this.#iframeReady.value = true;
        this.#appendLog('info', { message: 'Iframe ready' });
        break;

      case 'a2ui:state':
        this.#lastState.value = data.payload;
        this.#appendLog('received', data.payload);
        this.dispatchEvent(new CustomEvent('native:a2ui-state', {
          bubbles: true,
          detail: data.payload,
        }));
        break;

      case 'a2ui:action':
        this.#appendLog('received', data.payload);
        this.dispatchEvent(new CustomEvent('native:a2ui-action', {
          bubbles: true,
          detail: data.payload,
        }));
        break;

      case 'a2ui:reset-ack':
        this.#appendLog('info', { message: 'Iframe reset acknowledged' });
        break;
    }
  };
}
