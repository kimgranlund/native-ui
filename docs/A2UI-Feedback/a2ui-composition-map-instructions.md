# A2UI Composition Map — Claude Code Instructions

## Context

This document is a companion to `a2ui-component-api-instructions.md`. That document augments the **Component Map** (atomic native-ui primitives). This document builds the **Composition Map** — the missing bridge layer between abstract A2UI schema types and native-ui primitives.

### The three-layer architecture

```
┌─────────────────────────────────────────────────┐
│  A2UI Schema Layer                              │
│  Abstract types: ActionBar, DataList, PageHeader │
│  Defined in: A2UI spec (docs 00–10)             │
├─────────────────────────────────────────────────┤
│  Composition Map Layer          ← THIS DOCUMENT │
│  Decomposition recipes: ActionBar → Row + N×Button │
│  Defined in: a2ui-composition-map.ts (new file) │
├─────────────────────────────────────────────────┤
│  Component Map Layer                            │
│  Atomic primitives: Button → n-button           │
│  Defined in: a2ui-component-map.ts (existing)   │
└─────────────────────────────────────────────────┘
```

The Composition Map answers one question mechanically:

> Given an A2UI schema component type and its props/bindings/state, what tree of native-ui primitives do I produce, and how do the data contracts flow through?

---

## Objective

Create `a2ui-composition-map.ts` as a new module that:

1. Defines a `CompositionSpec` interface describing how abstract A2UI types decompose into primitive trees
2. Provides a `CompositionRegistry` keyed by A2UI type name
3. Covers every A2UI schema type that does NOT have a direct 1:1 mapping in the Component Map
4. Encodes prop delegation, state projection, event bubbling, and structural templates
5. Is serializable to JSON for LLM context injection (same pattern as `ComponentRegistry.toJSON()`)

---

## Phase 1 — Core Interfaces

### `CompositionSpec`

Each abstract A2UI type that requires composition gets one of these.

```typescript
/**
 * Defines how an abstract A2UI schema component decomposes into
 * a tree of native-ui primitives from the Component Map.
 */
export interface CompositionSpec {
  /** The A2UI schema type this composition resolves, e.g. 'ActionBar' */
  readonly a2uiType: string;

  /** Human-readable description of what this composite does */
  readonly description: string;

  /**
   * Whether the Component Map already has a direct 1:1 entry for this type.
   * - 'none'    → fully composite, no direct mapping exists
   * - 'partial' → a mapping exists but is incomplete (e.g. Table exists but lacks sort/select)
   * - 'direct'  → 1:1 mapping exists, no composition needed (this type should NOT be in the composition map)
   */
  readonly mappingStatus: 'none' | 'partial';

  /** The structural template — what primitive tree to produce */
  readonly template: CompositionTemplate;

  /** How the composite's props map to its children's props */
  readonly propDelegation: readonly PropDelegation[];

  /** How the composite's state variants map to child states */
  readonly stateProjection: readonly StateProjection[];

  /** How child events map back to the composite's action contract */
  readonly eventBubbling: readonly EventBubble[];

  /**
   * A2UI schema states this composite must support.
   * Mirrors the state completeness requirement from the A2UI spec:
   * every interactive composite must handle loading, empty, error at minimum.
   */
  readonly requiredStates: readonly string[];

  /**
   * Known gaps in this composition — things that cannot be fully resolved
   * with the current Component Map primitives. Uses the same gap discipline
   * as the API augmentation instructions.
   */
  readonly gaps?: readonly CompositionGap[];
}
```

### `CompositionTemplate`

The structural recipe. Describes the tree of primitives without specific data — this is the shape, not the content.

