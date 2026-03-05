import { NativeElement } from '../../core/native-element.ts';
import { getTrait, onTraitRegistered, getRegisteredTraitNames } from '../../registries/trait-registry.ts';
import { collectTraitOptions, parseTraitAttribute } from '../../core/trait-options.ts';

/**
 * Managed controller instances keyed by trait name, per target element.
 */
type ControllerMap = Map<string, unknown>;

/**
 * `<n-controller>` — Structural trait provider.
 *
 * Three modes:
 * - **Wrapper** (default): Applies traits to first element child
 * - **Selector** (`for="selector"`): Applies traits to matching descendants
 * - **Provider** (`provides="..."`): Exposes services via context (future)
 */
export class NController extends NativeElement {
  static observedAttributes = ['traits', 'for', 'provides'];

  /** Per-target controller instances: target → Map<traitName, instance> */
  #targets = new Map<HTMLElement, ControllerMap>();

  /** Watches for child additions/removals in selector mode, or first-child changes in wrapper mode */
  #childObserver: MutationObserver | null = null;

  /** Watches for trait option attribute changes on this element */
  #optionObserver: MutationObserver | null = null;

  /** Traits requested but not yet registered — retried on registration */
  #pendingTraits = new Set<string>();
  #traitUnsub: (() => void) | null = null;
  #alive = false;

