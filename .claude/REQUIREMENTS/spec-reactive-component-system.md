# Spec — Reactive UI Component System

> **Purpose:** Specification for a coding agent to author a reactive UI component system from scratch. Derived from deep analysis of a production system (~80 components, ~75 sessions of architectural iteration). Every design choice documented here was battle-tested against real failure modes.
>
> **Audience:** LLM coding agents, human implementors.
>
> **Scope:** Reactive primitives, base element class, registration, styling, context propagation, traits (mixins), controllers/stores, and component authoring patterns.

---

## Table of Contents

1. [Reactive Primitives](#1-reactive-primitives)
2. [Base Element Class](#2-base-element-class)
3. [Registration & Style Adoption](#3-registration--style-adoption)
4. [CSS Architecture](#4-css-architecture)
5. [Context Protocol](#5-context-protocol)
6. [Traits (Behavioral Mixins)](#6-traits-behavioral-mixins)
7. [Controllers & Stores](#7-controllers--stores)
8. [Component Authoring Patterns](#8-component-authoring-patterns)
9. [Multi-Element Families](#9-multi-element-families)
10. [File Structure & Naming](#10-file-structure--naming)
11. [Event System](#11-event-system)
12. [Form Association](#12-form-association)
13. [Accessibility Contracts](#13-accessibility-contracts)
14. [Testing Contracts](#14-testing-contracts)
15. [Known Pitfalls & Edge Cases](#15-known-pitfalls--edge-cases)
16. [Glossary](#16-glossary)

---

## 1. Reactive Primitives

The reactive system is the foundational layer. Everything else builds on it. Implement it as a self-contained module with zero DOM dependencies.

### 1.1 Core API Surface

| Export | Signature | Role |
|--------|-----------|------|
| `signal<T>` | `(initial: T) => Signal<T>` | Mutable reactive cell |
| `computed<T>` | `(fn: () => T) => ReadonlySignal<T>` | Lazy derived value |
| `effect` | `(fn: () => void) => Dispose` | Side-effect that re-runs when dependencies change |
| `batch` | `(fn: () => void) => void` | Coalesces signal writes; effects flush once at end |
| `untrack<T>` | `(fn: () => T) => T` | Reads signals without subscribing |

### 1.2 Signal Interface

```ts
interface Signal<T> {
  readonly [Symbol.toStringTag]: 'Signal';
  value: T;        // get: tracks; set: notifies
  peek(): T;       // read without tracking
}

interface ReadonlySignal<T> {
  readonly [Symbol.toStringTag]: 'Computed';
  readonly value: T;  // get: tracks + recomputes if dirty
  peek(): T;          // read without tracking (still recomputes if dirty)
}

type Dispose = () => void;
```

**Key constraints:**

- `[Symbol.toStringTag]` enables runtime type discrimination via `isSignal()` / `isComputed()` helpers.
- `peek()` on computed MUST recompute if dirty — it skips *tracking*, not *evaluation*.
- Equality check: `Object.is(current, next)`. This correctly handles `NaN === NaN` (true, skip) and `+0 !== -0` (different, notify).

### 1.3 Reactive Graph Internals

The system uses a **push-pull hybrid** model:

- **Push:** Writing to a signal immediately notifies subscribers. Effects are pushed into a pending queue (or executed immediately if unbatched).
- **Pull:** Computed values are lazy. Writing to their upstream marks them dirty, but recomputation is deferred until `.value` or `.peek()` is read.

#### Internal node types

| Node | Has `_subs` | Has `_deps` | Behavior |
|------|-------------|-------------|----------|
| `SourceNode` (signal) | ✅ | ❌ | Tracks who reads it |
| `ReactiveNode` (computed) | ✅ | ✅ | Both producer and consumer |
| `EffectNode` | ❌ | ✅ | Terminal consumer, executes side effects |

#### Tracking mechanism

- Module-level `activeNode: ReactiveNode | null` — set before executing an effect or computed's `fn`, restored after.
- When a signal's `.value` getter fires, it calls `track(source)` which adds `activeNode` to `source._subs` and `source` to `activeNode._deps`.
- Bidirectional linking enables cleanup: when an effect re-runs, `cleanup(node)` iterates `_deps`, removes `node` from each dep's `_subs`, then clears `_deps`. This drops stale subscriptions from previous execution branches.

#### Module-level singletons

The entire reactive system shares one `activeNode`, one `batchDepth` counter, and one `pendingEffects` set. This is a deliberate trade-off:

- ✅ Simple, matches Preact Signals / Solid / Angular Signals mental model.
- ✅ All components in the same JS context share reactive scheduling.
- ❌ No isolation between independent scopes (e.g. micro-frontends). Acceptable for a component library.
- ❌ Tests need manual cleanup (dispose all effects between tests).

### 1.4 Effect Execution

```
effect(fn):
  1. Create EffectNode { _fn: fn, _deps: Set, _disposed: false, _running: false }
  2. Call runEffect(node) immediately (initial run)
  3. Return dispose function

runEffect(node):
  1. If _disposed or _running → return (re-entrance guard)
  2. cleanup(node) — drop old subscriptions
  3. Set activeNode = node, _running = true
  4. Execute _fn()
  5. Restore activeNode, _running = false
```

**Critical behaviors:**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| Effect writes to a signal it reads | Write succeeds, but re-run notification is silently dropped (`_running` guard) | Prevents infinite loops. The write is fire-and-forget. |
| Nested `effect()` inside another `effect()` | Inner effect is independent — NOT auto-disposed when outer re-runs | Each call creates a new effect. The outer has no handle to dispose the inner. This is a known leak vector — document it. |
| Signal write during batch | Effect queued in `pendingEffects`, not executed | Coalescing |
| Signal write outside batch | Effect executed synchronously and immediately | Simpler mental model for unbatched code |

### 1.5 Computed Evaluation

```
computed(fn):
  1. Create node with dirty = true
  2. Return ReadonlySignal whose .value getter:
     a. Calls track(node) — so effects subscribe to this computed
     b. If dirty → recompute()
     c. Return cached value

recompute():
  1. Check for circular dependency (compute stack)
  2. cleanup(node) — drop old subscriptions
  3. Set activeNode = node
  4. Execute fn(), cache result
  5. Restore activeNode, dirty = false

_notify() on computed:
  1. If already dirty → return (no redundant propagation)
  2. Mark dirty
  3. Propagate notify() to own _subs (effects and other computeds)
```

The computed node's `_notify()` propagates staleness **without recomputing**. This is the "push dirty, pull value" pattern. Downstream effects see that their computed dependency is dirty and will pull the new value when they execute.

**Cycle detection:** Maintain a `computeStack: Set<SourceNode>`. Before recomputing, check if the node is already in the stack. If so, throw with a diagnostic message including the first 80 chars of the `fn.toString()`.

### 1.6 Batching

```
batch(fn):
  1. batchDepth++
  2. Execute fn()
  3. batchDepth--
  4. If batchDepth === 0 → flushEffects()

flushEffects():
  1. iterations = 0
  2. While pendingEffects.size > 0:
     a. If ++iterations > 100 → throw (infinite cycle)
     b. Snapshot pending effects, clear the set
     c. Execute each effect via runEffect()
```

Nested `batch()` calls increment/decrement the depth counter. Effects only flush when the outermost batch completes. The 100-iteration limit catches infinite write→effect→write cycles.

**Notify correctness:** When notifying subscribers of a signal write, **spread the `_subs` set to a snapshot array before iterating.** Without this, an effect's `cleanup()` + re-subscription during `runEffect()` mutates the set mid-iteration, causing infinite loops. The allocation cost is trivial (typically 1–3 subscribers per signal).

### 1.7 Debug Introspection

Provide a `debugReactive(sig)` function that returns:

```ts
interface ReactiveDebugInfo {
  type: 'signal' | 'computed' | 'unknown';
  value: unknown;
  subscriberCount: number;
  dependencyCount: number;
}
```

Implementation: Use a `WeakMap<object, SourceNode>` populated at signal/computed creation time. This avoids exposing internal node structure on the public interface while enabling devtools inspection.

### 1.8 Type Guards

```ts
function isSignal<T>(value: unknown): value is Signal<T>
function isComputed<T>(value: unknown): value is ReadonlySignal<T>
```

Check `[Symbol.toStringTag]` — it's reliable, non-enumerable on the prototype, and works across module boundaries.

---

## 2. Base Element Class

All components extend a single base class that integrates the reactive system with the Custom Elements lifecycle.

### 2.1 UIElement

```ts
class UIElement extends HTMLElement {
  #disposers: Dispose[] = [];

  addEffect(fn: () => void): void {
    this.#disposers.push(effect(fn));
  }

  connectedCallback(): void {
    this.#adoptStylesIfNeeded();
    this.setup();
  }

  disconnectedCallback(): void {
    this.teardown();
    for (const dispose of this.#disposers) dispose();
    this.#disposers = [];
  }

  setup(): void {}     // Override in subclasses
  teardown(): void {}   // Override in subclasses

  protected deferChildren(fn: () => void): void {
    if (this.firstChild) {
      fn();  // JS-created path: children already exist
    } else {
      queueMicrotask(() => {
        if (this.isConnected) fn();  // Parser path: wait for children
      });
    }
  }

  attributeChangedCallback(_name: string, _old: string | null, _new: string | null): void {}
}
```

### 2.2 Lifecycle Contract

| Phase | Trigger | What to do | What NOT to do |
|-------|---------|------------|----------------|
| `constructor()` | `new` or upgrade | `attachInternals()`, initialize signals, set role | Query children, dispatch events, read layout |
| `connectedCallback()` | Element added to DOM | Called by base — triggers `setup()` | Override directly (use `setup()` instead) |
| `setup()` | After `connectedCallback()` | Create effects, add event listeners, query self-attributes | Query children synchronously (use `deferChildren`) |
| `deferChildren(fn)` | Inside `setup()` | Query/wire child elements, create child-dependent effects | — |
| `attributeChangedCallback()` | Attribute mutation | Write to the corresponding signal | Side effects (that's what effects are for) |
| `teardown()` | Before `disconnectedCallback()` | Remove event listeners, null out child refs | — |
| `disconnectedCallback()` | Element removed from DOM | Called by base — triggers `teardown()` + effect disposal | Override directly (use `teardown()` instead) |

### 2.3 The Parser Timing Problem (Critical)

The HTML parser fires `connectedCallback()` when it encounters the **opening tag** — before children are parsed. This means:

```html
<ui-accordion>          ← connectedCallback fires HERE
  <ui-accordion-item>   ← not yet parsed
    ...
  </ui-accordion-item>
</ui-accordion>
```

`querySelector` inside `connectedCallback`/`setup()` returns `null` for children that haven't been parsed yet.

**Solution: `deferChildren(fn)`**

- If `this.firstChild` exists → children were added programmatically (e.g. `innerHTML`, `appendChild`). Execute `fn()` immediately.
- Otherwise → parser path. Defer via `queueMicrotask()`. By the time the microtask runs, the parser has finished the element's subtree.
- Guard: check `this.isConnected` before executing deferred work — the element may have been removed between `connectedCallback` and the microtask.

**Rule:** All child-querying logic MUST be wrapped in `deferChildren()`. Self-attribute effects (e.g., syncing `[disabled]` to ARIA) are safe synchronously.

### 2.4 Effect Lifecycle

Effects created via `addEffect()` are automatically disposed when the element disconnects. This prevents:

- Zombie effects running on detached elements.
- Memory leaks from signal subscriptions holding element references.
- Stale DOM updates after removal.

The `#disposers` array is cleared after disposal, so reconnecting the element (move, append elsewhere) starts fresh via a new `setup()` call.

### 2.5 Style Adoption

`UIElement` handles style adoption for Shadow DOM scenarios (when the element's `getRootNode()` is a `ShadowRoot` rather than `document`). In the normal `document` case, styles are pre-adopted during registration (§3). The element checks at `connectedCallback` time and adopts its `static sheet` and `static dependencies` to the shadow root if needed.

---

## 3. Registration & Style Adoption

### 3.1 `defineWithStyles(tag, elementClass)`

This is the **only** way to register a component. It does three things in order:

1. **Bootstrap layer order** (once, on first call): Adopt a `layersSheet` containing `@layer tokens, colors, themes, base, components, variants, states, utilities;` to `document.adoptedStyleSheets`. This establishes CSS cascade layer ordering before any component stylesheet is adopted.

2. **Adopt component stylesheets**: First `elementClass.dependencies` (in order), then `elementClass.sheet`. Order matters — later sheets win at equal specificity.

3. **Define the custom element**: `customElements.define(tag, elementClass)`. No-op if already defined.

**Why styles before define:** Elements already in the DOM upgrade instantly when `define()` is called. If styles haven't been adopted yet, there's a flash of unstyled content (FOUC). Adopting first eliminates this.

### 3.2 Element Split Pattern

Every component has two files:

| File | Contains | Imported by |
|------|----------|-------------|
| `ui-button-element.ts` | Pure class (`UIButton extends UIElement`) | Library barrel (`src/index.ts`), tests |
| `ui-button.ts` | Imports class, calls `defineWithStyles('ui-button', UIButton)`, re-exports | HTML demo pages, application code |

**Why:** The library barrel imports only `-element.ts` files. This means importing the library doesn't auto-register elements — consumers choose when/how registration happens. Tree-shaking works because unused element classes are never referenced by the registration side-effect.

### 3.3 `SheetRegistry`

A singleton that deduplicates stylesheet adoption per root (`Document` or `ShadowRoot`):

```ts
class SheetRegistry {
  adopt(root: Document | ShadowRoot, ...sheets: CSSStyleSheet[]): void
  remove(root: Document | ShadowRoot, ...sheets: CSSStyleSheet[]): void
  has(root: Document | ShadowRoot, sheet: CSSStyleSheet): boolean
}
```

- Uses `Set<CSSStyleSheet>` for the document (permanent, never GC'd).
- Uses `WeakMap<ShadowRoot, Set<CSSStyleSheet>>` for shadow roots (GC-able when the shadow host is collected).
- Only appends to `root.adoptedStyleSheets` if the sheet isn't already tracked. Prevents duplicates from multiple component registrations.

### 3.4 `css` Tagged Template

```ts
function css(strings: TemplateStringsArray, ...values: unknown[]): CSSStyleSheet
```

Creates a `CSSStyleSheet` via `new CSSStyleSheet()` + `replaceSync()`. In dev mode, warns if the input is non-trivial (>10 chars) but produces zero parsed rules — this catches silent CSS syntax errors that `replaceSync` swallows.

**This is the only way to create component stylesheets.** Never use `new CSSStyleSheet()` + `replaceSync()` directly.

### 3.5 UID Generation

```ts
function uid(prefix = 'ui'): string  // → "ui-a3f7b2c1"
```

Uses `crypto.randomUUID().slice(0, 8)` for 32 bits of randomness. Used for:
- Popover anchor wiring (`anchor-name` / `position-anchor`)
- ARIA cross-references (`aria-controls`, `aria-labelledby`)
- Any case where consumer-provided IDs aren't required

---

## 4. CSS Architecture

### 4.1 Layer System

Three CSS cascade layers, declared in order of increasing priority:

| Layer | Purpose | File(s) |
|-------|---------|---------|
| `colors` | Color primitives — env params, OKLCH ramps, scrims, elevation/brightness aliases | `colors.primitives.css` |
| `tokens` | Semantic color tokens — ground, ink, stroke, surface, outline per family | `colors.tokens.css` |
| `ui` | Public geometry scales, attribute selectors (size/density/radius/intent/variant), component styles | `ui.primitives.css`, `ui.{component}.css` |

Themes (`themes.css`) are intentionally **unlayered** — they use `:where([theme="..."])` selectors at the unlayered level so theme overrides sit outside the layer cascade.

Import order in `index.css` is critical and MUST NOT be reordered:

```
colors.primitives.css → colors.tokens.css → themes.css → ui.primitives.css → ui.{component}.css
```

Within the `ui` layer, components coexist with the generic attribute selectors. At `:where()` zero specificity, later-adopted sheets win — dependency sheets must be adopted before component sheets.

### 4.2 Zero-Specificity Selectors

**ALL selectors — component, attribute, and child — MUST use `:where()` wrappers:**

```css
/* ✅ Correct — CSS-only stage (native elements) */
:where(button, [role="button"], .ui-btn) { display: inline-grid; }
:where([variant="primary"]) { --_background: var(--_surface); }
:where([size="sm"]) { --_min-height: var(--ui-size-sm); }

/* ✅ Correct — Custom Element stage */
:where(ui-button) { display: inline-grid; }
:where(ui-button:hover:not([disabled])) { ... }

/* ❌ Wrong */
ui-button { display: inline-grid; }
[variant="primary"] { ... }
```

**Why:** `:where()` has zero specificity. This means:
- Layer order alone determines cascade priority (later layer wins).
- Consumer overrides with any non-zero specificity selector always win.
- No specificity wars between component library and application code.

### 4.3 Token Architecture — Three Tiers

Every value a component consumes flows through three tiers:

| Tier | Prefix | Scope | Purpose |
|------|--------|-------|---------|
| **1. Public** | `--ui-*` (geometry), `--color-env-*` (color), `--{family}-*` (semantic color) | `:root` | Themeable scale definitions and color tokens |
| **2. Local** | `--_*` | Attribute selectors | Resolved by `[size]`, `[intent]`, `[variant]`. Component-agnostic. |
| **3. Component** | (none) | Component selectors | Reads `--_*` locals directly. No per-component token namespace. |

Generic attribute selectors do the mapping — no per-component token declarations:

```css
/* Tier 1: Public scale tokens (on :root in ui.primitives.css) */
--ui-size-sm: 1.5rem;
--ui-font-sm: 0.8125rem;

/* Tier 2: Attribute selector resolves to locals (in ui.primitives.css) */
:where([size="sm"]) {
  --_min-height: var(--ui-size-sm);
  --_font-size: var(--ui-font-sm);
}

/* Tier 3: Component reads locals directly */
:where(ui-button) {
  min-height: var(--_min-height);
  font-size: var(--_font-size);
  background: var(--_background, transparent);
  color: var(--_color, inherit);
}
```

**Local naming:** `--_*` locals MUST use full CSS property names: `--_min-height` (not `--_size`), `--_font-size` (not `--_fs`), `--_background` (not `--_bg`).

**Intent → Variant color flow:** `[intent]` selectors map family role tokens to generic locals (`--_panel`, `--_ink`, `--_surface`). `[variant]` selectors then map those to output locals (`--_background`, `--_color`, `--_border-color`):

```css
/* Intent sets which family */
:where([intent="accent"]) {
  --_surface: var(--accent-surface);
  --_ink: var(--accent-ink);
}

/* Variant sets which role */
:where([variant="primary"]) {
  --_background: var(--_surface);
  --_color: var(--_surface-ink);
  --_border-color: transparent;
}
```

Components MUST NOT read public tokens or semantic color tokens directly — they read `--_*` locals.

### 4.4 Color Rules

| Rule | Example |
|------|---------|
| OKLCH only | `oklch(55% 0.2 250)` — never `#hex`, `rgb()`, `hsl()`, named colors |
| 9 env params control the entire palette | `--color-env-chroma`, `--color-env-hue-accent`, etc. on `:root` |
| 6 color families | `neutral`, `accent`, `info`, `success`, `warning`, `danger` |
| Semantic ramps use `light-dark()` internally | `--accent-050` through `--accent-950` auto-adapt to color scheme |
| Color scheme via property, not media query | `color-scheme: light dark;` — never `@media (prefers-color-scheme)` for individual values |
| Scrims use scrim tokens, not inline oklch | `var(--neutral-300-scrim)`, `var(--accent-scrim-tint-weaker)` |
| Components read `--_*` locals, never raw tokens | `background: var(--_background)` — not `var(--accent-surface)` |
| Exception: system colors in forced-colors | `@media (forced-colors: active) { color: ButtonText; }` |

### 4.5 Themes

A theme is a set of `:where([theme="name"])` selectors that override `--color-env-*` environment parameters. Themes are intentionally **unlayered** — they sit outside the `@layer` cascade. Themes MUST only override env params; the palette auto-recomputes.

Current CSS-only implementation (`themes.css`):

```css
:where([theme="zinc"]) {
  --color-env-hue-neutral: 240;
  --color-env-chroma-neutral: 0.15;
  --color-env-hue-accent: 240;
  --color-env-chroma-accent: 1.0;
  --color-env-chroma: 0.18;
}
```

Applied via HTML attribute: `<html theme="zinc">`. When `<ui-provider>` is implemented, themes will also be applicable on provider elements for nested theming:

```ts
// Future: Constructable StyleSheet for theme
export const zincTheme = css`
  :where(ui-provider[theme="zinc"]) {
    --color-env-hue-neutral: 240;
    --color-env-chroma-neutral: 0.15;
    --color-env-hue-accent: 240;
    --color-env-chroma-accent: 1.0;
  }
`;
```

**Theme ≠ color scheme.** A theme adjusts hue and chroma. A color scheme swaps light/dark appearance (via `color-scheme` property and `light-dark()` in the ramps). They are independent axes.

### 4.6 Light DOM — No Shadow DOM

Components render into the light DOM. Styles are adopted onto `document.adoptedStyleSheets` (or the shadow root of an ancestor, for embedding scenarios).

**Why light DOM:**
- CSS custom properties cascade naturally through the entire tree.
- No `::slotted()` specificity battles.
- No `::part()` piercing gymnastics.
- Standard CSS selectors work for theming and consumer overrides.
- `querySelector` works from any ancestor.
- Form association works without workarounds.
- Accessibility tree reflects the actual DOM structure.

**Trade-off:** No style encapsulation. Managed via `:where()` zero-specificity and `@layer` ordering instead.

---

## 5. Context Protocol

Context enables ancestor-to-descendant data flow without tight coupling. It is event-based, synchronous, and one-shot.

### 5.1 ContextRequestEvent

```ts
class ContextRequestEvent extends Event {
  readonly context: string;
  readonly callback: (value: unknown) => void;

  constructor(context: string, callback: (value: unknown) => void) {
    super('context-request', { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
  }
}
```

- `bubbles: true` — event walks up the DOM tree to find a provider.
- `composed: true` — crosses shadow DOM boundaries (critical for embedding scenarios).
- Callback-based — provider calls `callback(value)` synchronously during `dispatchEvent()`.

### 5.2 ContextProvider Mixin

```ts
function ContextProvider<T extends Constructor>(Base: T) {
  return class extends Base {
    #contexts = new Map<string, unknown>();

    provideContext(key: string, value: unknown): void {
      this.#contexts.set(key, value);
    }

    connectedCallback(): void {
      super.connectedCallback?.();
      this.addEventListener('context-request', this.#onRequest);
    }

    disconnectedCallback(): void {
      super.disconnectedCallback?.();
      this.removeEventListener('context-request', this.#onRequest);
    }

    #onRequest = (e: ContextRequestEvent): void => {
      const value = this.#contexts.get(e.context);
      if (value !== undefined) {
        e.stopPropagation();  // Nearest provider wins
        e.callback(value);
      }
    };
  };
}
```

**Key rules:**
- Call `provideContext()` before descendants connect — typically in `setup()`.
- `stopPropagation()` ensures nearest-ancestor-wins semantics. Nested providers shadow outer providers for the same key.
- The value is typically a store or signal — context provides the *container*, effects inside the consumer read from it reactively.

### 5.3 ContextConsumer Mixin

```ts
function ContextConsumer<T extends Constructor>(Base: T) {
  return class extends Base {
    #resolved = new Map<string, unknown>();

    requestContext<V>(key: string, callback?: (value: V) => void): void {
      this.dispatchEvent(new ContextRequestEvent(key, (value: unknown) => {
        this.#resolved.set(key, value);
        callback?.(value as V);
      }));
    }

    getContext<V>(key: string): V | null {
      return (this.#resolved.get(key) as V) ?? null;
    }
  };
}
```

**Timing rule:** `requestContext()` MUST be called during `setup()` — after the element is connected (so the event can bubble) and before effects are created (so the store reference is available for effect closures).

**Resolution is synchronous.** After `requestContext()` returns, the store is available via `getContext()`. No promises, no async.

### 5.4 Data Flow Direction

```
Provider (AppRoot)
  │
  │  context-request event bubbles UP ↑
  │  provider calls callback synchronously
  │  callback stores reference (flows DOWN ↓)
  │
  ├── Domain Panel (ContextConsumer)
  │     │
  │     │  reads store signals → effects update UI
  │     │  user interaction → dispatches DOM events UP ↑
  │     │
  │     ├── ui-input (generic, no context awareness)
  │     └── ui-select (generic, no context awareness)
  │
  └── Other Panel...
```

**Context flows down (via stores). Events flow up (via DOM).** Generic UI components know nothing about context. Domain panels are the binding layer.

---

## 6. Traits (Behavioral Mixins)

Traits add reusable behavior to elements via TypeScript mixins. They compose with `UIElement` and with each other.

### 6.1 Mixin Constraint

All traits operate on a shared type constraint:

```ts
interface Lifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  setup?(): void;
  teardown?(): void;
  attributeChangedCallback?(name: string, old: string | null, new_: string | null): void;
}

type Constructor<T extends HTMLElement & Lifecycle = HTMLElement & Lifecycle> =
  new (...args: any[]) => T;
```

This ensures `super.connectedCallback?.()` / `super.setup?.()` calls resolve at runtime regardless of mixin composition order.

### 6.2 Pressable

Handles pointer and keyboard press interaction with pointer capture for reliable press-release tracking.

**Applied via:** `class UIButton extends Pressable(UIElement)`

**Behavior:**
- `pointerdown` (button 0 only, not disabled) → `setPointerCapture()`, set `[pressed]` attribute
- `pointerup` → if had capture, dispatch `ui-press` event, remove `[pressed]`
- `keydown` Enter/Space (not repeat, not disabled) → set `[pressed]`
- `keyup` Enter/Space → dispatch `ui-press`, remove `[pressed]`
- `pointercancel` / `lostpointercapture` → clean up state

**Why pointer capture:** The browser implicitly releases capture before firing `pointerup`. Track capture state via a `#hasCapture` boolean flag set in `pointerdown`, not via `hasPointerCapture()` (which is already false by the time `pointerup` fires).

**The `disabled` check:** Read `this.disabled` (property backed by signal), not `this.hasAttribute('disabled')`. Properties are always current; attributes lag behind until effects flush.

**Dispatched event:** `ui-press` with `{ detail: { pointerType: 'mouse' | 'touch' | 'pen' | 'keyboard' }, bubbles: true, composed: true }`.

### 6.3 Dismissable

Manages a global layer stack for Escape key and click-outside dismissal. Only the topmost dismissable handles the event.

**API:**
- `enableDismiss()` — push onto stack (with `rAF` delay to prevent the opening click from immediately dismissing)
- `disableDismiss()` — remove from stack
- Dispatches `ui-dismiss` event on the topmost element

**Global listeners** (attached once, on `document`):
- `pointerdown` on capture phase — checks if click is outside the top layer element
- `keydown` — checks for Escape, prevents default

**Stack semantics:** Array-based. `pushLayer()` moves the element to the top (removing any existing entry first). `removeLayer()` splices it out. When the stack empties, global listeners are detached.

### 6.4 RovingFocusable

Arrow-key navigation within a container of focusable items (tabs, radio buttons, menu items).

**Configuration (public fields for subclass override):**

```ts
rovingSelector = ':scope > [role]';            // What to navigate
rovingOrientation = 'vertical';                // 'horizontal' | 'vertical' | 'both'
rovingWrap = true;                             // Wrap at boundaries
```

**Behavior:**
- Initializes tabindex on items: active item gets `0`, all others get `-1`.
- Arrow keys move focus by `±1` based on orientation.
- Home/End jump to first/last item.
- Skips `[disabled]` and `[aria-disabled="true"]` items.
- On `focusin` to the container itself, redirects focus to the active item.

### 6.5 FocusTrappable

Tab key wrapping within a container (dialogs, modals).

**API:**
- `enableFocusTrap()` — stores `document.activeElement`, intercepts Tab/Shift+Tab, wraps between first and last focusable child
- `disableFocusTrap()` — removes interceptor, restores previous focus

**Initial focus priority:** `[autofocus]` > first focusable child > container itself (with `tabindex="-1"`).

### 6.6 Composition

Traits compose via mixin chaining:

```ts
class UIAccordion extends RovingFocusable(UIElement) { ... }
class UIAlertDialog extends FocusTrappable(Dismissable(UIElement)) { ... }
class UIButton extends Pressable(UIElement) { ... }
```

Each trait calls `super.setup?.()` / `super.teardown?.()` / `super.connectedCallback?.()` etc., ensuring the full chain executes regardless of composition order.

---

## 7. Controllers & Stores

Controllers and stores are **pure JavaScript objects** that own reactive state. They have zero DOM dependencies — no element references, no event dispatching, no attribute manipulation.

### 7.1 Design Principles

| Principle | Meaning |
|-----------|---------|
| **Pure JS** | No DOM, no events, no elements |
| **Signal-based** | All state is `Signal<T>`, derived values are `ReadonlySignal<T>` |
| **Action methods** | Mutations go through named methods, not direct signal writes |
| **Testable in isolation** | Can be unit-tested without a DOM, browser, or test harness |
| **No rendering** | The element layer creates effects that bridge store state → DOM |

### 7.2 Store Anatomy

```ts
class ComboboxStore {
  // ═══ STATE (signals) ═══
  readonly open: Signal<boolean> = signal(false);
  readonly query: Signal<string> = signal('');
  readonly options: Signal<Option[]> = signal([]);
  readonly activeIndex: Signal<number> = signal(-1);
  readonly value: Signal<string | null> = signal(null);

  // ═══ DERIVED (computed) ═══
  readonly filtered: ReadonlySignal<Option[]> = computed(() => {
    const q = this.query.value.trim();
    return q ? this.options.value.filter(...) : this.options.value;
  });

  readonly activeOption: ReadonlySignal<Option | null> = computed(() => {
    const idx = this.activeIndex.value;
    const opts = this.filtered.value;
    return idx >= 0 && idx < opts.length ? opts[idx] : null;
  });

  // ═══ ACTIONS ═══
  show(): void { ... }
  close(): void { ... }
  toggle(): void { ... }
  moveActive(delta: number): void { ... }
  select(value: string): void { ... }
  clear(): void { ... }
  setOptions(opts: Option[]): void { ... }

  // ═══ NO DOM. NO EVENTS. NO ELEMENTS. ═══
}

function createComboboxStore(): ComboboxStore {
  return new ComboboxStore();
}
```

### 7.3 Store vs Controller Naming

Both are the same pattern (pure JS + signals + actions). The naming reflects intent:

| Name | Suffix | Use case |
|------|--------|----------|
| **Store** | `-store.ts`, `class XxxStore` | Complex state with many derived values (combobox, data table) |
| **Controller** | `-controller.ts`, `class XxxController` | Simpler coordination logic (select, toggle group) |

Factory function: `createXxxStore()` or `createXxxController()`.

### 7.4 Element↔Store Bridge

The element creates effects in `setup()` that read store signals and write to the DOM:

```ts
// Inside a component's setup():
this.addEffect(() => {
  const isOpen = this.#store.open.value;
  this.toggleAttribute('open', isOpen);
  this.#internals.ariaExpanded = String(isOpen);
  if (isOpen) this.#popover?.showPopover();
  else this.#popover?.hidePopover();
});
```

The store owns the truth. The element owns the DOM. Effects are the bridge.

### 7.5 Application Stores vs Library Stores

| Aspect | Library Store | Application Store |
|--------|--------------|-------------------|
| Scope | Single component family | Application-wide |
| Provided via | Component internal, or exported for advanced use | Context protocol |
| Example | `ComboboxStore` | `DocumentStore`, `SelectionStore`, `CommandStack` |
| DOM awareness | None | None |
| Who creates | Component or consumer | AppRoot / ContextProvider |

---

## 8. Component Authoring Patterns

### 8.1 Signal-Backed Attributes

Every observed attribute has a corresponding private signal. The `attributeChangedCallback` is a pure mapper — it converts the attribute string into the signal's typed value:

```ts
static observedAttributes = ['disabled', 'value', 'size', 'variant'];

#disabled = signal(false);
#value = signal<string | null>(null);
#size = signal('');
#variant = signal('');

attributeChangedCallback(name: string, old: string | null, val: string | null) {
  if (old === val) return;  // Early bail
  switch (name) {
    case 'disabled': this.#disabled.value = val !== null; break;
    case 'value': this.#value.value = val; break;
    case 'size': this.#size.value = val ?? ''; break;
    case 'variant': this.#variant.value = val ?? ''; break;
  }
  super.attributeChangedCallback?.(name, old, val);
}
```

**Rules:**
- Early-return on `old === val` — prevents unnecessary signal writes (which would skip due to `Object.is` anyway, but avoids the function call overhead).
- Boolean attributes: `val !== null` (present = true, absent = false).
- String attributes: `val ?? ''` (normalize null to empty string for non-nullable signals).
- Always call `super.attributeChangedCallback?.()` at the end — traits may observe attributes.

### 8.2 Property↔Attribute Reflection

Public property getters/setters read from signals. Setters also sync the DOM attribute:

```ts
get variant(): string {
  return this.#variant.value;
}

set variant(val: string) {
  this.#variant.value = val;
  if (val) {
    if (this.getAttribute('variant') !== val) {
      this.setAttribute('variant', val);
    }
  } else {
    this.removeAttribute('variant');
  }
}
```

**Why the guard?** `setAttribute` triggers `attributeChangedCallback`, which writes to the signal. Without the `getAttribute !== val` check, you get a redundant write cycle. The `Object.is` check in the signal would prevent effects from re-running, but the unnecessary callback overhead adds up across many components.

### 8.3 Effect Organization in `setup()`

```ts
setup(): void {
  super.setup();

  // 1. Self-attribute effects (safe synchronously)
  this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
  this.addEffect(() => {
    this.toggleAttribute('open', this.#open.value);
  });

  // 2. Event listeners on self
  this.addEventListener('click', this.#onClick);
  this.addEventListener('keydown', this.#onKeyDown);

  // 3. Child-dependent work (deferred for parser timing)
  this.deferChildren(() => {
    this.#popover = this.querySelector(':scope > ui-popover');
    this.#listbox = this.querySelector(':scope > ui-popover > ui-listbox');

    // Wire ARIA, set initial state, create child-dependent effects
    this.addEffect(() => {
      const val = this.#value.value;
      // Update label, listbox value, etc.
    });
  });
}
```

### 8.4 Shared Effect Factories

Common effect patterns should be extracted into reusable factory functions:

```ts
function createDisabledEffect(
  el: HTMLElement,
  disabled: Signal<boolean>,
  internals: ElementInternals,
  options?: { manageTabindex?: boolean },
): () => void {
  let prev: boolean | undefined;

  return () => {
    const val = disabled.value;
    el.toggleAttribute('disabled', val);
    internals.ariaDisabled = val ? 'true' : null;

    if (options?.manageTabindex) {
      el.setAttribute('tabindex', val ? '-1' : '0');
    }

    // Dispatch ui-disabled event on change (skip initial)
    if (prev !== undefined && prev !== val) {
      el.dispatchEvent(new CustomEvent('ui-disabled', {
        bubbles: true, composed: true,
        detail: { disabled: val },
      }));
    }
    prev = val;
  };
}
```

The factory returns a closure (not a `Dispose`). It's passed to `addEffect()`:

```ts
this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));
```

### 8.5 Strategy Pattern for Complex Components

When a component has multiple behavioral modes determined by DOM structure, use a strategy interface:

```ts
interface ComboboxStrategy {
  readonly mode: 'inline' | 'select';
  setupDOM(ctx: ComboboxContext): void;
  setupEffects(ctx: ComboboxContext, addEffect: (fn: () => void) => void): void;
  afterCommit(ctx: ComboboxContext, option: UIOption): void;
  focusAfterClose(ctx: ComboboxContext): void;
  onClick(ctx: ComboboxContext, e: MouseEvent): void;
  onInput(ctx: ComboboxContext, query: string): void;
  // ... additional mode-specific hooks
}
```

**Context object:** Exposes host internals to strategies without making private fields public:

```ts
interface ComboboxContext {
  readonly host: HTMLElement;
  input: UIInput | null;
  display: UIInput | null;
  readonly value: Signal<string | null>;
  readonly query: Signal<string>;
  readonly open: Signal<boolean>;
  showPopover(): void;
  hidePopover(): void;
  // ... additional bridging methods
}
```

**Strategy detection** happens once during `setup()` based on DOM structure:

```ts
function createStrategy(host: HTMLElement): ComboboxStrategy {
  const hasPopoverInput = host.querySelector(':scope > ui-popover > ui-input') !== null;
  if (hasPopoverInput) return new SelectStrategy();
  return new InlineStrategy();
}
```

This avoids mode flags, switch statements, and conditional logic scattered throughout the element class.

---

## 9. Multi-Element Families

Some components are composed of multiple custom elements that work together (accordion, tabs, menu, tree). These share a single flat directory.

### 9.1 Anatomy

```
ui-accordion/
├── index.ts                          ← barrel (children-first import order)
├── ui-accordion-element.ts           ← parent coordinator
├── ui-accordion.ts                   ← parent registration wrapper
├── ui-accordion.styles.ts
├── ui-accordion.schema.ts
├── ui-accordion.html                 ← dev demo page
├── ui-accordion-item-element.ts      ← structural child
├── ui-accordion-item.ts
├── ui-accordion-item.styles.ts
├── ui-accordion-trigger-element.ts   ← interactive child
├── ui-accordion-trigger.ts
├── ui-accordion-trigger.styles.ts
├── ui-accordion-content-element.ts   ← content child
├── ui-accordion-content.ts
└── ui-accordion-content.styles.ts
```

### 9.2 Family Barrel

```ts
// Children registered FIRST, parent LAST
import './ui-accordion-content.ts';
import './ui-accordion-trigger.ts';
import './ui-accordion-item.ts';
import './ui-accordion.ts';

export { UIAccordionContent } from './ui-accordion-content.ts';
export { UIAccordionTrigger } from './ui-accordion-trigger.ts';
export { UIAccordionItem } from './ui-accordion-item.ts';
export { UIAccordion } from './ui-accordion.ts';
```

**Why children first:** When the parent's `setup()` queries for child elements, those children need to already be defined as custom elements. Otherwise they're still `HTMLElement` instances and don't have the expected properties/methods.

### 9.3 Parent-Child Coordination

**Direction: Parent reaches down.** The parent coordinator queries children and sets their properties:

```ts
// Inside parent accordion's setup():
this.addEffect(() => {
  const expanded = this.#expandedSet.value;
  const items = this.querySelectorAll(':scope > ui-accordion-item');

  for (const item of items) {
    const isExpanded = expanded.has(item.value);
    item.expanded = isExpanded;           // Parent pushes state DOWN

    const trigger = item.querySelector('ui-accordion-trigger');
    if (trigger) {
      trigger.expanded = isExpanded;
      trigger.setAttribute('aria-controls', content.id);
    }
  }
});
```

**Children never query their parent.** A child item doesn't call `this.closest('ui-accordion')` to determine its own state. The parent owns the truth and distributes it.

**Events bubble up.** Child triggers dispatch `ui-press` (via the Pressable trait). The parent listens for this event, identifies which item it came from, and updates the expanded set.

### 9.4 ARIA Cross-References

Auto-generate IDs on children that don't have explicit IDs:

```ts
#ensureIds(): void {
  const items = this.querySelectorAll(':scope > ui-accordion-item');
  for (const item of items) {
    const trigger = item.querySelector('ui-accordion-trigger');
    const content = item.querySelector('ui-accordion-content');
    if (trigger && !trigger.id) trigger.id = uid('accordion-trigger');
    if (content && !content.id) content.id = uid('accordion-content');
  }
}
```

Then wire cross-references in the sync effect:
- `trigger.setAttribute('aria-controls', content.id)`
- `content.setAttribute('aria-labelledby', trigger.id)`

---

## 10. File Structure & Naming

### 10.1 Directory Layout

```
src/
├── reactivity/           ← Signal system (zero DOM dependencies)
│   ├── signal.ts
│   ├── types.ts
│   └── index.ts
├── core/                 ← UIElement, css, define, context, effects, uid, registry
│   ├── ui-element.ts
│   ├── css.ts
│   ├── define.ts
│   ├── context.ts
│   ├── effects.ts
│   ├── sheet-registry.ts
│   ├── uid.ts
│   └── index.ts
├── traits/               ← Behavioral mixins
│   ├── pressable.ts
│   ├── dismissable.ts
│   ├── roving-focusable.ts
│   ├── focus-trappable.ts
│   ├── types.ts
│   └── index.ts
├── controllers/          ← Pure JS stores and controllers
│   ├── combobox-store.ts
│   └── select-controller.ts
├── styles/               ← CSS design system (already implemented)
│   ├── index.css                ← Import order (layer cascade — do NOT reorder)
│   ├── colors.primitives.css    ← @layer colors: env params, OKLCH ramps, scrims
│   ├── colors.tokens.css        ← @layer tokens: semantic UI tokens (ground, ink, stroke, surface, outline)
│   ├── themes.css               ← Theme presets (unlayered, :where([theme="..."]))
│   ├── ui.primitives.css        ← @layer ui: public scales, attribute selectors (size/density/radius/intent/variant)
│   ├── ui.button.css            ← @layer ui: button component
│   ├── colors.ts                ← Constructable StyleSheet for Shadow DOM adoption
│   └── icons.ts                 ← 30 SVG icon sprites (currentColor, stroke style)
├── components/           ← All UI components
│   ├── ui-button/
│   ├── ui-accordion/
│   ├── ui-combobox/
│   └── ...
└── index.ts              ← Library barrel
```

### 10.2 Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Custom element tag | `ui-{name}` (kebab-case) | `ui-button`, `ui-accordion-item` |
| Element class | `UI{Name}` (PascalCase) | `UIButton`, `UIAccordionItem` |
| Element file | `ui-{name}-element.ts` | `ui-button-element.ts` |
| Registration wrapper | `ui-{name}.ts` | `ui-button.ts` |
| Stylesheet file | `ui-{name}.styles.ts` | `ui-button.styles.ts` |
| Stylesheet export | `{name}Sheet` | `buttonSheet`, `accordionSheet` |
| Store class | `{Name}Store` | `ComboboxStore` |
| Controller class | `{Name}Controller` | `SelectController` |
| Factory function | `create{Name}Store/Controller` | `createComboboxStore()` |
| Trait function | `{TraitName}` (PascalCase) | `Pressable`, `Dismissable` |

**Never abbreviate:** `ui-button` not `ui-btn`. `ui-accordion` not `ui-accord`.

### 10.3 Library Barrel Imports

The top-level `src/index.ts` imports from `-element.ts` files (not `.ts` wrappers):

```ts
export { UIButton } from '@/components/ui-button/ui-button-element.ts';
export { buttonSheet } from '@/components/ui-button/ui-button.styles.ts';
```

This ensures importing the library doesn't trigger side-effect registrations.

---

## 11. Event System

### 11.1 Event Naming

All component events use the `ui-` prefix:

| Event | Dispatched by | Detail | Cancelable |
|-------|--------------|--------|------------|
| `ui-press` | Pressable trait | `{ pointerType }` | No |
| `ui-change` | Select, combobox, accordion, tabs | `{ value, label }` | Yes |
| `ui-input` | Input (on every keystroke) | `{ value }` | No |
| `ui-dismiss` | Dismissable trait | — | No |
| `ui-disabled` | Disabled effect | `{ disabled }` | No |
| `ui-open` | Dialog, accordion item | — | No |
| `ui-close` | Dialog, accordion item | — | No |
| `ui-select` | Listbox (internal) | `{ value, label }` | No |

### 11.2 Event Conventions

```ts
// Standard event dispatch
this.dispatchEvent(new CustomEvent('ui-change', {
  bubbles: true,      // Always
  composed: true,     // Always (crosses shadow boundaries)
  cancelable: true,   // Only for events that can be prevented
  detail: { value, label },
}));
```

**Cancelable events:** Dispatch BEFORE committing the state change. Check `event.defaultPrevented` after dispatch. If prevented, abort the mutation:

```ts
const event = new CustomEvent('ui-change', { bubbles: true, composed: true, cancelable: true, detail });
this.dispatchEvent(event);
if (event.defaultPrevented) return;  // Consumer vetoed the change
this.#value.value = newValue;        // Commit only if not prevented
```

### 11.3 Never Use Classes for State

```ts
// ✅ Correct
this.toggleAttribute('disabled', val);
this.toggleAttribute('open', isOpen);
this.toggleAttribute('pressed', true);

// ❌ Wrong
this.classList.add('disabled');
this.classList.toggle('open');
this.className = 'pressed';
```

Attributes are semantic, inspectable in devtools, and work with CSS attribute selectors. Classes are presentation concerns. Component state is always expressed via attributes.

### 11.4 No `data-*` Attributes for State

```ts
// ✅ Correct: plain attributes
this.toggleAttribute('active', true);
this.setAttribute('size', 'lg');

// ❌ Wrong: data attributes
this.dataset.active = 'true';
this.setAttribute('data-size', 'lg');
```

Exception: `data-*` is acceptable for third-party integration or genuine arbitrary data storage.

---

## 12. Form Association

### 12.1 Static Flags

```ts
class UIButton extends Pressable(UIElement) {
  static formAssociated = true;
  // ...
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'button';
  }
}
```

### 12.2 ElementInternals Usage

| Purpose | API |
|---------|-----|
| ARIA role | `this.#internals.role = 'button'` |
| ARIA state | `this.#internals.ariaExpanded = 'true'` |
| ARIA label proxy | `this.#internals.ariaLabel = val` |
| Form value | `this.#internals.setFormValue(val)` |
| Form reference | `this.#internals.form` |
| Validation | `this.#internals.setValidity(...)` |

### 12.3 Form Lifecycle Callbacks

```ts
formDisabledCallback(disabled: boolean): void {
  this.#disabled.value = disabled;  // Sync fieldset disabled state
}

formResetCallback(): void {
  this.#value.value = this.getAttribute('value') ?? null;  // Restore initial
  this.#disabled.value = this.hasAttribute('disabled');
}
```

### 12.4 Form Submission

For button-type elements, handle `type="submit"` and `type="reset"` in the press handler:

```ts
#onPress = (): void => {
  const form = this.#internals.form;
  if (!form) return;

  if (this.#type.value === 'submit') {
    form.requestSubmit();  // Triggers validation + submit event
  } else if (this.#type.value === 'reset') {
    form.reset();
  }
};
```

---

## 13. Accessibility Contracts

### 13.1 Required ARIA for Every Component Type

| Component type | Role | Required ARIA |
|---------------|------|---------------|
| Button | `button` | `aria-pressed` (if toggle), `aria-disabled`, `aria-label` (icon-only) |
| Checkbox | `checkbox` | `aria-checked`, `aria-disabled` |
| Select/Combobox | `combobox` | `aria-expanded`, `aria-haspopup`, `aria-controls`, `aria-activedescendant` |
| Listbox | `listbox` | `aria-orientation` |
| Option | `option` | `aria-selected`, `aria-disabled` |
| Accordion trigger | `button` | `aria-expanded`, `aria-controls` |
| Accordion content | `region` | `aria-labelledby` |
| Tab | `tab` | `aria-selected`, `aria-controls` |
| Tab panel | `tabpanel` | `aria-labelledby` |
| Dialog | `dialog` | `aria-labelledby`, `aria-modal` |

### 13.2 Focus Management Rules

| Pattern | Implementation |
|---------|---------------|
| Focusable components | `tabindex="0"` by default, `tabindex="-1"` when disabled |
| Composite widgets | Roving tabindex — container is focusable, arrow keys navigate items |
| Modal dialogs | Focus trap — Tab wraps between first/last focusable, focus restored on close |
| Popovers/dropdowns | Focus the first item on open, restore focus to trigger on close |

### 13.3 Keyboard Contracts

| Key | Button | Checkbox | Select | Combobox | Accordion | Tabs |
|-----|--------|----------|--------|----------|-----------|------|
| Enter | Activate | Toggle | Open | Select highlighted / Open | Toggle | — |
| Space | Activate | Toggle | Open | Open | Toggle | Select |
| Escape | — | — | Close | Close | — | — |
| ArrowDown | — | — | Open/Navigate | Navigate | Next trigger | — |
| ArrowUp | — | — | Open/Navigate | Navigate | Prev trigger | — |
| ArrowLeft | — | — | — | — | — | Prev tab |
| ArrowRight | — | — | — | — | — | Next tab |
| Home | — | — | First | First | First trigger | First tab |
| End | — | — | Last | Last | Last trigger | Last tab |

### 13.4 Forced Colors & Reduced Motion

Every component stylesheet MUST include:

```css
@layer ui {
  @media (prefers-reduced-motion: reduce) {
    :where(ui-component) {
      --_duration: 0s;
    }
  }

  @media (forced-colors: active) {
    :where(ui-component) {
      /* Use system colors: Field, FieldText, ButtonBorder,
         ButtonText, GrayText, Highlight, etc. */
    }
  }
}
```

---

## 14. Testing Contracts

### 14.1 Reactive System Tests

Test these specific behaviors:

| Category | Cases |
|----------|-------|
| Signal basics | Initial value, update, peek without tracking, `Object.is` equality |
| Computed | Lazy evaluation, caching, chain propagation, peek behavior |
| Effect | Immediate execution, re-run on change, dispose stops tracking, stale dependency cleanup |
| Batch | Deferred execution, single run for multiple writes, nested batches, flush-triggered writes |
| Diamond dependency | Consistent computed values, single effect run with batch, double-fire without batch |
| Re-entrance guard | Self-write in effect is fire-and-forget, no infinite loop |
| Nested effects | Inner effects are independent, manual dispose prevents leaks |
| Cycle detection | Circular computed throws with diagnostic message |
| Flush limit | 100-iteration limit throws on infinite write→effect→write cycles |
| GC safety | Disposed effects don't retain signal references, multiple dispose is safe |

### 14.2 Component Tests

| What to test | How |
|-------------|-----|
| Attribute → signal sync | Set attribute, verify property and DOM state |
| Property → attribute reflection | Set property, verify attribute |
| Effect-driven DOM updates | Change signal, verify attribute/textContent/ARIA |
| Event dispatch | Simulate interaction, verify event detail and cancelation |
| Form integration | Verify `formDisabledCallback`, `formResetCallback`, form value |
| Parser timing | Create element via HTML string, verify `deferChildren` works |
| Disconnect cleanup | Remove element, verify effects are disposed, no zombie callbacks |
| Reconnect | Remove and re-add, verify `setup()` runs fresh |

### 14.3 Store/Controller Tests

Stores are tested in pure JS without DOM:

```ts
const store = createComboboxStore();
store.setOptions([
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]);

store.setQuery('ap');
expect(store.filtered.value).toEqual([{ value: 'a', label: 'Apple' }]);

store.moveActive(1);
expect(store.activeOption.value).toEqual({ value: 'a', label: 'Apple' });

store.selectActive();
expect(store.value.value).toBe('a');
expect(store.open.value).toBe(false);
```

### 14.4 Context Tests

```ts
const provider = document.createElement('div');
// Apply ContextProvider mixin, call provideContext('key', value)

const consumer = document.createElement('div');
// Apply ContextConsumer mixin

provider.appendChild(consumer);
document.body.appendChild(provider);

consumer.requestContext('key');
expect(consumer.getContext('key')).toBe(value);
```

---

## 15. Known Pitfalls & Edge Cases

### 15.1 Reactive System

| Pitfall | Description | Mitigation |
|---------|-------------|------------|
| **Nested effect leak** | Creating `effect()` inside another `effect()` leaks — inner is never auto-disposed when outer re-runs | Manually dispose previous inner before creating new one, or use `addEffect()` at the component level |
| **Diamond double-fire** | Without `batch()`, a diamond graph fires effects twice with inconsistent intermediate state | Use `batch()` when writing to multiple signals derived from a common source |
| **Self-write in effect** | Effect writes to a signal it reads — the notification is silently dropped by the `_running` guard | Intentional. The signal holds the written value, but the effect won't re-run to see it. Use `batch()` to defer if re-run is needed |
| **Notify iteration mutation** | Spread `_subs` to snapshot before iterating — cleanup + re-subscribe during effect execution mutates the set | Always `[...source._subs]` before the `for` loop |

### 15.2 Component Lifecycle

| Pitfall | Description | Mitigation |
|---------|-------------|------------|
| **Parser timing** | `connectedCallback` fires before children are parsed | Always use `deferChildren()` for child queries |
| **Attribute setter loops** | Property setter calls `setAttribute`, which fires `attributeChangedCallback`, which writes to signal | Guard: `if (this.getAttribute(name) !== val)` before `setAttribute` |
| **Stale child refs after disconnect** | Child element references (`#popover`, `#listbox`) persist after `disconnectedCallback` | Null out in `teardown()`, re-query in next `setup()` |
| **rAF after disconnect** | `requestAnimationFrame` callbacks fire after element is removed from DOM | Track pending frame handles, cancel in `teardown()` |
| **Popover toggle timing** | Native popover `toggle` event fires asynchronously (coalesced per spec) | Set `#open` signal synchronously in `show()`/`hide()` methods, not in the toggle event handler |

### 15.3 CSS

| Pitfall | Description | Mitigation |
|---------|-------------|------------|
| **Import order in `index.css`** | The 3-layer cascade (`colors → tokens → ui`) depends on exact import order | Never reorder imports in `index.css`. New component files go after `ui.primitives.css` |
| **Sheet adoption order** | At `:where()` zero specificity, later sheet wins. Dependency sheets must be adopted before component sheet | Use `static dependencies = [depSheet]` — `defineWithStyles` adopts them first |
| **`replaceSync` silent failures** | Invalid CSS is silently dropped with zero rules | Dev-mode warning in `css` tagged template when input > 10 chars produces 0 rules |
| **Top-layer popover tokens** | CSS custom properties don't inherit into the top layer; the popover is painted at the document root | Forward `[size]` and other attributes to elements inside the popover; include `light-dark()` fallbacks for overlay components |
| **Theme unlayered placement** | `themes.css` is intentionally NOT in a `@layer` — placing it in a layer changes cascade behavior | Keep theme selectors unlayered; they use `:where()` for zero specificity |

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| **Signal** | Mutable reactive cell — reads track, writes notify |
| **Computed** | Lazy derived value — dirty flag + pull-on-read |
| **Effect** | Side-effect function that auto-re-runs when dependencies change |
| **Batch** | Coalesces signal writes; effects flush once at the end |
| **Untrack** | Reads signals inside a function without subscribing |
| **UIElement** | Base class for all custom elements in the system |
| **Trait** | TypeScript mixin that adds reusable behavior (Pressable, Dismissable, etc.) |
| **Store/Controller** | Pure JS object with signals + computed + actions — no DOM |
| **Context** | Event-based ancestor→descendant data passing protocol |
| **Domain Panel** | Custom element that bridges application stores to generic UI components via context |
| **Light DOM** | Components render without Shadow DOM — styles via `adoptedStyleSheets` |
| **`:where()` wrapper** | Zero-specificity CSS selector — layer order determines cascade |
| **`defineWithStyles`** | Registration function — adopts styles, then defines the custom element |
| **Element split** | `-element.ts` (pure class) + `.ts` (registration side-effect) |
| **Family barrel** | `index.ts` in multi-element folder — imports children before parent |

---

**Version:** 1.1.0
