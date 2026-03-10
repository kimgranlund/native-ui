# A2UI Component API Augmentation — Claude Code Instructions

## Objective

You are augmenting the A2UI component registry (`a2ui-component-map.ts`) to serve as the single source of truth for both the runtime kernel AND the LLM context window. The goal is two capabilities:

1. **Write basic JS wiring code** that connects generated A2UI components using the native-ui API
2. **Report specific gaps** when the API surface is unclear or undocumented — never guess, never bypass

These are pursued in order. Gap reporting is the prerequisite for reliable wiring.

---

## Phase 1 — Augment `ComponentMapping` Interface

Add three new interfaces and three new optional fields to `ComponentMapping`. This is additive — zero breaking changes to existing code.

### New Interfaces

```typescript
/**
 * Describes a single event emitted by a native-ui component.
 * The LLM uses this to write addEventListener calls with correct event names and payloads.
 */
export interface EventSpec {
  /** Native event name, e.g. 'native:press' */
  readonly event: string;
  /** Shape of event.detail — flat record of { propertyName: typeDescription } */
  readonly detail?: Readonly<Record<string, string>>;
  /** Human-readable description of when this event fires */
  readonly description: string;
}

/**
 * Describes a single settable property on a native-ui component.
 * The LLM uses this to write property assignments and understand reactivity.
 */
export interface PropertySpec {
  /** Native attribute/property name on the rendered element */
  readonly attr: string;
  /** Type expressed as a TypeScript-style union or primitive, e.g. "'sm' | 'md' | 'lg'" or "boolean" */
  readonly type: string;
  /** If true, setting this property at runtime causes the component to re-render. Default: assume false. */
  readonly reactive?: boolean;
  /** Optional note for edge cases, caveats, or usage guidance */
  readonly note?: string;
}

/**
 * Describes an imperative method exposed by a native-ui component.
 * The LLM uses this to write direct method calls on element references.
 */
export interface MethodSpec {
  /** Method name on the element, e.g. 'focus', 'showModal' */
  readonly name: string;
  /** Parameters as { paramName: typeDescription } */
  readonly params?: Readonly<Record<string, string>>;
  /** Return type description, e.g. 'void', 'Promise<void>', 'string' */
  readonly returns?: string;
  /** When and why to call this method */
  readonly description: string;
}
```

### Augmented `ComponentMapping`

Add three optional fields to the existing interface:

```typescript
export interface ComponentMapping {
  // ... all existing fields unchanged ...

  /** Full event surface. When present, supersedes actionEvent for LLM use. */
  readonly events?: readonly EventSpec[];
  /** Full property surface with types and reactivity. When present, supersedes propertyMap for LLM use. */
  readonly properties?: readonly PropertySpec[];
  /** Imperative methods exposed by the rendered element. */
  readonly methods?: readonly MethodSpec[];
}
```

**Rules:**
- `actionEvent` stays for backward compatibility. `events` is the richer replacement — when both exist, `events` is authoritative.
- `propertyMap` stays for backward compatibility. `properties` is the richer replacement — when both exist, `properties` is authoritative.
- All three new fields are optional. A component without them is considered "undocumented API" and triggers gap reporting (see Phase 2).

---

## Phase 2 — Populate API Surface for Priority Components

Fill in `events`, `properties`, and `methods` for components in this priority order. Do the first tier before moving on.

### Tier 1 — Core interactive (do these first)

- **Button** — events, properties, methods
- **TextField** — events, properties, methods
- **TextArea** — events, properties, methods
- **CheckBox** — events, properties, methods
- **Switch** — events, properties, methods
- **ChoicePicker / Select** — events, properties, methods

### Tier 2 — Containers with behavior

- **Modal** — events (open, dismiss, confirm), properties (open state), methods (showModal, close)
- **Tabs** — events (tab change), properties (activeTab), methods
- **Accordion / AccordionItem** — events (expand/collapse), properties (open state)
- **List** — events (select), properties (selected value)
- **Toast** — events (dismiss), properties (message, type, duration), methods (show)

### Tier 3 — Display and layout

