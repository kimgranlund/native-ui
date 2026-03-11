/**
 * A2UI Composition Map
 *
 * Bridge between abstract A2UI schema types and native-ui primitives.
 * Sits above the Component Map — while the Component Map handles 1:1
 * mappings (A2UI type → native tag), the Composition Map handles
 * complex types that require assembling multiple primitives into a
 * coordinated template with prop delegation, state projection,
 * and event bubbling.
 *
 * The `CompositionRegistry` class provides a mutable registry with
 * change tracking via a signal. The default singleton
 * (`defaultCompositionRegistry`) preserves backward compatibility.
 */

import { signal } from '@nonoun/native-core';
import type { Signal } from '@nonoun/native-core';
import type { ComponentMapping, ComponentRegistry } from './a2ui-component-map.ts';

// ── Composition Spec ──

export interface TemplateNode {
  readonly role: string;
  readonly primitiveType: string;
  readonly staticProps?: Readonly<Record<string, unknown>>;
  readonly children?: readonly TemplateNode[];
  readonly repeatFrom?: string;
}

export type CompositionTemplate = TemplateNode;

export interface PropDelegation {
  readonly from: string;
  readonly toRole: string;
  readonly toProp: string;
  readonly transform?: 'direct' | 'variantMap' | 'boolean' | 'count' | 'template';
  readonly templateString?: string;
}

export interface StateProjection {
  readonly compositeState: string;
  readonly childStates: Readonly<Record<string, string | Readonly<Record<string, unknown>>>>;
  readonly description?: string;
}

export interface EventBubble {
  readonly fromRole: string;
  readonly fromEvent: string;
  readonly toAction: string;
  readonly payloadStrategy?: 'passthrough' | 'index' | 'merge';
  readonly mergePayload?: Readonly<Record<string, string>>;
}

export interface CompositionGap {
  readonly need: string;
  readonly impact: string;
  readonly workaround?: string;
}

export interface CompositionSpec {
  readonly a2uiType: string;
  readonly description: string;
  readonly mappingStatus: 'none' | 'partial';
  readonly template: CompositionTemplate;
  readonly propDelegation: readonly PropDelegation[];
  readonly stateProjection: readonly StateProjection[];
  readonly eventBubbling: readonly EventBubble[];
  readonly requiredStates: readonly string[];
  readonly gaps?: readonly CompositionGap[];
}

// ── Composition Registry ──

export class CompositionRegistry {
  #specs = new Map<string, CompositionSpec>();
  #version: Signal<number>;

  constructor(specs: readonly CompositionSpec[]) {
    this.#version = signal(0);
    for (const s of specs) this.#specs.set(s.a2uiType, s);
  }

  // ── Change Tracking ──

