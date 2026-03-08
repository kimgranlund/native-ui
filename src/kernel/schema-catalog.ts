/**
 * Schema Catalog
 *
 * Metadata registry describing what each native-ui component accepts:
 * allowed attributes, properties, children, slots, events, and ARIA
 * requirements. Used by the GenUI planner to generate valid plans.
 *
 * All public data is frozen with Object.freeze.
 */

// ── Types ──

export interface ComponentSchema {
  readonly tag: string;
  readonly category: 'form' | 'display' | 'navigation' | 'overlay' | 'container' | 'layout';
  readonly description: string;
  readonly attributes: readonly AttributeSchema[];
  readonly properties: readonly PropertySchema[];
  readonly slots: readonly SlotSchema[];
  readonly events: readonly EventSchema[];
  readonly aria: AriaRequirements;
  readonly allowedChildren?: readonly string[];
  readonly formAssociated: boolean;
}

export interface AttributeSchema {
  readonly name: string;
  readonly type: 'string' | 'enum' | 'boolean';
  readonly values?: readonly string[];
  readonly default?: string;
  readonly description: string;
}

export interface PropertySchema {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description: string;
  readonly required?: boolean;
}

export interface SlotSchema {
  readonly name: string;
  readonly description: string;
  readonly allowedTags?: readonly string[];
}

export interface EventSchema {
  readonly name: string;
  readonly description: string;
  readonly detail?: string;
}

export interface AriaRequirements {
  readonly role?: string;
  readonly requiredAttributes?: readonly string[];
  readonly autoLabeled?: boolean;
}

// ── Shared Attribute Sets ──

const SIZE_ATTR: AttributeSchema = Object.freeze({
  name: 'size',
  type: 'enum',
  values: Object.freeze(['xs', 'sm', 'md', 'lg', 'xl']),
  default: 'md',
  description: 'Controls the component size scale.',
});

const INTENT_ATTR: AttributeSchema = Object.freeze({
  name: 'intent',
  type: 'enum',
  values: Object.freeze(['neutral', 'accent', 'info', 'success', 'warning', 'danger']),
  default: 'neutral',
  description: 'Semantic color intent for the component.',
});

const DENSITY_ATTR: AttributeSchema = Object.freeze({
  name: 'density',
  type: 'enum',
  values: Object.freeze(['compact', 'default', 'loose']),
  default: 'default',
  description: 'Controls internal spacing density.',
});

const RADIUS_ATTR: AttributeSchema = Object.freeze({
  name: 'radius',
  type: 'enum',
  values: Object.freeze(['none', 'sm', 'round']),
  default: 'round',
  description: 'Border-radius variant.',
});

const DISABLED_ATTR: AttributeSchema = Object.freeze({
  name: 'disabled',
  type: 'boolean',
  description: 'Disables the component.',
});

const PLACEHOLDER_ATTR: AttributeSchema = Object.freeze({
  name: 'placeholder',
  type: 'string',
  description: 'Placeholder text shown when empty.',
});

// Common slot definitions
const DEFAULT_SLOT: SlotSchema = Object.freeze({
  name: '',
  description: 'Default slot for primary content.',
});

const LEADING_SLOT: SlotSchema = Object.freeze({
  name: 'leading',
  description: 'Content placed before the main label (e.g. icon).',
  allowedTags: Object.freeze(['n-icon', 'span', 'img']),
});

const TRAILING_SLOT: SlotSchema = Object.freeze({
  name: 'trailing',
  description: 'Content placed after the main label (e.g. icon, badge).',
  allowedTags: Object.freeze(['n-icon', 'span', 'img']),
});

// ── Helper ──

function freeze<T extends object>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

function freezeSchema(schema: ComponentSchema): ComponentSchema {
  return Object.freeze({
    ...schema,
    attributes: Object.freeze(schema.attributes),
    properties: Object.freeze(schema.properties),
    slots: Object.freeze(schema.slots),
    events: Object.freeze(schema.events),
    aria: Object.freeze(schema.aria),
    allowedChildren: schema.allowedChildren
      ? Object.freeze(schema.allowedChildren)
      : undefined,
  });
}

// ── Catalog Entries ──

// --- Form Components ---

