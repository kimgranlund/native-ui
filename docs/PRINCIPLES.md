# Principles

Five design principles codified from 105+ cross-project tickets between `@nonoun/native-ui` (web component library) and `native-host` (Astro SSR consumer). These are hard-won lessons — each principle exists because violating it caused real bugs, regressions, or architectural debt.

---

## 1. The Attribute Principle

**If a configuration value can be expressed as a string, it must be an attribute.**

Attributes are the component's **public API contract** — the documented, discoverable, version-stable configuration surface. Properties exist for internal state and complex objects, not for configuration. When you look at a component's attribute list, you are looking at its API.

Properties are only for complex objects that genuinely cannot be serialized (e.g., callback functions, nested object graphs). Everything else — strings, numbers, booleans, JSON-serializable arrays — goes through attributes.

Attributes work with:
- **SSR** — Astro templates emit HTML before any JS loads
- **View Transitions** — `adoptNode` preserves attributes across page navigations
- **DevTools** — inspectors show attributes; properties require console access
- **HTML authoring** — consumers can use the component with zero `<script>` code
- **API discoverability** — the attribute list IS the component reference; no source-diving needed

**Test:** Can a consumer use this feature with zero JavaScript?

```html
<!-- Good: attribute-driven, works in SSR and static HTML -->
<n-select placeholder="Country" options='[{"value":"us","label":"United States"}]'></n-select>
<n-button variant="primary" intent="accent">Save</n-button>
<n-input placeholder="Search" name="q"></n-input>

<!-- Bad: requires JS to configure -->
<n-select id="sel"></n-select>
<script>
  document.getElementById('sel').options = [{ value: 'us', label: 'United States' }];
</script>
```

**When properties are appropriate:** Complex objects that cannot round-trip through `getAttribute`/`setAttribute` — event handler callbacks, render functions, or deeply nested configuration objects. These are the exception, not the rule.

**The API hierarchy:**

| Surface | Purpose | Examples |
|---------|---------|----------|
| **Attributes** (public API) | Configuration — what the consumer controls | `variant`, `disabled`, `value`, `placeholder`, `options` |
| **Events** (public API) | Notification — what happened | `native:change`, `native:press`, `native:dismiss` |
| **CSS tokens** (public API) | Theming — visual customization | `--n-background`, `--n-color`, `--n-radius` |
| **Methods** (public API) | Imperative control — lifecycle and sequencing | `open()`, `close()`, `focusComposer()`, `goTo()` |
| **Properties** (internal) | Runtime state — complex objects and computed values | `store`, `controller`, `items`, `itemRenderer` |

A component's public API = attributes + events + CSS tokens + methods. Properties are implementation details — they serve internal wiring and JS-only data (callbacks, streams, deeply nested objects).

---

## 2. The Behavior Boundary Principle

**A component owns its internal behavior. Events inform; they do not delegate.**

When a component fires an event, it communicates what happened. The host should not need to read event details and feed them back to the same component as attributes or property assignments. If that pattern emerges, the behavior belongs inside the component.

**Anti-pattern: event-then-attribute round-trip**

```html
<!-- Bad: host is doing the component's job -->
<n-tabs id="tabs"></n-tabs>
<script>
  tabs.addEventListener('native:change', (e) => {
    // Reading detail just to set it back on the same element
    tabs.setAttribute('active', e.detail.value);
  });
</script>
```

```html
<!-- Good: component manages its own active state -->
<n-tabs>
  <n-tab value="one">One</n-tab>
  <n-tab value="two">Two</n-tab>
</n-tabs>
<!-- Component internally tracks the active tab.
     Event fires so the host can react (update URL, log analytics). -->
```

**The exception:** Host-level side effects that the component cannot and should not know about — navigation, persistence, analytics, cross-component coordination. The event is consumed by the host for the host's own purposes, not fed back to the originating component.

```html
<!-- Legitimate: host uses event for its own side effects -->
<n-tabs id="tabs"></n-tabs>
<script>
  tabs.addEventListener('native:change', (e) => {
    history.pushState(null, '', `?tab=${e.detail.value}`);  // navigation
    analytics.track('tab_change', e.detail);                 // analytics
  });
</script>
```

---

## 3. The CSS Single-Owner Principle

**Each CSS concern has exactly one owner. No rule should be overridden by a lower-specificity rule in another package.**

When two packages both declare rules for the same property on the same element, specificity wars and source-order bugs follow. Every CSS concern — layout, color, spacing, transitions — must have a single authoritative owner.

| Concern | Owner | Package |
|---------|-------|---------|
| Component base styles | Component CSS | `native-ui` |
| Token definitions | Foundation CSS | `native-ui` |
| Attribute selectors (variant, size) | Component CSS | `native-ui` |
| App-level sidebar layout | App layout CSS | `native-dashboard` |
| Page-specific overrides | Page styles | Consumer |