- **Card, Header, Body, Footer** — properties only (typically no events or methods)
- **Row, Column** — properties only
- **Progress** — properties only
- **Badge, Avatar, Image, Icon** — properties only
- **Table** — events (row select, sort), properties
- **Divider, Breadcrumb** — minimal

### How to populate

For each component, do the following:

1. **Read the native-ui source** for the custom element (e.g., the class extending HTMLElement for `n-button`). Identify:
   - Every `this.dispatchEvent(new CustomEvent(...))` call → becomes an `EventSpec`
   - Every observed attribute and public setter → becomes a `PropertySpec`
   - Every public method → becomes a `MethodSpec`

2. **If the source is ambiguous or unavailable**, create a stub entry with a `note` field explaining exactly what is unclear. Example:

```typescript
events: [
  {
    event: 'native:change',
    description: 'GAP: Fires on selection change, but detail payload shape is undocumented. Need to verify: does detail contain { value: string } or { selectedIndex: number } or both?',
  },
],
```

3. **If you cannot determine whether a property is reactive**, mark it explicitly:

```typescript
{ attr: 'value', type: 'string', reactive: undefined, note: 'GAP: Reactivity unknown — need to verify if setting .value after mount updates the rendered input' }
```

4. **If a component has no events/properties/methods at all**, say so explicitly with an empty array rather than omitting the field:

```typescript
events: [],       // This component emits no events
properties: [],   // This component has no settable properties
methods: [],      // This component exposes no imperative methods
```

An empty array means "documented as having none." An absent field means "undocumented."

---

## Phase 3 — Gap Reporting Protocol

This is the critical behavioral rule. It applies at all times — during augmentation AND during JS wiring.

### The Rule

> If you need to reference a component's event, property, or method and the information is not present in the `events`, `properties`, or `methods` arrays on its `ComponentMapping`, you MUST NOT guess. Instead, report a gap.

### Gap Report Format

Use this exact structure when you encounter a gap. Output it as a code comment in context, or as a standalone block if working on documentation:

```
GAP REPORT
───────────────────────────────────
Component:    [a2uiType]
Native tag:   [nativeTag]
Need:         [What specific API surface is missing — event name, property type, method signature]
Context:      [What you were trying to accomplish when you hit this gap]
Attempted:    [What you looked for and where — be specific]
Impact:       [What cannot be wired / built without this information]
Suggestion:   [Your best guess at what the API *might* be, clearly marked as unverified]
───────────────────────────────────
```

### Examples

```
GAP REPORT
───────────────────────────────────
Component:    Tabs
Native tag:   n-tabs
Need:         Event emitted when active tab changes — name and detail payload
Context:      Wiring tab selection to conditionally show/hide content panels
Attempted:    No actionEvent defined on mapping. No events array present.
Impact:       Cannot write addEventListener for tab changes. Tab content switching cannot be wired.
Suggestion:   Likely 'native:change' with detail: { tab: string } or { index: number } — UNVERIFIED
───────────────────────────────────
```

```
GAP REPORT
───────────────────────────────────
Component:    Modal
Native tag:   n-dialog
Need:         Method to programmatically open the modal
Context:      Button click should open a confirmation dialog
Attempted:    actionEvent is 'native:dismiss' (close only). No methods array present.
Impact:       Cannot wire "click button → open modal" without knowing the open method
Suggestion:   Likely .showModal() or setting an 'open' attribute — UNVERIFIED
───────────────────────────────────
```

### When to gap-report vs. when to proceed

| Situation | Action |
|---|---|
| `events` array exists and contains the event you need | Proceed — write the JS |
| `events` array exists but does NOT contain the event you need | Gap report — the event may not exist |
| `events` array is absent (field undefined) | Gap report — the component's event surface is undocumented |
| `events` is an empty array `[]` | Proceed — the component is documented as having no events. If you expected one, note the discrepancy. |
| `properties` array has the property but `reactive` is undefined | Gap report — you can set it but don't know if it works at runtime |
| You need a method and `methods` is absent or doesn't list it | Gap report |

---

## Phase 4 — Writing JS Wiring Code

Once a component has documented `events`, `properties`, and `methods`, you can write JS to wire it up. Follow these patterns.

### Getting a reference to a rendered component

