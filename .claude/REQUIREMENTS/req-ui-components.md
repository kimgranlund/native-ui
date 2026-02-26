# UI Component Library — Architectural Rules

> **This document is the architectural declaration of intent for the component library. It is the canonical source of truth for every design decision, naming convention, structural pattern, and behavioral contract. All code — generated or hand-authored — must conform to these rules.**
>
> **Audience:** AI coding assistants, human contributors, code reviewers.
>
> Each rule is a **MUST** / **MUST NOT** / **SHOULD** / **SHOULD NOT** statement. Rules are grouped by architectural layer. Rationale follows each rule block where non-obvious.

---

## 0. First Principles

Every rule in this document derives from these five axioms. When rules conflict, resolve by returning to these principles.

### 0.1 The Platform Is the Framework

Custom Elements, CSS, HTML semantics, ARIA, and DOM events are the primitives. Never abstract over them — extend them.

### 0.2 Structurally Agnostic, State-Aware

Components know **WHAT** (state: selected, open, value) but never **HOW** (structure: who created the children, where data came from, which framework rendered the DOM).

### 0.3 Ownership Boundary

Consumers own the visual layer (CSS). The library owns the behavioral/accessibility layer (JS). The schema is the contract between them.

### 0.4 Progressive Enhancement

Components MUST render meaningful, accessible content before JavaScript loads. JS enhances — it does not create.

### 0.5 Composition Over Configuration

Complex patterns are assembled from independent primitives, not configured through prop explosions on monolithic components.

---

## 1. Language and Privacy Conventions

### 1.1 Private Fields and Methods

All private state and internal methods MUST use native private class fields and methods (`#`). MUST NOT use underscore-prefix (`_prop`, `_method()`) convention. MUST NOT use TypeScript `private` keyword.

```js
// ✅ Correct
#open = false;
#controller;
get #menu() { return this.querySelector('ui-menu'); }
#handleClick() { ... }

// ❌ Wrong
_open = false;
_handleClick() { ... }
private open = false;
```

**Rationale:** Native `#` fields are truly private at runtime. Underscore and TS `private` are conventions only — they leak in devtools and allow external access.

**Exception:** Lifecycle hook methods that subclasses MUST override (see rule 1.4) are public methods with plain names — they are part of the class contract, not private internals.

### 1.2 Lifecycle and Override Methods

Methods intended for subclass override MUST use plain public names without any prefix. These are part of the class's extension contract.

```js
// ✅ Correct — public lifecycle hooks
setup() { ... }         // called by connectedCallback
teardown() { ... }      // called by disconnectedCallback

// ❌ Wrong — underscore "protected" convention
_setup() { ... }
_teardown() { ... }
```

The base class `UIElement` defines these lifecycle hooks:

| Method | Called by | Purpose |
|--------|-----------|---------|
| `setup()` | `connectedCallback()` | Child discovery, event wiring, effect creation |
| `teardown()` | `disconnectedCallback()` | Cleanup (handled automatically by base class for effects) |

**Rationale:** These methods are not private — they are the public extension API of the base class. Underscore-prefix implies "don't call from outside" but subclasses *must* override them. Plain names make the contract explicit.

### 1.3 Unique Identifiers

When a component needs a unique ID that is not human-readable (ARIA relationships, label-to-input wiring, internal bookkeeping), MUST use `crypto.randomUUID()`.

```js
// ✅ Correct
const id = crypto.randomUUID();

// ❌ Wrong
const id = `ui-${counter++}`;
const id = Math.random().toString(36).slice(2);
```

**Rationale:** `crypto.randomUUID()` is spec-standard, collision-proof, and available in all modern runtimes including workers and SSR environments (Node 19+).

### 1.4 Static Class Fields for Component Metadata

Component metadata (sheet, sheetId, dependencies, managed children selectors) MUST be declared as static class fields.

```js
// ✅ Correct
static sheet = buttonSheet;
static managedChildren = 'ui-tab';

// ❌ Wrong
UIButton.sheet = buttonSheet; // assigned after class
```

---

## 2. Schema Layer

### 2.1 Schema as Source of Truth

Every component MUST have a schema definition. The schema generates: TypeScript interfaces, component token CSS blocks, Storybook ArgTypes, ARIA role assignments, and documentation.

Code MUST NOT hand-maintain artifacts that the schema can generate.

### 2.2 Schema Shape

Schemas MUST declare:

- **Tag name**
- **Props** — with type, default, enum where applicable, and whether the prop reflects to an attribute
- **Slots** — with accepted children and min/max constraints
- **Events** — with detail type
- **Commands** — custom `--` prefixed actions the component handles, with descriptions
- **ARIA mapping** — role, child role

### 2.3 Prop Reflection

Props that affect CSS styling or ARIA state MUST reflect to attributes. Props that carry complex data (objects, arrays, functions) MUST NOT reflect — they are JS-only properties.

---

## 3. Element Layer — Custom Elements

### 3.1 Base Class

All components MUST extend `UIElement`, which itself extends `HTMLElement`. `UIElement` provides: style root resolution, sheet adoption, reactive effect lifecycle management, and the `setup()` lifecycle hook.

### 3.2 Light DOM by Default

Components MUST render to Light DOM. Shadow DOM is permitted ONLY for:

- Isolation shells (3rd-party embed wrappers)
- Components with complex slotting requirements (dialog surfaces)

When Shadow DOM is used, it MUST be explicitly justified in a code comment.

**Rationale:** Light DOM enables consumer CSS to style components using the same cascade they use for everything else. Shadow DOM creates encapsulation barriers that fight customizability.

### 3.3 No Internal Native Form Elements

Components MUST NOT create or contain internal native `<button>`, `<input>`, `<select>`, or `<textarea>` elements.

Instead, components that participate in forms MUST use:

- `static formAssociated = true;`
- `ElementInternals` via `this.attachInternals()`
- `internals.setFormValue()` for form participation
- `internals.setValidity()` for constraint validation
- `internals.states` for custom states (e.g. `:state(checked)`)
- `internals.role`, `internals.ariaLabel`, etc. for ARIA

```js
// ✅ Correct
class UIInput extends UIElement {
  static formAssociated = true;
  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'textbox';
  }
}

// ❌ Wrong
class UIInput extends UIElement {
  setup() {
    this.innerHTML = '<input type="text" />';
  }
}
```

**Rationale:** Internal native elements create a11y confusion (double-announced roles), break ARIA ownership, and make the component's external API inconsistent with its internal structure. `FormAssociated` + `ElementInternals` is the platform solution for custom form controls.

**Exception — non-form native elements (A1, D124):** A component MAY create an internal `<dialog>` element when it provides irreplaceable platform behavior (top-layer rendering, `::backdrop`, `showModal()` inert isolation, focus trapping). The prohibition applies to **form control** elements that would conflict with `ElementInternals`. The component MUST still extend `UIElement` (not `HTMLDialogElement`) and MUST NOT expose the internal element in its public API.

### 3.4 Registration

Components MUST be registered via `defineWithStyles(tag, Class)`, NOT via direct `customElements.define()`. This ensures styles are adopted into the document BEFORE any instance is constructed.

### 3.5 Constructor Rules

`constructor()` MUST only:

- Call `super()`
- Attach `ElementInternals` (if form-associated)
- Attach `ShadowRoot` (if justified per rule 3.2)
- Initialize private field defaults

`constructor()` MUST NOT:

- Access or query children or parent
- Set attributes
- Dispatch events
- Adopt stylesheets (handled by `defineWithStyles`)

**Rationale:** Per spec, the element has no DOM context in `constructor()`. Styles are adopted at registration time, which precedes any constructor call.

### 3.6 Lifecycle

`connectedCallback()` MUST:

- Call `super.connectedCallback()` (for trait chaining)
- Perform shadow-root style correction (if in a foreign shadow root, adopt sheets there)
- Call `this.setup()`

`disconnectedCallback()` MUST:

- Call `super.disconnectedCallback()` (for trait cleanup)
- Dispose all reactive effects (handled automatically by `UIElement` base class)
- Remove document-level event listeners
- Disconnect MutationObservers
- Unsubscribe from controllers

### 3.7 State Synchronization

Component state MUST be synchronized to the DOM exclusively through attributes and `ElementInternals` custom states. Components MUST NOT use `classList`, inline styles, or direct DOM manipulation to express state.

**Exception — `style.setProperty()` for CSS custom properties (A2, D118):** `style.setProperty()` is permitted for exactly two cases:

1. **JS-driven runtime values** — Private `--_` tokens that cannot be expressed in CSS alone (e.g., `--_progress` on `ui-range`, driven by signal-computed values).
2. **Top-layer theme propagation** — Popover and dialog elements in the top layer do not inherit CSS custom properties from ancestors in some browsers. Reading computed values from the nearest `ui-provider` and applying them as inline `--ui-*` overrides before showing is a documented browser workaround, not a styling pattern.

In both cases, the inline style sets a **CSS custom property**, never a direct CSS property like `display` or `color`.

A component has exactly **three communication channels**:

| Direction | Channel | Purpose | Example |
|-----------|---------|---------|---------|
| **Inbound (state)** | Attributes | Describe what the component *is* | `open`, `value`, `disabled`, `size` |
| **Inbound (action)** | Commands | Tell the component what to *do* | `--play`, `--reset`, `show-modal` |
| **Outbound** | Events | Announce what *happened* | `ui-play`, `ui-select`, `ui-dismiss` |

Attributes and commands are complementary inbound channels. A command arrives (`--play`), the component transitions state, then an event goes out (`ui-play`). The invoker doesn't know the internal state change. The event listeners don't know what triggered the action.

```js
// ✅ Correct
this.toggleAttribute('open', this.#open);
this.setAttribute('aria-expanded', String(this.#open));
this.#internals.states.add('checked');

// ❌ Wrong
this.classList.add('is-open');
this.style.display = 'block';
```

**Rationale:** Attributes are visible in devtools, queryable via CSS selectors, and serializable. Class-based state is invisible to the styling contract.

### 3.8 Event Dispatch

Components MUST dispatch `CustomEvent`s for all public state transitions. Events MUST:

- Use the `ui-` prefix (`ui-press`, `ui-select`, `ui-dismiss`)
- Set `bubbles: true`
- Set `composed: true` (to cross shadow boundaries)
- Include meaningful `detail` where applicable

Components MUST NOT re-dispatch native events or capture and suppress native events without re-emitting them.

#### 3.8.1 Event Taxonomy

Events follow a consistent naming pattern: `ui-{verb}`. The verb describes the user action or state transition, not the component type.

**Standard Event Types:**

