/**
 * <native-codemirror> Custom Element
 *
 * Declarative wrapper around CodeMirror 6 for the NativeUI ecosystem.
 * Provides reactive attribute-driven config, event dispatch, and
 * lifecycle management around a themed EditorView.
 *
 * @attr {string}  value        - Document content
 * @attr {string}  placeholder  - Placeholder text for empty editor
 * @attr {boolean} readonly     - Disable editing (still selectable)
 * @attr {boolean} disabled     - Full disabled state
 * @attr {boolean} line-numbers - Show line numbers (default: true)
 * @attr {boolean} line-wrapping - Enable soft line wrapping
 * @attr {number}  tab-size     - Tab size (default: 2)
 * @fires native:input  - On every document change, detail: { value }
 * @fires native:change - On blur (final commit), detail: { value }
 */

import type { Extension } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { NativeElement, signal, createDisabledEffect } from '@nonoun/native-ui';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers as cmLineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightSpecialChars,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from '@codemirror/language';
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { NTheme, NSyntaxHighlighting } from './theme.ts';

export class NCodemirror extends NativeElement {
  static observedAttributes = [
    'value', 'placeholder', 'readonly', 'disabled',
    'line-numbers', 'line-wrapping', 'tab-size',
  ];

  #internals: ElementInternals;
  #view: EditorView | null = null;

  // Signals
  #disabled = signal(false);
  #readonly = signal(false);
  #placeholder = signal('');
  #tabSize = signal(2);
  #lineNumbers = signal(true);
  #lineWrapping = signal(false);
  #extensions = signal<Extension[]>([]);

  // Compartments
  #readonlyCompartment = new Compartment();
  #placeholderCompartment = new Compartment();
  #extensionsCompartment = new Compartment();
  #lineNumbersCompartment = new Compartment();
  #lineWrappingCompartment = new Compartment();
  #tabSizeCompartment = new Compartment();

  // Track last committed value for native:change
  #lastCommittedValue = '';

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public Properties ──

  get value(): string {
    if (this.#view) return this.#view.state.doc.toString();
    return this.getAttribute('value') ?? '';
  }

  set value(val: string) {
    if (this.#view) {
      const current = this.#view.state.doc.toString();
      if (current !== val) {
        this.#view.dispatch({
          changes: { from: 0, to: this.#view.state.doc.length, insert: val },
        });
      }
    }
  }

  get editorView(): EditorView | null {
    return this.#view;
  }

  /** Additional CodeMirror extensions (language modes, etc.). */
  get extensions(): Extension[] {
    return this.#extensions.value;
  }

  set extensions(val: Extension[]) {
    this.#extensions.value = val;
  }

  get readOnly(): boolean {
    return this.#readonly.value;
  }

