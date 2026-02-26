import { UIElement } from '../../core/ui-element.ts';
import { getTrait } from '../../core/trait-registry.ts';
import { collectTraitOptions, parseTraitAttribute } from '../../core/trait-options.ts';

/**
 * Managed controller instances keyed by trait name, per target element.
 */
type ControllerMap = Map<string, unknown>;

/**
 * `<ui-controller>` — Structural trait provider.
 *
 * Three modes:
 * - **Wrapper** (default): Applies traits to first element child
 * - **Selector** (`for="selector"`): Applies traits to matching descendants
 * - **Provider** (`provides="..."`): Exposes services via context (future)
 */
export class UIController extends UIElement {
  static observedAttributes = ['traits', 'for', 'provides'];

  /** Per-target controller instances: target → Map<traitName, instance> */
  #targets = new Map<HTMLElement, ControllerMap>();

  /** Watches for child additions/removals in selector mode */
  #childObserver: MutationObserver | null = null;

  /** Watches for trait option attribute changes on this element */
  #optionObserver: MutationObserver | null = null;

  // WHY: Override connectedCallback to prevent UIElement from running its
  // trait-on-self protocol. UIController delegates traits to children, never
  // to itself. We call setup() directly (same as UIElement) but skip
  // #initTraitObserver.
  connectedCallback(): void {
    this.setup();
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
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    super.attributeChangedCallback(name, old, val);
    if (!this.isConnected) return;

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
  }

  #applyToFirstChild(traitTokens: string): void {
    const target = this.#resolveFirstChild();
    if (!target) return;
    this.#applyTraitsToElement(target, traitTokens);
  }

  #applyToSelector(traitTokens: string, selector: string): void {
    const targets = this.querySelectorAll<HTMLElement>(selector);
    for (const target of targets) {
      this.#applyTraitsToElement(target, traitTokens);
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
        console.warn(`[native-ui] Unknown trait "${name}". Is it registered?`);
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
        // Skip attributes handled by attributeChangedCallback
        if (m.attributeName === 'traits' || m.attributeName === 'for' || m.attributeName === 'provides') continue;

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
    this.#optionObserver.observe(this, { attributes: true });
  }
}
