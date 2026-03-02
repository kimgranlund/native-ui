import { effect } from '../reactivity/index.ts';
import type { Dispose } from '../reactivity/types.ts';
import { getTrait, onTraitRegistered } from '../registries/trait-registry.ts';
import { collectTraitOptions, parseTraitAttribute } from './trait-options.ts';

/** Base custom element class with reactive effect lifecycle, child deferral, and trait protocol. */
export class NativeElement extends HTMLElement {
  #disposers: Dispose[] = [];
  #controllers = new Map<string, unknown>();
  #traitObserver: MutationObserver | null = null;
  #pendingTraits = new Set<string>();
  #traitUnsub: (() => void) | null = null;
  #alive = false;
  #readyResolve: (() => void) | null = null;

  /** Resolves after setup() and any deferChildren microtask have completed. */
  readonly ready: Promise<void> = new Promise(resolve => {
    this.#readyResolve = resolve;
  });

  addEffect(fn: () => void): void {
    this.#disposers.push(effect(fn));
  }

  connectedCallback(): void {
    // WHY: Guard against double setup(). When native-app moves DOM nodes,
    // connectedCallback can fire twice without an intervening disconnectedCallback.
    // Without this guard, controllers/listeners are duplicated (e.g. double PressController
    // causes two native:press events per click, immediately opening then closing popovers).
    if (this.#alive) return;
    this.#alive = true;
    this.setup();
    // WHY: Initialize trait controllers after setup() so component wiring runs first
    const traits = this.getAttribute('traits');
    if (traits !== null) this.#initTraitObserver(traits);
    // WHY: Resolve ready after a microtask so deferChildren callbacks have fired.
    // Consumers use `await el.ready` instead of whenDefined + rAF hacks.
    queueMicrotask(() => this.#readyResolve?.());
  }

  disconnectedCallback(): void {
    this.#alive = false;
    this.#destroyAllControllers();
    this.#traitObserver?.disconnect();
    this.#traitObserver = null;
    this.#traitUnsub?.();
    this.#traitUnsub = null;
    this.#pendingTraits.clear();
    this.teardown();
    for (const dispose of this.#disposers) dispose();
    this.#disposers = [];
  }

  setup(): void {}
  teardown(): void {}

  protected deferChildren(fn: () => void): void {
    if (this.firstChild) {
      fn();
    } else {
      queueMicrotask(() => {
        if (this.isConnected) fn();
      });
    }
  }

  attributeChangedCallback(_name: string, _old: string | null, _val: string | null): void {}

  /**
   * Get a trait controller instance by name.
   * Returns null if no controller with that name is active.
   */
  getTraitController<T>(name: string): T | null {
    return (this.#controllers.get(name) as T) ?? null;
  }

  // ── Private controller protocol ──

  #initTraitObserver(initialTokens: string): void {
    this.#syncTraits(initialTokens);

    // WHY: Per-element MutationObserver avoids the static observedAttributes
    // inheritance problem. Only elements with traits="..." pay this cost.
    this.#traitObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'traits') {
          this.#syncTraits(this.getAttribute('traits') ?? '');
        } else if (m.attributeName) {
          // Check if this is a namespaced trait option like "draggable-axis"
          const parsed = parseTraitAttribute(m.attributeName);
          if (parsed) {
            const adapter = getTrait(parsed.trait);
            const instance = this.#controllers.get(parsed.trait);
            if (adapter && instance && adapter.update) {
              adapter.update(instance, collectTraitOptions(this, parsed.trait));
            }
          }
        }
      }
    });

    this.#traitObserver.observe(this, { attributes: true });
  }

  #syncTraits(tokens: string): void {
    const next = new Set(
      tokens.split(/\s+/).filter(Boolean),
    );

    // Remove controllers for traits no longer in the token list
    for (const [name, instance] of this.#controllers) {
      if (!next.has(name)) {
        const adapter = getTrait(name);
        if (adapter) adapter.destroy(instance);
        this.#controllers.delete(name);
      }
    }

    // Add controllers for new traits
    this.#pendingTraits.clear();
    for (const name of next) {
      if (this.#controllers.has(name)) continue;
      const adapter = getTrait(name);
      if (!adapter) {
        // WHY: Trait not yet registered — track it and retry when registered.
        // This handles the case where n-controller upgrades before registerAllTraits() runs.
        this.#pendingTraits.add(name);
        continue;
      }

      // Conflict check
      for (const [activeName] of this.#controllers) {
        const activeAdapter = getTrait(activeName);
        if (activeAdapter?.conflicts?.includes(name) || adapter.conflicts?.includes(activeName)) {
          const msg = `[native-ui] Trait conflict: "${name}" and "${activeName}" are incompatible.`;
          if (typeof import.meta?.env?.DEV !== 'undefined' && import.meta.env.DEV) {
            throw new Error(msg);
          }
          console.warn(msg);
        }
      }

      const options = collectTraitOptions(this, name);
      const instance = adapter.create(this, options);
      this.#controllers.set(name, instance);
    }

    // WHY: Subscribe to trait registration so pending traits auto-initialize
    // when registerAllTraits() runs after element upgrade
    if (this.#pendingTraits.size > 0 && !this.#traitUnsub) {
      this.#traitUnsub = onTraitRegistered((name) => {
        if (this.#pendingTraits.has(name)) {
          this.#pendingTraits.delete(name);
          this.#syncTraits(this.getAttribute('traits') ?? '');
          // WHY: Unsubscribe once all pending traits are resolved
          if (this.#pendingTraits.size === 0) {
            this.#traitUnsub?.();
            this.#traitUnsub = null;
          }
        }
      });
    } else if (this.#pendingTraits.size === 0 && this.#traitUnsub) {
      this.#traitUnsub();
      this.#traitUnsub = null;
    }
  }

  #destroyAllControllers(): void {
    for (const [name, instance] of this.#controllers) {
      const adapter = getTrait(name);
      if (adapter) adapter.destroy(instance);
    }
    this.#controllers.clear();
  }
}