| Event | Trigger | Use Case | Detail |
|-------|---------|----------|--------|
| `ui-press` | Pointer/keyboard activation completes | Buttons, menu items, clickable elements | `{ pointerType?: string }` |
| `ui-input` | Value changes during editing | Text inputs, contenteditable, sliders during drag | `{ value: string \| number }` |
| `ui-change` | Value committed (editing ends) | Inputs on blur, select on selection, slider on release | `{ value: any, label?: string }` |
| `ui-select` | Item chosen from a list | Listbox, menu, combobox option selection | `{ value: string, label: string }` |
| `ui-dismiss` | Overlay/modal closed by user action | Popover light-dismiss, dialog Escape, click-outside | `{ reason?: string }` |
| `ui-open` | Overlay/expandable opened | Popover, dialog, accordion, disclosure | — |
| `ui-close` | Overlay/expandable closed | Popover, dialog, accordion, disclosure | — |
| `ui-toggle` | Boolean state flipped | Toggle, checkbox, switch | `{ checked: boolean }` |

**When to use each event:**

| Scenario | Event | Rationale |
|----------|-------|-----------|
| User types in an input | `ui-input` | Continuous feedback during editing |
| User tabs away from input | `ui-change` | Final committed value |
| User selects combobox option | `ui-change` | Value committed via selection |
| Listbox dispatches to parent | `ui-select` | Internal coordination event |
| User clicks a button | `ui-press` | Activation completed |
| User presses Escape on popover | `ui-dismiss` | User-initiated close |
| Popover opens programmatically | `ui-open` | State transition notification |

**Event flow in coordinator components:**

```
User clicks option in combobox listbox
  → ui-listbox dispatches `ui-select` (internal)
    → ui-combobox catches `ui-select`, commits value
      → ui-combobox dispatches `ui-change` (public)
```

**Rules:**

1. **`ui-input` vs `ui-change`**: `ui-input` fires on every keystroke/drag; `ui-change` fires once when editing completes. Never fire both for the same atomic action.

2. **`ui-select` vs `ui-change`**: `ui-select` is an internal coordination event between list components and their coordinators. The coordinator then fires `ui-change` as the public API. Consumers listen to `ui-change`, not `ui-select`.

3. **`ui-open`/`ui-close` vs `ui-dismiss`**: `ui-open`/`ui-close` notify of state changes regardless of cause. `ui-dismiss` specifically indicates user-initiated close (Escape, click-outside) — useful for "don't show again" patterns.

4. **Trait events**: Traits like `Pressable` dispatch `ui-press`. The component MAY re-dispatch as a domain-specific event (e.g., `ui-press` → `ui-submit` on a submit button) but MUST NOT suppress the trait event.

### 3.9 Child Discovery

When a component needs references to managed children, it MUST use `querySelector`/`querySelectorAll` scoped to `:scope >`. It MUST NOT assume children exist — all child references MUST be guarded.

**Exception — descendant selectors when justified (A3, D126, D127):** `:scope` (descendant, without `>`) is permitted when the component explicitly documents that standard HTML patterns create intermediate DOM levels between the component and its managed children. The component MUST document its child discovery contract in a WHY comment. Known case: `ui-radio-group` uses `:scope ui-radio` because `<label>` wrapping is a standard HTML pattern that creates a grandchild relationship.

`MutationObserver` SHOULD only be used for components where children are genuinely dynamic at runtime (filtered lists, dynamic tabs). For static structures (dropdown, dialog), discovery-on-demand at interaction time is sufficient.

### 3.10 Parent-Child Directionality

**Parents reach down. Children never reach up.**

A child component MUST function in complete isolation. If a parent coordinates children, the parent owns that logic. Children communicate upward exclusively via events.

```js
// ✅ Parent reaches down
this.querySelector(':scope > ui-tab')
  .setAttribute('aria-selected', 'true');

// ✅ Child communicates up via event
this.dispatchEvent(new CustomEvent('ui-select', {
  bubbles: true, composed: true
}));

// ❌ Child reaches up to parent
this.closest('ui-tabs').selectTab(this);
```

---

## 4. Style Layer — CSS Architecture

### 4.1 Color Format

All colors MUST use `oklch()` format. MUST NOT use hex, `rgb()`, `hsl()`, or named colors except within `forced-colors` media queries (where system colors like `HighlightText` are required).

```css
/* ✅ Correct */
color: oklch(55% 0.18 220);
background: oklch(0 0 0 / 0.06);

/* ❌ Wrong */
color: #3b82f6;
background: rgba(0, 0, 0, 0.06);
```

**Rationale:** OKLCH is perceptually uniform. Lightness steps produce visually consistent palettes. Hue and chroma are independently adjustable for accessible theming.

### 4.2 Token Hierarchy — Three Tiers

Tokens MUST be organized in exactly three tiers:

| Tier | Prefix | Scope | Purpose | Examples |
|------|--------|-------|---------|----------|
| **1. Public** | `--ui-*` (geometry), `--color-env-*` (color), `--{family}-*` (semantic color) | `:root` | Themeable scale definitions and color tokens. User-facing API. | `--ui-size-sm`, `--color-env-chroma`, `--accent-panel` |
| **2. Local** | `--_*` | Attribute selectors | Resolved by `[size]`, `[intent]`, `[variant]` selectors. Internal, inherited via DOM. Component-agnostic. | `--_min-height`, `--_background`, `--_ink` |
| **3. Component** | (none — reads locals) | Component selectors | Reads `--_*` locals directly. No intermediate composition layer. | `min-height: var(--_min-height)` |

Token flow: **public → local → component**. Never skip a tier. Components MUST NOT read public tokens or semantic color tokens directly — they read `--_*` locals. Local tokens are resolved by generic attribute selectors that work across all components.

```css
/* ✅ Correct — component reads locals */
:where(button) { min-height: var(--_min-height); background: var(--_background); }

/* ❌ Wrong — component reads public tokens directly */
:where(button) { min-height: var(--ui-size-md); background: var(--accent-surface); }
```

**Color token flow** has an additional tier — semantic color tokens in `@layer tokens` sit between environment parameters and locals:

```
@layer colors:  --color-env-* → --{family}-{step} (computed OKLCH ramps)
@layer tokens:  --{family}-{step} → --{family}-{role} (e.g. --accent-panel, --accent-ink)
@layer ui:      --{family}-{role} → --_* (intent selectors) → --_background/--_color/--_border-color (variant selectors)
```

**Rationale:** Generic attribute selectors (`[size]`, `[intent]`, `[variant]`) eliminate per-component token namespaces. A single `[size="sm"]` selector works for buttons, inputs, and all future components without registering per-component size variants. This means components are structurally agnostic about their own sizing — they inherit it from the DOM.

### 4.3 Public vs Private Custom Properties

The token system uses four prefixes:

| Prefix | Scope | Mutability | Examples |
|--------|-------|------------|----------|
| `--color-env-*` | `:root` / `[theme]` | Consumer-settable | `--color-env-chroma`, `--color-env-hue-accent` |
| `--{family}-*` | `:root` (computed) | Read-only (derived from env params) | `--accent-panel`, `--neutral-ink-hover` |
| `--ui-*` | `:root` | Consumer-settable | `--ui-size-sm`, `--ui-font-weight-button` |
| `--_*` | Attribute selectors | Library-internal | `--_min-height`, `--_background`, `--_ink` |

Consumers MUST only set `--color-env-*` and `--ui-*` tokens. `--{family}-*` tokens are computed. `--_*` tokens are library-internal.

```css
/* ✅ Consumer theming — override env params */
:root { --color-env-hue-accent: 155; }

/* ✅ Consumer sizing — override scale tokens */
:root { --ui-size-md: 2.5rem; }

/* ❌ Wrong — directly setting computed tokens */
:root { --accent-panel: oklch(90% 0.05 155); }

/* ❌ Wrong — directly setting internal locals */
button { --_min-height: 3rem; }
```

**Rationale:** The `--ui-` and `--color-env-` prefixes prevent collisions with consumer custom properties. `--_*` locals are the internal wiring — set by attribute selectors, consumed by components. There are exactly four prefixes to learn.

#### `--_` Local Token Convention

Local tokens (`--_*`) are the bridge between public tokens and component properties. They serve three purposes:

1. **Geometry resolution** — `[size]` selectors map public scale tokens to locals: `--_min-height: var(--ui-size-sm)`
2. **Color resolution** — `[intent]` selectors map semantic color tokens to role locals (`--_panel`, `--_ink`, etc.), then `[variant]` selectors map role locals to output locals (`--_background`, `--_color`, `--_border-color`)
3. **JS-driven runtime values** — values set via `style.setProperty()` (e.g. `--_progress`)

**Naming rules — locals MUST use full CSS property names:**

| Pattern | Use | Example |
|---------|-----|---------|
| `--_min-height` | Maps to CSS `min-height` | NOT `--_height`, `--_min-h`, `--_size` |
| `--_font-size` | Maps to CSS `font-size` | NOT `--_font`, `--_fs` |
| `--_letter-spacing` | Maps to CSS `letter-spacing` | NOT `--_tracking` |
| `--_background` | Maps to CSS `background` | NOT `--_bg` |
| `--_border-color` | Maps to CSS `border-color` | NOT `--_border` |
| `--_panel`, `--_ink`, `--_surface` | Color role intermediates (intent→variant chain) | Set by `[intent]`, consumed by `[variant]` |
| `--_space-k` | Density multiplier (no CSS property equivalent) | Acceptable non-property name |

#### Nested Element Token Overrides

When a parent component styles a nested child component, it SHOULD use attribute selectors to set `--_*` locals on the child, leveraging the existing generic selector system:

```css
/* ✅ Override via attributes — child inherits locals naturally */
<ui-combobox>
  <ui-option size="md">...</ui-option>
</ui-combobox>

/* ✅ Override child's locals when attributes don't suffice */
:where(ui-combobox) :where(ui-option) {
  --_font-size: var(--ui-font-md);
  --_min-height: var(--ui-size-md);
}

/* ❌ Bypass child's token system */
:where(ui-combobox) :where(ui-option) {
  font-size: var(--ui-font-md);
  height: var(--ui-size-md);
}
```

**Exception:** When the child needs structural overrides that don't map to the generic local token system (e.g. `ui-input` used as a ghost search field inside `ui-combobox`), direct property overrides are acceptable. Document the reason with a WHY comment.

### 4.4 Component CSS Naming

The CSS layer targets **two selector strategies** depending on the component's implementation stage:

| Stage | Selector pattern | Example |
|-------|-----------------|---------|
| **CSS-only** (current) | Native element + role + utility class | `:where(button, [role="button"], .ui-btn)` |
| **Custom Elements** (future) | Custom element tag | `:where(ui-button)` |

Both strategies follow the same rules:

- **Block** = the element tag or selector group
- **Element** = structural children selected via child combinators or `[slot]` attributes
- No class-based BEM. Selectors target tags and attributes.

