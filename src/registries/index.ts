// Trait adapter registry
export { registerTrait, getTrait, getRegisteredTraitNames, onTraitRegistered } from './trait-registry.ts';
export type { TraitAdapter } from './trait-registry.ts';

// Icon registry
export { registerIcon, getIcon, onIconRegistered } from './icon-registry.ts';

// Plugin registry (kernel extensions)
export { PluginRegistry } from './plugin-registry.ts';
export type { PluginFactory } from './plugin-registry.ts';