const UI_BUTTON: ComponentSchema = freezeSchema({
  tag: 'n-button',
  category: 'form',
  description: 'Interactive button with variant, intent, and size support. Supports leading/trailing icon slots.',
  attributes: [
    freeze({
      name: 'variant',
      type: 'enum',
      values: Object.freeze(['primary', 'secondary', 'default', 'outline', 'ghost']),
      default: 'default',
      description: 'Visual style variant. "default" uses neutral chrome with intent-colored text.',
    }),
    INTENT_ATTR,
    SIZE_ATTR,
    DENSITY_ATTR,
    RADIUS_ATTR,
    DISABLED_ATTR,
    freeze({
      name: 'justify',
      type: 'enum',
      values: Object.freeze(['spread']),
      description: 'Set to "spread" for trigger-mode layout (label fills space, trailing icon pushes right).',
    }),
  ],
  properties: [],
  slots: [
    freeze({ name: '', description: 'Label text content.', allowedTags: Object.freeze(['span']) }),
    LEADING_SLOT,
    TRAILING_SLOT,
  ],
  events: [
    freeze({ name: 'native:press', description: 'Fired on activation (click, Enter, Space).' }),
  ],
  aria: freeze({ role: 'button', autoLabeled: true }),
  formAssociated: true,
});

const UI_INPUT: ComponentSchema = freezeSchema({
  tag: 'n-input',
  category: 'form',
  description: 'Text input field using contenteditable. Supports leading/trailing slots for icons or actions.',
  attributes: [
    freeze({
      name: 'variant',
      type: 'enum',
      values: Object.freeze(['outline', 'ghost']),
      default: 'outline',
      description: 'Visual style variant.',
    }),
    INTENT_ATTR,
    SIZE_ATTR,
    DENSITY_ATTR,
    RADIUS_ATTR,
    DISABLED_ATTR,
    PLACEHOLDER_ATTR,
    freeze({
      name: 'type',
      type: 'string',
      description: 'Input type hint (e.g. "email", "password").',
    }),
  ],
  properties: [
    freeze({ name: 'value', type: 'string', description: 'Current input value.' }),
  ],
  slots: [LEADING_SLOT, TRAILING_SLOT],
  events: [
    freeze({ name: 'native:input', description: 'Fired on each keystroke / input change.' }),
    freeze({ name: 'native:change', description: 'Fired when value is committed (blur or Enter).' }),
  ],
  aria: freeze({ role: 'textbox', requiredAttributes: Object.freeze(['aria-label']), autoLabeled: false }),
  formAssociated: true,
});

const UI_SELECT: ComponentSchema = freezeSchema({
  tag: 'n-select',
  category: 'form',
  description: 'Dropdown select coordinator. Manual mode wraps n-button + n-listbox; data-driven mode stamps children from options/src attribute.',
  attributes: [
    PLACEHOLDER_ATTR,
    SIZE_ATTR,
    INTENT_ATTR,
    DENSITY_ATTR,
    DISABLED_ATTR,
    freeze({
      name: 'options',
      type: 'string',
      description: 'JSON array of {value, label, disabled?} for data-driven mode.',
    }),
    freeze({
      name: 'src',
      type: 'string',
      description: 'URL to fetch options from for data-driven mode.',
    }),
  ],
  properties: [
    freeze({
      name: 'options',
      type: 'array',
      description: 'Array of SelectOption objects ({value, label, disabled?}) for data-driven mode.',
    }),
    freeze({ name: 'value', type: 'string', description: 'Currently selected value.' }),
  ],
  slots: [DEFAULT_SLOT],
  events: [
    freeze({ name: 'native:change', description: 'Fired when the selected value changes.', detail: '{ value: string }' }),
  ],
  aria: freeze({ role: 'combobox', requiredAttributes: Object.freeze(['aria-label']), autoLabeled: false }),
  allowedChildren: Object.freeze(['n-button', 'n-listbox']),
  formAssociated: true,
});