```css
/* ✅ Correct — CSS-only stage */
:where(button, [role="button"], .ui-btn) { ... }
:where(button, [role="button"], .ui-btn) > :where([slot="leading"]) { ... }

/* ✅ Correct — Custom Element stage */
:where(ui-button) { ... }
:where(ui-dialog) > dialog[open] { ... }

/* ❌ Wrong */
.ui-button__label { ... }
.ui-dialog--open { ... }
```

### 4.4.1 Low-Specificity Selectors — `:where()`

ALL selectors — component, attribute, and child — MUST be wrapped in `:where()` to produce zero specificity. This ensures consumer CSS can override any library style without `!important` or specificity escalation, even within the same CSS layer.

```css
/* ✅ Correct — zero specificity */
:where(button, [role="button"], .ui-btn) { ... }
:where([size="sm"]) { ... }
:where([variant="primary"]) { ... }
:where(button):hover { ... }
:where(button):focus-visible { ... }

/* ❌ Wrong — non-zero specificity */
button { ... }
[size="sm"] { ... }
```

Pseudo-elements (`::before`, `::after`) MUST remain outside `:where()` (they cannot be inside it), but the rest of the selector MUST be wrapped.

**Rationale:** CSS layers already provide a gross ordering advantage for consumer styles (unlayered > layered). `:where()` adds fine-grained insurance: even if a consumer accidentally places styles in a library layer, they still win on specificity. The combination of layers + `:where()` makes `!important` truly unnecessary.

### 4.5 Scrim Backgrounds

Overlay and track backgrounds MUST use scrim tokens from `@layer colors` instead of inline oklch values. Scrims are semi-transparent per-family colors that adapt to any surface underneath and respond to `light-dark()`.

The color system provides three scrim token sets per family:

| Token pattern | Purpose | Example |
|---------------|---------|---------|
| `--{family}-{step}-scrim` | Semantic scrim at a ramp step (light-dark aware) | `--neutral-300-scrim` |
| `--{family}-scrim-tint-*` | Graduated tint from anchor toward lightness-max | `--accent-scrim-tint-weaker` |
| `--{family}-scrim-shade-*` | Graduated shade from anchor toward lightness-min | `--accent-scrim-shade-weaker` |

Components MUST reference semantic color tokens that resolve to scrims (e.g. `--{family}-stroke` resolves to a scrim ramp step) rather than inline `oklch()` values.

```css
/* ✅ Scrim via semantic token — adapts to family, scheme, and surface */
border-color: var(--_stroke-muted);   /* resolves to e.g. --neutral-200-scrim */

/* ✅ Direct scrim reference when no semantic role exists */
background: var(--neutral-scrim-tint-weaker);

/* ❌ Inline scrim — not theme-aware */
background: oklch(0 0 0 / 0.06);

/* ❌ Solid — only works on one surface */
background: oklch(95% 0 0);
```

### 4.6 Radius Derivation

Radius is managed through per-scale public tokens and the `[radius]` attribute:

```css
/* Per-scale defaults (on :root) */
--ui-radius-xs: 0.625rem;
--ui-radius-sm: 0.75rem;
--ui-radius-md: 0.75rem;
/* ... */
--ui-radius-sharp: 0.125rem;  /* constant across sizes */

/* Local resolved by [size] selector */
--_radius: var(--ui-radius-md);

/* Radius attribute overrides */
:where([radius="round"]) { --_radius: var(--_min-height); }  /* pill */
:where([radius="sharp"]) { --_radius: var(--ui-radius-sharp); }
```

Components MUST read `var(--_radius)` — never set radius directly. Pill-shaped elements use `radius="round"` which derives radius from height. Inner element radius subtraction, when needed, uses `calc(var(--_radius) - var(--_space))`.

### 4.7 Size Variants

Size variants (`xs`, `sm`, `md`, `lg`, `xl`) are resolved by **generic attribute selectors** — not per-component selectors. A single `:where([size="sm"])` rule sets all geometry locals for every component.

| Size | `--ui-size-*` | `--ui-font-*` | `--ui-tracking-*` | `--ui-space-*` | `--ui-radius-*` |
|------|---------------|---------------|-------------------|----------------|-----------------|
| `xs` | 1.25rem | 0.75rem | 0.01em | 0.1875rem | 0.625rem |
| `sm` | 1.75rem | 0.8125rem | 0.005em | 0.1875rem | 0.75rem |
| `md` | 2.25rem | 0.875rem | 0em | 0.25rem | 0.75rem |
| `lg` | 2.75rem | 0.9375rem | -0.005em | 0.25rem | 0.75rem |
| `xl` | 3.25rem | 1rem | -0.01em | 0.25rem | 0.75rem |

Each `[size]` selector sets six `--_*` locals simultaneously:

```css
/* ✅ Generic — works for ALL components */
:where([size="sm"]) {
  --_min-height: var(--ui-size-sm);
  --_font-size: var(--ui-font-sm);
  --_letter-spacing: var(--ui-tracking-sm);
  --_space: var(--ui-space-sm);
  --_radius: var(--ui-radius-sm);
  --_icon-size: var(--ui-icon-sm);
}

/* ❌ Per-component size selector — unnecessary */
:where(ui-button[size="sm"]) { --ui-button-height: var(--size-sm); }

/* ❌ Hard-coded values in component */
button[size="sm"] { height: 28px; font-size: 13px; }
```

Components inherit size automatically from the DOM — a `size="sm"` attribute on a parent element cascades to all children via CSS custom property inheritance.

**Space** follows a two-tier system: `xs`/`sm` share `0.1875rem`, `md`/`lg`/`xl` share `0.25rem`. This reduces 5 distinct values to 2 perceptually meaningful steps.

**Density** is an additional axis that scales horizontal spacing via a multiplier:

| Density | `--_space-k` | Effect |
|---------|-------------|--------|
| `loose` | 6 | `padding-inline: calc(var(--_space-k) * var(--_space))` |
| `default` | 4 | `padding-inline: calc(var(--_space-k) * var(--_space))` |
| `compact` | 2 | `padding-inline: calc(var(--_space-k) * var(--_space))` |

### 4.8 Color Scheme & Theme Support

Color scheme and theme are independent axes:

| Concept | What it controls | Mechanism | Example |
|---------|-----------------|-----------|---------|
| **Color scheme** | Light or dark appearance | `color-scheme` CSS property + `light-dark()` | `color-scheme: dark` on `:root` or any ancestor |
| **Theme** | Hue and chroma overrides for color families | `[theme]` attribute + `--color-env-*` overrides | `<html theme="forest">` |

Both can be combined: `<html theme="rose">` with `color-scheme: dark`.

#### Color scheme

MUST use `color-scheme: light dark` with `light-dark()` where supported. The semantic color ramp (`--{family}-050` through `--{family}-950`) uses `light-dark()` internally — all color tokens automatically adapt when `color-scheme` changes. MUST NOT use `@media (prefers-color-scheme)` blocks for individual values.

```css
/* ✅ Correct — color ramps use light-dark() internally */
--accent-050: light-dark(var(--accent-1), var(--accent-11));
--accent-950: light-dark(var(--accent-11), var(--accent-1));

/* ✅ Correct — toggle via color-scheme property */
:root { color-scheme: light dark; }  /* follows OS preference */
:root { color-scheme: dark; }        /* force dark */

/* ❌ Wrong — manual media queries for individual values */
@media (prefers-color-scheme: dark) { color: oklch(93% 0.02 260); }
```

**Rationale:** `light-dark()` respects the inherited `color-scheme` property, enabling nested color schemes without media query coupling.

#### Themes

A theme is a set of `:where([theme="name"])` selectors that override `--color-env-*` environment parameters (hue and chroma per family). Themes live in `themes.css` and are intentionally **unlayered** (not in `@layer`).

Themes MUST only override `--color-env-*` params — the entire palette recomputes automatically:

```css
/* ✅ Theme — overrides env params only, palette auto-derives */
:where([theme="forest"]) {
  --color-env-hue-neutral: 155;
  --color-env-chroma-neutral: 0.25;
  --color-env-hue-accent: 155;
  --color-env-chroma-accent: 1.0;
}
```

Current themes: `forest`, `rose`, `zinc`. Applied via HTML attribute: `<html theme="forest">`.

When `<ui-provider>` is implemented, themes will also be applicable on provider elements for nested theming.

**Rationale:** Themes and color schemes are orthogonal. A theme adjusts hue/chroma while `light-dark()` handles mode. Conflating them prevents independent control.

### 4.9 Token Scoping

The CSS-only foundation defines all tokens on `:root`. This is appropriate for a design system that owns the page.

When `<ui-provider>` is implemented (§8), tokens SHOULD migrate to provider scoping for multi-theme/multi-scheme scenarios. The CSS-only layer will remain as the `:root` default that `<ui-provider>` overrides.

```css
/* ✅ Current — CSS-only foundation on :root */
:root { --ui-size-md: 2.25rem; }

/* ✅ Future — provider scoping for nested themes */
ui-provider { --ui-size-md: 2.25rem; }
```

Multiple providers on the same page, with different themes or color schemes, MUST NOT conflict. This is already achievable via the `[theme]` attribute selector system — `<div theme="forest">` scopes its children without affecting siblings.

### 4.10 CSS Layers

The library MUST ship styles within `@layer` declarations. Layer order:

```css
@layer colors;   /* color primitives — env params, OKLCH ramps, scrims, aliases */
@layer tokens;   /* semantic color tokens — ground, ink, stroke, surface, outline */
@layer ui;       /* scales, attribute selectors, components */
```

**Three layers, not seven.** The `colors` layer computes the raw palette from environment parameters. The `tokens` layer maps palette values to semantic UI roles. The `ui` layer contains all geometry scales, attribute selectors (size/density/radius/intent/variant), and component styles.

Themes (`themes.css`) are intentionally **unlayered** — they use `:where([theme="..."])` selectors at the unlayered level so theme overrides sit outside the layer cascade.

Import order in `index.css` is critical and MUST NOT be reordered:

```
colors.primitives.css → colors.tokens.css → themes.css → ui.primitives.css → ui.{component}.css
```

Consumer (unlayered) CSS MUST automatically win over all library layers without needing `!important`.

### 4.11 Component CSS File Anatomy

Every component CSS file MUST be wrapped in `@layer ui { ... }` and follow this section order:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **LOCAL OVERRIDES** | Component-specific `--_*` overrides (e.g. `--_font-weight`, `--_line-height`) |
| 2 | **BASE LAYOUT** | Display, dimensions, positioning — reading `--_*` locals |
| 3 | **CHILDREN** | Structural child selectors (e.g. `[slot="leading"]`) |
| 4 | **PSEUDO-ELEMENTS** | Indicators, decorations |
| 5 | **STATE SELECTORS** | `:hover`, `:active`, `:focus-visible`, `:disabled` |
| 6 | **ICON-ONLY / SPECIAL MODES** | Layout collapse, conditional display |
| 7 | **ACCESSIBILITY** | `@media prefers-reduced-motion`, `@media forced-colors` |

