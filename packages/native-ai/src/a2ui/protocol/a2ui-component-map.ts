/**
 * A2UI Component Map
 *
 * Bidirectional mapping between A2UI abstract component types
 * and native-ui concrete HTML/custom element tags.
 *
 * The `ComponentRegistry` class provides a mutable registry with
 * change tracking via a signal. The default singleton (`defaultRegistry`)
 * preserves backward compatibility with existing free-function imports.
 */

import { signal } from '@nonoun/native-ui';
import type { Signal } from '@nonoun/native-ui';

// ── Child Strategy ──

export type ChildStrategy = 'children' | 'textContent' | 'slot-label' | 'none';

// ── API Surface Specs ──

export interface EventSpec {
  readonly event: string;
  readonly detail?: Readonly<Record<string, string>>;
  readonly description: string;
}

export interface PropertySpec {
  readonly attr: string;
  readonly type: string;
  readonly reactive?: boolean;
  readonly note?: string;
}

export interface MethodSpec {
  readonly name: string;
  readonly params?: Readonly<Record<string, string>>;
  readonly returns?: string;
  readonly description: string;
}

// ── Component Mapping ──

export interface ComponentMapping {
  readonly a2uiType: string;
  readonly nativeTag: string;
  readonly defaultAttributes?: Readonly<Record<string, string>>;
  readonly childStrategy: ChildStrategy;
  /** Maps A2UI property names to native-ui attribute names */
  readonly propertyMap?: Readonly<Record<string, string>>;
  /** Maps A2UI variant values to native-ui variant values */
  readonly variantMap?: Readonly<Record<string, string>>;
  /** The native-ui event name that maps to A2UI action */
  readonly actionEvent?: string;
  /** Full event surface — supersedes actionEvent when present. */
  readonly events?: readonly EventSpec[];
  /** Full property surface — supersedes propertyMap when present. */
  readonly properties?: readonly PropertySpec[];
  /** Imperative methods on the rendered element. */
  readonly methods?: readonly MethodSpec[];
}

// ── Serialized Registry ──

export interface RegistrySnapshot {
  readonly mappings: ComponentMapping[];
  readonly categories: Record<string, string>;
}

// ── Component Registry ──

export class ComponentRegistry {
  #forward = new Map<string, ComponentMapping>();
  #reverse = new Map<string, ComponentMapping>();
  #categories = new Map<string, string>();
  #version: Signal<number>;

  constructor(mappings: readonly ComponentMapping[], categories?: Readonly<Record<string, string>>) {
    this.#version = signal(0);
    for (const m of mappings) this.#addInternal(m);
    if (categories) {
      for (const [type, cat] of Object.entries(categories)) {
        this.#categories.set(type, cat);
      }
    }
  }

  // ── Change Tracking ──

