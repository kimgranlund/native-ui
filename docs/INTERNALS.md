# Internals

Base class, reactivity, build system, and testing for `@nonoun/native-ui`.

## NativeElement Base Class

`src/core/native-element.ts` -- extends `HTMLElement`. All components inherit from this.

**Lifecycle:** `setup()` runs on first `connectedCallback` (guarded against double-fire from DOM moves). `teardown()` runs on `disconnectedCallback` after all effects are disposed.

**`addEffect(fn)`** -- registers a reactive effect scoped to the element's lifetime. Disposers are stored internally and called on disconnect.

**`deferChildren(fn)`** -- runs `fn` immediately if children exist, otherwise defers to microtask. Effects that depend on child elements go inside `deferChildren`; effects that don't go outside it.

```ts
this.addEffect(() => this.syncPopover(this.#store.open.value));  // no child dependency
this.deferChildren(() => {
  this.addEffect(() => { /* queries children */ });
});
```

**`ready`** -- `Promise<void>` resolving after `setup()` + any `deferChildren` microtask. Use `await el.ready` instead of `whenDefined` + rAF hacks.

**`getTraitController<T>(name)`** -- retrieves a trait controller attached via the `traits` attribute. Returns `null` if none active.

**Trait protocol:** Elements with `traits="..."` get a `MutationObserver` that syncs controllers via the trait registry. Pending traits auto-initialize when `registerAllTraits()` runs.

## Signal System

`src/reactivity/` -- minimal push-pull reactive graph with five public functions.

| Function | Signature | Purpose |
|----------|-----------|---------|
| `signal` | `signal<T>(initial): Signal<T>` | Mutable reactive value (`.value` read/write) |
| `computed` | `computed<T>(fn): ReadonlySignal<T>` | Lazy derived value, recomputes when dirty |
| `effect` | `effect(fn): Dispose` | Auto-tracking side effect, re-runs on dependency change |
| `batch` | `batch(fn): void` | Groups writes; effects flush once at end |
| `untrack` | `untrack<T>(fn): T` | Read signals without creating dependencies |

```ts
interface Signal<T> { value: T; peek(): T; }       // peek() reads without tracking
interface ReadonlySignal<T> { readonly value: T; peek(): T; }
```

**Behaviors:** Same-value skip via `Object.is` (read an extra signal to force re-run). Auto-tracking rebuilds deps each run. Circular computed throws. Batch flush limit: 100 iterations.

**Debug:** `isSignal(v)`, `isComputed(v)` for type checks. `debugReactive(sig)` returns subscriber/dependency counts.

## Core Utilities

**`define(tag, class)`** (`src/core/define.ts`) -- idempotent `customElements.define()` wrapper. No side effects beyond registration.

**`createDisabledEffect(el, disabled, internals?, options?)`** (`src/core/effects.ts`) -- returns an effect function that toggles `[disabled]`, sets `aria-disabled` via `setAttribute()`, optionally manages `tabindex`, dispatches `native:disabled`.

**`FormAssociable(Base)`** (`src/core/form-associable.ts`) -- class mixin providing `onFormDisabled()`, `onFormReset()`, `onFormStateRestore()`. Must be a mixin (not controller) because the spec requires `static formAssociated = true`.

**`uid(prefix)`** (`src/core/uid.ts`) -- `crypto.randomUUID()`-based IDs (e.g., `uid('anchor')` -> `"anchor-a1b2c3d4"`). Used for anchor positioning and ARIA wiring.

## Top-Layer Architecture

**Principle: never append to `document.body`.** All overlays stay in their component's DOM context so CSS custom properties inherit normally. Visual promotion uses the platform's top-layer APIs:

| API | Usage | Elements stay in |
|-----|-------|-----------------|
| `[popover="manual"]` | Drag ghost, toast container, tooltip, resize handles | Host element |
| `<dialog>.showModal()` | n-dialog, n-drawer, PresentController | Host element (dialog created as child) |

Zero `document.body.appendChild()` calls in production code. No global z-index scale.

## Component File Pattern

```
src/components/foo/
  n-foo.css           -- CSS source of truth (@layer ui, :where() selectors)
  foo-element.ts      -- Element class (behavior only, no CSS imports)
  n-foo.ts            -- define('n-foo', NFoo)
  index.ts            -- Barrel exports
  n-foo.html          -- Demo page
  foo-controller.ts   -- Optional: simple reactive state
  foo-store.ts        -- Optional: complex reactive state
```

## Build System

**JS:** Vite 8 beta (Rolldown/OXC), library mode, ES format. `__DEV__` is dead-code-eliminated in production.

| Entry | Output | Content |
|-------|--------|---------|
| `src/index.ts` | `native-ui.js` | Components + traits + reactivity + core + icons |
| `src/kernel.ts` | `kernel.js` | Kernel + protocol |
| `src/traits-entry.ts` | `traits.js` | Trait controllers standalone |
| `src/register-all.ts` | `register-all.js` | All registrations |

Manual chunks: `core.js` (traits/core/registries/reactivity), `components.js`, `n-icon.js`.

**CSS:** `scripts/build-css.mjs` concatenates after Vite clears `dist/`. Foundation files load in cascade order (colors -> tokens -> themes -> base -> primitives). Components auto-discovered from `src/components/` and `src/containers/`. Outputs: `foundation.css`, `components.css`, `components-lean.css` (no `force-*` selectors), `native-ui.css`, `native-ui-lean.css`.

**Types:** `tsconfig.build.json` with `rewriteRelativeImportExtensions: true`. Build order: JS -> CSS -> types.

**TypeScript constraints:** `erasableSyntaxOnly` (no enums), `verbatimModuleSyntax` (`import type` required), `noUnusedLocals`/`noUnusedParameters` (prefix with `_`), no path aliases.

## Testing

Vitest + happy-dom. Each file needs `// @vitest-environment happy-dom`.

`src/test-setup.ts` stubs: `attachInternals()` (role, aria-*, validity), `setPointerCapture()`/`releasePointerCapture()`, `showPopover()`/`hidePopover()`. `elementFromPoint()` returns `null` -- pointer traits fall back to `e.target`.

```bash
npm test                                              # all
npx vitest run src/traits/__tests__/draggable.test.ts # single file
```

## Icon Codegen

`npm run generate:icons` reads `@phosphor-icons/core` SVGs -> `src/icons/phosphor/*.ts`. Two paths: `<n-icon name="house">` (registry) or `import { IconCaretDown }` (direct SVG string).

## Source Directories

| Path | Purpose |
|------|---------|
| `src/core/` | NativeElement, define, uid, context, effects, form-associable |
| `src/reactivity/` | signal, computed, effect, batch, untrack, debug |
| `src/registries/` | trait-registry, icon-registry, plugin-registry |
| `src/traits/` | 26 controllers + adapters |
| `src/components/` | Interactive components |
| `src/containers/` | Structural containers |
| `src/styles/` | Foundation CSS |
| `src/icons/` | Icon system + generated Phosphor modules |
| `src/kernel/` | Kernel + protocol (separate entry) |
| `scripts/` | build-css.mjs, generate-icons |
