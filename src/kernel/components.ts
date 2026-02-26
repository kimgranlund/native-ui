/**
 * Component Integration Module
 *
 * Bridges the native-ui component library to the kernel by providing:
 * - A frozen manifest of all component descriptors (tags, metadata, events)
 * - registerAll() to batch-register components through the kernel
 * - installEventBridge() to wire DOM events to the command bus
 * - Lookup helpers for querying descriptors by tag or category
 */

import type { Kernel } from './kernel.ts';
import type { Dispose } from '../reactivity/types.ts';

// ── Component Descriptor ──

export interface ComponentDescriptor {
  readonly tag: string;
  readonly module: string;
  readonly formAssociated: boolean;
  readonly events: readonly string[];
  readonly category:
    | 'form'
    | 'display'
    | 'navigation'
    | 'overlay'
    | 'container'
    | 'layout';
}

// ── Manifest ──

function desc(
  tag: string,
  module: string,
  category: ComponentDescriptor['category'],
  formAssociated: boolean,
  events: readonly string[],
): ComponentDescriptor {
  return Object.freeze({ tag, module, formAssociated, events, category });
}

export const COMPONENT_MANIFEST: readonly ComponentDescriptor[] = Object.freeze([
  // Form components
  desc('ui-button', 'components/ui-button', 'form', true, ['ui-press']),
  desc('ui-input', 'components/ui-input', 'form', true, ['ui-input', 'ui-change']),
  desc('ui-checkbox', 'components/ui-checkbox', 'form', true, ['ui-change']),
  desc('ui-switch', 'components/ui-switch', 'form', true, ['ui-change']),
  desc('ui-radio-group', 'components/ui-radio-group', 'form', true, ['ui-change']),
  desc('ui-select', 'components/ui-select', 'form', true, ['ui-change']),
  desc('ui-combobox', 'components/ui-combobox', 'form', true, ['ui-change', 'ui-input']),
  desc('ui-textarea', 'components/ui-textarea', 'form', true, ['ui-input', 'ui-change']),
  desc('ui-range', 'components/ui-range', 'form', true, ['ui-change']),
  desc('ui-segmented-control', 'components/ui-segmented-control', 'form', true, ['ui-change']),
  desc('ui-input-otp', 'components/ui-input-otp', 'form', true, ['ui-change']),
  desc('ui-calendar', 'components/ui-calendar', 'form', true, ['ui-change']),

  // Display components
  desc('ui-listbox', 'components/ui-listbox', 'display', false, ['ui-select']),
  desc('ui-option', 'components/ui-option', 'display', false, ['ui-select']),
  desc('ui-option-group', 'components/ui-option-group', 'display', false, []),
  desc('ui-badge', 'components/ui-badge', 'display', false, []),
  desc('ui-avatar', 'components/ui-avatar', 'display', false, []),
  desc('ui-icon', 'icons/ui-icon', 'display', false, []),

  // Navigation components
  desc('ui-tabs', 'components/ui-tabs', 'navigation', false, ['ui-change']),
  desc('ui-tab', 'components/ui-tab', 'navigation', false, ['ui-select']),
  desc('ui-tab-panel', 'components/ui-tab-panel', 'navigation', false, []),
  desc('ui-tab-panels', 'components/ui-tab-panels', 'navigation', false, []),
  desc('ui-breadcrumb', 'components/ui-breadcrumb', 'navigation', false, []),
  desc('ui-breadcrumb-item', 'components/ui-breadcrumb-item', 'navigation', false, ['ui-press']),
  desc('ui-pagination', 'components/ui-pagination', 'navigation', false, ['ui-change']),
  desc('ui-tree', 'components/ui-tree', 'navigation', false, ['ui-change']),
  desc('ui-tree-item', 'components/ui-tree-item', 'navigation', false, ['ui-select']),

  // Overlay components
  desc('ui-dialog', 'components/ui-dialog', 'overlay', false, ['close', 'ui-dismiss']),
  desc('ui-drawer', 'components/ui-drawer', 'overlay', false, ['close', 'ui-dismiss']),
  desc('ui-tooltip', 'components/ui-tooltip', 'overlay', false, []),
  desc('ui-accordion', 'components/ui-accordion', 'overlay', false, []),
  desc('ui-accordion-item', 'components/ui-accordion-item', 'overlay', false, [
    'ui-expand',
    'ui-collapse',
  ]),

  // Command palette
  desc('ui-command', 'components/ui-command', 'navigation', false, ['ui-change']),
  desc('ui-command-input', 'components/ui-command', 'form', false, ['ui-input']),
  desc('ui-command-list', 'components/ui-command', 'display', false, []),
  desc('ui-command-item', 'components/ui-command', 'display', false, ['ui-select']),
  desc('ui-command-group', 'components/ui-command', 'display', false, []),
  desc('ui-command-empty', 'components/ui-command', 'display', false, []),

  // Table
  desc('ui-table', 'components/ui-table', 'display', false, ['ui-sort', 'ui-row-select']),
  desc('ui-table-head', 'components/ui-table', 'display', false, []),
  desc('ui-table-body', 'components/ui-table', 'display', false, []),
  desc('ui-table-row', 'components/ui-table', 'display', false, []),
  desc('ui-table-cell', 'components/ui-table', 'display', false, []),
  desc('ui-table-header', 'components/ui-table', 'display', false, ['ui-sort']),

  // Containers
  desc('ui-card', 'containers/ui-card', 'container', false, []),
  desc('ui-section', 'containers/ui-section', 'container', false, [
    'ui-expand',
    'ui-collapse',
  ]),
  desc('ui-toolbar', 'containers/ui-toolbar', 'container', false, []),

  // Other
  desc('ui-field', 'components/ui-field', 'form', false, []),
  desc('ui-radio', 'components/ui-radio', 'form', false, ['ui-select']),
  desc('ui-segment', 'components/ui-segment', 'form', false, ['ui-select']),
]);