  get version(): Signal<number> { return this.#version; }

  // ── Read API ──

  get(type: string): ComponentMapping | undefined { return this.#forward.get(type); }
  has(type: string): boolean { return this.#forward.has(type); }
  get size(): number { return this.#forward.size; }
  keys(): IterableIterator<string> { return this.#forward.keys(); }
  values(): IterableIterator<ComponentMapping> { return this.#forward.values(); }
  entries(): IterableIterator<[string, ComponentMapping]> { return this.#forward.entries(); }
  forEach(cb: (mapping: ComponentMapping, type: string, map: Map<string, ComponentMapping>) => void): void {
    this.#forward.forEach(cb);
  }
  [Symbol.iterator](): IterableIterator<[string, ComponentMapping]> { return this.#forward[Symbol.iterator](); }

  // ── Mutation API ──

  add(mapping: ComponentMapping, notify = true): void {
    this.#addInternal(mapping);
    if (notify) this.#version.value++;
  }

  update(a2uiType: string, patch: Partial<Omit<ComponentMapping, 'a2uiType'>>): void {
    const existing = this.#forward.get(a2uiType);
    if (!existing) return;
    const updated: ComponentMapping = { ...existing, ...patch };
    this.#forward.set(a2uiType, updated);
    this.#rebuildReverse();
    this.#version.value++;
  }

  remove(a2uiType: string): void {
    if (!this.#forward.has(a2uiType)) return;
    this.#forward.delete(a2uiType);
    this.#categories.delete(a2uiType);
    this.#rebuildReverse();
    this.#version.value++;
  }

  setCategory(a2uiType: string, category: string): void {
    this.#categories.set(a2uiType, category);
    this.#version.value++;
  }

  // ── Serialization ──

  toJSON(): RegistrySnapshot {
    const mappings = Array.from(this.#forward.values());
    const categories: Record<string, string> = {};
    for (const [type, cat] of this.#categories) categories[type] = cat;
    return { mappings, categories };
  }

  static fromJSON(data: RegistrySnapshot): ComponentRegistry {
    return new ComponentRegistry(data.mappings, data.categories);
  }

  clone(): ComponentRegistry {
    return ComponentRegistry.fromJSON(this.toJSON());
  }

  // ── Lookup Functions ──

  resolveNativeTag(a2uiType: string): ComponentMapping | null {
    return this.#forward.get(a2uiType) ?? null;
  }

  resolveA2UIType(tag: string, attributes?: Readonly<Record<string, string>>): string | null {
    // Check data-a2ui attribute first (for div/span disambiguation)
    const a2uiAttr = attributes?.['data-a2ui'];
    if (a2uiAttr && this.#forward.has(a2uiAttr)) return a2uiAttr;

    // Direct reverse lookup
    const mapping = this.#reverse.get(tag);
    if (mapping) return mapping.a2uiType;

    // Fallback: disambiguate plain HTML tags and shared custom elements
    if (tag === 'span') {
      if (attributes?.class?.includes('text')) return 'Text';
      return 'Text';
    }
    if (tag === 'n-stack') {
      return attributes?.direction === 'row' ? 'Row' : 'Column';
    }
    if (tag === 'div') {
      if (attributes?.class?.includes('stack')) {
        return attributes?.direction === 'row' ? 'Row' : 'Column';
      }
      const style = attributes?.style ?? '';
      if (style.includes('flex-direction:column') || style.includes('flex-direction: column')) return 'Column';
      if (style.includes('display:flex') || style.includes('display: flex')) return 'Row';
      return 'Column';
    }
    if (tag === 'img') return 'Image';
    if (tag === 'video') return 'Video';
    if (tag === 'audio') return 'AudioPlayer';
    if (/^h[1-6]$/.test(tag)) return 'Text';
    return null;
  }

  getSupportedTypes(): readonly string[] {
    return Array.from(this.#forward.keys());
  }

  getComponentCategory(a2uiType: string): string {
    return this.#categories.get(a2uiType) ?? 'other';
  }

  getCompatibleTypes(a2uiType: string): readonly string[] {
    const cat = this.getComponentCategory(a2uiType);
    return Array.from(this.#forward.keys()).filter(t => this.getComponentCategory(t) === cat);
  }

  // ── Internals ──

  #addInternal(mapping: ComponentMapping): void {
    this.#forward.set(mapping.a2uiType, mapping);
    if (mapping.nativeTag !== 'div' && mapping.nativeTag !== 'span' && !this.#reverse.has(mapping.nativeTag)) {
      this.#reverse.set(mapping.nativeTag, mapping);
    }
  }

  #rebuildReverse(): void {
    this.#reverse.clear();
    for (const m of this.#forward.values()) {
      if (m.nativeTag !== 'div' && m.nativeTag !== 'span' && !this.#reverse.has(m.nativeTag)) {
        this.#reverse.set(m.nativeTag, m);
      }
    }
  }
}

// ── Shared interactive properties ──
// These CSS-driven attributes apply to all interactive <n-*> components.
// Defined once here to avoid repetition across 20+ component entries.

const SHARED_INTERACTIVE_PROPS: readonly PropertySpec[] = [
  { attr: 'intent', type: "'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'", note: 'Color intent — drives background, border, and text color tokens' },
  { attr: 'variant', type: "'default' | 'primary' | 'secondary' | 'ghost' | 'outline'", note: 'Visual weight — primary=filled, ghost=transparent, outline=bordered' },
  { attr: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'", note: 'Component scale — affects height, padding, font-size, icon-size' },
  { attr: 'radius', type: "'none' | 'sm' | 'md' | 'lg' | 'full'", note: 'Border radius override' },
  { attr: 'density', type: "'compact' | 'inline'", note: 'compact=reduced padding, inline=minimal height' },
];

// ── Default Seed Data ──

const DEFAULT_MAPPINGS: readonly ComponentMapping[] = [
  {
    a2uiType: 'Text',
    nativeTag: 'span',
    childStrategy: 'textContent',
    defaultAttributes: { class: 'text' },
    events: [],
    properties: [{ attr: 'variant', type: "'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'heading' | 'caption' | 'body'", note: 'Resolved to HTML tag by textVariantTag()' }],
    methods: [],
  },
  {
    a2uiType: 'Button',
    nativeTag: 'n-button',
    childStrategy: 'slot-label',
    actionEvent: 'native:press',
    defaultAttributes: { size: 'sm' },
    variantMap: {
      primary: 'primary',
      secondary: 'secondary',
      borderless: 'ghost',
      ghost: 'ghost',
      outline: 'outline',
      danger: 'primary',
    },
    events: [{ event: 'native:press', description: 'Fires on click or keyboard activation (Enter/Space).' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'type', type: "'button' | 'submit' | 'reset'", reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'TextField',
    nativeTag: 'n-input',
    childStrategy: 'none',
    actionEvent: 'native:input',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      value: 'value',
      placeholder: 'placeholder',
    },
    events: [
      { event: 'native:input', detail: { value: 'string' }, description: 'Fires on each keystroke.' },
      { event: 'native:change', detail: { value: 'string' }, description: 'Fires on blur after value changed.' },
      { event: 'native:format', detail: { type: 'string', value: 'string' }, description: 'Fires after text formatting is applied.' },
    ],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'string', reactive: true },
      { attr: 'placeholder', type: 'string', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'readonly', type: 'boolean', reactive: true },
      { attr: 'required', type: 'boolean', reactive: true },
      { attr: 'pattern', type: 'string' },
      { attr: 'type', type: "'text' | 'password'", reactive: true },
      { attr: 'formatting', type: 'string', note: 'Space-separated format list (code, bold, italic)' },
    ],
    methods: [
      { name: 'select', returns: 'void', description: 'Select all text in the input.' },
      { name: 'focus', params: { options: 'FocusOptions' }, returns: 'void', description: 'Focus the editing surface.' },
    ],
  },
  {
    a2uiType: 'TextArea',
    nativeTag: 'n-textarea',
    childStrategy: 'none',
    actionEvent: 'native:input',
    defaultAttributes: { size: 'sm', rows: '2' },
    propertyMap: {
      value: 'value',
      placeholder: 'placeholder',
      rows: 'rows',
    },
    events: [
      { event: 'native:input', detail: { value: 'string' }, description: 'Fires on each keystroke.' },
      { event: 'native:change', detail: { value: 'string' }, description: 'Fires on blur after value changed.' },
      { event: 'native:format', detail: { type: 'string', value: 'string' }, description: 'Fires after text formatting is applied.' },
    ],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'string', reactive: true },
      { attr: 'placeholder', type: 'string', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'readonly', type: 'boolean', reactive: true },
      { attr: 'required', type: 'boolean', reactive: true },
      { attr: 'rows', type: 'number', reactive: true },
      { attr: 'maxlength', type: 'number' },
      { attr: 'autogrow', type: 'boolean', reactive: true },
      { attr: 'pattern', type: 'string' },
      { attr: 'formatting', type: 'string', note: 'Space-separated format list (code, bold, italic)' },
    ],
    methods: [
      { name: 'applyFormat', params: { type: 'string' }, returns: 'void', description: 'Apply or toggle a text format on the current selection.' },
    ],
  },
  {
    a2uiType: 'CheckBox',
    nativeTag: 'n-checkbox',
    childStrategy: 'textContent',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
    events: [{ event: 'native:change', detail: { checked: 'boolean', value: 'string' }, description: 'Fires when checked state toggles.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'checked', type: 'boolean', reactive: true },
      { attr: 'indeterminate', type: 'boolean', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'name', type: 'string' },
      { attr: 'value', type: 'string', note: "Defaults to 'on'" },
      { attr: 'required', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'Switch',
    nativeTag: 'n-switch',
    childStrategy: 'textContent',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
    events: [{ event: 'native:change', detail: { checked: 'boolean', value: 'string' }, description: 'Fires when toggled on/off.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'checked', type: 'boolean', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'name', type: 'string' },
      { attr: 'value', type: 'string', note: "Defaults to 'on'" },
      { attr: 'required', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'ChoicePicker',
    nativeTag: 'n-select',
    childStrategy: 'children',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      placeholder: 'placeholder',
    },
    events: [{ event: 'native:change', detail: { value: 'string', label: 'string', previousValue: 'string' }, description: 'Fires when selection changes.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'string', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'name', type: 'string' },
      { attr: 'options', type: 'string', note: 'JSON array: [{ value, label }]' },
      { attr: 'src', type: 'string', note: 'URL for fetching options' },
      { attr: 'placeholder', type: 'string', reactive: true },
      { attr: 'required', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'Slider',
    nativeTag: 'n-range',
    childStrategy: 'none',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      min: 'min',
      max: 'max',
      value: 'value',
    },
    events: [{ event: 'native:change', detail: { value: 'number' }, description: 'Fires when slider value changes.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'number', reactive: true },
      { attr: 'min', type: 'number' },
      { attr: 'max', type: 'number' },
      { attr: 'step', type: 'number' },
      { attr: 'disabled', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'DateTimeInput',
    nativeTag: 'n-input',
    childStrategy: 'none',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      value: 'value',
      min: 'min',
      max: 'max',
    },
    events: [{ event: 'native:change', detail: { value: 'string' }, description: 'Fires when date/time value changes.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'string', reactive: true },
      { attr: 'min', type: 'string' },
      { attr: 'max', type: 'string' },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'required', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'Row',
    nativeTag: 'n-stack',
    childStrategy: 'children',
    defaultAttributes: { direction: 'row' },
    events: [],
    properties: [{ attr: 'gap', type: 'string' }, { attr: 'align', type: 'string' }],
    methods: [],
  },
  {
    a2uiType: 'Column',
    nativeTag: 'n-stack',
    childStrategy: 'children',
    events: [],
    properties: [{ attr: 'gap', type: 'string' }, { attr: 'align', type: 'string' }],
    methods: [],
  },
  {
    a2uiType: 'Card',
    nativeTag: 'n-container',
    childStrategy: 'children',
    events: [],
    properties: [{ attr: 'bordered', type: 'boolean' }, { attr: 'data-kind', type: "'panel'" }],
    methods: [],
  },
  {
    a2uiType: 'Header',
    nativeTag: 'n-header',
    childStrategy: 'children',
    events: [],
    properties: [],
    methods: [],
  },
  {
    a2uiType: 'Body',
    nativeTag: 'n-body',
    childStrategy: 'children',
    events: [],
    properties: [],
    methods: [],
  },
  {
    a2uiType: 'Footer',
    nativeTag: 'n-footer',
    childStrategy: 'children',
    events: [],
    properties: [],
    methods: [],
  },
  {
    a2uiType: 'Modal',
    nativeTag: 'n-dialog',
    childStrategy: 'children',
    actionEvent: 'native:dismiss',
    events: [{ event: 'close', description: 'Fires when the dialog is closed.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'no-close-on-escape', type: 'boolean' },
      { attr: 'no-close-on-backdrop', type: 'boolean' },
    ],
    methods: [
      { name: 'showModal', returns: 'void', description: 'Open the dialog in modal mode.' },
      { name: 'close', returns: 'void', description: 'Close the dialog.' },
    ],
  },
  {
    a2uiType: 'Tabs',
    nativeTag: 'n-tabs',
    childStrategy: 'children',
    events: [{ event: 'native:change', detail: { value: 'string', label: 'string' }, description: 'Fires when the active tab changes.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'string', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'orientation', type: "'horizontal' | 'vertical'", reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'List',
    nativeTag: 'n-listbox',
    childStrategy: 'children',
    actionEvent: 'native:select',
    events: [{ event: 'native:change', detail: { value: 'string', label: 'string' }, description: 'Fires when the selected option changes.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'multiple', type: 'boolean', reactive: true },
      { attr: 'virtual-focus', type: 'boolean' },
    ],
    methods: [
      { name: 'getActiveOption', returns: 'Element | null', description: 'Returns the currently keyboard-focused option.' },
    ],
  },
  {
    a2uiType: 'ListItem',
    nativeTag: 'n-option',
    childStrategy: 'textContent',
    events: [{ event: 'native:select', detail: { value: 'string', label: 'string' }, description: 'Fires when this option is clicked.' }],
    properties: [
      { attr: 'value', type: 'string' },
      { attr: 'disabled', type: 'boolean' },
      { attr: 'label', type: 'string', note: 'Falls back to textContent' },
    ],
    methods: [],
  },
  {
    a2uiType: 'Image',
    nativeTag: 'n-picture',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
      alt: 'alt',
    },
    events: [],
    properties: [{ attr: 'src', type: 'string' }, { attr: 'alt', type: 'string' }],
    methods: [],
  },
  {
    a2uiType: 'Icon',
    nativeTag: 'n-icon',
    childStrategy: 'none',
    defaultAttributes: { 'aria-hidden': 'true' },
    propertyMap: {
      name: 'name',
    },
    events: [],
    properties: [{ attr: 'name', type: 'string', reactive: true }],
    methods: [],
  },
  {
    a2uiType: 'Divider',
    nativeTag: 'n-divider',
    childStrategy: 'none',
    events: [],
    properties: [{ attr: 'orientation', type: "'horizontal' | 'vertical'" }],
    methods: [],
  },
  {
    a2uiType: 'Badge',
    nativeTag: 'n-badge',
    childStrategy: 'textContent',
    events: [],
    properties: [{ attr: 'intent', type: "'info' | 'success' | 'warning' | 'danger'" }, { attr: 'dot', type: 'boolean' }],
    methods: [],
  },
  {
    a2uiType: 'Avatar',
    nativeTag: 'n-avatar',
    childStrategy: 'none',
    propertyMap: {
      src: 'src',
      alt: 'alt',
    },
    events: [],
    properties: [{ attr: 'src', type: 'string' }, { attr: 'alt', type: 'string' }],
    methods: [],
  },
  {
    a2uiType: 'Select',
    nativeTag: 'n-select',
    childStrategy: 'children',
    actionEvent: 'native:change',
    propertyMap: {
      placeholder: 'placeholder',
    },
    events: [{ event: 'native:change', detail: { value: 'string', label: 'string', previousValue: 'string' }, description: 'Fires when selection changes.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'value', type: 'string', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'name', type: 'string' },
      { attr: 'options', type: 'string', note: 'JSON array: [{ value, label }]' },
      { attr: 'src', type: 'string', note: 'URL for fetching options' },
      { attr: 'placeholder', type: 'string', reactive: true },
      { attr: 'required', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'Video',
    nativeTag: 'n-video',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
      poster: 'poster',
    },
    events: [],
    properties: [{ attr: 'src', type: 'string' }, { attr: 'poster', type: 'string' }],
    methods: [],
  },
  {
    a2uiType: 'AudioPlayer',
    nativeTag: 'n-audio',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
    },
    events: [],
    properties: [{ attr: 'src', type: 'string' }],
    methods: [],
  },
  {
    a2uiType: 'Accordion',
    nativeTag: 'n-accordion',
    childStrategy: 'children',
    events: [],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'multiple', type: 'boolean', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
    ],
    methods: [],
  },
  {
    a2uiType: 'AccordionItem',
    nativeTag: 'n-accordion-item',
    childStrategy: 'children',
    propertyMap: {
      label: 'label',
    },
    events: [],
    properties: [
      { attr: 'open', type: 'boolean', reactive: true },
      { attr: 'disabled', type: 'boolean', reactive: true },
      { attr: 'label', type: 'string' },
    ],
    methods: [],
  },
  {
    a2uiType: 'Table',
    nativeTag: 'n-table',
    childStrategy: 'children',
    events: [
      { event: 'native:table-sort', detail: { column: 'string', direction: "'asc' | 'desc' | null" }, description: 'Fires when column sort changes.' },
      { event: 'native:table-select', detail: { value: 'string', selected: 'boolean', allSelected: 'string[]' }, description: 'Fires when row selection changes.' },
      { event: 'native:table-reorder', detail: { sourceIndex: 'number', targetIndex: 'number', inserted: 'string[]' }, description: 'Fires when rows are drag-reordered.' },
    ],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'selectable', type: 'boolean', reactive: true },
      { attr: 'resizable', type: 'boolean' },
      { attr: 'reorderable', type: 'boolean' },
      { attr: 'cols', type: 'string', reactive: true, note: 'Sets grid-template-columns CSS' },
      { attr: 'sticky-header', type: 'boolean' },
    ],
    methods: [],
  },
  {
    a2uiType: 'Progress',
    nativeTag: 'n-progress',
    childStrategy: 'none',
    propertyMap: {
      value: 'value',
      max: 'max',
    },
    events: [],
    properties: [...SHARED_INTERACTIVE_PROPS, { attr: 'value', type: 'number', reactive: true }, { attr: 'max', type: 'number' }],
    methods: [],
  },
  {
    a2uiType: 'Breadcrumb',
    nativeTag: 'n-breadcrumb',
    childStrategy: 'children',
    events: [],
    properties: [],
    methods: [],
  },
  {
    a2uiType: 'Toast',
    nativeTag: 'n-toast',
    childStrategy: 'textContent',
    events: [{ event: 'native:dismiss', description: 'Fires when the toast dismiss button is clicked.' }],
    properties: [
      ...SHARED_INTERACTIVE_PROPS,
      { attr: 'message', type: 'string' },
      { attr: 'dismissible', type: 'boolean' },
    ],
    methods: [],
  },
  {
    a2uiType: 'Chart',
    nativeTag: 'n-chart',
    childStrategy: 'none',
    events: [
      { event: 'native:chart-hover', detail: { point: 'ChartPoint', series: 'string', x: 'number', y: 'number' }, description: 'Fires when hovering over a data point.' },
      { event: 'native:chart-select', detail: { point: 'ChartPoint', series: 'string' }, description: 'Fires when clicking a data point.' },
      { event: 'native:chart-legend-toggle', detail: { series: 'string', visible: 'boolean' }, description: 'Fires when a legend item is toggled.' },
    ],
    properties: [
      { attr: 'type', type: "'line' | 'bar' | 'scatter' | 'sparkline'", note: 'Chart type — sparkline is compact (no axes/legend)' },
      { attr: 'palette', type: "'default' | 'vivid' | 'pastel' | 'earth' | 'ocean' | 'sunset' | 'forest' | 'neon' | 'mono' | 'accessible'", note: 'Color palette' },
      { attr: 'stacked', type: 'boolean', note: 'Stack bars/areas on top of each other' },
      { attr: 'smooth', type: 'boolean', note: 'Smooth line curves (Catmull-Rom)' },
      { attr: 'area', type: 'boolean', note: 'Fill area under line' },
      { attr: 'horizontal', type: 'boolean', note: 'Horizontal bar chart' },
      { attr: 'legend', type: "'top' | 'bottom' | 'none'", note: 'Legend position' },
      { attr: 'grid', type: "'horizontal' | 'vertical' | 'both' | 'none'", note: 'Grid line visibility' },
      { attr: 'animate', type: 'boolean', note: 'Entry animations (line draw, bar grow)' },
      { attr: 'aspect', type: 'string', note: 'Aspect ratio e.g. "16:9"' },
      { attr: 'x-label', type: 'string', note: 'X-axis label' },
      { attr: 'y-label', type: 'string', note: 'Y-axis label' },
      { attr: 'average', type: 'boolean', note: 'Show dashed average line per series' },
      { attr: 'disabled', type: 'boolean', note: 'Disable interactions and grey out' },
    ],
    methods: [],
  },
  {
    a2uiType: 'Controller',
    nativeTag: 'n-controller',
    childStrategy: 'children',
    propertyMap: { traits: 'traits' },
    events: [],
    properties: [
      { attr: 'traits', type: 'string', note: 'Space-separated trait names. Core: pressable, hoverable, swipeable, draggable, droppable, resizable, collapsible, dismissable, editable, sortable, selectable, searchable, copyable, clippable, presentable, modalable, toastable, shortcutable, slash-commandable, validatable, intersectable, virtualizable, noodleable. Fun: flippable, tossable, parallaxable, confettible, magnetizable' },
    ],
    methods: [],
  },
];

const DEFAULT_CATEGORIES: Record<string, string> = {
  Text: 'display',
  Icon: 'display',
  Image: 'display',
  Badge: 'display',
  Avatar: 'display',
  Divider: 'display',
  Progress: 'display',
  Button: 'action',
  TextField: 'input',
  TextArea: 'input',
  CheckBox: 'input',
  Switch: 'input',
  ChoicePicker: 'input',
  Select: 'input',
  Slider: 'input',
  DateTimeInput: 'input',
  Row: 'layout',
  Column: 'layout',
  Card: 'container',
  Header: 'container',
  Body: 'container',
  Footer: 'container',
  Modal: 'container',
  Accordion: 'container',
  AccordionItem: 'container',
  Tabs: 'navigation',
  List: 'navigation',
  ListItem: 'navigation',
  Breadcrumb: 'navigation',
  Video: 'media',
  AudioPlayer: 'media',
  Table: 'data',
  Toast: 'feedback',
  Chart: 'data-viz',
  Controller: 'behavior',
};

// ── Default Singleton Registry ──

export const defaultRegistry = new ComponentRegistry(DEFAULT_MAPPINGS, DEFAULT_CATEGORIES);

/** All component mappings, keyed by A2UI type. */
export const COMPONENT_MAP: ComponentRegistry = defaultRegistry;

// ── Backward-Compatible Free Functions ──

export function resolveNativeTag(a2uiType: string): ComponentMapping | null {
  return defaultRegistry.resolveNativeTag(a2uiType);
}

export function resolveA2UIType(
  tag: string,
  attributes?: Readonly<Record<string, string>>,
): string | null {
  return defaultRegistry.resolveA2UIType(tag, attributes);
}

export function getSupportedTypes(): readonly string[] {
  return defaultRegistry.getSupportedTypes();
}

export function getComponentCategory(a2uiType: string): string {
  return defaultRegistry.getComponentCategory(a2uiType);
}

export function getCompatibleTypes(a2uiType: string): readonly string[] {
  return defaultRegistry.getCompatibleTypes(a2uiType);
}

// ── Text Variant → HTML Tag ──

const TEXT_VARIANT_TAG: Record<string, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  heading: 'h2',
  caption: 'small',
  body: 'span',
};

/**
 * For A2UI Text components, resolve the variant to an HTML tag.
 * Returns 'span' by default.
 */
export function textVariantTag(variant?: string): string {
  if (!variant) return 'span';
  return TEXT_VARIANT_TAG[variant] ?? 'span';
}

// ── DateTimeInput → Input Type ──

/**
 * For A2UI DateTimeInput components, resolve enableDate/enableTime to HTML input type.
 */
export function dateTimeInputType(
  enableDate?: boolean,
  enableTime?: boolean,
): string {
  if (enableDate && enableTime) return 'datetime-local';
  if (enableTime && !enableDate) return 'time';
  return 'date'; // default
}

// ── TextField Variant → Input Type ──

const TEXT_FIELD_VARIANT_TYPE: Record<string, string> = {
  number: 'number',
  obscured: 'password',
  shortText: 'text',
  longText: 'text',
};

/**
 * For A2UI TextField components, resolve the variant to an HTML input type attribute.
 */
export function textFieldInputType(variant?: string): string {
  if (!variant) return 'text';
  return TEXT_FIELD_VARIANT_TYPE[variant] ?? 'text';
}
