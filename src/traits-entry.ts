// Traits-only entry point: controllers + adapters + registration + reactivity.
// No components, containers, or icons — lighter import for trait-only consumers.
//
// Usage:
//   import { PressController, signal, effect } from '@nonoun/native-ui/traits';
//   import { registerTrait, pressableAdapter } from '@nonoun/native-ui/traits';

// Reactivity (needed by controller consumers)
export { signal, computed, effect, batch, untrack } from '@nonoun/native-core';
export { isSignal, isComputed, debugReactive } from '@nonoun/native-core';
export type { Signal, ReadonlySignal, Dispose, ReactiveDebugInfo } from '@nonoun/native-core';

// Core utilities used by trait consumers
export { NativeElement } from '@nonoun/native-core';
export type { Lifecycle, Constructor } from '@nonoun/native-core';
export { define } from '@nonoun/native-core';
export { uid } from '@nonoun/native-core';
export { registerTrait, getTrait, getRegisteredTraitNames } from '@nonoun/native-core';
export type { TraitAdapter } from '@nonoun/native-core';
export { parseTraitAttribute, collectTraitOptions } from '@nonoun/native-core';
export { getTraitRuntime, DismissStack } from '@nonoun/native-traits';
export type { TraitRuntime, ToastOptions as RuntimeToastOptions } from '@nonoun/native-traits';

// Event detail types
export type { NPressDetail, NSelectDetail, NTextChangeDetail, NRangeValueDetail, NPickerChangeDetail, NToggleChangeDetail, NInputDetail, NDisabledDetail, NDragStartDetail, NDragMoveDetail, NDragOverDetail, NDropDetail, NDragCancelDetail, NInvalidDetail, NValidDetail, NRangeChangeDetail, NRangeSelectDetail, NFileDropDetail, NTextDropDetail, NSearchDetail, NClipDetail, NIntersectDetail, NCopyDetail, NVirtualChangeDetail, NSelectionChangeDetail, NHoverDetail, NSortDetail, NSwipeDetail, NResizeDetail, NEditStartDetail, NEditCommitDetail, NEditCancelDetail, NSlideChangeDetail, NSendDetail, NToastDetail, NTableSortDetail, NTableSelectDetail, NTableReorderDetail, NTableResizeDetail, NTableResizeEndDetail, NCalendarRangeDetail } from './events.ts';

// All controllers, types, adapters, and registerAllTraits
export * from '@nonoun/native-traits';
