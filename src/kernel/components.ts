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
  desc('n-button', 'components/button', 'form', true, ['native:press']),
  desc('n-input', 'components/input', 'form', true, ['native:input', 'native:change']),
  desc('n-checkbox', 'components/checkbox', 'form', true, ['native:change']),
  desc('n-switch', 'components/switch', 'form', true, ['native:change']),
  desc('n-radio-group', 'components/radio-group', 'form', true, ['native:change']),
  desc('n-select', 'components/select', 'form', true, ['native:change']),
  desc('n-combobox', 'components/combobox', 'form', true, ['native:change', 'native:input']),
  desc('n-textarea', 'components/textarea', 'form', true, ['native:input', 'native:change']),
  desc('n-range', 'components/range', 'form', true, ['native:change']),
  desc('n-segmented-control', 'components/segmented-control', 'form', true, ['native:change']),
  desc('n-input-otp', 'components/input-otp', 'form', true, ['native:change']),
  desc('n-calendar', 'components/calendar', 'form', true, ['native:change']),

  // Display components
  desc('n-listbox', 'components/listbox', 'display', false, ['native:select']),
  desc('n-option', 'components/option', 'display', false, ['native:select']),
  desc('n-option-group', 'components/option-group', 'display', false, []),
  desc('n-badge', 'components/badge', 'display', false, []),
  desc('n-avatar', 'components/avatar', 'display', false, []),
  desc('n-icon', 'icons/n-icon', 'display', false, []),

  // Navigation components
  desc('n-tabs', 'components/tabs', 'navigation', false, ['native:change']),
  desc('n-tab', 'components/tab', 'navigation', false, ['native:select']),
  desc('n-tab-panel', 'components/tab-panel', 'navigation', false, []),
  desc('n-tab-panels', 'components/tab-panels', 'navigation', false, []),
  desc('n-breadcrumb', 'components/breadcrumb', 'navigation', false, []),
  desc('n-breadcrumb-item', 'components/breadcrumb-item', 'navigation', false, ['native:press']),
  desc('n-pagination', 'components/pagination', 'navigation', false, ['native:change']),
  desc('n-tree', 'components/tree', 'navigation', false, ['native:change']),
  desc('n-tree-item', 'components/tree-item', 'navigation', false, ['native:select']),

  // Overlay components
  desc('n-dialog', 'components/dialog', 'overlay', false, ['close', 'native:dismiss']),
  desc('n-drawer', 'components/drawer', 'overlay', false, ['close', 'native:dismiss']),
  desc('n-tooltip', 'components/tooltip', 'overlay', false, []),
  desc('n-accordion', 'components/accordion', 'overlay', false, []),
  desc('n-accordion-item', 'components/accordion-item', 'overlay', false, [
    'native:expand',
    'native:collapse',
  ]),

  // Command palette
  desc('n-command', 'components/command', 'navigation', false, ['native:change']),
  desc('n-command-input', 'components/command', 'form', false, ['native:input']),
  desc('n-command-list', 'components/command', 'display', false, []),
  desc('n-command-item', 'components/command', 'display', false, ['native:select']),
  desc('n-command-group', 'components/command', 'display', false, []),
  desc('n-command-empty', 'components/command', 'display', false, []),

  // Table
  desc('n-table', 'components/table', 'display', false, ['native:sort', 'native:row-select']),
  desc('n-table-head', 'components/table', 'display', false, []),
  desc('n-table-body', 'components/table', 'display', false, []),
  desc('n-table-row', 'components/table', 'display', false, []),
  desc('n-table-cell', 'components/table', 'display', false, []),
  desc('n-table-header', 'components/table', 'display', false, ['native:sort']),

  // Containers
  desc('n-container', 'containers/article', 'container', false, []),
  desc('n-toolbar', 'components/toolbar', 'container', false, []),

  // Other
  desc('n-field', 'components/field', 'form', false, []),
  desc('n-radio', 'components/radio', 'form', false, ['native:select']),
  desc('n-segment', 'components/segment', 'form', false, ['native:select']),
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
  'native:press',
  'native:change',
  'native:select',
  'native:input',
  'native:dismiss',
  'native:expand',
  'native:collapse',
  'native:sort',
  'native:row-select',
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
        const commandType = `${tag}.${eventName.replace('native:', '')}`;
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