```typescript
/**
 * A node in the composition tree. Each node maps to a Component Map primitive.
 */
export interface TemplateNode {
  /**
   * Role ID within this composition — used to reference this node in
   * propDelegation, stateProjection, and eventBubbling.
   * NOT the runtime component ID (that comes from the schema instance).
   * Example: 'root', 'title-text', 'action-button', 'items-container'
   */
  readonly role: string;

  /** Component Map a2uiType — must exist in ComponentRegistry */
  readonly primitiveType: string;

  /** Static props set on this node regardless of the composite's props */
  readonly staticProps?: Readonly<Record<string, unknown>>;

  /** Child nodes. Order matters — maps to DOM order. */
  readonly children?: readonly TemplateNode[];

  /**
   * If this node is repeated for each item in a composite prop array.
   * Example: ActionBar has N buttons, one per entry in actions[].
   * The value is the prop path on the composite that drives repetition.
   */
  readonly repeatFrom?: string;
}

export type CompositionTemplate = TemplateNode;
```

### `PropDelegation`

How composite props flow down to primitive children.

```typescript
/**
 * Maps a prop on the composite to a prop on a child primitive.
 */
export interface PropDelegation {
  /** Dot-path on the composite's props, e.g. 'title', 'actions[n].label', 'cta.label' */
  readonly from: string;

  /** Role ID of the target child node in the template */
  readonly toRole: string;

  /** Prop name on the target child, e.g. 'label', 'variant', 'placeholder' */
  readonly toProp: string;

  /**
   * Optional transform applied during delegation.
   * - 'direct'     → value passes through unchanged (default)
   * - 'variantMap' → value is translated through the primitive's variantMap
   * - 'boolean'    → value is coerced to boolean (truthy/falsy)
   * - 'count'      → array.length
   * - 'template'   → string template with ${} substitution from parent props
   */
  readonly transform?: 'direct' | 'variantMap' | 'boolean' | 'count' | 'template';

  /** If transform is 'template', the template string, e.g. 'Confirm ${action}' */
  readonly templateString?: string;
}
```

### `StateProjection`

How the composite's states map to its children's states.

```typescript
/**
 * When the composite enters a given state, apply these state changes to children.
 */
export interface StateProjection {
  /** State name on the composite, e.g. 'loading', 'submitting', 'error' */
  readonly compositeState: string;

  /** State changes to apply to children, keyed by role ID */
  readonly childStates: Readonly<Record<string, string | Readonly<Record<string, unknown>>>>;

  /**
   * Optional description of what the user sees in this state.
   * Used by the LLM for runtime explanation (Stage 9).
   */
  readonly description?: string;
}
```

### `EventBubble`

How child events map back to the composite's action contract.

```typescript
/**
 * Maps an event from a child primitive back to the composite's action interface.
 */
export interface EventBubble {
  /** Role ID of the child that emits the event */
  readonly fromRole: string;

  /** Event name on the child (must be in that primitive's EventSpec) */
  readonly fromEvent: string;

  /** Action name on the composite that this maps to, e.g. 'onApprove', 'onSelect', 'onChange' */
  readonly toAction: string;

  /**
   * How to extract the action payload from the child event.
   * - 'passthrough' → forward event.detail as-is
   * - 'index'       → include the repeat index (for repeated children)
   * - 'merge'       → merge event.detail with additional context from the composite
   */
  readonly payloadStrategy?: 'passthrough' | 'index' | 'merge';

  /** If payloadStrategy is 'merge', additional payload fields */
  readonly mergePayload?: Readonly<Record<string, string>>;
}
```

### `CompositionGap`

Same discipline as the API augmentation gap reports — never guess, always document.

```typescript
/**
 * Documents something this composition cannot fully resolve with current primitives.
 */
export interface CompositionGap {
  /** What is missing or unresolvable */
  readonly need: string;

  /** Why it matters — what breaks or degrades without it */
  readonly impact: string;

  /** What the composition does instead (workaround, partial implementation, or nothing) */
  readonly workaround?: string;
}
```

---

## Phase 2 — Type Audit and Classification

Before writing any compositions, classify every A2UI schema type into one of three categories.

### Category A — Direct mapping exists (no composition needed)