// ── Tag-keyed lookup index ──

const _byTag: ReadonlyMap<string, ComponentDescriptor> = new Map(
  COMPONENT_MANIFEST.map((d) => [d.tag, d]),
);

// ── Lookup Helpers ──

export function getDescriptor(tag: string): ComponentDescriptor | undefined {
  return _byTag.get(tag);
}

export function getDescriptorsByCategory(
  category: ComponentDescriptor['category'],
): readonly ComponentDescriptor[] {
  return COMPONENT_MANIFEST.filter((d) => d.category === category);
}

// ── Registration ──

export function registerAll(
  kernel: Kernel,
  classes: ReadonlyMap<string, CustomElementConstructor>,
  options?: { readonly exclude?: readonly string[] },
): number {
  const exclude = options?.exclude ? new Set(options.exclude) : null;
  let count = 0;

  for (const [tag, elementClass] of classes) {
    if (exclude?.has(tag)) continue;

    const descriptor = _byTag.get(tag);
    if (!descriptor) continue;

    kernel.registerAndDefine(tag, elementClass, {
      formAssociated: descriptor.formAssociated,
    });
    count++;
  }

  return count;
}

// ── Event Bridge ──

const BRIDGE_EVENTS = Object.freeze([
  'ui-press',
  'ui-change',
  'ui-select',
  'ui-input',
  'ui-dismiss',
  'ui-expand',
  'ui-collapse',
  'ui-sort',
  'ui-row-select',
] as const);

export function installEventBridge(
  kernel: Kernel,
  root?: HTMLElement,
): Dispose {
  const target = root ?? document.body;
  const bus = kernel.bus;
  const controllers: AbortController[] = [];

  for (const eventName of BRIDGE_EVENTS) {
    const ac = new AbortController();
    controllers.push(ac);

    target.addEventListener(
      eventName,
      (e: Event) => {
        const el = e.target as HTMLElement;
        if (!el?.tagName) return;

        const tag = el.tagName.toLowerCase();
        const commandType = `${tag}.${eventName.replace('ui-', '')}`;
        const planId =
          el.closest('[data-plan-id]')?.getAttribute('data-plan-id') ??
          undefined;

        bus.dispatch(
          commandType,
          {
            target: tag,
            event: eventName,
            detail: (e as CustomEvent).detail,
          },
          planId ? { planId } : undefined,
        );
      },
      { signal: ac.signal },
    );
  }

  return () => {
    for (const ac of controllers) ac.abort();
  };
}