Components do NOT have a PUBLIC API token section or SIZE VARIANTS section — sizes, intents, and variants are resolved by the generic attribute selectors in `ui.primitives.css`. Components just read the resulting `--_*` locals.

This ordering is mandatory. New developers must be able to open any component file and know exactly where to look.

**UA Style Overrides on Internal Native Elements (A9, D125):** When component CSS overrides properties on native elements used internally (e.g., `<dialog>`), it MUST NOT override **state-dependent UA properties** unconditionally. The UA stylesheet uses these properties to express element state (e.g., `display: none` on `<dialog>:not([open])`). An unconditional override makes the element permanently visible/active regardless of state.

```css
/* ✅ Correct — only override display when dialog is open */
:where(ui-dialog) > dialog[open] {
  display: grid;
  place-items: center;
}

/* ❌ Wrong — overrides UA display: none for closed dialogs */
:where(ui-dialog) > dialog {
  display: grid;
}
```

**Self-Contained Label Rendering (A10, D127):** Components that display label text alongside a visual indicator (checkbox, radio, toggle) SHOULD handle their own label layout via CSS flex + pseudo-elements. The element is the flex container; `::before` is the indicator; text content flows as a natural flex child.

```css
/* ✅ Self-contained — no external <label> needed for layout */
:where(ui-radio) {
  display: inline-flex;
  align-items: center;
  gap: var(--ui-radio-gap);
}

:where(ui-radio)::before {
  content: "";
  width: var(--_size);
  height: var(--_size);
  flex-shrink: 0;
  border-radius: var(--radius-full);
  border: 1px solid var(--ui-radio-border);
}
```

Consequences: state selectors (`:hover`, `[checked]`, `:focus-visible`) target `::before`, not the element. Focus ring wraps the indicator, not the full label. Size variants include gap and label font-size tokens alongside indicator dimensions.

### 4.12 Attribute Selectors Over `::part()`

CSS MUST use attribute selectors for state-driven styling. MUST NOT use `::part()` pseudo-elements.

```css
/* ✅ Attribute selector with :where() */
:where(ui-segment[aria-checked="true"]) { ... }

/* ❌ Part pseudo-element */
ui-segment::part(label) { ... }
```

**Rationale:** `::part()` only works across shadow boundaries and provides a limited, flat styling surface. Attribute selectors work in Light DOM, compose with specificity layers, and reflect real component state.

### 4.13 State-Driven Indicators

Sliding indicators (tabs, segmented controls) MUST use CSS `:has()` to detect state and set a `--_indicator-index` custom property. The indicator MUST be a `::before` or `::after` pseudo-element that transforms via `translateX`/`translateY` based on the index.

MUST NOT use JavaScript to set indicator position or inline transform styles.

### 4.14 Animation Tokens

Motion MUST use the shared public tokens:

| Token | Value | Use |
|-------|-------|-----|
| `--ui-duration` | `0.225s` | All transitions |
| `--ui-easing` | `cubic-bezier(0.2, 0, 0, 1)` | Standard deceleration curve |

Components read these via locals: `--_duration: var(--ui-duration)` and `--_easing: var(--ui-easing)`.

Additional easing curves MAY be added as `--ui-easing-*` tokens (e.g. `--ui-easing-spring` for bounce/overshoot) as components require them.

Pressed state feedback: `scale(0.97)` on indicator, `opacity: 0.8` on labels.

`@media (prefers-reduced-motion: reduce)` MUST disable or minimize all transitions and transforms.

`@media (forced-colors: active)` MUST provide visible boundaries using system colors (`Highlight`, `HighlightText`, `ButtonBorder`).

### 4.15 Constructable StyleSheets

All component CSS MUST be delivered as `CSSStyleSheet` objects. MUST NOT use `<style>` element injection (except SSR fallback).

Sheets MUST be declared using the `css` tagged template literal:

```js
import { css } from '../core/css.ts';

export const buttonSheet = css`@layer ui {
  :where(ui-button) {
    --_font-weight: var(--ui-font-weight-button);
    --_line-height: var(--ui-line-height-control);
    display: inline-grid;
    min-height: var(--_min-height);
  }
}`;
```

The `css` function creates a `CSSStyleSheet` via `new CSSStyleSheet()` + `replaceSync()` and returns it. This provides:

- CSS syntax highlighting in editors (tagged template recognition)
- Single expression per sheet (no intermediate variables)
- Runtime construction with zero build-step dependency

Sheets MUST be:

1. **Parsed at module load time** (top-level scope, via `css` tagged template)
2. **Stored as static class fields**
3. **Adopted at registration time** via `defineWithStyles()`

A singleton `SheetRegistry` MUST ensure each sheet is parsed exactly once and adopted into each root at most once.

### 4.16 Style Root Resolution

| Context | Adoption Target | Timing |
|---------|-----------------|--------|
| **1st party** (document) | `document.adoptedStyleSheets` | Registration time — zero FOUC |
| **3rd party** (shadow) | `shadowRoot.adoptedStyleSheets` | `connectedCallback()` — on first instance per root |

The component code MUST be identical in both modes. The only variable is the adoption target, resolved by `getRootNode()`.

### 4.17 Per-Component Files — No Monolithic Stylesheet

Each component MUST have its own CSS file. There MUST NOT be a single global `framework.css` containing all styles.

An `all.css` convenience bundle MAY be provided for rapid prototyping, but tree-shakeable per-component imports MUST be the primary distribution.

### 4.18 Top-Layer Token Fallbacks

Components rendered in the **top layer** (`<dialog>` via `showModal()`, `[popover]` via Popover API) can lose access to inherited CSS custom properties because the top layer is outside the normal DOM cascade. These components MUST include belt-and-suspenders fallback values for every token they consume.

```css
/* ✅ Overlay component — fallback protects against broken inheritance */
:where(ui-dialog) {
  background: var(--_background, var(--neutral-modal, light-dark(oklch(100% 0 0), oklch(22% 0.015 230))));
  color: var(--_color, var(--neutral-ink, light-dark(oklch(20% 0.02 230), oklch(93% 0.01 230))));
}

/* ❌ Non-overlay component — fallback is noise */
:where(button) {
  background: var(--_background, light-dark(oklch(100% 0 0), oklch(18% 0.015 230)));
}

/* ✅ Non-overlay component — reads locals without fallback */
:where(button) {
  background: var(--_background, transparent);
}
```

**Rule**: Components that render in the top layer MUST include fallback values. All other components MUST NOT.

**Applies to**: `ui-dialog`, `ui-popover`, `ui-tooltip`, `ui-select` (dropdown), `ui-combobox` (dropdown).

**WHY**: Fallback values use hardcoded hue `230` (the default `--color-env-hue-neutral`) because `var(--color-env-hue-neutral)` inside a fallback is circular — the fallback exists precisely because the token may not resolve. The hardcoded value matches the default theme. Non-default themes that change the hue will still resolve the primary token; the fallback is only reached if token inheritance is completely broken.

### 4.19 Color State System

The library uses a multi-layer color architecture driven by 9 environment parameters and 6 color families. All component stylesheets MUST reference `--_*` locals — never raw color tokens or inline `oklch()` values.

#### Layer 1: Color Primitives (`@layer colors`)

9 environment parameters (`--color-env-*`) control the entire palette. Per-family parameters define hue, chroma multiplier, and lightness anchor for each of 6 families: `neutral`, `accent`, `info`, `success`, `warning`, `danger`.

From these params, the system computes:
- **Raw solid ramp** (`--{family}-1` through `--{family}-11`) — mode-independent oklch values
- **Semantic solid ramp** (`--{family}-050` through `--{family}-950`) — `light-dark()` wrapped, inverts direction between modes
- **Raw scrim ramp** (`--{family}-1-scrim` through `--{family}-11-scrim`) — semi-transparent variants
- **Semantic scrim ramp** (`--{family}-050-scrim` through `--{family}-950-scrim`) — `light-dark()` wrapped
- **Elevation aliases** (`--{family}-lowest` through `--{family}-highest`) — 7 steps, same visual in both modes
- **Brightness aliases** (`--{family}-brightest` through `--{family}-dimmest`) — flip across modes
- **Scrim tint/shade palettes** (`--{family}-scrim-tint-strongest` through `weakest`, `--{family}-scrim-shade-strongest` through `weakest`)
- **Anchor alias** (`--{family}` = `--{family}-500`)

#### Layer 2: Semantic Role Tokens (`@layer tokens`)

Maps color primitives to 49 UI role tokens per family:

| Role | Tokens | Purpose |
|------|--------|---------|
| **Grounds** | `--{family}-doc/body/panel/control/card/modal` (× 4 states) | Background surfaces by elevation |
| **Ink** | `--{family}-ink` + `-strong/-muted/-placeholder/-hover/-active/-disabled` | Text/icons on grounds |
| **Stroke** | `--{family}-stroke` + `-muted/-hover/-active/-disabled` | Borders on grounds (scrim-based) |
| **Surface** | `--{family}-surface` + `-hover/-active/-disabled` | Interactive element fills |
| **Surface Ink** | `--{family}-surface-ink` + `-hover/-active/-disabled` | Text on surfaces (defaults to white) |
| **Outline** | `--{family}-outline` + `-muted/-hover/-active/-disabled` | Borders on surfaces |

Ground elevation order: doc (lowest/dimmest) → body → panel → control → card → modal (brightest).

#### Layer 3: Intent → Variant Resolution (`@layer ui`)

**Intent selectors** (`[intent="accent"]`, etc.) map family role tokens to generic `--_*` role locals:

```css
:where([intent="accent"]) {
  --_panel: var(--accent-panel);
  --_ink: var(--accent-ink);
  --_surface: var(--accent-surface);
  /* ... all role locals for all states */
}
```

**Variant selectors** then map role locals to output locals:

| Variant | `--_background` | `--_color` | `--_border-color` |
|---------|----------------|-----------|-------------------|
| `primary` | `--_surface` | `--_surface-ink` | transparent |
| `secondary` | `--_panel` | `--_ink` | `--_stroke-muted` |
| `default` | `--neutral-panel` (hard-coded) | `--_ink` | `--neutral-stroke-muted` (hard-coded) |
| `ghost` | transparent | `--_ink` | transparent |
| `outline` | transparent | `--_ink` | `--_stroke` |

All variants include `-hover`, `-active`, and `-disabled` state mappings.

**`variant="default"` intentionally hard-codes `--neutral-*`** for background and border. This is by design — neutral chrome with intent-colored text.

#### State Technique Taxonomy