These A2UI types have a 1:1 entry in the Component Map. They should NOT appear in the Composition Map. Verify each one and document the mapping.

| A2UI Schema Type | Component Map Type | Notes |
|---|---|---|
| `Button` | `Button` | Direct |
| `TextArea` | `TextArea` | Direct |
| `Toggle` | `Switch` | Name differs, same component |
| `Avatar` | `Avatar` | Direct |
| `Divider` | `Divider` | Direct |
| `Tabs` | `Tabs` | Partial — Tabs exists but verify tab change events |
| `Accordion` | `Accordion` | Direct |

For each, confirm the Component Map entry fully satisfies the A2UI schema type's prop contract. If it doesn't, reclassify as Category B.

### Category B — Partial mapping exists (composition augments it)

The Component Map has an entry, but it's missing capabilities the A2UI schema requires.

| A2UI Schema Type | Component Map Type | What's Missing |
|---|---|---|
| `DataTable` | `Table` | Sort, filter, row selection, bulk select, column config |
| `Select` | `ChoicePicker` / `Select` | Possibly missing multi-select, search-within-select |
| `StatusBadge` | `Badge` | Variant-to-color mapping, size prop |

For each, write a `CompositionSpec` with `mappingStatus: 'partial'` that documents what the existing primitive covers and what the composition adds.

### Category C — No mapping exists (full composition required)

These A2UI schema types have no equivalent in the Component Map. Each needs a full `CompositionSpec`.

**Tier 1 — High frequency in schemas, compose first:**

| A2UI Type | Decomposes Into | Complexity |
|---|---|---|
| `SearchInput` | `TextField` + clear `Button` + debounce behavior | Low |
| `ActionBar` | `Row` + N × `Button` | Low |
| `EmptyState` | `Column` + `Icon` + `Text` (title) + `Text` (description) + `Button` (CTA) | Low |
| `PageHeader` | `Row` + `Text` (title) + `Breadcrumb` + action `Button`(s) | Medium |
| `ConfirmationDialog` | `Modal` + `Text` (title) + `Text` (description) + `Button` (confirm) + `Button` (cancel) | Medium |
| `ErrorBanner` | `Row` + `Icon` + `Text` (message) + `Button` (action) | Low |
| `SuccessToast` | `Toast` with success variant | Low (near-direct) |
| `ErrorDialog` | `Modal` + `Icon` + `Text` (title) + `Text` (message) + N × `Button` (actions) | Medium |
| `LoadingIndicator` | `Progress` or spinner element | Low |

**Tier 2 — Medium frequency, compose second:**

| A2UI Type | Decomposes Into | Complexity |
|---|---|---|
| `DataList` | `Column` (scrollable) + N × `ItemCard` + selection state management | High |
| `ItemCard` | `Card` + `Row`/`Column` of `Text` (title, subtitle, meta) + `StatusBadge` | Medium |
| `FilterPanel` | `Column` + N × filter controls (`Select`, `DateRangePicker`, `TextField`) + collapse toggle | High |
| `DetailPane` | `Card` + `PageHeader` (title) + content slot + collapse behavior | Medium |
| `Toolbar` | `Row` + slotted children (search, filters, sort, actions) | Medium |
| `MetadataSection` | `Column` or grid of `Row`s, each with `Text` (label) + `Text` (value) | Medium |
| `Pagination` | `Row` + `Button` (prev) + `Text` (info) + `Button` (next) | Low |
| `Drawer` | Side-panel container — needs native primitive or positioned `Card` | Medium |
| `SortControl` | `Select` (field picker) + `Button` (direction toggle) | Low |

**Tier 3 — Lower frequency or high complexity, compose last:**

