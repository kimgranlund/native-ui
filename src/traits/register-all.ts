import { registerTrait } from '../registries/trait-registry.ts';
import {
  coreAdapters,
  interactionAdapters,
  devAdapters,
  allAdapters,
} from './adapters/index.ts';

/**
 * Register core trait adapters (standard UI behaviors).
 * Excludes interaction traits (toss, flip, parallax, confetti, magnet)
 * and dev traits (css-inspect).
 */
export function registerCoreTraits(): void {
  for (const adapter of coreAdapters) registerTrait(adapter);
}

/**
 * Register interaction trait adapters (visual/physics effects).
 * Includes: toss, flip, parallax, confetti, magnet.
 */
export function registerInteractionTraits(): void {
  for (const adapter of interactionAdapters) registerTrait(adapter);
}

/**
 * Register dev trait adapters (development/inspection tools).
 * Includes: css-inspect.
 */
export function registerDevTraits(): void {
  for (const adapter of devAdapters) registerTrait(adapter);
}

/**
 * Register all built-in trait adapters with the global trait registry.
 * Call once at app startup to enable `traits="..."` attribute on NativeElement subclasses.
 *
 * Equivalent to calling registerCoreTraits() + registerInteractionTraits() + registerDevTraits().
 */
export function registerAllTraits(): void {
  for (const adapter of allAdapters) registerTrait(adapter);
}