Each component category uses a specific hover, pressed, focus, and disabled technique. These are not interchangeable — the technique is matched to the component's spatial context.

**Hover:** Components read `--_background-hover`, `--_color-hover`, `--_border-color-hover` — the variant selector determines what these resolve to (e.g. primary uses `--_surface-hover`, ghost uses `--_panel-hover`).

**Focus:** `outline: 2px solid var(--_outline)` — follows intent color via the intent→variant chain. Buttons use `outline-offset: 2px` (external ring). Inputs use `1px solid var(--_outline); outline-offset: 0` (border-highlight). Options/items use `outline-offset: -2px` (inset, inside container).

**Disabled:** `--_background-disabled`, `--_color-disabled`, `--_border-color-disabled` + `cursor: not-allowed` + `pointer-events: none`.

#### Button Hierarchy

Buttons use a 5-level visual weight system. Intent is a separate orthogonal axis:

| Rank | Variant | Background | Text | Border |
|------|---------|-----------|------|--------|
| 1 | `primary` | `--_surface` (intent-colored fill) | `--_surface-ink` (white) | none |
| 2 | `secondary` | `--_panel` (tinted fill) | `--_ink` (intent-colored) | `--_stroke-muted` |
| 3 | `default` | `--neutral-panel` (neutral fill) | `--_ink` (intent-colored) | `--neutral-stroke-muted` |
| 4 | `outline` | transparent | `--_ink` (intent-colored) | `--_stroke` |
| 5 | `ghost` | transparent | `--_ink` (intent-colored) | none |

Any variant can be combined with any intent (neutral, accent, info, success, warning, danger).

#### Checked/Selected Visual Tiers

Three tiers of selection emphasis, matched to control type:

| Tier | Components | Treatment |
|------|-----------|-----------|
| **Strong** | checkbox, radio, toggle | Fill indicator with `--_surface`, icon in `--_surface-ink` |
| **Medium** | option, segmented-control | `--_panel` background + `--_ink` text |
| **Subtle** | tab | Text color shift via `--_ink-muted` → `--_ink`, indicator bar in `--_surface` |

---

## 5. Behavior Layer — State, Interaction, Accessibility

### 5.1 Popover-Based Overlays

Tooltips, dropdown menus, combobox listboxes, and all non-modal overlays MUST use the **Popover API** with CSS `anchor()` positioning.

Simple trigger → popover relationships SHOULD use `commandfor`/`command` for declarative wiring without JavaScript:

```html
<!-- ✅ Preferred — declarative trigger via Invoker Commands -->
<button type="button" commandfor="file-menu" command="toggle-popover">
  File
</button>
<ui-menu id="file-menu" popover>
  <ui-menu-item value="new">New</ui-menu-item>
  <ui-menu-item value="open">Open</ui-menu-item>
</ui-menu>

<!-- ✅ Also correct — coordinator for complex multi-component patterns -->
<ui-combobox>
  <ui-input placeholder="Search..."></ui-input>
  <ui-popover>
    <ui-listbox>...</ui-listbox>
  </ui-popover>
</ui-combobox>
```

MUST NOT use:

- `position: absolute` + JavaScript `getBoundingClientRect()`
- Third-party positioning libraries (Floating UI, Popper)

**Rationale:** Popover API provides top-layer rendering (no z-index wars), light-dismiss behavior, accessibility announcements, and works with `anchor()` for pure-CSS positioning. This is the platform's answer — use it.

### 5.2 Dialog-Based Modals

All modal UI (confirmations, full-screen overlays, blocking interactions) MUST use `<dialog>` element patterns.

- MUST use `showModal()` for modal behavior (not `show()`)
- MUST use `<dialog>::backdrop` for overlay scrim
- MUST use `close` event for dismissal handling
- MUST NOT implement custom focus trapping (`<dialog>` provides it)
- MUST NOT implement custom inert behavior (`<dialog>` provides it)

Dialog open/close SHOULD use `commandfor`/`command` for declarative wiring without JavaScript:

```html
<!-- ✅ Preferred — zero JS needed for open/close path -->
<button type="button" commandfor="settings" command="show-modal">
  Open Settings
</button>
<dialog id="settings">
  <h2>Settings</h2>
  <!-- ... -->
  <button type="button" commandfor="settings" command="request-close">
    Close
  </button>
</dialog>

<!-- ❌ Wrong -->
Custom div-based modal with manual focus trap
```

**Internal `<dialog>` Pattern for Custom Elements (A5, D124, D125):**

When implementing `ui-dialog` as a custom element, the component uses an internal `<dialog>` element while extending `UIElement` (not `HTMLDialogElement`):

```
ui-dialog (UIElement)
  └── <dialog>          ← internal, created in setup()
       └── <div>        ← visual surface (border, bg, padding)
            └── …       ← consumer content (moved from host)
```

- `setup()` creates the internal `<dialog>` and surface `<div>`, moves consumer children into the surface
- `teardown()` moves children back to the host and removes the internal DOM
- CSS on the host uses `display: contents` — the host generates no box
- CSS on `dialog` resets UA styles and provides full-viewport grid centering
- CSS `display: grid` MUST only apply to `dialog[open]` — closed dialogs MUST respect the UA `display: none` (see §4.11 UA Style Overrides)

### 5.3 Controllers and Stores — Shared State Objects

When two or more components need to coordinate state (trigger ↔ menu, input ↔ listbox), a **Controller** or **Store** object MUST own the shared state.

Controllers/Stores MUST:

- Be plain JS objects (no DOM, no rendering)
- Expose state as signals (reactive atoms)
- Expose derived state as computed signals
- Mutate state via explicit action methods

Controllers/Stores MUST NOT:

- Query or manipulate the DOM
- Import or reference any component class
- Dispatch DOM events (components do that)
- Set attributes or call element methods

```js
// ✅ Correct — pure reactive state + actions
class SelectController {
  open = signal(false);
  value = signal(null);
  options = signal([]);

  // Derived
  selectedLabel = computed(() => {
    const val = this.value.value;
    return this.options.value.find(o => o.value === val)?.label ?? '';
  });

  // Actions
  toggle() { this.open.value = !this.open.value; }
  select(val) {
    this.value.value = val;
    this.open.value = false;
  }
}
```

Connected components create effects that read from controller signals. The effect system provides automatic subscription and disposal — no manual `subscribe(fn) → unsubscribe` wiring is needed.

A **Store** is a Controller with a larger state surface. Use the term "Controller" for simple coordination (2–3 signals) and "Store" for complex patterns (5+ signals with multiple derived values).

**Rationale:** Controllers/Stores are the portable behavioral core. They can drive Custom Elements, React components, tests, or a CLI — because they have zero DOM coupling. Signals make the reactivity automatic rather than manually wired.

### 5.4 Traits — Functional Mixins

Cross-cutting behaviors shared by unrelated components MUST be implemented as functional mixin functions.

```js
const Pressable = (Base) => class extends Base { ... }
const Dismissable = (Base) => class extends Base { ... }
```

Traits MUST:

- Call `super.connectedCallback()` and `super.disconnectedCallback()`
- Communicate outward via **plain attributes** (e.g., `pressed`, `dismissed`) — NOT `data-*` attributes
- Communicate upward via events (`ui-press`, `ui-dismiss`)
- Own their own cleanup in `disconnectedCallback`

Traits MUST NOT:

- Assume anything about the component they're mixed into
- Conflict with each other (no shared state names)

**Standard trait library (A6, D124):**

| Trait | Purpose | Status |
|-------|---------|--------|
| `Pressable` | Pointer/keyboard press tracking, `ui-press` event | Active — used by button, checkbox, toggle, radio, menu-item |
| `Dismissable` | Escape key + click-outside, `ui-dismiss` event | Active — used by popover-based overlays. NOT used by dialog (native `<dialog>` handles Escape via `cancel` event). |
| `Popoverable` | Full popover lifecycle (extends Dismissable): `wirePopover()`, `syncPopover()` | Active — used by select, combobox, command coordinators |
| `FocusTrappable` | Focus cycling within a container | Active — used for non-modal focus containment scenarios |
| `RovingFocusable` | Arrow-key focus within a group (roving tabindex) | Active — used by radio-group, menu, listbox |
| `Draggable` | Pointer-driven drag-and-drop with two modes (drop/slot) | Active — `DragController` handles ghost, placeholder, reorder/swap/replace semantics |
| `RangeSelectable` | Click-drag range selection with two modes (drag/click) | Active — `RangeSelectController` handles range computation, preview, commit |
| `Collapsible` | Animated expand/collapse with `interpolate-size` | Active — CSS-driven height animation with JS fallback |
| `Toastable` | Toast notification system with queue management | Active — auto-dismiss, stacking, dismiss individual/all |
| `Validatable` | Rule-based form validation with async support | Active — composable rule functions, error state management |
| `Resizable` | Pointer-driven resize handles with axis/min/max constraints | Active — `ResizeController` handles pointer capture and bounds |
| `Virtualizable` | Virtual scrolling for large lists | Active — `VirtualScrollController` manages viewport windowing and overscan |
| ~~`Anchorable`~~ | ~~Anchor-positioned relative to a trigger~~ | **Removed** — absorbed into `Popoverable`. Anchor wiring is a popover concern, not a cross-cutting trait. |

### 5.4.1 Trait Controller Extraction Pattern

Complex traits MUST extract their core logic into a **Controller** class that the trait instantiates. The controller owns pointer math, state tracking, and index computation. The trait owns DOM event wiring and attribute manipulation.

```js
// Controller — pure logic, no DOM
class DragController {
  #getItems;
  #dragItem = null;
  #startIndex = -1;

  constructor(getItems) { this.#getItems = getItems; }
  startDrag(item) { ... }
  updatePosition(x, y) { ... }
  endDrag() { ... }  // returns { item, fromIndex, toIndex, insertBefore }
}

// Trait — wires DOM events to controller
const Draggable = (Base) => class extends Base {
  #ctrl;
  setup() {
    super.setup?.();
    this.#ctrl = new DragController(() => this.querySelectorAll(this.dragSelector));
    this.addEventListener('pointerdown', (e) => { ... this.#ctrl.startDrag(item); });
  }
};
```

**Known trait controllers:**

| Trait | Controller | Responsibility |
|-------|-----------|----------------|
| `Draggable` | `DragController` | Ghost positioning, placeholder management, drop/slot index computation |
| `Resizable` | `ResizeController` | Axis-constrained resize math, min/max bounds |
| `RangeSelectable` | `RangeSelectController` | Range start/end tracking, selection state machine |
| `Virtualizable` | `VirtualScrollController` | Viewport windowing, overscan, scroll offset |

Controllers are testable in isolation — no DOM, no events, just method calls and return values.

### 5.5 Keyboard Navigation