| A2UI Type | Decomposes Into | Complexity |
|---|---|---|
| `HistoryTimeline` | `Column` + N × `Row` (timestamp + label + optional detail) | Medium |
| `MetricCard` | `Card` + `Text` (label) + `Text` (value) + trend indicator | Medium |
| `DateRangePicker` | Two `DateTimeInput` components + preset `Select` | Medium |
| `TextInput` | `TextField` (alias — verify prop compatibility) | Low |
| `MultiSelect` | `ChoicePicker` with multi-selection mode | Medium |
| `RadioGroup` | `Column` + N × radio-style `CheckBox` (mutual exclusion logic) | High |
| `CheckboxGroup` | `Column` + N × `CheckBox` | Low |
| `FileInput` | `Button` (trigger) + hidden file input + `Text` (filename display) | Medium |
| `SplitButton` | `Button` (primary) + dropdown trigger + `List` (secondary actions) | High |
| `ActionMenu` | `Button` (trigger) + dropdown `List` of action items | High |
| `Chart` | No native primitive — external dependency required | Gap |
| `Tag` | `Badge` variant with removable behavior | Low |

---

## Phase 3 — Writing Composition Specs

For each type in Category C (and augmentations in Category B), write a complete `CompositionSpec`. Work through tiers in order.

### Worked Example — `ActionBar`

```typescript
const ActionBarComposition: CompositionSpec = {
  a2uiType: 'ActionBar',
  description: 'A horizontal group of contextual action buttons. Each action in the actions[] prop produces one Button child.',
  mappingStatus: 'none',

  template: {
    role: 'root',
    primitiveType: 'Row',
    staticProps: { gap: 'sm', align: 'center' },
    children: [
      {
        role: 'action-button',
        primitiveType: 'Button',
        repeatFrom: 'actions',
      },
    ],
  },

  propDelegation: [
    { from: 'actions[n].label',   toRole: 'action-button', toProp: 'label',   transform: 'direct' },
    { from: 'actions[n].variant', toRole: 'action-button', toProp: 'variant', transform: 'variantMap' },
    { from: 'actions[n].id',     toRole: 'action-button', toProp: 'data-action-id', transform: 'direct' },
  ],

  stateProjection: [
    {
      compositeState: 'hidden',
      childStates: { 'root': 'hidden' },
      description: 'The entire action bar is not visible (no record selected).',
    },
    {
      compositeState: 'idle',
      childStates: { 'root': 'visible', 'action-button': 'enabled' },
      description: 'All action buttons are visible and interactive.',
    },
    {
      compositeState: 'submitting',
      childStates: { 'action-button': 'disabled' },
      description: 'All buttons disabled while the triggered action is in progress.',
    },
    {
      compositeState: 'success',
      childStates: { 'action-button': 'enabled' },
      description: 'Buttons re-enabled after successful action.',
    },
    {
      compositeState: 'error',
      childStates: { 'action-button': 'enabled' },
      description: 'Buttons re-enabled after failed action (error shown elsewhere).',
    },
  ],

  eventBubbling: [
    {
      fromRole: 'action-button',
      fromEvent: 'native:press',
      toAction: 'onAction',
      payloadStrategy: 'index',
    },
  ],

  requiredStates: ['hidden', 'idle', 'submitting', 'success', 'error'],
  gaps: [],
};
```

### Worked Example — `ConfirmationDialog`