```javascript
// By A2UI component ID (set as data attribute by the kernel)
const el = document.querySelector('[data-a2ui-id="my-button"]');

// If the kernel provides a lookup method, prefer it:
// const el = kernel.getComponent('my-button');
// GAP: Verify which method the kernel exposes for component lookup
```

### Listening to events

```javascript
// Use the event name from the component's EventSpec
const input = document.querySelector('[data-a2ui-id="name-input"]');
input.addEventListener('native:input', (e) => {
  // Access detail payload as documented in EventSpec.detail
  const value = e.detail.value; // string — per TextField EventSpec
  console.log('Input value:', value);
});
```

### Setting properties at runtime

```javascript
// Only set properties documented as reactive: true
const badge = document.querySelector('[data-a2ui-id="status-badge"]');
badge.setAttribute('variant', 'success'); // per PropertySpec { attr: 'variant', reactive: true }
```

### Calling methods

```javascript
// Only call methods documented in MethodSpec
const input = document.querySelector('[data-a2ui-id="name-input"]');
input.focus(); // per MethodSpec { name: 'focus' }
```

### Wiring two components together

```javascript
// Example: TextField value updates a Text display
// REQUIRES: TextField.events includes native:input with detail.value
// REQUIRES: Text element supports textContent assignment
const input = document.querySelector('[data-a2ui-id="search-input"]');
const display = document.querySelector('[data-a2ui-id="search-echo"]');

input.addEventListener('native:input', (e) => {
  display.textContent = e.detail.value;
});
```

### Wiring a button to open a modal

```javascript
// REQUIRES: Button.events includes native:press
// REQUIRES: Modal.methods includes a documented open method
const btn = document.querySelector('[data-a2ui-id="open-modal-btn"]');
const modal = document.querySelector('[data-a2ui-id="confirm-dialog"]');

btn.addEventListener('native:press', () => {
  // GAP if Modal.methods does not document an open method:
  modal.showModal(); // UNVERIFIED — see gap report
});
```

### Pattern: form value collection

```javascript
// Collect values from multiple inputs on button press
// REQUIRES: Each input's PropertySpec documents how to read its current value
const form = {
  name:  () => document.querySelector('[data-a2ui-id="name-input"]').value,
  email: () => document.querySelector('[data-a2ui-id="email-input"]').value,
  agree: () => document.querySelector('[data-a2ui-id="agree-checkbox"]').checked,
};

document.querySelector('[data-a2ui-id="submit-btn"]')
  .addEventListener('native:press', () => {
    const values = Object.fromEntries(
      Object.entries(form).map(([k, getter]) => [k, getter()])
    );
    console.log('Form values:', values);
    // GAP: How to read .checked from n-checkbox — is it a property or attribute?
  });
```

---

## Summary of Deliverables

| Phase | Deliverable | Acceptance criteria |
|---|---|---|
| 1 | `EventSpec`, `PropertySpec`, `MethodSpec` interfaces added to `a2ui-component-map.ts` | Compiles with zero breaking changes. All existing tests pass. |
| 2 | Tier 1 components populated with `events`, `properties`, `methods` | Every field sourced from native-ui source code. Every unknown marked as GAP with note. |
| 3 | Gap reports collected | At minimum one gap report per Tier 2+ component that lacks source documentation. |
| 4 | JS wiring patterns validated | At least one working wiring example per Tier 1 component, using only documented API surface. |

---

## Hard Rules

1. **Never guess an event name.** If it's not in `events`, gap-report it.
2. **Never guess a detail payload shape.** If it's not in `EventSpec.detail`, gap-report it.
3. **Never assume a property is reactive.** If `reactive` is not `true`, don't write code that depends on runtime reactivity.
4. **Never invent a method.** If it's not in `methods`, gap-report it.
5. **Empty array ≠ absent field.** `events: []` means "no events." `events: undefined` means "undocumented."
6. **Every gap report must include a suggestion.** Your best guess, clearly marked UNVERIFIED, helps the API author fill the gap faster.
7. **Backward compatibility is non-negotiable.** `actionEvent` and `propertyMap` stay. New fields augment, never replace at the code level.