**Anti-pattern: competing declarations**

```css
/* native-ui/n-panel.css */
:where(main) { padding: var(--n-space); }

/* native-dashboard/sidebar.css — BAD: redeclares the same property */
:where(main) { padding: 0; }
```

**Correct approach:** The component owns its default padding. The app-level package extends with new concerns (grid placement, collapse behavior) but does not redeclare what the component already handles. If the default needs to change, it changes at the source.

```css
/* native-ui/n-panel.css — owns padding */
:where(main) { padding: var(--n-space); }

/* native-dashboard/sidebar.css — extends with layout concerns only */
:where(section.content) > :where(main) { grid-area: main; }
```

**Practical test:** Search for any CSS property that appears in both `native-ui` and the consumer for the same selector. If found, one of them is wrong.

---

## 4. The Zero-JS-for-Rendering Principle

**A component must render its initial state correctly from attributes alone, before any JavaScript executes.**

SSR sends HTML before JS loads. Users see the initial render for 100-500ms (or longer on slow connections). If the component relies on JS to set up its visual state, users see a flash of broken or empty content.

**Test:** Disable JavaScript in the browser. Does the component show meaningful content?

```html
<!-- Good: renders immediately from HTML, no JS needed for initial paint -->
<n-button variant="primary">Save Draft</n-button>
<n-input placeholder="Search documents..." value="quarterly report"></n-input>
<n-badge>3</n-badge>

<!-- Bad: empty shell until JS runs -->
<n-select id="sel"></n-select>
<script>
  // Without this script, the select renders as an empty box
  sel.setOptions([...]);
  sel.setPlaceholder('Pick one');
</script>
```

**What this means for component authors:**
- CSS base rules must produce a usable visual state from tag + attributes alone
- Default backgrounds, colors, borders, and sizing come from CSS, not JS initialization
- Content (text, icons) comes from HTML children or attributes, not JS rendering
- JS enhances behavior (events, ARIA, state management) but does not create the visual baseline

**Relationship to the Attribute Principle:** This principle is the *reason* attributes matter. Attributes are the only configuration mechanism that survives SSR — properties require JS to set.

---

## 5. The Zero-Config Principle

**Every component must render correctly and be fully functional with no attributes.**

Bare markup — just a tag name and content — must produce a usable component. Defaults for variant, radius, role, intent, and all other configuration are set in CSS base rules and JS constructors.

```html
<!-- All of these work with zero configuration -->
<n-button>Click me</n-button>
<n-input></n-input>
<n-checkbox>Accept terms</n-checkbox>
<n-select></n-select>
```

**How defaults are implemented:**

CSS base rules at zero specificity (`:where()`) set explicit token defaults:

```css
:where(n-button) {
  --n-background: var(--n-button);
  --n-color: var(--n-ink);
  --n-border-color: var(--n-border-muted);
  border-radius: var(--n-radius-round);
  /* ... full visual state from CSS alone */
}
```

Attribute selectors at real specificity (0,1,0) override these defaults when consumers opt in:

```css
[variant="primary"] {
  --n-background: var(--n-button-accent);
  --n-color: var(--n-surface-ink);
  --n-border-color: transparent;
}
```

**Test:** Drop a bare component tag into a page with only the CSS loaded. It should look intentional, not broken.

**Relationship to other principles:** Zero-config is the consumer-facing promise. The Attribute Principle (1) ensures configuration is declarative. Zero-JS-for-Rendering (4) ensures the defaults are visible before JS loads. Together they guarantee that `<n-button>Save</n-button>` just works — in any context, at any point in the page lifecycle.

---

## Exception: Real-Time & Stream-Driven Components

Principles 4 (Zero-JS-for-Rendering) and 5 (Zero-Config) apply fully to **static UI components** — buttons, inputs, cards, containers, layout primitives. These components can and should render meaningful content from HTML alone.

**Real-time, stream-driven components** (chat, notifications, live collaboration) are exempt from strict zero-JS rendering. These components are inherently stateful and interactive — their content arrives asynchronously from servers and APIs. Enforcing zero-JS rendering on a chat panel would produce an empty shell with no utility.

However, the exemption is narrow:
- **Principles 1-3 still apply fully.** Configuration must be attribute-driven (Attribute Principle). Events must be informational (Behavior Boundary). CSS must have single owners (CSS Single-Owner).
- **Container elements within stream-driven components** should still render CSS layout without JS where possible. For example, `n-chat-feed` renders a scrollable flex column from CSS; `n-chat-messages` renders a grid layout. JS enhances but doesn't create the structural baseline.
- **The main entry point should be zero-config.** `<native-chat-panel></native-chat-panel>` with no attributes should produce a complete, intentional UI — even if that UI is empty and waiting for a gateway to be configured.