```typescript
const ConfirmationDialogComposition: CompositionSpec = {
  a2uiType: 'ConfirmationDialog',
  description: 'A modal approval gate shown before destructive or consequential actions. Contains a title, description, and confirm/cancel buttons.',
  mappingStatus: 'none',

  template: {
    role: 'root',
    primitiveType: 'Modal',
    children: [
      {
        role: 'content',
        primitiveType: 'Column',
        staticProps: { gap: 'md' },
        children: [
          { role: 'title-text',       primitiveType: 'Text', staticProps: { variant: 'h3' } },
          { role: 'description-text', primitiveType: 'Text', staticProps: { variant: 'body' } },
          {
            role: 'button-row',
            primitiveType: 'Row',
            staticProps: { gap: 'sm', justify: 'end' },
            children: [
              { role: 'cancel-button',  primitiveType: 'Button', staticProps: { variant: 'secondary' } },
              { role: 'confirm-button', primitiveType: 'Button', staticProps: { variant: 'primary' } },
            ],
          },
        ],
      },
    ],
  },

  propDelegation: [
    { from: 'title',        toRole: 'title-text',       toProp: 'textContent', transform: 'direct' },
    { from: 'description',  toRole: 'description-text', toProp: 'textContent', transform: 'direct' },
    { from: 'confirmLabel', toRole: 'confirm-button',   toProp: 'label',       transform: 'direct' },
    { from: 'cancelLabel',  toRole: 'cancel-button',    toProp: 'label',       transform: 'direct' },
  ],

  stateProjection: [
    {
      compositeState: 'hidden',
      childStates: { 'root': 'closed' },
      description: 'Dialog is not visible.',
    },
    {
      compositeState: 'visible',
      childStates: { 'root': 'open', 'confirm-button': 'enabled', 'cancel-button': 'enabled' },
      description: 'Dialog is open. User can confirm or cancel.',
    },
    {
      compositeState: 'submitting',
      childStates: { 'confirm-button': 'loading', 'cancel-button': 'disabled' },
      description: 'Confirm was pressed. Confirm button shows loading, cancel is disabled.',
    },
  ],

  eventBubbling: [
    { fromRole: 'confirm-button', fromEvent: 'native:press', toAction: 'onConfirm', payloadStrategy: 'passthrough' },
    { fromRole: 'cancel-button',  fromEvent: 'native:press', toAction: 'onCancel',  payloadStrategy: 'passthrough' },
    { fromRole: 'root',           fromEvent: 'native:dismiss', toAction: 'onCancel', payloadStrategy: 'passthrough' },
  ],

  requiredStates: ['hidden', 'visible', 'submitting'],

  gaps: [
    {
      need: 'Modal open/close method — need to verify if n-dialog uses .showModal()/.close() or an open attribute',
      impact: 'Cannot wire state projection for hidden↔visible without knowing the imperative API',
      workaround: 'Gap report filed in component API augmentation. Composition assumes an open attribute or method exists.',
    },
  ],
};
```

### Worked Example — `EmptyState`

```typescript
const EmptyStateComposition: CompositionSpec = {
  a2uiType: 'EmptyState',
  description: 'A centered guidance message shown when a collection has no items. Contains an icon, title, description, and optional call-to-action button.',
  mappingStatus: 'none',

  template: {
    role: 'root',
    primitiveType: 'Column',
    staticProps: { align: 'center', gap: 'md', padding: 'xl' },
    children: [
      { role: 'empty-icon',  primitiveType: 'Icon' },
      { role: 'empty-title', primitiveType: 'Text', staticProps: { variant: 'h3' } },
      { role: 'empty-desc',  primitiveType: 'Text', staticProps: { variant: 'body', color: 'muted' } },
      { role: 'cta-button',  primitiveType: 'Button', staticProps: { variant: 'secondary' } },
    ],
  },

  propDelegation: [
    { from: 'icon',        toRole: 'empty-icon',  toProp: 'name',        transform: 'direct' },
    { from: 'title',       toRole: 'empty-title', toProp: 'textContent', transform: 'direct' },
    { from: 'description', toRole: 'empty-desc',  toProp: 'textContent', transform: 'direct' },
    { from: 'cta.label',   toRole: 'cta-button',  toProp: 'label',       transform: 'direct' },
    { from: 'cta.action',  toRole: 'cta-button',  toProp: 'data-action', transform: 'direct' },
  ],

  stateProjection: [
    { compositeState: 'hidden',  childStates: { 'root': 'hidden' }, description: 'Not visible (collection has items).' },
    { compositeState: 'visible', childStates: { 'root': 'visible' }, description: 'Visible when collection is empty.' },
  ],

  eventBubbling: [
    { fromRole: 'cta-button', fromEvent: 'native:press', toAction: 'onCta', payloadStrategy: 'passthrough' },
  ],

  requiredStates: ['hidden', 'visible'],
  gaps: [],
};
```