  set readOnly(val: boolean) {
    this.#readonly.value = val;
    this.toggleAttribute('readonly', val);
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get placeholder(): string {
    return this.#placeholder.value;
  }

  set placeholder(val: string) {
    this.#placeholder.value = val;
    this.setAttribute('placeholder', val);
  }

  override focus(): void {
    this.#view?.focus();
  }

  // ── Attribute Sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        if (this.#view) {
          const current = this.#view.state.doc.toString();
          if (current !== (val ?? '')) {
            this.#view.dispatch({
              changes: { from: 0, to: this.#view.state.doc.length, insert: val ?? '' },
            });
          }
        }
        break;
      case 'placeholder':
        this.#placeholder.value = val ?? '';
        break;
      case 'readonly':
        this.#readonly.value = val !== null;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'line-numbers':
        this.#lineNumbers.value = val !== 'false';
        break;
      case 'line-wrapping':
        this.#lineWrapping.value = val !== null;
        break;
      case 'tab-size':
        this.#tabSize.value = val !== null ? parseInt(val, 10) || 2 : 2;
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Sync initial attribute values
    this.#disabled.value = this.hasAttribute('disabled');
    this.#readonly.value = this.hasAttribute('readonly');
    this.#placeholder.value = this.getAttribute('placeholder') ?? '';
    this.#lineNumbers.value = this.getAttribute('line-numbers') !== 'false';
    this.#lineWrapping.value = this.hasAttribute('line-wrapping');
    const tabAttr = this.getAttribute('tab-size');
    if (tabAttr) this.#tabSize.value = parseInt(tabAttr, 10) || 2;

    // Read initial content
    const initialDoc = this.#readInitialContent();
    this.#lastCommittedValue = initialDoc;

    // Create EditorView
    this.#createEditorView(initialDoc);

    // Set tabindex for focusability
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    // Disabled pipeline
    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));

    // Locked effect (readonly OR disabled → CM readOnly)
    this.addEffect(() => {
      const locked = this.#readonly.value || this.#disabled.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#readonlyCompartment.reconfigure([
            EditorState.readOnly.of(locked),
            EditorView.editable.of(!locked),
          ]),
        });
      }
    });

    // Placeholder effect
    this.addEffect(() => {
      const text = this.#placeholder.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#placeholderCompartment.reconfigure(
            text ? cmPlaceholder(text) : [],
          ),
        });
      }
    });

    // Extensions effect
    this.addEffect(() => {
      const exts = this.#extensions.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#extensionsCompartment.reconfigure(exts),
        });
      }
    });

    // Line numbers effect
    this.addEffect(() => {
      const show = this.#lineNumbers.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#lineNumbersCompartment.reconfigure(
            show ? [cmLineNumbers(), foldGutter(), highlightActiveLineGutter()] : [],
          ),
        });
      }
    });

    // Line wrapping effect
    this.addEffect(() => {
      const wrap = this.#lineWrapping.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#lineWrappingCompartment.reconfigure(
            wrap ? EditorView.lineWrapping : [],
          ),
        });
      }
    });

    // Tab size effect
    this.addEffect(() => {
      const size = this.#tabSize.value;
      if (this.#view) {
        this.#view.dispatch({
          effects: this.#tabSizeCompartment.reconfigure(
            EditorState.tabSize.of(size),
          ),
        });
      }
    });
  }

  teardown(): void {
    this.#view?.destroy();
    this.#view = null;
    super.teardown();
  }

  // ── Private ──

  #readInitialContent(): string {
    const script = this.querySelector('script[type="text/plain"]');
    if (script) {
      const content = script.textContent ?? '';
      script.remove();
      return content.replace(/^\n/, '');
    }
    return this.getAttribute('value') ?? '';
  }

  #createEditorView(doc: string): void {
    const locked = this.#readonly.value || this.#disabled.value;
    const initialPlaceholder = this.#placeholder.value;
    const showLineNumbers = this.#lineNumbers.value;
    const wrap = this.#lineWrapping.value;
    const tabSize = this.#tabSize.value;

    const extensions: Extension[] = [
      NTheme,
      NSyntaxHighlighting,
      // Base extensions (line numbers/gutter managed separately by compartment)
      highlightSpecialChars(),
      drawSelection(),
      indentOnInput(),
      history(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightActiveLine(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
      ]),
      this.#readonlyCompartment.of([
        EditorState.readOnly.of(locked),
        EditorView.editable.of(!locked),
      ]),
      this.#placeholderCompartment.of(
        initialPlaceholder ? cmPlaceholder(initialPlaceholder) : [],
      ),
      this.#extensionsCompartment.of(this.#extensions.value),
      this.#lineNumbersCompartment.of(
        showLineNumbers ? [cmLineNumbers(), foldGutter(), highlightActiveLineGutter()] : [],
      ),
      this.#lineWrappingCompartment.of(
        wrap ? EditorView.lineWrapping : [],
      ),
      this.#tabSizeCompartment.of(
        EditorState.tabSize.of(tabSize),
      ),
      // Change listener
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const value = update.state.doc.toString();
          this.dispatchEvent(new CustomEvent('native:input', {
            bubbles: true,
            composed: true,
            detail: { value },
          }));
        }
        if (update.focusChanged && !update.view.hasFocus) {
          const value = update.state.doc.toString();
          if (value !== this.#lastCommittedValue) {
            this.#lastCommittedValue = value;
            this.dispatchEvent(new CustomEvent('native:change', {
              bubbles: true,
              composed: true,
              detail: { value },
            }));
          }
        }
      }),
    ];

    const state = EditorState.create({ doc, extensions });

    this.#view = new EditorView({
      state,
      parent: this,
      // WHY: When the editor parent is slotted inside a shadow host (e.g. native-app),
      // CM6's getRoot() follows assignedSlot → shadow root, then mounts its StyleModule
      // into the shadow root's adoptedStyleSheets. But the editor DOM stays in the light
      // DOM, so those styles don't apply. Force document root for correct style mounting.
      root: this.ownerDocument,
    });
  }
}