  // WHY: Override connectedCallback to prevent NativeElement from running its
  // trait-on-self protocol. NController delegates traits to children, never
  // to itself. We call setup() directly (same as NativeElement) but skip
  // #initTraitObserver. The #alive guard prevents double-setup on DOM move.
  connectedCallback(): void {
    if (this.#alive) return;
    this.#alive = true;
    // WHY: NController skips super.connectedCallback(), so it must renew the
    // ready promise itself. Without this, `await el.ready` is stale after
    // View Transition reconnect.
    this.renewReady();
    this.setup();
  }

  disconnectedCallback(): void {
    this.#alive = false;
    // WHY: Delegate to parent which calls teardown() + disposes effects
    super.disconnectedCallback();
  }

  setup(): void {
    super.setup();
    this.#apply();
    this.#startOptionObserver();
  }

  teardown(): void {
    this.#destroyAll();
    this.#childObserver?.disconnect();
    this.#childObserver = null;
    this.#optionObserver?.disconnect();
    this.#optionObserver = null;
    this.#traitUnsub?.();
    this.#traitUnsub = null;
    this.#pendingTraits.clear();
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    super.attributeChangedCallback(name, old, val);
    // WHY: Guard on #alive (not isConnected). During CE upgrade after adoptNode +
    // replaceWith, the element is already connected but setup() hasn't run yet.
    // Using isConnected would cause a premature #apply() here, then setup() would
    // #apply() again — leaking a duplicate MutationObserver.
    if (!this.#alive) return;

    if (name === 'traits' || name === 'for' || name === 'provides') {
      // Full re-apply — destroy old, create new
      this.#destroyAll();
      this.#childObserver?.disconnect();
      this.#childObserver = null;
      this.#apply();
    }
  }

  // ── Private ──

  #apply(): void {
    const provides = this.getAttribute('provides');
    if (provides !== null) {
      // Provider mode — expose services, don't apply traits to children.
      // Future: use ContextProvider to expose services.
      return;
    }

    const traitTokens = this.getAttribute('traits');
    if (!traitTokens) return;

    const forSelector = this.getAttribute('for');

    if (forSelector !== null) {
      // Selector mode — apply to matching descendants
      this.#applyToSelector(traitTokens, forSelector);
    } else {
      // Wrapper mode — apply to first element child
      this.#applyToFirstChild(traitTokens);
    }

    // WHY: Subscribe to trait registration so pending traits auto-initialize
    // when registerAllTraits() runs after element upgrade
    if (this.#pendingTraits.size > 0 && !this.#traitUnsub) {
      this.#traitUnsub = onTraitRegistered((name) => {
        if (this.#pendingTraits.has(name)) {
          this.#pendingTraits.delete(name);
          // Re-apply all traits — #applyTraitsToElement skips already-active ones
          this.#apply();
          if (this.#pendingTraits.size === 0) {
            this.#traitUnsub?.();
            this.#traitUnsub = null;
          }
        }
      });
    }
  }

  #applyToFirstChild(traitTokens: string): void {
    const target = this.#resolveFirstChild();
    if (target) {
      this.#applyTraitsToElement(target, traitTokens);
    } else {
      // WHY: Children may not be parsed yet (e.g. CE upgrade before parser finishes).
      // Retry with microtask → RAF → RAF as defense-in-depth alongside the MutationObserver.
      this.#retryApplyFirstChild(traitTokens, 0);
    }

    // WHY: Guard against duplicate observers. If #apply() is called twice (e.g. during
    // CE upgrade), disconnect the existing observer before creating a new one.
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }

    // WHY: Watch for first-child replacement so controllers are cleaned up and re-created.
    // Selector mode has its own observer; wrapper mode needs this to handle dynamic first children.
    this.#childObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;

        // Destroy controllers for any removed first-child (if it was our target)
        for (const removed of m.removedNodes) {
          if (removed instanceof HTMLElement) {
            const controllers = this.#targets.get(removed);
            if (controllers) {
              this.#destroyControllersFor(removed, controllers);
              this.#targets.delete(removed);
            }
          }
        }

        // Apply traits to the new first child if one appeared
        const newFirst = this.#resolveFirstChild();
        if (newFirst && !this.#targets.has(newFirst)) {
          this.#applyTraitsToElement(newFirst, traitTokens);
        }
      }
    });
    this.#childObserver.observe(this, { childList: true });
  }

  #applyToSelector(traitTokens: string, selector: string): void {
    const targets = this.querySelectorAll<HTMLElement>(selector);
    for (const target of targets) {
      this.#applyTraitsToElement(target, traitTokens);
    }

    // Guard against duplicate observers (defense-in-depth)
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }

    // Watch for dynamic children
    this.#childObserver = new MutationObserver(() => {
      this.#syncSelectorTargets(traitTokens, selector);
    });
    this.#childObserver.observe(this, { childList: true, subtree: true });
  }

  #syncSelectorTargets(traitTokens: string, selector: string): void {
    const currentTargets = new Set(this.querySelectorAll<HTMLElement>(selector));

    // Remove controllers from elements no longer matching
    for (const [target, controllers] of this.#targets) {
      if (!currentTargets.has(target)) {
        this.#destroyControllersFor(target, controllers);
        this.#targets.delete(target);
      }
    }

    // Add controllers to new matching elements
    for (const target of currentTargets) {
      if (!this.#targets.has(target)) {
        this.#applyTraitsToElement(target, traitTokens);
      }
    }
  }

  #applyTraitsToElement(target: HTMLElement, traitTokens: string): void {
    const names = traitTokens.split(/\s+/).filter(Boolean);
    const controllers: ControllerMap = this.#targets.get(target) ?? new Map();

    for (const name of names) {
      if (controllers.has(name)) continue;

      const adapter = getTrait(name);
      if (!adapter) {
        // WHY: Trait not yet registered — track and retry when it becomes available
        this.#pendingTraits.add(name);
        continue;
      }

      // Conflict check against already-active traits on this target
      for (const [activeName] of controllers) {
        const activeAdapter = getTrait(activeName);
        if (activeAdapter?.conflicts?.includes(name) || adapter.conflicts?.includes(activeName)) {
          const msg = `[native-ui] Trait conflict: "${name}" and "${activeName}" are incompatible.`;
          if (typeof import.meta?.env?.DEV !== 'undefined' && import.meta.env.DEV) {
            throw new Error(msg);
          }
          console.warn(msg);
        }
      }

      // Options come from *this* element (the controller), not the target
      const options = collectTraitOptions(this, name);
      const instance = adapter.create(target, options);
      controllers.set(name, instance);
    }

    this.#targets.set(target, controllers);
  }

  #resolveFirstChild(): HTMLElement | null {
    for (const child of this.children) {
      if (child instanceof HTMLElement) return child;
    }
    return null;
  }

  #retryApplyFirstChild(traitTokens: string, attempt: number): void {
    const tick = () => {
      if (!this.#alive) return;
      const target = this.#resolveFirstChild();
      if (target && !this.#targets.has(target)) {
        this.#applyTraitsToElement(target, traitTokens);
        return;
      }
      if (attempt < 2) {
        this.#retryApplyFirstChild(traitTokens, attempt + 1);
      }
    };
    if (attempt === 0) queueMicrotask(tick);
    else requestAnimationFrame(tick);
  }

  #destroyControllersFor(target: HTMLElement, controllers: ControllerMap): void {
    for (const [name, instance] of controllers) {
      const adapter = getTrait(name);
      if (adapter) adapter.destroy(instance);
    }
    controllers.clear();
    // Remove any reference but keep target lookup clean
    void target;
  }

  #destroyAll(): void {
    for (const [target, controllers] of this.#targets) {
      this.#destroyControllersFor(target, controllers);
    }
    this.#targets.clear();
  }

  /** Watch trait option attributes (e.g. draggable-axis) on this element */
  #startOptionObserver(): void {
    this.#optionObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (!m.attributeName) continue;

        const parsed = parseTraitAttribute(m.attributeName);
        if (!parsed) continue;

        const adapter = getTrait(parsed.trait);
        if (!adapter?.update) continue;

        // Update all target instances of this trait
        const options = collectTraitOptions(this, parsed.trait);
        for (const [, controllers] of this.#targets) {
          const instance = controllers.get(parsed.trait);
          if (instance) adapter.update(instance, options);
        }
      }
    });

    // WHY: Only observe trait-namespaced option attributes (e.g. "draggable-axis").
    // Compute attributeFilter from all attributes currently on this element that match
    // a registered trait prefix. This avoids firing on every attribute change.
    const attributeFilter = this.#buildOptionAttributeFilter();
    if (attributeFilter.length > 0) {
      this.#optionObserver.observe(this, { attributes: true, attributeFilter });
    } else {
      // No trait option attrs present — observe all to catch dynamically added ones.
      // MutationObserver with no filter fires on all attrs; parseTraitAttribute gates the logic.
      this.#optionObserver.observe(this, { attributes: true });
    }
  }

  /** Collect all attributes on this element that match any registered trait prefix. */
  #buildOptionAttributeFilter(): string[] {
    const traitNames = getRegisteredTraitNames();
    const filter: string[] = [];
    for (const attr of this.attributes) {
      for (const name of traitNames) {
        if (attr.name.startsWith(name + '-')) {
          filter.push(attr.name);
          break;
        }
      }
    }
    return filter;
  }
}