---

## Phase 4 — The CompositionRegistry

Model this after `ComponentRegistry` for consistency. Same patterns: signal-based change tracking, serialization, singleton export.

```typescript
export class CompositionRegistry {
  #specs = new Map<string, CompositionSpec>();
  #version: Signal<number>;

  constructor(specs: readonly CompositionSpec[]) {
    this.#version = signal(0);
    for (const s of specs) this.#specs.set(s.a2uiType, s);
  }

  // Read API
  get(type: string): CompositionSpec | undefined { return this.#specs.get(type); }
  has(type: string): boolean { return this.#specs.has(type); }
  keys(): IterableIterator<string> { return this.#specs.keys(); }
  values(): IterableIterator<CompositionSpec> { return this.#specs.values(); }

  /**
   * Critical method: determines how to resolve an A2UI schema type.
   * Returns 'direct' if ComponentRegistry handles it, 'composition' if this registry handles it, 'unknown' if neither.
   */
  resolveStrategy(a2uiType: string, componentRegistry: ComponentRegistry): 'direct' | 'composition' | 'unknown' {
    if (this.#specs.has(a2uiType)) return 'composition';
    if (componentRegistry.has(a2uiType)) return 'direct';
    return 'unknown';
  }

  // Mutation API
  add(spec: CompositionSpec): void { this.#specs.set(spec.a2uiType, spec); this.#version.value++; }
  remove(a2uiType: string): void { this.#specs.delete(a2uiType); this.#version.value++; }

  // Serialization (for LLM context injection)
  toJSON(): { compositions: CompositionSpec[] } {
    return { compositions: Array.from(this.#specs.values()) };
  }

  static fromJSON(data: { compositions: CompositionSpec[] }): CompositionRegistry {
    return new CompositionRegistry(data.compositions);
  }

  // Gap collection — returns all gaps across all compositions
  getAllGaps(): Array<{ a2uiType: string; gap: CompositionGap }> {
    const result: Array<{ a2uiType: string; gap: CompositionGap }> = [];
    for (const spec of this.#specs.values()) {
      for (const gap of spec.gaps ?? []) {
        result.push({ a2uiType: spec.a2uiType, gap });
      }
    }
    return result;
  }

  // Coverage report — what percentage of A2UI spec types are resolved?
  coverageReport(componentRegistry: ComponentRegistry, allSchemaTypes: readonly string[]): {
    direct: string[];
    composed: string[];
    unresolved: string[];
    gapCount: number;
  } {
    const direct: string[] = [];
    const composed: string[] = [];
    const unresolved: string[] = [];
    for (const type of allSchemaTypes) {
      const strategy = this.resolveStrategy(type, componentRegistry);
      if (strategy === 'direct') direct.push(type);
      else if (strategy === 'composition') composed.push(type);
      else unresolved.push(type);
    }
    return { direct, composed, unresolved, gapCount: this.getAllGaps().length };
  }
}
```

---

## Phase 5 — Integration with Kernel Resolution

The kernel currently calls `ComponentRegistry.resolveNativeTag(a2uiType)` to get a `ComponentMapping`. With the Composition Map, resolution becomes two-step:

```
schema component → resolveStrategy() → direct? → ComponentRegistry.resolveNativeTag()
                                      → composition? → CompositionRegistry.get() → expand template → resolve each primitive via ComponentRegistry
                                      → unknown? → error / gap report
```

### What to build

A resolver function that the kernel calls instead of calling `ComponentRegistry` directly:

