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

// ── Default Seed Data ──

const DEFAULT_MAPPINGS: readonly ComponentMapping[] = [
  {
    a2uiType: 'Text',
    nativeTag: 'span',
    childStrategy: 'textContent',
    defaultAttributes: { class: 'text' },
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
  },
  {
    a2uiType: 'CheckBox',
    nativeTag: 'n-checkbox',
    childStrategy: 'textContent',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
  },
  {
    a2uiType: 'Switch',
    nativeTag: 'n-switch',
    childStrategy: 'textContent',
    actionEvent: 'native:change',
    defaultAttributes: { size: 'sm' },
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
  },
  {
    a2uiType: 'Row',
    nativeTag: 'n-stack',
    childStrategy: 'children',
    defaultAttributes: { direction: 'row' },
  },
  {
    a2uiType: 'Column',
    nativeTag: 'n-stack',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Card',
    nativeTag: 'n-container',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Header',
    nativeTag: 'n-header',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Body',
    nativeTag: 'n-body',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Footer',
    nativeTag: 'n-footer',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Modal',
    nativeTag: 'n-dialog',
    childStrategy: 'children',
    actionEvent: 'native:dismiss',
  },
  {
    a2uiType: 'Tabs',
    nativeTag: 'n-tabs',
    childStrategy: 'children',
  },
  {
    a2uiType: 'List',
    nativeTag: 'n-listbox',
    childStrategy: 'children',
    actionEvent: 'native:select',
  },
  {
    a2uiType: 'ListItem',
    nativeTag: 'n-option',
    childStrategy: 'textContent',
  },
  {
    a2uiType: 'Image',
    nativeTag: 'n-picture',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
      alt: 'alt',
    },
  },
  {
    a2uiType: 'Icon',
    nativeTag: 'n-icon',
    childStrategy: 'none',
    defaultAttributes: { 'aria-hidden': 'true' },
    propertyMap: {
      name: 'name',
    },
  },
  {
    a2uiType: 'Divider',
    nativeTag: 'n-divider',
    childStrategy: 'none',
  },
  {
    a2uiType: 'Badge',
    nativeTag: 'n-badge',
    childStrategy: 'textContent',
  },
  {
    a2uiType: 'Avatar',
    nativeTag: 'n-avatar',
    childStrategy: 'none',
    propertyMap: {
      src: 'src',
      alt: 'alt',
    },
  },
  {
    a2uiType: 'Select',
    nativeTag: 'n-select',
    childStrategy: 'children',
    actionEvent: 'native:change',
    propertyMap: {
      placeholder: 'placeholder',
    },
  },
  {
    a2uiType: 'Video',
    nativeTag: 'n-video',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
      poster: 'poster',
    },
  },
  {
    a2uiType: 'AudioPlayer',
    nativeTag: 'n-audio',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
    },
  },
  {
    a2uiType: 'Accordion',
    nativeTag: 'n-accordion',
    childStrategy: 'children',
  },
  {
    a2uiType: 'AccordionItem',
    nativeTag: 'n-accordion-item',
    childStrategy: 'children',
    propertyMap: {
      label: 'label',
    },
  },
  {
    a2uiType: 'Table',
    nativeTag: 'n-table',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Progress',
    nativeTag: 'n-progress',
    childStrategy: 'none',
    propertyMap: {
      value: 'value',
      max: 'max',
    },
  },
  {
    a2uiType: 'Breadcrumb',
    nativeTag: 'n-breadcrumb',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Toast',
    nativeTag: 'n-toast',
    childStrategy: 'textContent',
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