All interactive components MUST be fully keyboard-operable. MUST follow WAI-ARIA Authoring Practices patterns for the relevant widget role.

Focus management MUST use roving tabindex (`tabindex` 0/−1) for composite widgets (menus, listboxes, radio groups). MUST NOT use sequential tab stops for items within a single widget.

### 5.6 Form Association

All form-participating components MUST use:

- `static formAssociated = true;`
- `this.attachInternals()` in constructor

| Method | Purpose |
|--------|---------|
| `internals.setFormValue()` | Form participation |
| `internals.setValidity()` | Constraint validation |
| `internals.states` | Custom states (`:state(checked)`) |

Components MUST implement these `ElementInternals` callbacks:

- `formResetCallback()` — MUST implement
- `formDisabledCallback(disabled)` — MUST implement

Components SHOULD implement these callbacks when a concrete use case exists (A7):

- `formAssociatedCallback(form)` — SHOULD implement (e.g., when the component needs to know which form it belongs to)
- `formStateRestoreCallback(state, mode)` — SHOULD implement (e.g., restoring state after browser back-forward navigation)

### 5.7 Invoker Commands

Components MUST support the Invoker Commands API (`command`/`commandfor`) as their declarative action interface. This provides a third inbound communication channel alongside attributes (state) and JS method calls (imperative).

#### Built-in commands

Components that wrap or extend `<dialog>` or `[popover]` elements MUST NOT re-implement the built-in command behaviors in JavaScript. The platform already handles these:

| Target | Built-in commands |
|--------|-------------------|
| `[popover]` | `toggle-popover`, `show-popover`, `hide-popover` |
| `<dialog>` | `show-modal`, `close`, `request-close` |

#### Custom commands

Components MAY define custom commands for domain-specific actions. Custom commands MUST use the `--` prefix (per spec).

Custom commands MUST be declared in the component's schema under a `commands` key.

```js
// Schema declaration
const VideoPlayerSchema = {
  tag: 'ui-video-player',
  // ... props, events, etc.
  commands: {
    '--play':         { description: 'Start playback' },
    '--pause':        { description: 'Pause playback' },
    '--seek-forward': { description: 'Seek forward 10s' },
    '--seek-back':    { description: 'Seek backward 10s' },
  }
};
```

#### Command handling pattern

Components MUST handle commands by listening for the `command` event on themselves. Handlers MUST be declared as a static or private `#commands` map for discoverability and consistency:

```js
class UIVideoPlayer extends UIElement {
  static sheet = videoPlayerSheet;

  #commands = {
    '--play':    () => this.play(),
    '--pause':   () => this.pause(),
    '--seek-forward': () => this.seek(10),
  };

  setup() {
    this.addEventListener('command', (e) => {
      const handler = this.#commands[e.command];
      if (handler) handler(e);
    });
  }
}
```

```html
<!-- Any button anywhere on the page can invoke the component -->
<button type="button" commandfor="player" command="--play">Play</button>
<button type="button" commandfor="player" command="--pause">Pause</button>
<ui-video-player id="player" src="video.mp4"></ui-video-player>
```

#### Command → state → event flow

A command MUST follow this lifecycle: inbound command → signal mutation → effects auto-sync DOM → outbound event. The component never exposes *how* the state change was triggered.

```
commandfor="player" command="--play"
  → CommandEvent fires on <ui-video-player>
    → handler calls this.play()
      → this.#playing.value = true           (signal mutation)
        → effect: this.toggleAttribute(...)  (auto DOM sync)
        → dispatches CustomEvent('ui-play')  (outbound event)
```

Whether the action was triggered by a `commandfor` button, a keyboard shortcut handler calling `player.play()`, or a controller calling the same method — the state transition and outbound event are identical. The component is agnostic to the invocation source.

#### Light DOM and ID refs

`commandfor` takes an ID ref, and ID refs do not cross shadow boundaries. This is naturally compatible with rule 3.2 (Light DOM by default) — component IDs are visible and referenceable. For 3rd-party shadow DOM isolation (rule 8.2), the emerging `reference-target` proposal will enable cross-shadow command targeting. Until then, the embed wrapper MUST relay commands manually if cross-boundary invocation is needed.

#### `popovertarget` as Interim (A13, D121)

Until the Invoker Commands API (`commandfor`/`command`) ships in 2+ browser engines, `popovertarget`/`popovertargetaction` is the platform mechanism for declarative popover triggering. Custom elements MUST implement this manually because only native `<button>` and `<input>` elements receive automatic `popovertarget` behavior.

Implementation pattern (from `ui-button`):
1. Observe `popovertarget` and `popovertargetaction` attributes
2. On `ui-press`, resolve the target element by ID via `document.getElementById()`
3. Call `togglePopover()`, `showPopover()`, or `hidePopover()` based on action
4. Skip form submission when `popovertarget` is set (per spec)

When Invoker Commands ship, `ui-button` should add `command`/`commandfor` support alongside (not replacing) `popovertarget`.

### 5.8 Reactive State — Signals

Component internal state MUST be managed using signals. Signals are the internal reactivity primitive that connects inbound channels (attributes, commands) to outbound channels (attribute reflection, events, ARIA updates).

**Signals are an internal implementation detail.** They MUST NOT appear in the component's public API. The public contract remains: attributes (inbound state), commands (inbound actions), events (outbound notifications). A component MUST be replaceable with an imperative implementation that has identical external behavior.

```js
// ✅ Correct — signals are internal, public API is attributes + events
class UIToggle extends UIElement {
  static sheet = toggleSheet;
  static formAssociated = true;

  #internals;
  #checked = signal(false);
  #disabled = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'switch';
  }

  // Public property API — reads from signal, no signal exposed
  get checked() { return this.#checked.value; }
  set checked(val) { this.#checked.value = Boolean(val); }
}
```

#### State declaration

All mutable internal state MUST be declared as `signal()` private fields at the top of the class body, grouped together:

```js
class UIDropdown extends Dismissable(UIElement) {
  // ═══ REACTIVE STATE ═══
  #open = signal(false);
  #value = signal(null);
  #disabled = signal(false);

  // ═══ DERIVED STATE ═══
  #ariaExpanded = computed(() => String(this.#open.value));

  // ... rest of class
}
```

#### Attribute → signal bridge

`attributeChangedCallback` is the bridge from external attribute mutations into the reactive graph. It MUST update signal values, never DOM directly:

```js
static observedAttributes = ['open', 'value', 'disabled'];

attributeChangedCallback(name, oldVal, newVal) {
  if (oldVal === newVal) return; // break potential cycles
  switch (name) {
    case 'open':     this.#open.value = newVal !== null; break;
    case 'value':    this.#value.value = newVal; break;
    case 'disabled': this.#disabled.value = newVal !== null; break;
  }
}
```

### 5.9 Reactive Effects

Effects are the mechanism that replaces manual `#sync()` methods. An effect automatically tracks which signals it reads and re-runs when any of them change.

#### Effect creation and disposal

Effects MUST be created in `setup()` (which runs from `connectedCallback`). The `UIElement` base class MUST automatically dispose all effects in `disconnectedCallback`.

```js
class UIElement extends HTMLElement {
  #disposers = [];

  /** Subclasses call this to register effects that auto-dispose on disconnect */
  addEffect(fn) {
    this.#disposers.push(effect(fn));
  }

  connectedCallback() {
    // ... style root resolution, sheet adoption ...
    this.setup();
  }

  disconnectedCallback() {
    this.#disposers.forEach(dispose => dispose());
    this.#disposers = [];
  }

  /** Subclasses override this */
  setup() {}
}
```

#### Effect patterns

Each effect SHOULD have a single responsibility — one DOM concern per effect:

```js
setup() {
  const trigger = this.querySelector(':scope > ui-trigger');
  const menu = this.querySelector(':scope > ui-menu');

  // Effect: open state → DOM attributes
  this.addEffect(() => {
    const isOpen = this.#open.value;
    this.toggleAttribute('open', isOpen);
    menu?.toggleAttribute('open', isOpen);
  });

  // Effect: ARIA
  this.addEffect(() => {
    trigger?.setAttribute('aria-expanded', this.#ariaExpanded.value);
  });

  // Effect: value reflection
  this.addEffect(() => {
    const val = this.#value.value;
    if (val != null) this.setAttribute('value', val);
    else this.removeAttribute('value');
  });

  // Effect: form value sync
  this.addEffect(() => {
    this.#internals.setFormValue(this.#value.value);
  });

  // Event wiring (NOT reactive — static bindings, not effects)
  trigger?.addEventListener('ui-press', () => this.toggle());
  menu?.addEventListener('ui-select', (e) => this.select(e.detail.value));
  this.addEventListener('ui-dismiss', () => { this.#open.value = false; });
}
```

#### Cycle prevention

Effects that sync state back to attributes could create infinite loops (`attribute changes → signal → effect sets attribute → attributeChangedCallback → signal → ...`). This MUST be prevented by:

1. **Idempotent DOM writes** — `toggleAttribute` and `setAttribute` with the same value are no-ops and do not re-trigger `attributeChangedCallback`
2. **Guard in `attributeChangedCallback`** — `if (oldVal === newVal) return;`

#### Seed-Before-Effect Pattern (A8, D126)

