/**
 * A2UI Component Map
 *
 * Bidirectional mapping between A2UI abstract component types
 * and native-ui concrete HTML/custom element tags.
 */

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

// ── Forward Map: A2UI Type → native-ui ──

const mappings: readonly ComponentMapping[] = [
  {
    a2uiType: 'Text',
    nativeTag: 'span',
    childStrategy: 'textContent',
  },
  {
    a2uiType: 'Button',
    nativeTag: 'ui-button',
    childStrategy: 'slot-label',
    actionEvent: 'ui-press',
    defaultAttributes: { size: 'sm' },
    variantMap: {
      primary: 'primary',
      borderless: 'ghost',
    },
  },
  {
    a2uiType: 'TextField',
    nativeTag: 'ui-input',
    childStrategy: 'none',
    actionEvent: 'ui-input',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      value: 'value',
      placeholder: 'placeholder',
    },
  },
  {
    a2uiType: 'TextArea',
    nativeTag: 'ui-textarea',
    childStrategy: 'none',
    actionEvent: 'ui-input',
    defaultAttributes: { size: 'sm', rows: '2' },
    propertyMap: {
      value: 'value',
      placeholder: 'placeholder',
      rows: 'rows',
    },
  },
  {
    a2uiType: 'CheckBox',
    nativeTag: 'ui-checkbox',
    childStrategy: 'textContent',
    actionEvent: 'ui-change',
    defaultAttributes: { size: 'sm' },
  },
  {
    a2uiType: 'Switch',
    nativeTag: 'ui-switch',
    childStrategy: 'textContent',
    actionEvent: 'ui-change',
    defaultAttributes: { size: 'sm' },
  },
  {
    a2uiType: 'ChoicePicker',
    nativeTag: 'ui-select',
    childStrategy: 'children',
    actionEvent: 'ui-change',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      placeholder: 'placeholder',
    },
  },
  {
    a2uiType: 'Slider',
    nativeTag: 'ui-range',
    childStrategy: 'none',
    actionEvent: 'ui-change',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      min: 'min',
      max: 'max',
      value: 'value',
    },
  },
  {
    a2uiType: 'DateTimeInput',
    nativeTag: 'ui-input',
    childStrategy: 'none',
    actionEvent: 'ui-change',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      value: 'value',
      min: 'min',
      max: 'max',
    },
  },
  {
    a2uiType: 'Row',
    nativeTag: 'div',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Column',
    nativeTag: 'div',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Card',
    nativeTag: 'ui-card',
    childStrategy: 'children',
  },
  {
    a2uiType: 'Modal',
    nativeTag: 'ui-dialog',
    childStrategy: 'children',
    actionEvent: 'ui-dismiss',
  },
  {
    a2uiType: 'Tabs',
    nativeTag: 'ui-tabs',
    childStrategy: 'children',
  },
  {
    a2uiType: 'List',
    nativeTag: 'ui-listbox',
    childStrategy: 'children',
    actionEvent: 'ui-select',
  },
  {
    a2uiType: 'ListItem',
    nativeTag: 'ui-option',
    childStrategy: 'textContent',
  },
  {
    a2uiType: 'Image',
    nativeTag: 'img',
    childStrategy: 'none',
    propertyMap: {
      url: 'src',
      alt: 'alt',
    },
  },
  {
    a2uiType: 'Icon',
    nativeTag: 'ui-icon',
    childStrategy: 'none',
    defaultAttributes: { 'aria-hidden': 'true' },
    propertyMap: {
      name: 'name',
    },
  },
  {
    a2uiType: 'Divider',
    nativeTag: 'ui-divider',
    childStrategy: 'none',
  },
  {
    a2uiType: 'Badge',
    nativeTag: 'ui-badge',
    childStrategy: 'textContent',
  },
  {
    a2uiType: 'Avatar',
    nativeTag: 'ui-avatar',
    childStrategy: 'none',
    propertyMap: {
      src: 'src',
      alt: 'alt',
    },
  },
  {
    a2uiType: 'Select',
    nativeTag: 'ui-select',
    childStrategy: 'children',
    actionEvent: 'ui-change',
    propertyMap: {
      placeholder: 'placeholder',
    },
  },
  {
    a2uiType: 'Video',
    nativeTag: 'video',
    childStrategy: 'none',
    defaultAttributes: { controls: '' },
    propertyMap: {
      url: 'src',
      poster: 'poster',
    },
  },
  {
    a2uiType: 'AudioPlayer',
    nativeTag: 'audio',
    childStrategy: 'none',
    defaultAttributes: { controls: '' },
    propertyMap: {
      url: 'src',
    },
  },
];

// ── Lookup Structures ──

const forwardMap = new Map<string, ComponentMapping>();
const reverseMap = new Map<string, ComponentMapping>();

for (const m of mappings) {
  forwardMap.set(m.a2uiType, m);
  // Only add to reverse map if the tag is unique or is a custom element.
  // div/span are ambiguous — handled by resolveA2UIType with data-a2ui attribute.
  // First mapping wins for shared tags (TextField before DateTimeInput for ui-input).
  if (m.nativeTag !== 'div' && m.nativeTag !== 'span' && !reverseMap.has(m.nativeTag)) {
    reverseMap.set(m.nativeTag, m);
  }
}

/** All component mappings, keyed by A2UI type */
export const COMPONENT_MAP: ReadonlyMap<string, ComponentMapping> = forwardMap;

// ── Forward: A2UI Type → native-ui ──

export function resolveNativeTag(a2uiType: string): ComponentMapping | null {
  return forwardMap.get(a2uiType) ?? null;
}

// ── Reverse: native-ui Tag → A2UI Type ──

export function resolveA2UIType(
  tag: string,
  attributes?: Readonly<Record<string, string>>,
): string | null {
  // Check data-a2ui attribute first (for div/span disambiguation)
  const a2uiAttr = attributes?.['data-a2ui'];
  if (a2uiAttr && forwardMap.has(a2uiAttr)) {
    return a2uiAttr;
  }

  // Direct reverse lookup
  const mapping = reverseMap.get(tag);
  if (mapping) return mapping.a2uiType;

  // Fallback: disambiguate plain HTML tags
  if (tag === 'span') return 'Text';
  if (tag === 'div') {
    const style = attributes?.style ?? '';
    if (style.includes('flex-direction:column') || style.includes('flex-direction: column')) {
      return 'Column';
    }
    if (style.includes('display:flex') || style.includes('display: flex')) {
      return 'Row';
    }
    return 'Column'; // default layout direction
  }
  if (tag === 'img') return 'Image';
  if (tag === 'video') return 'Video';
  if (tag === 'audio') return 'AudioPlayer';
  if (tag === 'hr') return 'Divider';

  // Heading tags → Text with variant
  if (/^h[1-6]$/.test(tag)) return 'Text';

  return null;
}

// ── Text Variant → HTML Tag ──

const TEXT_VARIANT_TAG: Record<string, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
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

/**
 * Get all supported A2UI component types.
 */
export function getSupportedTypes(): readonly string[] {
  return Array.from(forwardMap.keys());
}