const UI_COMBOBOX: ComponentSchema = freezeSchema({
  tag: 'n-combobox',
  category: 'form',
  description: 'Filterable select coordinator. Wraps n-input + n-listbox with typeahead filtering.',
  attributes: [
    PLACEHOLDER_ATTR,
    SIZE_ATTR,
    INTENT_ATTR,
    DENSITY_ATTR,
    DISABLED_ATTR,
  ],
  properties: [
    freeze({ name: 'value', type: 'string', description: 'Currently selected value.' }),
  ],
  slots: [DEFAULT_SLOT],
  events: [
    freeze({ name: 'native:change', description: 'Fired when the selected value changes.', detail: '{ value: string }' }),
    freeze({ name: 'native:input', description: 'Fired on filter text input.' }),
  ],
  aria: freeze({ role: 'combobox', requiredAttributes: Object.freeze(['aria-label']), autoLabeled: false }),
  allowedChildren: Object.freeze(['n-input', 'n-listbox']),
  formAssociated: true,
});

const UI_CHECKBOX: ComponentSchema = freezeSchema({
  tag: 'n-checkbox',
  category: 'form',
  description: 'Checkbox toggle with label content as default slot.',
  attributes: [
    SIZE_ATTR,
    INTENT_ATTR,
    DISABLED_ATTR,
  ],
  properties: [
    freeze({ name: 'checked', type: 'boolean', description: 'Whether the checkbox is checked.' }),
  ],
  slots: [
    freeze({ name: '', description: 'Label text content.' }),
  ],
  events: [
    freeze({ name: 'native:change', description: 'Fired when checked state changes.', detail: '{ checked: boolean }' }),
  ],
  aria: freeze({ role: 'checkbox', autoLabeled: true }),
  formAssociated: true,
});

const UI_SWITCH: ComponentSchema = freezeSchema({
  tag: 'n-switch',
  category: 'form',
  description: 'Toggle switch with on/off states. Self-labels from content.',
  attributes: [
    SIZE_ATTR,
    INTENT_ATTR,
    DISABLED_ATTR,
  ],
  properties: [
    freeze({ name: 'checked', type: 'boolean', description: 'Whether the switch is on.' }),
  ],
  slots: [
    freeze({ name: '', description: 'Label text content.' }),
  ],
  events: [
    freeze({ name: 'native:change', description: 'Fired when toggled.', detail: '{ checked: boolean }' }),
  ],
  aria: freeze({ role: 'switch', autoLabeled: true }),
  formAssociated: true,
});

const UI_TEXTAREA: ComponentSchema = freezeSchema({
  tag: 'n-textarea',
  category: 'form',
  description: 'Multi-line text input area.',
  attributes: [
    freeze({
      name: 'variant',
      type: 'enum',
      values: Object.freeze(['outline', 'ghost']),
      default: 'outline',
      description: 'Visual style variant.',
    }),
    SIZE_ATTR,
    INTENT_ATTR,
    DENSITY_ATTR,
    RADIUS_ATTR,
    DISABLED_ATTR,
    PLACEHOLDER_ATTR,
  ],
  properties: [
    freeze({ name: 'value', type: 'string', description: 'Current textarea value.' }),
  ],
  slots: [],
  events: [
    freeze({ name: 'native:input', description: 'Fired on each keystroke.' }),
    freeze({ name: 'native:change', description: 'Fired when value is committed.' }),
  ],
  aria: freeze({ role: 'textbox', requiredAttributes: Object.freeze(['aria-label']), autoLabeled: false }),
  formAssociated: true,
});

const UI_RANGE: ComponentSchema = freezeSchema({
  tag: 'n-range',
  category: 'form',
  description: 'Slider range input for numeric values.',
  attributes: [
    freeze({ name: 'min', type: 'string', default: '0', description: 'Minimum value.' }),
    freeze({ name: 'max', type: 'string', default: '100', description: 'Maximum value.' }),
    freeze({ name: 'step', type: 'string', default: '1', description: 'Step increment.' }),
    SIZE_ATTR,
    INTENT_ATTR,
    DISABLED_ATTR,
  ],
  properties: [
    freeze({ name: 'value', type: 'number', description: 'Current numeric value.' }),
  ],
  slots: [],
  events: [
    freeze({ name: 'native:change', description: 'Fired when value changes.', detail: '{ value: number }' }),
  ],
  aria: freeze({ role: 'slider', requiredAttributes: Object.freeze(['aria-label']), autoLabeled: false }),
  formAssociated: true,
});