When `setup()` reads child element attributes to seed initial state (e.g., querying `ui-radio[checked]` to determine the initial selected value), the seed logic MUST execute **before** `addEffect()` calls that modify those same attributes. Effects run immediately when created — a value-sync effect that sets `child.checked = false` for all children (because the parent's value signal is null) will remove `[checked]` attributes before seed logic can query them.

```js
// ✅ Correct — seed before effect
setup() {
  // Seed: read child state while attributes are intact
  if (this.#value.value === null) {
    const preselected = this.querySelector('ui-radio[checked]');
    if (preselected) this.#value.value = preselected.value;
  }

  // Effect: now safe to sync — value is seeded
  this.addEffect(() => {
    const val = this.#value.value;
    for (const radio of this.querySelectorAll('ui-radio')) {
      radio.checked = radio.value === val;
    }
  });
}

// ❌ Wrong — effect clears attributes before seed runs
setup() {
  this.addEffect(() => { /* clears [checked] on all radios */ });
  // Too late — [checked] already removed
  const preselected = this.querySelector('ui-radio[checked]');
}
```

Same pattern applies to `ui-dialog`'s `shouldOpen` capture before the open-sync effect.

#### What MUST NOT be an effect

Static event listener bindings, one-time ARIA role assignment, and child discovery are NOT reactive concerns. They MUST be plain imperative code in `setup()`, not wrapped in effects.

```js
// ✅ Correct — static setup is imperative
setup() {
  this.addEventListener('command', (e) => { ... });  // not reactive
  this.#internals.role = 'listbox';                   // not reactive

  // Only DOM state that changes over time is in effects
  this.addEffect(() => { ... });
}

// ❌ Wrong — wrapping static code in an effect
setup() {
  this.addEffect(() => {
    this.addEventListener('click', handler); // runs every time deps change!
  });
}
```

### 5.10 Stores — Complex Reactive State

A Store is a Controller (rule 5.3) with a larger state surface, used for complex multi-component patterns. The naming convention:

| Complexity | Term | Example |
|------------|------|---------|
| 2–3 signals, simple coordination | **Controller** | `SelectController` |
| 5+ signals, multiple derived values, complex actions | **Store** | `ComboboxStore` |

#### Store anatomy

```js
class ComboboxStore {
  // ═══ STATE (signals) ═══
  open = signal(false);
  query = signal('');
  options = signal([]);
  activeIndex = signal(-1);
  value = signal(null);

  // ═══ DERIVED (computed) ═══
  filtered = computed(() => {
    const q = this.query.value.toLowerCase();
    return q
      ? this.options.value.filter(o => o.label.toLowerCase().includes(q))
      : this.options.value;
  });

  activeOption = computed(() => {
    const idx = this.activeIndex.value;
    const opts = this.filtered.value;
    return idx >= 0 && idx < opts.length ? opts[idx] : null;
  });

  // ═══ ACTIONS (methods that mutate signals) ═══
  setQuery(text) {
    this.query.value = text;
    this.activeIndex.value = -1;
    this.open.value = true;
  }

  moveActive(delta) {
    const len = this.filtered.value.length;
    if (len === 0) return;
    const idx = this.activeIndex.value;
    this.activeIndex.value = (idx + delta + len) % len;
  }

  selectActive() {
    const opt = this.activeOption.value;
    if (!opt) return;
    this.value.value = opt.value;
    this.query.value = opt.label;
    this.open.value = false;
  }

  // ═══ NO DOM. NO EVENTS. NO ELEMENTS. ═══
}
```

#### Connecting components to stores

Coordinator elements (rule 6.3) create a store and connect primitives to it using effects:

```js
class UICombobox extends UIElement {
  #store = new ComboboxStore();

  setup() {
    const input = this.querySelector(':scope > ui-input');
    const popover = this.querySelector(':scope > ui-popover');
    const listbox = this.querySelector(':scope > ui-listbox');

    // Input → store (event wiring, not an effect)
    input?.addEventListener('ui-input', (e) => {
      this.#store.setQuery(e.detail.value);
    });

    // Store → popover (reactive effect)
    this.addEffect(() => {
      if (this.#store.open.value) popover?.showPopover();
      else popover?.hidePopover();
    });

    // Store → listbox active item (reactive effect)
    this.addEffect(() => {
      const active = this.#store.activeOption.value;
      listbox?.setActiveDescendant(active?.value ?? null);
    });

    // Listbox → store → outbound event (event wiring)
    listbox?.addEventListener('ui-select', (e) => {
      this.#store.value.value = e.detail.value;
      this.#store.open.value = false;
      this.dispatchEvent(new CustomEvent('change', {
        bubbles: true, composed: true,
        detail: { value: e.detail.value }
      }));
    });
  }
}
```

#### Store testability

Stores MUST be testable in complete isolation — no DOM, no effects, no elements. Pure signal reads and action calls:

```js
// Test: ComboboxStore filtering
const store = new ComboboxStore();
store.options.value = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
];
store.setQuery('al');
assert(store.filtered.value.length === 1);
assert(store.filtered.value[0].value === 'a');
```

---

## 6. Composability Rules

### 6.1 Five Composition Types

The library recognizes five distinct composition mechanisms. Each has exactly one allowed pattern:

| Type | Mechanism | Example |
|------|-----------|---------|
| **Structural** | DOM nesting | Parent contains child |
| **Behavioral** | Controllers, events (up), attributes (down) | Trigger ↔ Menu coordination |
| **Trait** | Functional mixins | `Pressable`, `Dismissable` |
| **Pattern** | Coordinator elements | `<ui-combobox>` wires input + popover + listbox |
| **Invoker** | `commandfor`/`command` (sideways, by ID ref) | Any button → any target, declaratively |
| **Container** | CSS surfaces (elevation, padding, borders) | `<ui-card>`, `<ui-stack>`, `<ui-grid>` |
| **Block** | HTML templates (copy-paste patterns) | Login form, dashboard stats, settings page |

MUST NOT conflate composition types. A coordinator element is not a trait. A controller is not a parent component. An invoker relationship is not a parent-child relationship — it is a **sideways** connection between any two elements in the same root, mediated by ID reference.

### 6.2 Dumb Components, Smart Controllers

Components MUST be structurally agnostic — they discover children but never create them. Components know state (selected, open, value) but never structure (who built the DOM, where data came from).

Structure creation belongs to the **smart layer**:

- Hand-authored HTML
- `Controller.render()`
- Server-side template engine
- Framework adapter (React/Vue wrapper)

All smart layers MUST produce the same DOM contract. The component MUST NOT be able to distinguish which smart layer created its children.

**Exception — Data-Driven Mode (A12, D129):** Coordinator components (e.g., `ui-select`, `ui-combobox`) MAY create their own children when operating in **data-driven mode**, triggered by the presence of `options` (JSON) or `src` (fetch URL) attributes at setup time. In this mode, the component stamps the same DOM contract (trigger + listbox + options) that a manual author would write. The rest of `setup()` runs identically — the wiring code does not know whether children were authored or stamped. This pattern enables declarative data binding without requiring consumers to imperatively build DOM:

```html
<!-- Data-driven: component stamps its own children -->
<ui-select placeholder="Pick" options='[{"value":"a","label":"Alpha"}]'></ui-select>

<!-- Manual: author writes the same DOM structure by hand -->
<ui-select>
  <ui-button><span slot="label">Pick</span><ui-icon name="caret-up-down" slot="trailing"></ui-icon></ui-button>
  <ui-listbox popover><ui-option value="a">Alpha</ui-option></ui-listbox>
</ui-select>
```

**Rules for data-driven mode:**
- Mode detection MUST happen in `setup()` via attribute presence — never dynamically mid-lifecycle
- `#stampDOM()` MUST run synchronously before child discovery (`querySelector`) so existing wiring works unchanged
- Reactive re-rendering (when `options` or `src` changes) MUST use signal-driven effects, not manual `attributeChangedCallback` DOM manipulation
- The `SelectOption` interface (`{ value: string; label: string; disabled?: boolean }`) defines the JSON contract

### 6.3 Coordinator Elements vs Invoker Commands

Simple trigger → target relationships (open a dialog, toggle a popover, invoke a single action) SHOULD use `commandfor`/`command` directly. No coordinator element is needed.

```html
<!-- Simple: commandfor is sufficient -->
<button type="button" commandfor="confirm-dialog" command="show-modal">
  Delete Account
</button>
<dialog id="confirm-dialog">...</dialog>
```

Complex patterns requiring **multi-component orchestration** (combobox filtering, typeahead, multi-step flows, coordinated ARIA across 3+ elements) MUST be implemented as coordinator elements that wire independent primitives together.

```html
<!-- Complex: coordinator wires input + popover + listbox + filter logic -->
<ui-combobox>
  <ui-input placeholder="Search..."></ui-input>
  <ui-popover>
    <ui-listbox>...</ui-listbox>
  </ui-popover>
</ui-combobox>
```

The decision boundary: if the interaction requires **shared mutable state** between components (filter text, selection index, typeahead buffer), use a coordinator with a controller. If the interaction is **stateless invocation** (click → thing happens), use `commandfor`.

Coordinators:

- Have **no visual presence** (no stylesheet)
- Do **not** create child DOM
- Wire ARIA relationships between discovered children
- Create and distribute Controller instances
- Dispatch pattern-level events (`change`, `submit`)

Every primitive within a pattern MUST function standalone. `<ui-listbox>` works alone. `<ui-popover>` works alone. `<ui-input>` works alone. Coordinators add value through assembly, not dependency.

### 6.4 Option A / Option B / Option C Equivalence

Every component MUST support at minimum two construction paths and produce identical behavior:

| Path | Description |
|------|-------------|
| **Option A** | Fully hand-authored HTML — developer writes all children manually in markup |
| **Option B** | Controller-hydrated — developer provides data, a controller renders children |
| **Option C** | Data-driven — developer provides `options` or `src` attribute, component stamps its own children |

Additional paths (server render, framework adapter) are permitted and encouraged. The component's wiring logic (event listeners, ARIA setup, effects) MUST NOT have any awareness of which path was used. In Option C, `#stampDOM()` produces the same DOM contract as Options A and B — the downstream `querySelector` calls find the same elements regardless of origin.

### 6.5 Containers — Structural Components

Containers are a distinct category from interactive components. They provide elevation, padding, borders, and layout — but no interactive behavior. They exist at the intersection of the CSS token system and DOM composition.

**Rules for containers:**

- Containers MUST NOT have signals, events, or form association
- Containers MUST NOT set ARIA roles except landmarks where appropriate (`toolbar` for `ui-toolbar`)
- Containers MUST consume `--_*` locals for all visual properties (same as interactive components)
- Containers MUST cascade size/density/intent to children via CSS custom property inheritance
- CSS-only containers (`ui-divider`, `ui-stack`, `ui-grid`, `ui-inset`) MUST NOT require JavaScript
- Minimal-CE containers (`ui-card`, `ui-section`, `ui-toolbar`) use JS only for slot wiring or ARIA

**Elevation model:** Containers resolve `--_ground` from an elevation tier:

| Elevation | Token pattern | Use case |
|-----------|--------------|----------|
| `doc` | `--{family}-doc` | Page background (lowest) |
| `body` | `--{family}-body` | Main content area |
| `panel` | `--{family}-panel` | Sidebar, toolbar |
| `card` | `--{family}-card` | Lifted content card |
| `modal` | `--{family}-modal` | Dialog surface (highest) |

### 6.6 Blocks — HTML Template Patterns

Blocks are pre-composed layout patterns built from existing components and containers. They are NOT custom elements.

**Rules for blocks:**

- Blocks MUST NOT introduce new custom elements or CSS
- Blocks MUST use only existing components, containers, and standard HTML
- Blocks MUST be copy-paste starting points — no runtime dependencies beyond the component library
- Blocks MUST NOT be opinionated about data fetching, routing, or state management
- Each block MUST be a demo page viewable in the dev server
- Blocks MUST be organized by category in `src/blocks/{category}/{block-name}/`

---

## 7. StyleSheet Lifecycle

### 7.1 Three-Phase Lifecycle

| Phase | When | What |
|-------|------|------|
| **1. Module Load** | `import` executes | `CSSStyleSheet` parsed via `replaceSync()`. Static. Once per component type. |
| **2. Registration** | `defineWithStyles()` | Sheets adopted into `document.adoptedStyleSheets`. Before any `constructor()`. Eliminates FOUC. |
| **3. Connection** | `connectedCallback()` | Correction only. If inside a foreign `ShadowRoot`, adopt sheets there. 3rd-party embed scenarios only. |

### 7.2 Singleton Registry

A `SheetRegistry` MUST ensure:

- Each CSS text is parsed into a `CSSStyleSheet` exactly once
- Each sheet is adopted into each root at most once
- Adoption tracking uses `WeakMap` (shadow roots can be GC'd)
- Document-level adoption uses a `Set` (document is permanent)

### 7.3 SSR Fallback

For server-side rendering, a `SSRSheetCollector` MUST gather all sheets used during render and emit them as a single `<style data-ui-lib>` tag. On hydration, the base class MUST detect existing SSR styles and skip re-adoption.

---

## 8. Token Provider

### 8.1 `<ui-provider>` Element

All design tokens MUST cascade from a `<ui-provider>` element. Nested providers MUST be supported for sub-themes and color scheme overrides.

```html
<ui-provider color-scheme="light">
  <ui-provider color-scheme="dark">
    <!-- inner components receive dark color scheme -->
  </ui-provider>
</ui-provider>

<!-- Theme and color scheme are independent axes -->
<ui-provider theme="zinc">
  <ui-provider theme="zinc" color-scheme="dark">
    <!-- inner components: zinc theme + dark color scheme -->
  </ui-provider>
</ui-provider>
```

Tokens propagate via CSS custom property inheritance. No JavaScript is required for token resolution.

### 8.2 3rd-Party Isolation

When the library runs inside another application's page, a `<ui-embed>` wrapper MUST:

- Attach a `ShadowRoot`
- Adopt all needed sheets into that shadow root
- Contain a `<ui-provider>` inside the shadow
- Use `<slot>` to project consumer content

Individual component code MUST NOT change. Only the adoption target changes (document → shadow root).

---

## 9. Distribution and Consumption

### 9.1 Package Structure

```
dist/
  tokens.css                    ← global + semantic tokens
  base.css                      ← display resets for all tags
  all.css                       ← convenience bundle
  components/
    button.css                  ← per-component (tree-shakeable)
    dialog.css
    ...
  elements/
    button.js                   ← Custom Element class + registration
    dialog.js
    ...
  controllers/
    select.controller.js        ← simple shared state (2–3 signals)
    ...
  stores/
    combobox.store.js            ← complex shared state (5+ signals)
    ...
  traits/
    pressable.js                ← functional mixins
    dismissable.js
    ...
  reactivity/
    signal.js                   ← signal, computed, effect primitives
  adapters/
    react/                      ← generated framework wrappers
    vue/
    svelte/
```

### 9.2 Consumer Ownership Model

| Layer | Owner |
|-------|-------|
| **CSS** (visual) | Consumer — override via component tokens or full stylesheet replacement |
| **Behavior** (elements, controllers, traits) | Library — maintained upstream |

> *"You own the skin. You subscribe to the skeleton."*

### 9.3 Framework Adapters

Adapters MUST be auto-generated from schemas. They are thin wrappers that map framework conventions (React props, Vue `v-model`) to Custom Element attributes and events. Adapters MUST NOT contain logic, styling, or ARIA wiring.

---

## 10. Testing and Quality

### 10.1 Testability Contract

Components MUST be testable with plain HTML fixtures. No framework, no build step, no data layer required. Set DOM state → call method or simulate event → assert attributes and dispatched events.

### 10.2 ARIA Verification

Every component MUST have tests verifying correct ARIA role, state, and property assignments for all interactive states. Tests MUST cover keyboard navigation paths defined in WAI-ARIA Authoring Practices.

### 10.3 Style Contract Tests

Component CSS MUST be testable in isolation: apply the stylesheet to a static HTML fixture and verify computed styles for each variant × state combination. No JS required for style verification.

---

## 11. Naming Conventions Summary

| Artifact | Convention | Example |
|----------|-----------|---------|
| **CSS Token Naming** | | |
| Color env parameters | `--color-env-{param}` | `--color-env-chroma`, `--color-env-hue-accent` |
| Semantic color tokens | `--{family}-{role}` | `--accent-panel`, `--neutral-ink-hover` |
| Public geometry tokens | `--ui-{property}-{scale}` | `--ui-size-sm`, `--ui-font-md` |
| Public constants | `--ui-{property}` | `--ui-duration`, `--ui-easing`, `--ui-font-weight-button` |
| Local tokens | `--_{full-css-property}` | `--_min-height`, `--_font-size`, `--_background` |
| Color role locals | `--_{role}` | `--_panel`, `--_ink`, `--_surface`, `--_stroke` |
| **CSS Selectors** | | |
| CSS-only component selectors | `:where(element, [role], .class)` | `:where(button, [role="button"], .ui-btn)` |
| Custom element selectors (future) | `:where(ui-{component})` | `:where(ui-button)` |
| Generic attribute selectors | `:where([attr="value"])` | `:where([size="sm"])`, `:where([intent="accent"])` |
| CSS component files | `ui.{component}.css` | `ui.button.css` |
| Style declarations (CE stage) | `css` tagged template | `` css`@layer ui { ... }` `` |
| **JS/CE Naming** | | |
| Custom element tags | `ui-{component}` | `ui-button`, `ui-dialog` |
| Lifecycle hooks | Plain public method names | `setup()`, `teardown()` |
| Private fields/methods | `#` prefix | `#open`, `#handleClick()` |
| Reactive state (signals) | `#` prefix + `signal()` | `#open = signal(false)` |
| Derived state | `#` prefix + `computed()` | `#ariaExpanded = computed(...)` |
| Events | `ui-{verb}` | `ui-press`, `ui-select`, `ui-dismiss` |
| Custom commands | `--{verb}` or `--{verb}-{noun}` | `--play`, `--seek-forward`, `--reset-filters` |
| Trait state attributes | `{trait-state}` | `pressed`, `dismissed` |
| Controller classes | `{Pattern}Controller` | `SelectController` |
| Store classes | `{Pattern}Store` | `ComboboxStore` |
| Trait mixins | `{Capability}(Base)` | `Pressable(UIElement)` |
| Coordinator elements | `ui-{pattern}` | `ui-combobox`, `ui-date-picker` |
| Container elements | `ui-{container}` | `ui-card`, `ui-stack`, `ui-grid` |
| Block directories | `{category}/{block-name}/` | `auth/auth-login/`, `forms/form-contact/` |
| Schema files | `{component}.schema.js` | `button.schema.js` |
| Element files | `ui-{component}.ts` | `components/ui-button/ui-button.ts` |

---

## 12. Anti-Patterns — Explicit Prohibitions

| ❌ Prohibited | Why |
|--------------|-----|
| **CSS Architecture** | |
| Hard-coding values in components | Always read `--_*` locals (rule 4.2) |
| Components reading `--ui-*` or `--{family}-*` directly | Components read `--_*` locals; attribute selectors do the mapping (rule 4.2) |
| Bare selectors without `:where()` | Use `:where(button)` not `button`, `:where([size="sm"])` not `[size="sm"]` (rule 4.4.1) |
| `!important` | Never — layers + `:where()` make it unnecessary (rule 4.4.1) |
| Abbreviated local token names | Use `--_min-height` not `--_size`, `--_font-size` not `--_fs` (rule 4.3) |
| Inline `oklch()` for state colors | Use `--_*` locals that resolve to scrim/semantic tokens (rule 4.5) |
| `hex`, `rgb()`, `hsl()` color formats | Use `oklch()` (rule 4.1) |
| `@media (prefers-color-scheme)` for individual values | Use `light-dark()` (rule 4.8) |
| Per-component size selectors | Use generic `:where([size="sm"])` — works for all components (rule 4.7) |
| Monolithic global stylesheet | Per-component files in `@layer ui` (rule 4.17) |
| JavaScript-driven indicator positioning | CSS `:has()` + `--_indicator-index` (rule 4.13) |
| `::part()` pseudo-elements | Use attribute selectors (rule 4.12) |
| **Custom Elements (future)** | |
| `classList.add/remove/toggle` for state expression | Use attributes (rule 3.7) |
| `element.style.*` for computed layout or visual state | Use custom properties (rule 3.7) |
| Internal native `<button>`, `<input>`, `<select>`, `<textarea>` | Use `FormAssociated` + `ElementInternals` (rule 3.3) |
| `_underscore` prefix for private members or methods | Use native `#` private fields (rule 1.1) or plain names for lifecycle hooks (rule 1.2) |
| `Math.random()` for identifiers | Use `crypto.randomUUID()` (rule 1.3) |
| Shadow DOM without explicit justification | Light DOM by default (rule 3.2) |
| Components creating their own children (without data-driven mode) | Dumb components (rule 6.2). Exception: data-driven mode via `options`/`src` attributes (A12, D129). |
| Children querying or calling methods on parents | Parent-child directionality (rule 3.10) |
| Third-party positioning libraries | Popover API + `anchor()` (rule 5.1) |
| `<style>` injection (except SSR fallback) | Constructable StyleSheets (rule 4.15) |
| `new CSSStyleSheet()` + `replaceSync()` directly | Use `css` tagged template (rule 4.15) |
| `data-*` attributes for styling or state | Use plain attributes: `[pressed]`, `[variant]`, `[open]` |
| Inline event handlers in markup | `addEventListener` in `setup()` (rule 3.6) |
| Framework-specific logic in component classes | Adapters layer only (rule 9.3) |
| Re-implementing built-in `command` behaviors in JS | Platform handles `show-modal`, `toggle-popover`, etc. (rule 5.7) |
| Custom commands without `--` prefix | Spec requires `--` prefix for custom commands (rule 5.7) |
| Coordinator elements for simple trigger → target patterns | Use `commandfor`/`command` instead (rule 6.3) |
| Manual `#sync()` methods for DOM reconciliation | Use reactive effects via `addEffect()` (rule 5.9) |
| Exposing signals in public component API | Signals are internal; public API is attributes + events (rule 5.8) |
| Creating effects in `constructor()` | Effects MUST be created in `setup()`, disposed automatically on disconnect (rule 5.9) |
| Wrapping static event bindings in effects | Event listeners are imperative setup, not reactive (rule 5.9) |
| Controllers/Stores that touch DOM or dispatch events | Pure reactive state + actions only (rule 5.3) |
| Static prefix/suffix on dynamic-value components (e.g., `ui-select`) | Static decorations become contradictory when selection changes (A11, D128). Use `ui-input` for fixed-context decorations. |

---

> **Version:** 1.7.0
> **Last updated:** 2026-02-20
>
> These rules are the architectural law of the component library. Deviations require explicit justification in code review and a comment in the source referencing the rule being waived and why.
