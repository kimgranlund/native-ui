# Trait Controller System — Requirements Document

**Component:** `<ui-controller>`
**Scope:** Web Components–based interaction runtime
**Goal:** Unified capability injection system supporting both structural (wrapper) and host-level (attribute) composition.

---

# 1. Purpose

Define a composable, conflict-safe, and context-aware trait system for Web Components that:

* Enables behavior injection via:

  * **Structural providers** (`<ui-controller>`)
  * **Host flags** (`traits="..."`)
* Supports interaction topologies (drag/sort/drop, focus groups, overlays)
* Centralizes gesture arbitration
* Avoids prototype mutation or mixin-based inheritance
* Remains platform-native (Pointer Events, Shadow DOM, ElementInternals)

---

# 2. Terminology

| Term       | Definition                                                  |
| ---------- | ----------------------------------------------------------- |
| Trait      | Named behavioral capability (e.g., `draggable`, `sortable`) |
| Controller | Instance implementing trait logic for a specific host       |
| Provider   | `<ui-controller>` element that supplies context/services    |
| Host       | Element declaring `traits="..."`                            |
| Scope      | DOM subtree governed by a provider                          |

---

# 3. Supported Composition Patterns

## 3.1 Host-Level Trait Declaration

```html
<ui-button traits="draggable sortable"></ui-button>
```

**Requirements:**

* `traits` attribute accepts space-separated tokens
* Attribute is observed
* Runtime must diff tokens on change
* Controllers are instantiated/destroyed accordingly
* Trait options are expressed via namespaced attributes:

```html
<ui-button
  traits="draggable"
  draggable-axis="x"
  draggable-handle="[part=grab]"
></ui-button>
```

---

## 3.2 Structural Provider

```html
<ui-controller traits="draggable sortable">
  <ui-button></ui-button>
</ui-controller>
```

### Modes

| Mode                   | Behavior                                         |
| ---------------------- | ------------------------------------------------ |
| Wrapper Mode (default) | Apply traits to first element child              |
| Selector Mode          | `for="selector"` applies to matching descendants |
| Provider Mode          | `provides="..."` exposes services only           |

Example:

```html
<ui-controller provides="sortable droppable">
  <ui-button traits="draggable"></ui-button>
</ui-controller>
```

---

# 4. Architectural Model

## 4.1 Traits are Controllers (Not Mixins)

Traits must:

* Not mutate prototypes
* Not rely on inheritance
* Be instantiated per host
* Be detachable
* Be context-aware

### Controller Interface

```ts
interface TraitController {
  id: string
  connect(host: HTMLElement, context: TraitContext): void
  disconnect(): void
  update?(options: Record<string, any>): void
  onEvent?(event: Event): TraitClaim
}
```

---

## 4.2 TraitContext

Context must include:

* Nearest provider scope
* Shared services (gesture router, drag registry, overlay manager)
* Policies (bounds, list id, collision strategy)
* Config inheritance from parent providers

Resolution:

```
host → closest <ui-controller> → fallback to root runtime
```

---

# 5. Lifecycle Requirements

## 5.1 Host Trait Resolution

On:

* `connectedCallback`
* `disconnectedCallback`
* `attributeChangedCallback` (traits + namespaced options)

System must:

1. Parse trait tokens
2. Diff against active controllers
3. Instantiate new controllers
4. Disconnect removed controllers
5. Update existing controllers with option changes

---

## 5.2 Provider Resolution

`<ui-controller>` must:

* Register itself as scope boundary
* Provide services via context
* Support nested providers
* Merge policies hierarchically
* Clean up on disconnect

---

# 6. Gesture Arbitration

## 6.1 Central Gesture Router

Required to:

* Normalize Pointer Events
* Coordinate drag vs click vs rotate vs scroll
* Support claiming model

### Arbitration Contract

Controller may:

```
return "claim" | "pass"
```

Router must:

* Respect priority ordering
* Prevent duplicate gesture ownership
* Support thresholds (movement, delay)
* Integrate with `touch-action` policies

Without this, trait composition is invalid.

---

# 7. Conflict Rules

### 7.1 Duplicate Trait Declaration

* Duplicate tokens are ignored
* Multiple providers do not duplicate controller instances

### 7.2 Trait Incompatibility

Traits may declare incompatibilities:

```ts
static conflicts = ["pressable"]
```

Runtime must:

* Throw in dev mode
* Warn in production mode

### 7.3 Exclusive Claims

If two traits claim same interaction:

* Highest priority wins
* Priority is static per trait
* Providers may override priority policy

---

# 8. CSS Contract

Traits must not:

* Inject global styles
* Mutate adopted stylesheets
* Force inline transforms destructively

Preferred pattern:

```css
:where([data-ui-draggable]) {
  transform: var(--ui-drag-transform);
}
```

Traits may:

* Set CSS variables
* Set data attributes
* Dispatch events

---

# 9. Shadow DOM Compatibility

System must:

* Respect composedPath()
* Work across shadow boundaries
* Avoid leaking internal implementation details
* Support hosts with or without Shadow DOM

---

# 10. Performance Requirements

* No global MutationObserver scanning entire DOM
* Resolution must be localized to:

  * hosts declaring `traits`
  * `<ui-controller>` subtree
* Controller count must scale O(n traits), not O(n DOM depth)
* No layout thrashing during gesture loops

---

# 11. Accessibility Requirements

Traits must:

* Preserve native semantics
* Avoid breaking focus order
* Not rely on `display: contents` for core functionality
* Integrate with ARIA reflection if needed

---

# 12. Non-Goals

* No prototype mutation
* No mixin-based inheritance
* No global magical blanket behaviors
* No silent conflict resolution

---

# 13. Example Valid Configurations

### Structural Topology (Sortable List)

```html
<ui-controller provides="sortable droppable" list="tasks">
  <ui-item traits="draggable"></ui-item>
  <ui-item traits="draggable"></ui-item>
</ui-controller>
```

### Single Target Wrapper

```html
<ui-controller traits="draggable">
  <ui-card></ui-card>
</ui-controller>
```

### Pure Host-Level

```html
<ui-card traits="draggable rotatable"></ui-card>
```

---

# 14. Design Principles

* Traits express **capabilities**
* Providers express **context**
* Controllers implement **behavior**
* Gesture router enforces **order**
* CSS variables enable **visual projection**
* DOM topology expresses **system boundaries**

---

# 15. Acceptance Criteria

The system is complete when:

* Host + wrapper syntax produce identical controller instances
* Nested providers resolve correctly
* Drag + click + rotate do not conflict
* Traits can be dynamically added/removed at runtime
* No prototype mutation occurs
* No global DOM scanning is required
* Interaction graph can be reasoned about deterministically