// --- Display Components ---

const UI_LISTBOX: ComponentSchema = freezeSchema({
  tag: 'n-listbox',
  category: 'display',
  description: 'Scrollable list of selectable options. Used standalone or as a child of n-select/n-combobox.',
  attributes: [
    freeze({
      name: 'variant',
      type: 'enum',
      values: Object.freeze(['secondary', 'ghost']),
      default: 'secondary',
      description: 'Visual style variant.',
    }),
    SIZE_ATTR,
    DENSITY_ATTR,
  ],
  properties: [],
  slots: [DEFAULT_SLOT],
  events: [
    freeze({ name: 'native:select', description: 'Fired when an option is selected.', detail: '{ value: string }' }),
  ],
  aria: freeze({ role: 'listbox' }),
  allowedChildren: Object.freeze(['n-option', 'n-option-group']),
  formAssociated: false,
});

const UI_OPTION: ComponentSchema = freezeSchema({
  tag: 'n-option',
  category: 'display',
  description: 'Single selectable option inside a n-listbox.',
  attributes: [
    freeze({ name: 'value', type: 'string', description: 'Option value submitted on selection.' }),
    DISABLED_ATTR,
  ],
  properties: [],
  slots: [
    freeze({ name: '', description: 'Option label content.' }),
    LEADING_SLOT,
    TRAILING_SLOT,
  ],
  events: [
    freeze({ name: 'native:select', description: 'Fired when this option is selected.' }),
  ],
  aria: freeze({ role: 'option', autoLabeled: true }),
  formAssociated: false,
});

const UI_BADGE: ComponentSchema = freezeSchema({
  tag: 'span.badge',
  category: 'display',
  description: 'Small status indicator or label tag.',
  attributes: [
    freeze({
      name: 'variant',
      type: 'enum',
      values: Object.freeze(['primary', 'secondary', 'outline']),
      default: 'secondary',
      description: 'Visual style variant.',
    }),
    INTENT_ATTR,
    SIZE_ATTR,
    RADIUS_ATTR,
  ],
  properties: [],
  slots: [
    freeze({ name: '', description: 'Badge label content.' }),
  ],
  events: [],
  aria: freeze({ autoLabeled: true }),
  formAssociated: false,
});

const UI_AVATAR: ComponentSchema = freezeSchema({
  tag: 'span.avatar',
  category: 'display',
  description: 'User avatar image or fallback initials.',
  attributes: [
    freeze({ name: 'src', type: 'string', description: 'Image URL for the avatar.' }),
    freeze({ name: 'alt', type: 'string', description: 'Accessible alt text for the avatar image.' }),
    SIZE_ATTR,
    RADIUS_ATTR,
  ],
  properties: [],
  slots: [
    freeze({ name: '', description: 'Fallback content (e.g. initials) when no src is provided.' }),
  ],
  events: [],
  aria: freeze({ role: 'img', requiredAttributes: Object.freeze(['aria-label']) }),
  formAssociated: false,
});

const UI_ICON: ComponentSchema = freezeSchema({
  tag: 'n-icon',
  category: 'display',
  description: 'Phosphor icon element. Renders an SVG icon by name from the global registry.',
  attributes: [
    freeze({
      name: 'name',
      type: 'string',
      description: 'Icon name from the Phosphor icon set (e.g. "house", "caret-up-down", "check").',
    }),
    SIZE_ATTR,
  ],
  properties: [],
  slots: [],
  events: [],
  aria: freeze({ requiredAttributes: Object.freeze(['aria-hidden']), autoLabeled: false }),
  formAssociated: false,
});

// --- Navigation Components ---

const UI_TABS: ComponentSchema = freezeSchema({
  tag: 'n-tabs',
  category: 'navigation',
  description: 'Tab container that coordinates tab selection and panel visibility.',
  attributes: [
    SIZE_ATTR,
    DENSITY_ATTR,
  ],
  properties: [
    freeze({ name: 'value', type: 'string', description: 'Currently active tab value.' }),
  ],
  slots: [DEFAULT_SLOT],
  events: [
    freeze({ name: 'native:change', description: 'Fired when the active tab changes.', detail: '{ value: string }' }),
  ],
  aria: freeze({ role: 'tablist' }),
  allowedChildren: Object.freeze(['n-tab', 'n-tab-panels']),
  formAssociated: false,
});

