export { NativeElement } from './native-element.ts';
export { define } from './define.ts';
export { uid } from './uid.ts';
export { createDisabledEffect } from './effects.ts';
export { prop, syncProp } from './reactive-prop.ts';
export type { ReactiveProp } from './reactive-prop.ts';
export { ContextProvider, ContextConsumer, ContextRequestEvent } from './context.ts';
export type { Lifecycle, Constructor } from './types.ts';
export { FormAssociable } from './form-associable.ts';
export { parseTraitAttribute, collectTraitOptions } from './trait-options.ts';
export { DataListController, createDataList } from './data-list.ts';
export type { DataItem, DataListOptions } from './data-list.ts';
export { parseDataOptions, fetchDataOptions } from './data-options.ts';
export type { BaseOption } from './data-options.ts';

// Re-exports from registries/ and traits/ — backwards compatibility
export { registerTrait, getTrait, getRegisteredTraitNames } from '../registries/trait-registry.ts';
export type { TraitAdapter } from '../registries/trait-registry.ts';
export { getTraitRuntime, DismissStack, ToastManager } from '../traits/runtime.ts';
export type { TraitRuntime, ToastOptions as RuntimeToastOptions } from '../traits/runtime.ts';
export { GestureRouter } from '../traits/gesture-router.ts';
export type { GestureParticipant } from '../traits/gesture-router.ts';
