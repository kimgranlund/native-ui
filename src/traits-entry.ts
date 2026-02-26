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
export { UIElement } from './core/ui-element.ts';
export type { Lifecycle, Constructor } from './core/types.ts';
export { define } from './core/define.ts';
export { uid } from './core/uid.ts';
export { registerTrait, getTrait, getRegisteredTraitNames } from './core/trait-registry.ts';
export type { TraitAdapter } from './core/trait-registry.ts';
export { parseTraitAttribute, collectTraitOptions } from './core/trait-options.ts';
export { getTraitRuntime, DismissStack, ToastManager } from './core/trait-runtime.ts';
export type { TraitRuntime, ToastOptions as RuntimeToastOptions } from './core/trait-runtime.ts';

// Event detail types
export type { UIPressDetail, UISelectDetail, UITextChangeDetail, UIRangeValueDetail, UIPickerChangeDetail, UIToggleChangeDetail, UIInputDetail, UIDisabledDetail, UIDragStartDetail, UIDragMoveDetail, UIDragOverDetail, UIDropDetail, UIDragCancelDetail, UIInvalidDetail, UIValidDetail, UIRangeChangeDetail, UIRangeSelectDetail, UIFileDropDetail, UITextDropDetail, UISearchDetail, UIClipDetail, UIIntersectDetail, UICopyDetail, UIVirtualChangeDetail, UISelectionChangeDetail, UIHoverDetail, UISortDetail, UISwipeDetail, UIResizeDetail, UIEditStartDetail, UIEditCommitDetail, UIEditCancelDetail, UISlideChangeDetail, UISendDetail, UIToastDetail, UITableSortDetail, UITableSelectDetail, UITableReorderDetail, UITableResizeDetail, UITableResizeEndDetail, UICalendarRangeDetail } from './events.ts';

// All controllers, types, adapters, and registerAllTraits
export * from './traits/index.ts';
