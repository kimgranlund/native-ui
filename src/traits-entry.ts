// Traits-only entry point: controllers + adapters + registration + reactivity.
// No components, containers, or icons — lighter import for trait-only consumers.
//
// Usage:
//   import { PressController, signal, effect } from '@nonoun/native-ui/traits';
//   import { registerTrait, pressableAdapter } from '@nonoun/native-ui/traits';

// Reactivity (needed by controller consumers)
export { signal, computed, effect, batch, untrack } from './reactivity/index.ts';
export { isSignal, isComputed, debugReactive } from './reactivity/index.ts';
export type { Signal, ReadonlySignal, Dispose, ReactiveDebugInfo } from './reactivity/index.ts';

// Core utilities used by trait consumers
export { NativeElement } from './core/native-element.ts';
export type { Lifecycle, Constructor } from './core/types.ts';
export { define } from './core/define.ts';
export { uid } from './core/uid.ts';
export { registerTrait, getTrait, getRegisteredTraitNames } from './registries/trait-registry.ts';
export type { TraitAdapter } from './registries/trait-registry.ts';
export { parseTraitAttribute, collectTraitOptions } from './core/trait-options.ts';
export { getTraitRuntime, DismissStack } from './traits/runtime.ts';
export type { TraitRuntime, ToastOptions as RuntimeToastOptions } from './traits/runtime.ts';

// Event detail types
export type { NPressDetail, NSelectDetail, NTextChangeDetail, NRangeValueDetail, NPickerChangeDetail, NToggleChangeDetail, NInputDetail, NDisabledDetail, NDragStartDetail, NDragMoveDetail, NDragOverDetail, NDropDetail, NDragCancelDetail, NInvalidDetail, NValidDetail, NRangeChangeDetail, NRangeSelectDetail, NFileDropDetail, NTextDropDetail, NSearchDetail, NClipDetail, NIntersectDetail, NCopyDetail, NVirtualChangeDetail, NSelectionChangeDetail, NHoverDetail, NSortDetail, NSwipeDetail, NResizeDetail, NEditStartDetail, NEditCommitDetail, NEditCancelDetail, NSlideChangeDetail, NSendDetail, NToastDetail, NTableSortDetail, NTableSelectDetail, NTableReorderDetail, NTableResizeDetail, NTableResizeEndDetail, NCalendarRangeDetail } from './events.ts';

// All controllers, types, adapters, and registerAllTraits
export * from './traits/index.ts';