  get version(): Signal<number> { return this.#version; }

  // ── Read API ──

  get(type: string): CompositionSpec | undefined { return this.#specs.get(type); }
  has(type: string): boolean { return this.#specs.has(type); }
  get size(): number { return this.#specs.size; }
  keys(): IterableIterator<string> { return this.#specs.keys(); }
  values(): IterableIterator<CompositionSpec> { return this.#specs.values(); }

  // ── Mutation API ──

  add(spec: CompositionSpec): void {
    this.#specs.set(spec.a2uiType, spec);
    this.#version.value++;
  }

  remove(a2uiType: string): void {
    this.#specs.delete(a2uiType);
    this.#version.value++;
  }

  // ── Strategy Resolution ──

  resolveStrategy(
    a2uiType: string,
    componentRegistry: ComponentRegistry,
  ): 'direct' | 'composition' | 'unknown' {
    if (this.#specs.has(a2uiType)) return 'composition';
    if (componentRegistry.has(a2uiType)) return 'direct';
    return 'unknown';
  }

  // ── Serialization ──

  toJSON(): { compositions: CompositionSpec[] } {
    return { compositions: Array.from(this.#specs.values()) };
  }

  static fromJSON(data: { compositions: CompositionSpec[] }): CompositionRegistry {
    return new CompositionRegistry(data.compositions);
  }

  // ── Analysis ──

  getAllGaps(): Array<{ a2uiType: string; gap: CompositionGap }> {
    const result: Array<{ a2uiType: string; gap: CompositionGap }> = [];
    for (const spec of this.#specs.values()) {
      for (const gap of spec.gaps ?? []) {
        result.push({ a2uiType: spec.a2uiType, gap });
      }
    }
    return result;
  }

  coverageReport(
    componentRegistry: ComponentRegistry,
    allSchemaTypes: readonly string[],
  ): {
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

// ── Bridge Function ──

export function resolveComponent(
  a2uiType: string,
  compositionRegistry: CompositionRegistry,
  componentRegistry: ComponentRegistry,
): { strategy: 'direct'; mapping: ComponentMapping }
  | { strategy: 'composition'; spec: CompositionSpec }
  | { strategy: 'unknown'; type: string } {

  const strategy = compositionRegistry.resolveStrategy(a2uiType, componentRegistry);
  if (strategy === 'direct') {
    return { strategy: 'direct', mapping: componentRegistry.get(a2uiType)! };
  }
  if (strategy === 'composition') {
    return { strategy: 'composition', spec: compositionRegistry.get(a2uiType)! };
  }
  return { strategy: 'unknown', type: a2uiType };
}

// ── Tier 1 Default Compositions ──

const DEFAULT_COMPOSITIONS: readonly CompositionSpec[] = [

  // ── 1. SearchInput ──
  {
    a2uiType: 'SearchInput',
    description: 'Text field with integrated clear button for search workflows.',
    mappingStatus: 'none',
    template: {
      role: 'root',
      primitiveType: 'Row',
      staticProps: { gap: 'sm', align: 'center' },
      children: [
        {
          role: 'search-input',
          primitiveType: 'TextField',
        },
        {
          role: 'clear-button',
          primitiveType: 'Button',
          staticProps: { variant: 'ghost' },
        },
      ],
    },
    propDelegation: [
      { from: 'placeholder', toRole: 'search-input', toProp: 'placeholder', transform: 'direct' },
      { from: 'value', toRole: 'search-input', toProp: 'value', transform: 'direct' },
    ],
    stateProjection: [
      {
        compositeState: 'idle',
        childStates: {
          'search-input': 'enabled',
        },
        description: 'Default state, input is editable.',
      },
      {
        compositeState: 'searching',
        childStates: {
          'search-input': 'disabled',
        },
        description: 'Search in progress, input is disabled.',
      },
      {
        compositeState: 'empty',
        childStates: {
          'clear-button': 'hidden',
        },
        description: 'No search value, clear button is hidden.',
      },
    ],
    eventBubbling: [
      { fromRole: 'search-input', fromEvent: 'native:input', toAction: 'onSearch', payloadStrategy: 'passthrough' },
      { fromRole: 'clear-button', fromEvent: 'native:press', toAction: 'onClear', payloadStrategy: 'passthrough' },
    ],
    requiredStates: ['idle', 'searching', 'empty'],
    gaps: [
      {
        need: 'Debounce behavior',
        impact: 'No built-in debounce on search input',
        workaround: 'Consumer adds debounce in event handler',
      },
    ],
  },

  // ── 2. ActionBar ──
  {
    a2uiType: 'ActionBar',
    description: 'Horizontal bar of action buttons, typically used at the bottom of a card or panel.',
    mappingStatus: 'none',
    template: {
      role: 'root',
      primitiveType: 'Row',
      staticProps: { gap: 'sm', justify: 'end', align: 'center' },
      children: [
        {
          role: 'action-button',
          primitiveType: 'Button',
          repeatFrom: 'actions',
        },
      ],
    },
    propDelegation: [
      { from: 'actions[n].label', toRole: 'action-button', toProp: 'label', transform: 'direct' },
      { from: 'actions[n].variant', toRole: 'action-button', toProp: 'variant', transform: 'variantMap' },
      { from: 'actions[n].disabled', toRole: 'action-button', toProp: 'disabled', transform: 'boolean' },
    ],
    stateProjection: [
      {
        compositeState: 'idle',
        childStates: {
          'action-button': 'enabled',
        },
        description: 'All actions are available.',
      },
      {
        compositeState: 'submitting',
        childStates: {
          'action-button': 'disabled',
        },
        description: 'Submission in progress, all buttons disabled.',
      },
    ],
    eventBubbling: [
      { fromRole: 'action-button', fromEvent: 'native:press', toAction: 'onAction', payloadStrategy: 'index' },
    ],
    requiredStates: ['idle', 'submitting'],
    gaps: [],
  },

  // ── 3. EmptyState ──
  {
    a2uiType: 'EmptyState',
    description: 'Placeholder shown when a list or area has no content, with optional icon, message, and action.',
    mappingStatus: 'none',
    template: {
      role: 'root',
      primitiveType: 'Column',
      staticProps: { gap: 'md', align: 'center', justify: 'center' },
      children: [
        {
          role: 'empty-icon',
          primitiveType: 'Icon',
          staticProps: { name: 'magnifying-glass' },
        },
        {
          role: 'empty-title',
          primitiveType: 'Text',
          staticProps: { variant: 'h3' },
        },
        {
          role: 'empty-message',
          primitiveType: 'Text',
          staticProps: { variant: 'body' },
        },
        {
          role: 'empty-action',
          primitiveType: 'Button',
        },
      ],
    },
    propDelegation: [
      { from: 'title', toRole: 'empty-title', toProp: 'textContent', transform: 'direct' },
      { from: 'message', toRole: 'empty-message', toProp: 'textContent', transform: 'direct' },
      { from: 'icon', toRole: 'empty-icon', toProp: 'name', transform: 'direct' },
      { from: 'actionLabel', toRole: 'empty-action', toProp: 'label', transform: 'direct' },
    ],
    stateProjection: [
      {
        compositeState: 'visible',
        childStates: {
          root: 'visible',
        },
        description: 'Empty state is displayed.',
      },
      {
        compositeState: 'hidden',
        childStates: {
          root: 'hidden',
        },
        description: 'Content is present, empty state is hidden.',
      },
    ],
    eventBubbling: [
      { fromRole: 'empty-action', fromEvent: 'native:press', toAction: 'onAction', payloadStrategy: 'passthrough' },
    ],
    requiredStates: ['visible', 'hidden'],
    gaps: [],
  },

  // ── 4. PageHeader ──
  {
    a2uiType: 'PageHeader',
    description: 'Top-of-page header with title, optional breadcrumb, and action buttons.',
    mappingStatus: 'none',
    template: {
      role: 'root',
      primitiveType: 'Row',
      staticProps: { justify: 'space-between', align: 'center' },
      children: [
        {
          role: 'title-area',
          primitiveType: 'Column',
          children: [
            {
              role: 'title-text',
              primitiveType: 'Text',
              staticProps: { variant: 'h1' },
            },
            {
              role: 'breadcrumb',
              primitiveType: 'Breadcrumb',
            },
          ],
        },
        {
          role: 'actions-area',
          primitiveType: 'Row',
          staticProps: { gap: 'sm' },
          children: [
            {
              role: 'action-button',
              primitiveType: 'Button',
              repeatFrom: 'actions',
            },
          ],
        },
      ],
    },
    propDelegation: [
      { from: 'title', toRole: 'title-text', toProp: 'textContent', transform: 'direct' },
      { from: 'breadcrumbs', toRole: 'breadcrumb', toProp: 'children', transform: 'direct' },
      { from: 'actions[n].label', toRole: 'action-button', toProp: 'label', transform: 'direct' },
      { from: 'actions[n].variant', toRole: 'action-button', toProp: 'variant', transform: 'variantMap' },
    ],
    stateProjection: [
      {
        compositeState: 'visible',
        childStates: {
          root: 'visible',
          'action-button': 'enabled',
        },
        description: 'Page header is visible, actions are enabled.',
      },
      {
        compositeState: 'loading',
        childStates: {
          'action-button': 'disabled',
        },
        description: 'Page is loading, action buttons are disabled.',
      },
    ],
    eventBubbling: [
      { fromRole: 'action-button', fromEvent: 'native:press', toAction: 'onAction', payloadStrategy: 'index' },
    ],
    requiredStates: ['visible', 'loading'],
    gaps: [],
  },

  // ── 5. ConfirmationDialog ──
  {
    a2uiType: 'ConfirmationDialog',
    description: 'Modal dialog asking the user to confirm or cancel a destructive or important action.',
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
            {
              role: 'title',
              primitiveType: 'Text',
              staticProps: { variant: 'h3' },
            },
            {
              role: 'message',
              primitiveType: 'Text',
              staticProps: { variant: 'body' },
            },
            {
              role: 'button-row',
              primitiveType: 'Row',
              staticProps: { gap: 'sm', justify: 'end' },
              children: [
                {
                  role: 'cancel-button',
                  primitiveType: 'Button',
                  staticProps: { variant: 'ghost' },
                },
                {
                  role: 'confirm-button',
                  primitiveType: 'Button',
                  staticProps: { variant: 'primary' },
                },
              ],
            },
          ],
        },
      ],
    },
    propDelegation: [
      { from: 'title', toRole: 'title', toProp: 'textContent', transform: 'direct' },
      { from: 'message', toRole: 'message', toProp: 'textContent', transform: 'direct' },
      { from: 'confirmLabel', toRole: 'confirm-button', toProp: 'label', transform: 'direct' },
      { from: 'cancelLabel', toRole: 'cancel-button', toProp: 'label', transform: 'direct' },
    ],
    stateProjection: [
      {
        compositeState: 'hidden',
        childStates: {
          root: 'closed',
        },
        description: 'Dialog is not visible.',
      },
      {
        compositeState: 'visible',
        childStates: {
          root: 'open',
          'confirm-button': 'enabled',
          'cancel-button': 'enabled',
        },
        description: 'Dialog is open, buttons are interactive.',
      },
      {
        compositeState: 'submitting',
        childStates: {
          'confirm-button': 'disabled',
          'cancel-button': 'disabled',
        },
        description: 'Confirmation in progress, buttons are disabled.',
      },
    ],
    eventBubbling: [
      { fromRole: 'confirm-button', fromEvent: 'native:press', toAction: 'onConfirm', payloadStrategy: 'passthrough' },
      { fromRole: 'cancel-button', fromEvent: 'native:press', toAction: 'onCancel', payloadStrategy: 'passthrough' },
      { fromRole: 'root', fromEvent: 'native:dismiss', toAction: 'onDismiss', payloadStrategy: 'passthrough' },
    ],
    requiredStates: ['hidden', 'visible', 'submitting'],
    gaps: [
      {
        need: 'Modal open/close method',
        impact: 'No declarative open/close attribute on n-dialog — requires imperative showModal()/close()',
        workaround: 'Consumer calls element.showModal() and element.close() directly',
      },
    ],
  },

  // ── 6. ErrorBanner ──
  {
    a2uiType: 'ErrorBanner',
    description: 'Inline error banner with icon, message text, and optional action button.',
    mappingStatus: 'none',
    template: {
      role: 'root',
      primitiveType: 'Row',
      staticProps: { gap: 'sm', align: 'center' },
      children: [
        {
          role: 'error-icon',
          primitiveType: 'Icon',
          staticProps: { name: 'warning' },
        },
        {
          role: 'error-message',
          primitiveType: 'Text',
          staticProps: { variant: 'body' },
        },
        {
          role: 'action-button',
          primitiveType: 'Button',
          staticProps: { variant: 'ghost' },
        },
      ],
    },
    propDelegation: [
      { from: 'message', toRole: 'error-message', toProp: 'textContent', transform: 'direct' },
      { from: 'actionLabel', toRole: 'action-button', toProp: 'label', transform: 'direct' },
      { from: 'icon', toRole: 'error-icon', toProp: 'name', transform: 'direct' },
    ],
    stateProjection: [
      {
        compositeState: 'visible',
        childStates: {
          root: 'visible',
        },
        description: 'Error banner is displayed.',
      },
      {
        compositeState: 'hidden',
        childStates: {
          root: 'hidden',
        },
        description: 'Error banner is not displayed.',
      },
    ],
    eventBubbling: [
      { fromRole: 'action-button', fromEvent: 'native:press', toAction: 'onAction', payloadStrategy: 'passthrough' },
    ],
    requiredStates: ['visible', 'hidden'],
    gaps: [],
  },

  // ── 7. SuccessToast ──
  {
    a2uiType: 'SuccessToast',
    description: 'Transient success notification toast with auto-dismiss.',
    mappingStatus: 'partial',
    template: {
      role: 'root',
      primitiveType: 'Toast',
      staticProps: { intent: 'success' },
    },
    propDelegation: [
      { from: 'message', toRole: 'root', toProp: 'message', transform: 'direct' },
    ],
    stateProjection: [
      {
        compositeState: 'visible',
        childStates: {
          root: 'visible',
        },
        description: 'Toast is shown.',
      },
      {
        compositeState: 'hidden',
        childStates: {
          root: 'hidden',
        },
        description: 'Toast is dismissed.',
      },
    ],
    eventBubbling: [
      { fromRole: 'root', fromEvent: 'native:dismiss', toAction: 'onDismiss', payloadStrategy: 'passthrough' },
    ],
    requiredStates: ['visible', 'hidden'],
    gaps: [],
  },

  // ── 8. ErrorDialog ──
  {
    a2uiType: 'ErrorDialog',
    description: 'Modal dialog displaying an error with icon, title, message, and action buttons.',
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
            {
              role: 'error-icon',
              primitiveType: 'Icon',
              staticProps: { name: 'warning-circle' },
            },
            {
              role: 'title',
              primitiveType: 'Text',
              staticProps: { variant: 'h3' },
            },
            {
              role: 'message',
              primitiveType: 'Text',
              staticProps: { variant: 'body' },
            },
            {
              role: 'button-row',
              primitiveType: 'Row',
              staticProps: { gap: 'sm', justify: 'end' },
              children: [
                {
                  role: 'action-button',
                  primitiveType: 'Button',
                  repeatFrom: 'actions',
                },
              ],
            },
          ],
        },
      ],
    },
    propDelegation: [
      { from: 'title', toRole: 'title', toProp: 'textContent', transform: 'direct' },
      { from: 'message', toRole: 'message', toProp: 'textContent', transform: 'direct' },
      { from: 'actions[n].label', toRole: 'action-button', toProp: 'label', transform: 'direct' },
      { from: 'actions[n].variant', toRole: 'action-button', toProp: 'variant', transform: 'variantMap' },
    ],
    stateProjection: [
      {
        compositeState: 'hidden',
        childStates: {
          root: 'closed',
        },
        description: 'Dialog is not visible.',
      },
      {
        compositeState: 'visible',
        childStates: {
          root: 'open',
          'action-button': 'enabled',
        },
        description: 'Dialog is open, action buttons are enabled.',
      },
      {
        compositeState: 'submitting',
        childStates: {
          'action-button': 'disabled',
        },
        description: 'Action in progress, buttons are disabled.',
      },
    ],
    eventBubbling: [
      { fromRole: 'action-button', fromEvent: 'native:press', toAction: 'onAction', payloadStrategy: 'index' },
      { fromRole: 'root', fromEvent: 'native:dismiss', toAction: 'onDismiss', payloadStrategy: 'passthrough' },
    ],
    requiredStates: ['hidden', 'visible', 'submitting'],
    gaps: [
      {
        need: 'Modal open/close method',
        impact: 'No declarative open/close attribute on n-dialog — requires imperative showModal()/close()',
        workaround: 'Consumer calls element.showModal() and element.close() directly',
      },
    ],
  },

  // ── 9. LoadingIndicator ──
  {
    a2uiType: 'LoadingIndicator',
    description: 'Progress indicator for loading states, maps to the native Progress primitive.',
    mappingStatus: 'partial',
    template: {
      role: 'root',
      primitiveType: 'Progress',
    },
    propDelegation: [
      { from: 'value', toRole: 'root', toProp: 'value', transform: 'direct' },
      { from: 'max', toRole: 'root', toProp: 'max', transform: 'direct' },
    ],
    stateProjection: [
      {
        compositeState: 'active',
        childStates: {
          root: 'visible',
        },
        description: 'Loading indicator is visible and active.',
      },
      {
        compositeState: 'hidden',
        childStates: {
          root: 'hidden',
        },
        description: 'Loading is complete, indicator is hidden.',
      },
    ],
    eventBubbling: [],
    requiredStates: ['active', 'hidden'],
    gaps: [],
  },
];

// ── Default Singleton Registry ──

export const defaultCompositionRegistry = new CompositionRegistry(DEFAULT_COMPOSITIONS);
export const COMPOSITION_MAP: CompositionRegistry = defaultCompositionRegistry;
