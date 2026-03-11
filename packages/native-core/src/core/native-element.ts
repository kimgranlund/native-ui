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
  #readyPromise: Promise<void>;
  #pendingDefers = 0;

  /** @internal Suppress lifecycle during synchronous reparenting (e.g. PresentController). */
  _reparenting = false;

  constructor() {
    super();
    this.#readyPromise = new Promise(r => { this.#readyResolve = r; });
  }

  /** Resolves after setup() and any deferChildren callbacks have completed. Renews on reconnect. */
  get ready(): Promise<void> {
    return this.#readyPromise;
  }

  addEffect(fn: () => void): void {
    this.#disposers.push(effect(fn));
  }

  connectedCallback(): void {
    // WHY: Guard against double setup(). When native-dashboard moves DOM nodes,
    // connectedCallback can fire twice without an intervening disconnectedCallback.
    // Without this guard, controllers/listeners are duplicated (e.g. double PressController
    // causes two native:press events per click, immediately opening then closing popovers).
    if (this.#alive) return;
    this.#alive = true;
    // WHY: Renew the ready promise on each connect so consumers can `await el.ready`
    // after View Transition reconnect. The old promise (from previous connection) stays
    // resolved — correct for anyone who stored a reference during that lifecycle.
    this.#readyPromise = new Promise(r => { this.#readyResolve = r; });
    this.#pendingDefers = 0;
    this.setup();
    // WHY: Initialize trait controllers after setup() so component wiring runs first
    const traits = this.getAttribute('traits');
    if (traits !== null) this.#initTraitObserver(traits);
    // WHY: If no deferChildren calls were made, resolve ready on next microtask.
    // If deferChildren was called, #resolveWhenReady gates on #pendingDefers === 0.
    if (this.#pendingDefers === 0) {
      queueMicrotask(() => this.#resolveWhenReady());
    }
  }

  disconnectedCallback(): void {
    // WHY: PresentController (and other reparenting code) sets _reparenting = true
    // before synchronously moving the host into a dialog. Without this guard,
    // the move triggers teardown+setup, destroying and rebuilding all DOM/state.
    if (this._reparenting) return;
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
      return;
    }
    this.#pendingDefers++;
    this.#retryDefer(fn, 0);
  }

  #retryDefer(fn: () => void, attempt: number): void {
    const tick = () => {
      if (!this.isConnected || !this.#alive) {
        this.#pendingDefers--;
        this.#resolveWhenReady();
        return;
      }
      if (this.firstChild || attempt >= 2) {
        fn();
        this.#pendingDefers--;
        this.#resolveWhenReady();
        return;
      }
      this.#retryDefer(fn, attempt + 1);
    };
    if (attempt === 0) queueMicrotask(tick);
    else requestAnimationFrame(tick);
  }

  /** Resolve the ready promise once all pending deferChildren callbacks have settled. */
  #resolveWhenReady(): void {
    if (this.#pendingDefers === 0 && this.#readyResolve) {
      this.#readyResolve();
      this.#readyResolve = null;
    }
  }

  /** @internal Renew the ready promise. Called by NController which overrides connectedCallback. */
  protected renewReady(): void {
    this.#readyPromise = new Promise(r => { this.#readyResolve = r; });
    this.#pendingDefers = 0;
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
          // Check if this is a trait option like "data-trait-draggable-axis"
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
        if (adapter && instance) adapter.destroy(instance);
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
      if (adapter && instance) adapter.destroy(instance);
    }
    this.#controllers.clear();
  }
}
