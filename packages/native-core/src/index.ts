// Reactivity
export { signal, computed, effect, batch, untrack } from './reactivity/index.ts';
export { isSignal, isComputed, debugReactive } from './reactivity/index.ts';
export type { Signal, ReadonlySignal, Dispose, ReactiveDebugInfo } from './reactivity/index.ts';

// Core
export { NativeElement } from './core/index.ts';
export { define, uid } from './core/index.ts';
export { createDisabledEffect } from './core/index.ts';
export { prop, syncProp } from './core/index.ts';
export type { ReactiveProp } from './core/index.ts';
export { ContextProvider, ContextConsumer, ContextRequestEvent } from './core/index.ts';
export type { Lifecycle, Constructor } from './core/index.ts';
export { DataListController, createDataList } from './core/index.ts';
export type { DataItem, DataListOptions } from './core/index.ts';
export { parseDataOptions, fetchDataOptions } from './core/index.ts';
export type { BaseOption } from './core/index.ts';
export { FormAssociable } from './core/index.ts';
export { parseTraitAttribute, collectTraitOptions } from './core/index.ts';
export { FORMAT_MARKERS, FORMAT_SHORTCUTS, isFormatEnabled, getSelectionOffsets, toggleMarker, restoreSelection } from './core/formatting.ts';
export { whenNativeReady } from './core/ready.ts';
export type { ReadyOptions } from './core/ready.ts';
export { getNativeDiagnostics } from './core/diagnostics.ts';
export type { DiagnosticsReport, DiagnosticsOptions } from './core/diagnostics.ts';

// Registries
export { registerTrait, getTrait, getRegisteredTraitNames, onTraitRegistered } from './registries/trait-registry.ts';
export type { TraitAdapter } from './registries/trait-registry.ts';
export { PluginRegistry } from './registries/plugin-registry.ts';
export type { PluginFactory } from './registries/plugin-registry.ts';
export { registerIcon, getIcon, onIconRegistered } from './registries/icon-registry.ts';