```typescript
export function resolveComponent(
  a2uiType: string,
  compositionRegistry: CompositionRegistry,
  componentRegistry: ComponentRegistry,
): { strategy: 'direct'; mapping: ComponentMapping }
 | { strategy: 'composition'; spec: CompositionSpec }
 | { strategy: 'unknown'; type: string } {

  const strategy = compositionRegistry.resolveStrategy(a2uiType, componentRegistry);

  if (strategy === 'direct') {
    return { strategy: 'direct', mapping: componentRegistry.resolveNativeTag(a2uiType)! };
  }
  if (strategy === 'composition') {
    return { strategy: 'composition', spec: compositionRegistry.get(a2uiType)! };
  }
  return { strategy: 'unknown', type: a2uiType };
}
```

The kernel's rendering pipeline then needs a `expandComposition()` function that takes a `CompositionSpec` and a component's props/state from the schema, and produces a tree of resolved primitive `ComponentMapping` nodes with delegated props. This is the mechanical translation step.

**Do not build `expandComposition()` yet.** First, complete the composition specs for Tier 1 types so the data structure is proven. Then build the expansion logic.

---

## Phase 6 — LLM Context Injection

Both registries should be serializable and injectable into the LLM system prompt. The combined output gives the LLM everything it needs:

```typescript
const llmContext = {
  primitives: componentRegistry.toJSON(),   // atomic types + API surface
  compositions: compositionRegistry.toJSON(), // abstract type decompositions
  gaps: compositionRegistry.getAllGaps(),      // what's still unresolved
};
```

The LLM system prompt should include instructions to:

1. **Check the composition map first** when generating schema. If a type has a composition, the LLM knows exactly what primitives back it, what states are required, and what events are available.
2. **Use the gap list** to avoid generating schema that depends on unresolved capabilities. If `Chart` has a gap saying "no native primitive," the LLM should flag this to the user rather than silently including it.
3. **Write JS wiring** against the expanded primitive tree, not the abstract type. When wiring an `ActionBar`, the LLM writes event listeners on the child `Button` elements, using the `eventBubbling` spec to know which button event maps to which composite action.

---

## Sequencing

| Step | What | Depends on |
|---|---|---|
| 1 | Add interfaces (`CompositionSpec`, `TemplateNode`, etc.) to new file | Nothing |
| 2 | Classify all A2UI schema types (Category A/B/C audit) | Step 1 |
| 3 | Write Tier 1 composition specs (9 types) | Step 2 |
| 4 | Build `CompositionRegistry` class | Step 1 |
| 5 | Write `resolveComponent()` bridge function | Step 4 + Component Map |
| 6 | Write Tier 2 composition specs (10 types) | Step 3 |
| 7 | Build `expandComposition()` for kernel | Step 5 + Tier 1 specs proven |
| 8 | Write Tier 3 composition specs (remaining types) | Step 6 |
| 9 | LLM context serialization and prompt integration | Step 4 + API augmentation |

---

## Hard Rules

1. **Every `primitiveType` in a template must exist in the Component Map.** If it doesn't, that's a gap — not a reason to invent a new primitive.
2. **Every `fromEvent` in an `EventBubble` must be documented in the primitive's `EventSpec`.** If the primitive doesn't have an `events` array yet, file a gap in both the composition AND the API augmentation instructions.
3. **`requiredStates` must always include states mandated by the A2UI spec** for that component's category (loading/empty/error for collections, hidden/visible for conditional components, etc.).
4. **Never skip the gap field.** If a composition is complete with no gaps, set `gaps: []` explicitly. An absent `gaps` field means you forgot to check.
5. **Compositions are data, not code.** They describe structure declaratively. They do not contain JavaScript, event handler implementations, or rendering logic. The kernel's `expandComposition()` function interprets them.
6. **The Composition Map does not replace the Component Map.** It sits above it. A composition that bypasses the Component Map and references native tags directly is a violation.
7. **Serialization must round-trip.** `CompositionRegistry.fromJSON(registry.toJSON())` must produce an identical registry. No functions, no closures, no non-serializable data in specs.