const UI_TAB_PANELS: ComponentSchema = freezeSchema({
  tag: 'n-tab-panels',
  category: 'navigation',
  description: 'Container for tab panels within a n-tabs component.',
  attributes: [],
  properties: [],
  slots: [DEFAULT_SLOT],
  events: [],
  aria: freeze({ role: 'presentation' }),
  allowedChildren: Object.freeze(['n-tab-panel']),
  formAssociated: false,
});

// --- Overlay Components ---

const UI_DIALOG: ComponentSchema = freezeSchema({
  tag: 'n-dialog',
  category: 'overlay',
  description: 'Modal dialog overlay. Wraps a native <dialog> and provides showModal()/close() API.',
  attributes: [
    freeze({
      name: 'no-close-on-escape',
      type: 'boolean',
      description: 'Prevents closing the dialog when Escape is pressed.',
    }),
    freeze({
      name: 'no-close-on-backdrop',
      type: 'boolean',
      description: 'Prevents closing the dialog when the backdrop is clicked.',
    }),
  ],
  properties: [],
  slots: [DEFAULT_SLOT],
  events: [
    freeze({ name: 'close', description: 'Fired when the dialog is closed.' }),
    freeze({ name: 'native:dismiss', description: 'Fired when a dismiss action is triggered.' }),
  ],
  aria: freeze({ role: 'dialog', requiredAttributes: Object.freeze(['aria-label']), autoLabeled: false }),
  formAssociated: false,
});

// --- Container Components ---

const UI_CARD: ComponentSchema = freezeSchema({
  tag: 'n-container',
  category: 'container',
  description: 'Bounded surface container with optional header and footer slots.',
  attributes: [
    SIZE_ATTR,
    DENSITY_ATTR,
    RADIUS_ATTR,
  ],
  properties: [],
  slots: [
    DEFAULT_SLOT,
  ],
  allowedChildren: Object.freeze([
    'n-header', 'n-body', 'n-footer', 'img', 'n-picture',
  ]),
  events: [],
  aria: freeze({}),
  formAssociated: false,
});

const UI_FIELD: ComponentSchema = freezeSchema({
  tag: 'n-field',
  category: 'form',
  description: 'Form field wrapper that pairs a label with a form control and displays validation messages.',
  attributes: [],
  properties: [],
  slots: [DEFAULT_SLOT],
  events: [],
  aria: freeze({}),
  allowedChildren: Object.freeze([
    'label', 'n-input', 'n-select', 'n-combobox', 'n-checkbox',
    'n-switch', 'n-textarea', 'n-range', 'span',
  ]),
  formAssociated: false,
});

// ── Build the Catalog Map ──

const _entries: readonly ComponentSchema[] = Object.freeze([
  UI_BUTTON,
  UI_INPUT,
  UI_SELECT,
  UI_COMBOBOX,
  UI_CHECKBOX,
  UI_SWITCH,
  UI_TEXTAREA,
  UI_RANGE,
  UI_LISTBOX,
  UI_OPTION,
  UI_BADGE,
  UI_AVATAR,
  UI_ICON,
  UI_TABS,
  UI_TAB_PANELS,
  UI_DIALOG,
  UI_CARD,
  UI_FIELD,
]);

export const SCHEMA_CATALOG: ReadonlyMap<string, ComponentSchema> = new Map(
  _entries.map((s) => [s.tag, s]),
);

// ── Lookup Functions ──

export function getSchema(tag: string): ComponentSchema | undefined {
  return SCHEMA_CATALOG.get(tag);
}

export function getSchemasForCategory(
  category: ComponentSchema['category'],
): readonly ComponentSchema[] {
  return _entries.filter((s) => s.category === category);
}

export function getSchemaAttribute(
  tag: string,
  attrName: string,
): AttributeSchema | undefined {
  const schema = SCHEMA_CATALOG.get(tag);
  if (!schema) return undefined;
  return schema.attributes.find((a) => a.name === attrName);
}
