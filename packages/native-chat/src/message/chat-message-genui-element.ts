import { NativeElement, signal } from '@nonoun/native-ui';

/** Minimal UINode shape for schema-driven rendering. */
export interface GenUINode {
  tag: string;
  id?: string;
  attributes?: Record<string, string>;
  properties?: Record<string, unknown>;
  children?: GenUINode[];
  text?: string;
  slot?: string;
}

const FORBIDDEN_TAGS = new Set([
  'script', 'style', 'link', 'iframe', 'embed', 'object',
  'form', 'input', 'textarea', 'select', 'meta', 'base',
  'applet', 'frame', 'frameset', 'noscript',
]);

/**
 * GenUI message card — renders UI from a schema (A2UI, MCPUI, etc).
 *
 * Validates the schema before rendering. Forbidden tags are rejected.
 *
 * ```html
 * <n-chat-message-genui schema-type="a2ui" mode="inline"></n-chat-message-genui>
 * ```
 *
 * Set the schema via property:
 * ```js
 * el.schema = { tag: 'n-card', children: [{ tag: 'p', text: 'Hello' }] };
 * ```
 *
 * @attr {string} schema-type - `a2ui` | `mcpui`
 * @attr {string} mode - `inline` (default) | `lightbox`
 * @fires native:genui-action - Fired when an action occurs within the rendered UI
 * @fires native:genui-error - Fired when schema validation fails
 */
export class NChatMessageGenUI extends NativeElement {
  static observedAttributes = ['schema-type', 'mode'];

  #internals: ElementInternals;
  #schemaType = signal<string>('a2ui');
  #mode = signal<'inline' | 'lightbox'>('inline');
  #schema = signal<GenUINode | null>(null);
  #containerEl: HTMLElement | null = null;
  #lightboxDialog: HTMLElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get schema(): GenUINode | null { return this.#schema.value; }
  set schema(val: GenUINode | null) {
    this.#schema.value = val;
  }

  get schemaType(): string { return this.#schemaType.value; }
  set schemaType(val: string) {
    this.#schemaType.value = val;
    this.setAttribute('schema-type', val);
  }

  get mode(): 'inline' | 'lightbox' { return this.#mode.value; }
  set mode(val: 'inline' | 'lightbox') {
    this.#mode.value = val;
    this.setAttribute('mode', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'schema-type': this.#schemaType.value = val ?? 'a2ui'; break;
      case 'mode': this.#mode.value = val === 'lightbox' ? 'lightbox' : 'inline'; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.#containerEl = document.createElement('div');
    this.#containerEl.className = 'n-chat-genui-container';
    this.appendChild(this.#containerEl);

    this.addEffect(() => {
      const schema = this.#schema.value;
      const mode = this.#mode.value;
      if (!this.#containerEl) return;

      this.#containerEl.textContent = '';

      if (!schema) return;

      // Validate
      const errors = validateNode(schema);
      if (errors.length > 0) {
        this.#renderError(errors);
        this.dispatchEvent(new CustomEvent('native:genui-error', {
          bubbles: true,
          composed: true,
          detail: { errors },
        }));
        return;
      }

      if (mode === 'lightbox') {
        this.#renderLightboxPreview(schema);
      } else {
        const tree = stampNode(schema);
        if (tree) this.#containerEl.appendChild(tree);
      }

      this.#internals.states.add('rendered');
    });

    // Delegate events from stamped GenUI
    this.addEventListener('native:press', this.#onGenUIAction);
  }

  teardown(): void {
    this.removeEventListener('native:press', this.#onGenUIAction);
    this.#closeLightbox();
    this.#containerEl = null;
    super.teardown();
  }

  // ── Rendering ──

  #renderError(errors: string[]): void {
    if (!this.#containerEl) return;
    const el = document.createElement('div');
    el.className = 'n-chat-genui-error';
    el.textContent = `Schema validation failed: ${errors.join(', ')}`;
    this.#containerEl.appendChild(el);
  }

  #renderLightboxPreview(schema: GenUINode): void {
    if (!this.#containerEl) return;

    const preview = document.createElement('n-card');
    preview.dataset.role = 'preview';

    const label = document.createElement('span');
    label.textContent = `Interactive UI (${schema.tag})`;
    preview.appendChild(label);

    const btn = document.createElement('n-button');
    btn.setAttribute('variant', 'outline');
    btn.setAttribute('size', 'sm');
    btn.setAttribute('inline', '');
    btn.textContent = 'Open';
    btn.addEventListener('click', () => this.#openLightbox(schema));
    preview.appendChild(btn);

    this.#containerEl.appendChild(preview);
  }

  #openLightbox(schema: GenUINode): void {
    // Close any existing lightbox first
    this.#closeLightbox();

    const dialog = document.createElement('n-dialog');
    const tree = stampNode(schema);
    if (tree) dialog.appendChild(tree);
    this.appendChild(dialog);
    this.#lightboxDialog = dialog;

    // n-dialog creates a native <dialog> in setup, then showModal
    requestAnimationFrame(() => {
      const inner = dialog.querySelector('dialog');
      if (inner) inner.showModal();
    });

    dialog.addEventListener('close', () => {
      dialog.remove();
      if (this.#lightboxDialog === dialog) {
        this.#lightboxDialog = null;
      }
    });
  }

  #closeLightbox(): void {
    if (!this.#lightboxDialog) return;
    const inner = this.#lightboxDialog.querySelector('dialog');
    if (inner?.open) {
      try { inner.close(); } catch { /* already closed */ }
    }
    this.#lightboxDialog.remove();
    this.#lightboxDialog = null;
  }

  // ── Events ──

  #onGenUIAction = (e: Event): void => {
    // Only re-dispatch if it came from inside the container
    if (!this.#containerEl?.contains(e.target as Node)) return;

    this.dispatchEvent(new CustomEvent('native:genui-action', {
      bubbles: true,
      composed: true,
      detail: {
        schemaType: this.#schemaType.value,
        action: 'press',
        data: (e as CustomEvent).detail,
      },
    }));
  };
}

// ═══════════════════════════════════════════════════════
// Schema validation + DOM stamping
// ═══════════════════════════════════════════════════════

function validateNode(node: GenUINode, depth = 0): string[] {
  const errors: string[] = [];

  if (depth > 20) {
    errors.push('Maximum nesting depth (20) exceeded');
    return errors;
  }

  if (!node.tag || typeof node.tag !== 'string') {
    errors.push('Node missing required "tag" property');
    return errors;
  }

  if (FORBIDDEN_TAGS.has(node.tag.toLowerCase())) {
    errors.push(`Forbidden tag: <${node.tag}>`);
  }

  if (node.children) {
    for (const child of node.children) {
      errors.push(...validateNode(child, depth + 1));
    }
  }

  return errors;
}

function stampNode(node: GenUINode): HTMLElement | null {
  if (FORBIDDEN_TAGS.has(node.tag.toLowerCase())) return null;

  const el = document.createElement(node.tag);

  if (node.id) el.id = node.id;
  if (node.slot) el.slot = node.slot;

  if (node.attributes) {
    for (const [key, val] of Object.entries(node.attributes)) {
      el.setAttribute(key, val);
    }
  }

  if (node.properties) {
    for (const [key, val] of Object.entries(node.properties)) {
      (el as unknown as Record<string, unknown>)[key] = val;
    }
  }

  if (node.text) {
    el.textContent = node.text;
  }

  if (node.children) {
    for (const child of node.children) {
      const childEl = stampNode(child);
      if (childEl) el.appendChild(childEl);
    }
  }

  return el;
}
