import { NativeElement, CopyController, ResizeController, PresentController } from '@nonoun/native-ui';
import type { NCodemirror } from '../codemirror/index.ts';
import '../codemirror/register.ts';
import { createPlaygroundStore } from './playground-store.ts';
import type { PlaygroundStore, ConsoleEntry } from './playground-store.ts';
import { getLanguageExtension, TAB_LABELS } from './editors.ts';
import type { TabName } from './editors.ts';
import { buildSrcdoc } from './iframe/template.ts';

const TAB_NAMES: readonly TabName[] = ['html', 'css', 'js'] as const;

/**
 * Interactive code playground with live preview.
 *
 * Renders a tabbed code editor (CodeMirror), a sandboxed iframe preview,
 * toolbar controls, and an optional console panel. Content is sourced from
 * `<script type="playground/html|css|js">` children at setup time.
 *
 * @attr {string} orientation - Layout direction: "horizontal" | "vertical" | "auto" (default "auto")
 * @attr {boolean} auto-run - Auto-run preview on code changes (default true)
 * @attr {number} debounce - Debounce delay in ms for auto-run (default 300)
 * @attr {string} active-tab - Active editor tab: "html" | "css" | "js" (default "html")
 * @attr {boolean} console-open - Whether the console panel is visible
 * @attr {boolean} readonly - Disable editing
 * @attr {string} preview-theme - OKLCH token overrides as CSS custom property string
 * @attr {string} css-url - URL to native-ui.css for the iframe (required)
 * @attr {string} register-url - URL to native-ui register script for the iframe (required)
 *
 * @fires playground:run - When the preview updates, detail: { html, css, js }
 * @fires playground:change - When user edits code, detail: { tab, code }
 * @fires playground:copy - When code is copied, detail: { tab, code }
 * @fires playground:reset - When code is reset, detail: { html, css, js }
 */
export class NPlayground extends NativeElement {
  static observedAttributes = [
    'orientation',
    'auto-run',
    'debounce',
    'active-tab',
    'console-open',
    'readonly',
    'preview-theme',
    'css-url',
    'register-url',
  ];

  #store!: PlaygroundStore;
  #editors = new Map<TabName, HTMLElement & NCodemirror>();
  #iframe: HTMLIFrameElement | null = null;
  #debounceTimer: ReturnType<typeof setTimeout> | undefined;
  #copyController!: CopyController;
  #resizeController: ResizeController | null = null;
  #presentController: PresentController | null = null;

  // Resolved framework CSS (cached after first resolution)
  #cssCache = '';
  #cssCacheUrl = '';

  // DOM references
  #tabsEl: HTMLElement | null = null;
  #panels: HTMLDivElement[] = [];
  #consolePanelEl: HTMLDivElement | null = null;
  #editorRegion: HTMLDivElement | null = null;

  // WHY: Cache initial <script> content so it survives disconnect/reconnect cycles.
  // #extractContent() removes script children on first setup. If the same instance
  // is reconnected (e.g. View Transitions, adoptNode), the scripts are gone.
  // This cache lets setup() re-use the original content without the scripts.
  #cachedContent: { html: string; css: string; js: string } | null = null;

  // WHY: Track DOM nodes created by #buildDOM() so teardown() can remove them.
  // Without cleanup, reconnecting the same instance duplicates toolbar/editor DOM.
  #buildDOMNodes: Node[] = [];

  // ── Public API ──

  /** Manually trigger a preview update. */
  run(): Promise<void> {
    return this.#run();
  }

  /** Reset all code to initial values. */
  reset(): void {
    this.#resetCode();
  }

  /** Get the current code from all three editors. */
  getCode(): { html: string; css: string; js: string } {
    return {
      html: this.#store.html.value,
      css: this.#store.css.value,
      js: this.#store.js.value,
    };
  }

