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
    nativeTag: 'n-card',
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
    nativeTag: 'img',
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
    nativeTag: 'n-range',
    childStrategy: 'none',
    defaultAttributes: { size: 'sm' },
    propertyMap: {
      value: 'value',
      min: 'min',
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

// ── Lookup Structures ──

const forwardMap = new Map<string, ComponentMapping>();
const reverseMap = new Map<string, ComponentMapping>();

for (const m of mappings) {
  forwardMap.set(m.a2uiType, m);
  // Only add to reverse map if the tag is unique or is a custom element.
  // div/span are ambiguous — handled by resolveA2UIType with data-a2ui attribute.
  // First mapping wins for shared tags (TextField before DateTimeInput for n-input).
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

/**
 * Get all supported A2UI component types.
 */
export function getSupportedTypes(): readonly string[] {
  return Array.from(forwardMap.keys());
}
