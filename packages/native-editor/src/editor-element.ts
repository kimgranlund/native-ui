import type { EditorView as EditorViewType, ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { NativeElement, createDisabledEffect, GatewayController, ResizeController, PresentController } from '@nonoun/native-ui';
import { EditorView, EditorState, Compartment } from '@nonoun/native-codemirror';
import { NTheme, NSyntaxHighlighting, NBaseExtensions } from '@nonoun/native-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { placeholder as cmPlaceholder } from '@codemirror/view';
import { commands, markdownKeymap } from './commands.ts';
import type { EditorCommands } from './commands.ts';
import { previewCompartment, createPreviewExtension, sourceExtension } from './decorations.ts';
import { EditorStore, DEFAULT_TOOLBAR } from './editor-store.ts';
import type { ViewMode } from './editor-store.ts';

// ---------------------------------------------------------------------------
// Toolbar button definitions
// ---------------------------------------------------------------------------

interface ToolbarButtonDef {
  icon: string;
  label: string;
  action: (view: EditorViewType) => boolean;
}

const buttonMap: Record<string, ToolbarButtonDef> = {
  'bold': { icon: 'text-b', label: 'Bold', action: commands.toggleBold },
  'italic': { icon: 'text-italic', label: 'Italic', action: commands.toggleItalic },
  'code': { icon: 'code', label: 'Code', action: commands.toggleCode },
  'h1': { icon: 'text-h-one', label: 'Heading 1', action: (v) => commands.setHeading(v, 1) },
  'h2': { icon: 'text-h-two', label: 'Heading 2', action: (v) => commands.setHeading(v, 2) },
  'h3': { icon: 'text-h-three', label: 'Heading 3', action: (v) => commands.setHeading(v, 3) },
  'bullet-list': { icon: 'list-bullets', label: 'Bullet List', action: commands.toggleBulletList },
  'ordered-list': { icon: 'list-numbers', label: 'Ordered List', action: commands.toggleOrderedList },
  'blockquote': { icon: 'quotes', label: 'Blockquote', action: commands.toggleBlockquote },
  'link': { icon: 'link', label: 'Link', action: commands.insertLink },
  'image': { icon: 'image', label: 'Image', action: commands.insertImage },
};

// ---------------------------------------------------------------------------
// Element
// ---------------------------------------------------------------------------

/**
 * Markdown content editor with live preview and source modes.
 *
 * Built on CodeMirror 6, renders a toolbar and a rich editing surface.
 * Supports form association, reactive mode switching, and configurable toolbars.
 *
 * @attr {string} value - The markdown string
 * @attr {string} mode - Active view mode: "preview" or "source"
 * @attr {string} toolbar - Comma-separated toolbar button keys
 * @attr {string} placeholder - Placeholder text for empty editor
 * @attr {boolean} readonly - Disable editing
 * @attr {boolean} disabled - Disabled state
 * @attr {string} name - Form field name
 * @attr {string} src - URL to load/save content from
 * @fires change - Fired when document content changes with `{ value }` detail
 * @fires mode-change - Fired when mode is toggled with `{ mode }` detail
 * @fires n-load - Fired after content is loaded from src
 * @fires n-save - Fired after content is saved to src
 * @fires n-error - Fired on load/save error with `{ error }` detail
 * @fires dirty-change - Fired when dirty state changes with `{ dirty }` detail
 */
export class NEditor extends NativeElement {
  static observedAttributes = ['value', 'mode', 'toolbar', 'placeholder', 'readonly', 'disabled', 'name', 'src'];
  static formAssociated = true;

  #internals: ElementInternals;
  #store = new EditorStore();
  #gateway = new GatewayController(this as unknown as HTMLElement);
  #view: EditorViewType | null = null;
  #surface: HTMLDivElement | null = null;
  #initialContent = '';

  // -- Compartments for dynamic reconfiguration --
  #readonlyCompartment = new Compartment();
  #placeholderCompartment = new Compartment();

  // -- DOM refs --
  #toolbarEl: HTMLElement | null = null;
  #modeSegmented: HTMLElement | null = null;
  #resizeController: ResizeController | null = null;
  #presentController: PresentController | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public Properties ──

  get value(): string {
    if (this.#view) {
      return this.#view.state.doc.toString();
    }
    return this.getAttribute('value') ?? '';
  }

  set value(val: string) {
    if (this.#view) {
      const currentDoc = this.#view.state.doc.toString();
      if (currentDoc !== val) {
        this.#view.dispatch({
          changes: { from: 0, to: this.#view.state.doc.length, insert: val },
        });
      }
    }
    this.#internals.setFormValue(val);
  }

  get mode(): ViewMode {
    return this.#store.mode.value;
  }

  set mode(val: ViewMode) {
    this.#store.setMode(val);
    this.setAttribute('mode', val);
  }

  get toolbar(): string[] {
    return this.#store.toolbar.value;
  }

  set toolbar(val: string[] | string) {
    this.#store.setToolbar(val);
  }

  get placeholder(): string {
    return this.#store.placeholder.value;
  }

  set placeholder(val: string) {
    this.#store.placeholder.value = val;
    this.setAttribute('placeholder', val);
  }

  get readOnly(): boolean {
    return this.#store.readonly.value;
  }

  set readOnly(val: boolean) {
    this.#store.readonly.value = val;
    this.toggleAttribute('readonly', val);
  }

  get disabled(): boolean {
    return this.#store.disabled.value;
  }

  set disabled(val: boolean) {
    this.#store.disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get src(): string | null {
    return this.#store.src.value;
  }

  set src(val: string | null) {
    this.#store.src.value = val;
    if (val != null) this.setAttribute('src', val);
    else this.removeAttribute('src');
  }

  get loading(): boolean {
    return this.#gateway.loading.value;
  }

  get saving(): boolean {
    return this.#gateway.saving.value;
  }

  get dirty(): boolean {
    return this.#gateway.dirty.value;
  }

  get error(): string | null {
    return this.#gateway.error.value;
  }

  // ── Public API ──

  /** Proxy to editor commands — each method auto-passes the internal EditorView. */
  get commands(): EditorCommands {
    const view = this.#view;
    if (!view) {
      const noop = () => false;
      return {
        toggleBold: noop,
        toggleItalic: noop,
        toggleCode: noop,
        toggleStrikethrough: noop,
        setHeading: noop,
        toggleBulletList: noop,
        toggleOrderedList: noop,
        toggleBlockquote: noop,
        insertLink: noop,
        insertImage: noop,
        insertHorizontalRule: noop,
      } as unknown as EditorCommands;
    }

    return {
      toggleBold: (_v: EditorViewType) => commands.toggleBold(view),
      toggleItalic: (_v: EditorViewType) => commands.toggleItalic(view),
      toggleCode: (_v: EditorViewType) => commands.toggleCode(view),
      toggleStrikethrough: (_v: EditorViewType) => commands.toggleStrikethrough(view),
      setHeading: (_v: EditorViewType, level: 1 | 2 | 3) => commands.setHeading(view, level),
      toggleBulletList: (_v: EditorViewType) => commands.toggleBulletList(view),
      toggleOrderedList: (_v: EditorViewType) => commands.toggleOrderedList(view),
      toggleBlockquote: (_v: EditorViewType) => commands.toggleBlockquote(view),
      insertLink: (_v: EditorViewType, url?: string, text?: string) => commands.insertLink(view, url, text),
      insertImage: (_v: EditorViewType, url?: string, alt?: string) => commands.insertImage(view, url, alt),
      insertHorizontalRule: (_v: EditorViewType) => commands.insertHorizontalRule(view),
    };
  }

  override focus(): void {
    this.#view?.focus();
  }

  getSelection(): { from: number; to: number; text: string } {
    if (!this.#view) return { from: 0, to: 0, text: '' };
    const { from, to } = this.#view.state.selection.main;
    return { from, to, text: this.#view.state.sliceDoc(from, to) };
  }

  insertText(text: string, position?: number): void {
    if (!this.#view) return;
    const pos = position ?? this.#view.state.selection.main.head;
    this.#view.dispatch({
      changes: { from: pos, to: pos, insert: text },
    });
  }

  /** Save current content to the `src` URL via PUT. */
  async save(): Promise<boolean> {
    const url = this.#store.src.value;
    if (!url) return false;
    const ok = await this.#gateway.save(url, this.value);
    if (ok) {
      this.dispatchEvent(new CustomEvent('n-save', { bubbles: true, composed: true }));
    }
    return ok;
  }

  /** Reload content from the `src` URL. */
  async reload(): Promise<void> {
    const url = this.#store.src.value;
    if (!url) return;
    const content = await this.#gateway.load(url);
    if (content !== null) {
      this.value = content;
      this.dispatchEvent(new CustomEvent('n-load', {
        bubbles: true, composed: true, detail: { value: content },
      }));
    }
  }

  // ── Attribute Sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    const s = this.#store;
    switch (name) {
      case 'value':
        if (this.#view) {
          const currentDoc = this.#view.state.doc.toString();
          if (currentDoc !== (val ?? '')) {
            this.#view.dispatch({
              changes: { from: 0, to: this.#view.state.doc.length, insert: val ?? '' },
            });
          }
        }
        this.#internals.setFormValue(val ?? '');
        break;
      case 'mode':
        if (val === 'preview' || val === 'source') s.mode.value = val;
        break;
      case 'toolbar':
        s.toolbar.value = val !== null
          ? val.split(',').map((t) => t.trim()).filter(Boolean)
          : DEFAULT_TOOLBAR;
        break;
      case 'placeholder':
        s.placeholder.value = val ?? '';
        break;
      case 'readonly':
        s.readonly.value = val !== null;
        break;
      case 'disabled':
        s.disabled.value = val !== null;
        break;
      case 'src':
        s.src.value = val;
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    const s = this.#store;

    // Sync initial attribute values into store
    s.mode.value = (this.getAttribute('mode') as ViewMode) || 'preview';
    s.disabled.value = this.hasAttribute('disabled');
    s.readonly.value = this.hasAttribute('readonly');
    s.placeholder.value = this.getAttribute('placeholder') ?? '';

    const toolbarAttr = this.getAttribute('toolbar');
    if (toolbarAttr) {
      s.setToolbar(toolbarAttr);
    }
    s.src.value = this.getAttribute('src');

    // -- Read initial content from <script type="text/markdown"> or value attr --
    this.#initialContent = this.#readInitialContent();

    // -- Build DOM --
    this.#buildToolbar();
    this.#buildSurface();
    this.#createEditorView();

    // Present controller — expand editor to full-viewport dialog
    this.#presentController = new PresentController(this as unknown as HTMLElement);

    // Resize controller — lets users drag to resize the editor
    this.#resizeController = new ResizeController(this as unknown as HTMLElement, {
      handleSelector: '.native-editor-resize-handle',
      axis: 'vertical',
      min: 200,
    });

    // -- Disabled effect --
    this.addEffect(createDisabledEffect(this, s.disabled, this.#internals));

    // -- Mode switch effect --
    this.addEffect(() => {
      const mode = s.mode.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: previewCompartment.reconfigure(
            mode === 'preview' ? createPreviewExtension() : sourceExtension,
          ),
        });
      }
      if (this.#modeSegmented) {
        this.#modeSegmented.setAttribute('value', mode);
      }
      this.dispatchEvent(new CustomEvent('mode-change', {
        bubbles: true,
        composed: true,
        detail: { mode },
      }));
    });

    // -- Locked effect (readonly OR disabled → CodeMirror editable) --
    this.addEffect(() => {
      const locked = s.locked.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#readonlyCompartment.reconfigure([
            EditorState.readOnly.of(locked),
            EditorView.editable.of(!locked),
          ]),
        });
      }
      // Cascade disabled to toolbar
      if (this.#toolbarEl) {
        this.#toolbarEl.toggleAttribute('disabled', s.disabled.value);
      }
    });

    // -- Placeholder effect --
    this.addEffect(() => {
      const text = s.placeholder.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#placeholderCompartment.reconfigure(
            text ? cmPlaceholder(text) : [],
          ),
        });
      }
    });

    // -- Toolbar rebuild effect --
    this.addEffect(() => {
      s.toolbar.value; // track
      this.#rebuildToolbarContent();
    });

    // -- Src load effect --
    this.addEffect(() => {
      const url = s.src.value;
      if (url) this.reload();
    });

    // -- Gateway state effects (reflect to host attributes + events) --
    this.addEffect(() => {
      this.toggleAttribute('loading', this.#gateway.loading.value);
    });

    this.addEffect(() => {
      this.toggleAttribute('saving', this.#gateway.saving.value);
    });

    this.addEffect(() => {
      const dirty = this.#gateway.dirty.value;
      this.toggleAttribute('dirty', dirty);
      this.dispatchEvent(new CustomEvent('dirty-change', {
        bubbles: true, composed: true, detail: { dirty },
      }));
    });

    this.addEffect(() => {
      const error = this.#gateway.error.value;
      if (error) {
        this.dispatchEvent(new CustomEvent('n-error', {
          bubbles: true, composed: true, detail: { error },
        }));
      }
    });

    // -- Set initial form value --
    this.#internals.setFormValue(this.#initialContent);
  }

  teardown(): void {
    this.#gateway.destroy();
    this.#resizeController?.destroy();
    this.#resizeController = null;
    this.#presentController?.destroy();
    this.#presentController = null;
    if (this.#view) {
      this.#view.destroy();
      this.#view = null;
    }
    this.#toolbarEl = null;
    this.#modeSegmented = null;
    this.#surface = null;
    super.teardown();
  }

  // ── Content Source ──

  /**
   * Read initial content from a `<script type="text/markdown">` child,
   * falling back to the `value` attribute. Consumes the script tag.
   */
  #readInitialContent(): string {
    const script = this.querySelector('script[type="text/markdown"]');
    if (script) {
      const content = script.textContent ?? '';
      script.remove();
      // Strip one leading newline (common when content follows the opening tag)
      return content.replace(/^\n/, '');
    }
    return this.getAttribute('value') ?? '';
  }

  // ── DOM Construction ──

  #buildToolbar(): void {
    const header = document.createElement('n-card-header');
    const toolbar = document.createElement('n-toolbar');
    toolbar.setAttribute('size', 'md');
    toolbar.setAttribute('variant', 'plain');
    toolbar.setAttribute('fill', '');
    this.#toolbarEl = toolbar;
    header.appendChild(toolbar);
    this.appendChild(header);
    this.#rebuildToolbarContent();
  }

  #rebuildToolbarContent(): void {
    const toolbar = this.#toolbarEl;
    if (!toolbar) return;

    toolbar.innerHTML = '';
    this.#modeSegmented = null;

    const items = this.#store.toolbar.value;

    for (const key of items) {
      if (key === '|') {
        const divider = document.createElement('n-divider');
        divider.setAttribute('orientation', 'vertical');
        toolbar.appendChild(divider);
        continue;
      }

      if (key === 'mode-toggle') {
        this.#buildModeToggle(toolbar);
        continue;
      }

      const def = buttonMap[key];
      if (!def) continue;

      const btn = document.createElement('n-button');
      btn.setAttribute('variant', 'ghost');
      btn.setAttribute('size', 'sm');
      btn.setAttribute('square', '');
      btn.setAttribute('aria-label', def.label);
      btn.setAttribute('title', def.label);

      const icon = document.createElement('n-icon');
      icon.setAttribute('name', def.icon);
      btn.appendChild(icon);

      btn.addEventListener('native:press', this.#createToolbarHandler(def.action));
      toolbar.appendChild(btn);
    }

    // Expand button (always present, after toolbar items)
    const expandBtn = document.createElement('n-button');
    expandBtn.setAttribute('variant', 'ghost');
    expandBtn.setAttribute('size', 'sm');
    expandBtn.setAttribute('square', '');
    expandBtn.setAttribute('aria-label', 'Expand');
    expandBtn.setAttribute('title', 'Expand');
    const expandIcon = document.createElement('n-icon');
    expandIcon.setAttribute('name', 'arrows-out');
    expandBtn.appendChild(expandIcon);
    expandBtn.addEventListener('native:press', this.#onExpandClick);
    toolbar.appendChild(expandBtn);
  }

  #buildModeToggle(toolbar: HTMLElement): void {
    const segmented = document.createElement('n-segmented-control');
    segmented.setAttribute('size', 'sm');
    segmented.setAttribute('value', this.#store.mode.value);
    this.#modeSegmented = segmented;

    const previewSeg = document.createElement('n-segment');
    previewSeg.setAttribute('value', 'preview');
    previewSeg.textContent = 'Preview';

    const sourceSeg = document.createElement('n-segment');
    sourceSeg.setAttribute('value', 'source');
    sourceSeg.textContent = 'Source';

    segmented.appendChild(previewSeg);
    segmented.appendChild(sourceSeg);

    segmented.addEventListener('native:change', this.#onModeChange);

    toolbar.appendChild(segmented);
  }

  #buildSurface(): void {
    const surface = document.createElement('div');
    surface.className = 'native-editor-surface';
    this.#surface = surface;
    this.appendChild(surface);

    // Resize handle at bottom-right corner
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'native-editor-resize-handle';
    this.appendChild(resizeHandle);
  }

  // ── CodeMirror ──

  #createEditorView(): void {
    if (!this.#surface) return;

    const s = this.#store;
    const initialDoc = this.#initialContent;
    const initialMode = s.mode.value;
    const initialPlaceholder = s.placeholder.value;
    const locked = s.locked.value;

    const extensions: Extension[] = [
      NTheme,
      NSyntaxHighlighting,
      NBaseExtensions,
      EditorView.lineWrapping,
      markdown(),
      markdownKeymap,
      previewCompartment.of(
        initialMode === 'preview' ? createPreviewExtension() : sourceExtension,
      ),
      this.#readonlyCompartment.of([
        EditorState.readOnly.of(locked),
        EditorView.editable.of(!locked),
      ]),
      this.#placeholderCompartment.of(
        initialPlaceholder ? cmPlaceholder(initialPlaceholder) : [],
      ),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const value = update.state.doc.toString();
          this.#internals.setFormValue(value);
          this.#gateway.markDirty();
          this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { value },
          }));
        }
      }),
    ];

    const state = EditorState.create({
      doc: initialDoc,
      extensions,
    });

    this.#view = new EditorView({
      state,
      parent: this.#surface,
    });
  }

  // ── Event Handlers ──

  #createToolbarHandler(action: (view: EditorViewType) => boolean): () => void {
    return () => {
      if (!this.#view) return;
      action(this.#view);
      this.#view.focus();
    };
  }

  #onExpandClick = (): void => {
    this.#presentController?.present();
  };

  #onModeChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    if (detail && (detail.value === 'preview' || detail.value === 'source')) {
      this.#store.mode.value = detail.value;
      this.setAttribute('mode', detail.value);
    }
  };
}