  /** Programmatically set code in one or more editors. */
  setCode(code: Partial<Record<TabName, string>>): void {
    for (const tab of TAB_NAMES) {
      if (code[tab] !== undefined) {
        this.#store[tab].value = code[tab]!;
        const editor = this.#editors.get(tab);
        if (editor) editor.value = code[tab]!;
      }
    }
    if (this.#store.autoRun.value) this.#scheduleRun();
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;

    // Guard: store may not exist yet if attribute is set before connectedCallback
    if (!this.#store) return;

    switch (name) {
      case 'orientation':
        this.#store.orientation.value = (val as 'horizontal' | 'vertical' | 'auto') ?? 'auto';
        break;
      case 'auto-run':
        this.#store.autoRun.value = val !== null;
        break;
      case 'debounce':
        this.#store.debounce.value = val !== null ? Number(val) || 300 : 300;
        break;
      case 'active-tab':
        if (val === 'html' || val === 'css' || val === 'js') {
          this.#store.activeTab.value = val;
        }
        break;
      case 'console-open':
        this.#store.consoleOpen.value = val !== null;
        break;
      case 'readonly':
        this.#store.readonly.value = val !== null;
        break;
      case 'preview-theme':
        this.#store.previewTheme.value = val ?? '';
        break;
    }

    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Seed store with empty defaults; content extraction happens in deferChildren
    this.#store = createPlaygroundStore('', '', '');

    // Sync attributes → store before DOM build
    this.#seedFromAttributes();

    // Copy controller — value is a getter that returns the active tab's code
    this.#copyController = new CopyController(this, {
      value: () => this.#store[this.#store.activeTab.value].value,
    });

    // Build DOM structure
    this.#buildDOM();

    // Present controller — expand playground to full-viewport dialog
    this.#presentController = new PresentController(this as unknown as HTMLElement);

    // Resize controller — lets users drag the handle between editor and preview
    if (this.#editorRegion) {
      const isVertical = this.#store.orientation.value === 'vertical';
      this.#resizeController = new ResizeController(this.#editorRegion, {
        handleSelector: '.pg-resize-handle',
        axis: isVertical ? 'vertical' : 'horizontal',
        min: isVertical ? 100 : 200,
      });
    }

    // Effect: orientation changes → update resize axis
    this.addEffect(() => {
      const orientation = this.#store.orientation.value;
      if (this.#resizeController) {
        const isVertical = orientation === 'vertical';
        this.#resizeController.axis = isVertical ? 'vertical' : 'horizontal';
        this.#resizeController.min = isVertical ? 100 : 200;
        // Clear explicit size when orientation changes
        if (this.#editorRegion) {
          this.#editorRegion.style.width = '';
          this.#editorRegion.style.height = '';
        }
      }
    });

    // Effects that do NOT depend on children

    // Effect: active tab → show/hide panels, sync n-tabs value
    this.addEffect(() => {
      const active = this.#store.activeTab.value;
      for (let i = 0; i < TAB_NAMES.length; i++) {
        this.#panels[i].hidden = TAB_NAMES[i] !== active;
      }
      if (this.#tabsEl) this.#tabsEl.setAttribute('value', active);
    });

    // Effect: console open → show/hide console panel
    this.addEffect(() => {
      const open = this.#store.consoleOpen.value;
      if (this.#consolePanelEl) this.#consolePanelEl.hidden = !open;
    });

    // Effect: console entries → render console content
    this.addEffect(() => {
      const entries = this.#store.consoleEntries.value;
      this.#renderConsole(entries);
    });

    // Effect: auto-run + code changes → debounced run
    this.addEffect(() => {
      // Read all three code signals to track changes
      void this.#store.html.value;
      void this.#store.css.value;
      void this.#store.js.value;

      if (this.#store.autoRun.value) {
        this.#scheduleRun();
      }
    });

    // Listen for messages from iframe
    window.addEventListener('message', this.#messageHandler);

    // Content extraction: read playground script children, then create editors
    this.deferChildren(() => {
      this.#extractContent();
      this.#createEditors();

      // Run initial preview after editors are ready
      this.#run();
    });
  }

  teardown(): void {
    window.removeEventListener('message', this.#messageHandler);

    clearTimeout(this.#debounceTimer);

    this.#editors.clear();

    this.#copyController.destroy();
    this.#resizeController?.destroy();
    this.#resizeController = null;
    this.#presentController?.destroy();
    this.#presentController = null;

    // WHY: Remove DOM nodes created by #buildDOM() so a subsequent setup()
    // starts with a clean element. Without this, reconnecting the same
    // instance (View Transitions, adoptNode) duplicates the toolbar/editor.
    for (const node of this.#buildDOMNodes) node.parentNode?.removeChild(node);
    this.#buildDOMNodes = [];

    this.#iframe = null;
    this.#consolePanelEl = null;
    this.#editorRegion = null;
    this.#tabsEl = null;
    this.#panels = [];

    super.teardown();
  }

  // ── DOM construction ──

  #buildDOM(): void {
    // Toolbar — n-toolbar inside semantic header for dark chrome context
    const toolbarHeader = document.createElement('n-header');
    const toolbar = document.createElement('n-toolbar');
    toolbar.setAttribute('variant', 'plain');
    toolbar.setAttribute('size', 'md');
    toolbar.setAttribute('fill', '');

    const runBtn = this.#createToolbarButton('pg-btn-run', 'Run', '\u25B6 Run');
    runBtn.addEventListener('native:press', this.#onRunClick);

    const resetBtn = this.#createToolbarButton('', 'Reset', '\u21BA Reset');
    resetBtn.addEventListener('native:press', this.#onResetClick);

    const copyBtn = this.#createToolbarButton('', 'Copy', 'Copy');
    copyBtn.addEventListener('native:press', this.#onCopyClick);

    const consoleBtn = this.#createToolbarButton('', 'Console', 'Console');
    consoleBtn.addEventListener('native:press', this.#onConsoleToggle);

    const expandBtn = this.#createToolbarButton('', 'Expand', 'Expand');
    expandBtn.addEventListener('native:press', this.#onExpandClick);

    toolbar.append(runBtn, resetBtn, copyBtn, consoleBtn, expandBtn);
    toolbarHeader.appendChild(toolbar);

    // Split container
    const split = document.createElement('div');
    split.className = 'pg-split';

    // Editor region
    const editorRegion = document.createElement('div');
    editorRegion.className = 'pg-editor';

    // Tab bar wrapped in semantic header for dark chrome context
    const tabHeader = document.createElement('n-header');

    const tabBar = document.createElement('n-tabs');
    tabBar.setAttribute('value', this.#store.activeTab.value);
    tabBar.setAttribute('size', 'sm');

    for (const tab of TAB_NAMES) {
      const tabEl = document.createElement('n-tab');
      tabEl.setAttribute('value', tab);
      tabEl.textContent = TAB_LABELS[tab];
      tabBar.appendChild(tabEl);
    }

    tabBar.addEventListener('native:change', this.#onTabChange);
    this.#tabsEl = tabBar;

    tabHeader.appendChild(tabBar);
    editorRegion.appendChild(tabHeader);

    // Code panels (one per tab, each containing a <native-codemirror>)
    for (let i = 0; i < TAB_NAMES.length; i++) {
      const panel = document.createElement('div');
      panel.className = 'pg-code-panel';
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = TAB_NAMES[i] !== this.#store.activeTab.value;

      const editor = document.createElement('native-codemirror') as HTMLElement & NCodemirror;
      panel.appendChild(editor);
      this.#editors.set(TAB_NAMES[i], editor);

      editorRegion.appendChild(panel);
      this.#panels.push(panel);
    }

    // Console panel
    const consolePanel = document.createElement('div');
    consolePanel.className = 'pg-console';
    consolePanel.hidden = !this.#store.consoleOpen.value;
    editorRegion.appendChild(consolePanel);
    this.#consolePanelEl = consolePanel;

    // Resize handle (inside editor, positioned at right/bottom edge)
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'pg-resize-handle';
    editorRegion.appendChild(resizeHandle);

    split.appendChild(editorRegion);
    this.#editorRegion = editorRegion;

    // Preview region
    const previewRegion = document.createElement('div');
    previewRegion.className = 'pg-preview';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', 'Preview');
    previewRegion.appendChild(iframe);
    this.#iframe = iframe;

    split.appendChild(previewRegion);

    // Append to host and track for teardown cleanup
    this.append(toolbarHeader, split);
    this.#buildDOMNodes = [toolbarHeader, split];
  }

  #createToolbarButton(className: string, title: string, label: string): HTMLElement {
    const btn = document.createElement('n-button');
    btn.className = className;
    btn.title = title;
    btn.setAttribute('variant', 'ghost');
    btn.textContent = label;
    return btn;
  }

  // ── Content extraction ──

  #extractContent(): void {
    const scripts = this.querySelectorAll<HTMLScriptElement>('script[type^="playground/"]');
    let html = '';
    let css = '';
    let js = '';

    for (const script of scripts) {
      const type = script.getAttribute('type') ?? '';
      const suffix = type.replace('playground/', '') as TabName;
      const code = (script.textContent ?? '').trim();

      switch (suffix) {
        case 'html': html = code; break;
        case 'css': css = code; break;
        case 'js': js = code; break;
      }

      script.remove();
    }

    // WHY: Fall back to cached content when scripts were already consumed.
    // On disconnect/reconnect (View Transitions, adoptNode), the <script>
    // children were removed during the first setup. The cache preserves
    // the original content so the playground re-initializes correctly.
    if (!html && !css && !js && this.#cachedContent) {
      html = this.#cachedContent.html;
      css = this.#cachedContent.css;
      js = this.#cachedContent.js;
    }

    // Cache for future reconnections
    if (html || css || js) {
      this.#cachedContent = { html, css, js };
    }

    // Update store with extracted content
    this.#store.html.value = html;
    this.#store.css.value = css;
    this.#store.js.value = js;

    // Preserve initial values for reset
    this.#store.initialHtml = html;
    this.#store.initialCss = css;
    this.#store.initialJs = js;
  }

  // ── Editor creation ──

  #createEditors(): void {
    const readonly = this.#store.readonly.value;

    for (const tab of TAB_NAMES) {
      const editor = this.#editors.get(tab);
      if (!editor) continue;

      const storeSignal = this.#store[tab];

      editor.value = storeSignal.value;
      editor.extensions = [getLanguageExtension(tab)];
      if (readonly) editor.readOnly = true;

      editor.addEventListener('native:input', (e: Event) => {
        const code = (e as CustomEvent).detail.value;
        storeSignal.value = code;
        this.dispatchEvent(new CustomEvent('playground:change', {
          bubbles: true,
          detail: { tab, code },
        }));
      });
    }
  }

  // ── CSS resolution ──

  /**
   * Resolve a CSS URL to inline text. In Vite dev mode, CSS files with @import
   * are served as JS modules (Content-Type: text/javascript) which breaks
   * <link rel="stylesheet"> in srcdoc iframes. Using ?inline dynamic import
   * gets the resolved CSS as a string. Falls back to fetch() for production
   * CDN URLs where ?inline isn't available.
   */
  async #resolveCss(url: string): Promise<string> {
    if (!url) return '';
    if (url === this.#cssCacheUrl && this.#cssCache) return this.#cssCache;

    let cssText = '';
    try {
      // Vite dev: .css?inline returns a JS module exporting the CSS string
      const mod = await import(/* @vite-ignore */ url + '?inline');
      cssText = mod.default;
    } catch {
      // Production: fetch the CSS URL directly
      const res = await fetch(url);
      cssText = await res.text();
    }

    this.#cssCacheUrl = url;
    this.#cssCache = cssText;
    return cssText;
  }

  // ── Run / preview ──

  #scheduleRun(): void {
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.#run();
    }, this.#store.debounce.value);
  }

  async #run(): Promise<void> {
    const iframe = this.#iframe;
    if (!iframe) return;

    const cssUrl = this.getAttribute('css-url') ?? '';
    const registerUrl = this.getAttribute('register-url') ?? '';

    const html = this.#store.html.value;
    const css = this.#store.css.value;
    const js = this.#store.js.value;

    // Clear console on new run
    this.#store.consoleEntries.value = [];

    // Resolve framework CSS to inline text (avoids Vite MIME-type issues)
    const frameworkCss = await this.#resolveCss(cssUrl);

    const srcdoc = buildSrcdoc({
      html,
      css,
      js,
      frameworkCss,
      registerUrl,
      themeOverrides: this.#store.previewTheme.value || undefined,
    });

    iframe.srcdoc = srcdoc;

    this.dispatchEvent(new CustomEvent('playground:run', {
      bubbles: true,
      detail: { html, css, js },
    }));
  }

  // ── Reset ──

  #resetCode(): void {
    const { initialHtml, initialCss, initialJs } = this.#store;

    this.#store.html.value = initialHtml;
    this.#store.css.value = initialCss;
    this.#store.js.value = initialJs;

    const htmlEditor = this.#editors.get('html');
    const cssEditor = this.#editors.get('css');
    const jsEditor = this.#editors.get('js');
    if (htmlEditor) htmlEditor.value = initialHtml;
    if (cssEditor) cssEditor.value = initialCss;
    if (jsEditor) jsEditor.value = initialJs;

    this.dispatchEvent(new CustomEvent('playground:reset', {
      bubbles: true,
      detail: { html: initialHtml, css: initialCss, js: initialJs },
    }));

    this.#run();
  }

  // ── Console rendering ──

  #renderConsole(entries: ConsoleEntry[]): void {
    const el = this.#consolePanelEl;
    if (!el) return;

    // Clear and rebuild
    el.textContent = '';

    for (const entry of entries) {
      if (entry.level === 'clear') {
        el.textContent = '';
        continue;
      }

      const line = document.createElement('div');
      line.className = 'pg-console-line';

      if (entry.level === 'warn') line.classList.add('pg-console-warn');
      if (entry.level === 'error') line.classList.add('pg-console-error');

      line.textContent = entry.args.join(' ');
      el.appendChild(line);
    }

    // Auto-scroll to bottom
    el.scrollTop = el.scrollHeight;
  }

  // ── Seed store from attributes ──

  #seedFromAttributes(): void {
    const orientation = this.getAttribute('orientation');
    if (orientation === 'horizontal' || orientation === 'vertical' || orientation === 'auto') {
      this.#store.orientation.value = orientation;
    }

    // auto-run defaults to true in the store; only need to explicitly
    // set false if the attribute is absent (consumer opted out by not adding it).
    // However the spec says default is true and the attr is boolean, so presence = true.
    // We leave the store default and don't override here unless the attribute is present.
    if (this.hasAttribute('auto-run')) {
      this.#store.autoRun.value = true;
    }

    const debounce = this.getAttribute('debounce');
    if (debounce !== null) {
      this.#store.debounce.value = Number(debounce) || 300;
    }

    const activeTab = this.getAttribute('active-tab');
    if (activeTab === 'html' || activeTab === 'css' || activeTab === 'js') {
      this.#store.activeTab.value = activeTab;
    }

    if (this.hasAttribute('console-open')) {
      this.#store.consoleOpen.value = true;
    }

    if (this.hasAttribute('readonly')) {
      this.#store.readonly.value = true;
    }

    const previewTheme = this.getAttribute('preview-theme');
    if (previewTheme) {
      this.#store.previewTheme.value = previewTheme;
    }
  }

  // ── Event handlers (arrow properties for stable references) ──

  #onRunClick = (): void => {
    this.#run();
  };

  #onResetClick = (): void => {
    this.#resetCode();
  };

  #onCopyClick = async (): Promise<void> => {
    const tab = this.#store.activeTab.value;
    const code = this.#store[tab].value;

    await this.#copyController.copy();

    this.dispatchEvent(new CustomEvent('playground:copy', {
      bubbles: true,
      detail: { tab, code },
    }));
  };

  #onConsoleToggle = (): void => {
    this.#store.consoleOpen.value = !this.#store.consoleOpen.value;
  };

  #onExpandClick = (): void => {
    this.#presentController?.present();
  };

  #onTabChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    if (detail?.value === 'html' || detail?.value === 'css' || detail?.value === 'js') {
      this.#store.activeTab.value = detail.value;
    }
  };

  #messageHandler = (e: MessageEvent): void => {
    // Only accept messages from our iframe
    if (e.source !== this.#iframe?.contentWindow) return;

    const data = e.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'playground:console') {
      const entry: ConsoleEntry = {
        level: data.level ?? 'log',
        args: Array.isArray(data.args) ? data.args : [],
      };

      // Immutable update so the signal notifies subscribers
      this.#store.consoleEntries.value = [...this.#store.consoleEntries.value, entry];
    }
  };
}
