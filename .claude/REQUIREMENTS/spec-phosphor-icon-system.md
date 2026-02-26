# Spec — Phosphor Icon System

> **Purpose:** Specification for a coding agent to author an equivalent icon system — from raw icon source to tree-shakeable per-icon modules, a global registry, and a consumer-facing custom element. Derived from the production implementation (BACK-377, D261, D271, D260, D262).
>
> **Audience:** LLM coding agents, human implementors.
>
> **Scope:** Icon registry, `<ui-icon>` custom element, per-icon codegen from `@phosphor-icons/core`, direct SVG string imports for internal component use, sizing tokens, accessibility, and late-registration handling.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Two Consumption Paths](#2-two-consumption-paths)
3. [Icon Registry](#3-icon-registry)
4. [The `<ui-icon>` Custom Element](#4-the-ui-icon-custom-element)
5. [Per-Icon Codegen Modules](#5-per-icon-codegen-modules)
6. [Direct SVG String Imports](#6-direct-svg-string-imports)
7. [Sizing & Token Integration](#7-sizing--token-integration)
8. [Stylesheet](#8-stylesheet)
9. [Accessibility](#9-accessibility)
10. [Package Exports](#10-package-exports)
11. [Testing Contracts](#11-testing-contracts)
12. [Late Registration & Import Order](#12-late-registration--import-order)
13. [Brand & Custom Icons](#13-brand--custom-icons)
14. [File Structure](#14-file-structure)
15. [Decision Log References](#15-decision-log-references)

---

## 1. Architecture Overview

The icon system has three layers:

```
┌──────────────────────────────────────────────────────────┐
│  @phosphor-icons/core (npm dependency)                   │
│  ~1,500 SVG files in assets/regular/                     │
└────────────────────────┬─────────────────────────────────┘
                         │ codegen script (build-time)
                         ▼
┌──────────────────────────────────────────────────────────┐
│  src/icons/phosphor/{name}.ts   (per-icon modules)       │
│  Each calls registerIcon(name, svgString)                │
│  Side-effect imports → tree-shakeable                    │
└────────────────────────┬─────────────────────────────────┘
                         │ import at runtime
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Registry (Map<string, string>)                          │
│  + subscriber set for late registration                  │
└────────┬──────────────────────────────────┬──────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────┐     ┌──────────────────────────────┐
│  <ui-icon name="…"> │     │  icons.ts (direct SVG        │
│  Consumer-facing     │     │  string exports for          │
│  custom element      │     │  internal component use)     │
└─────────────────────┘     └──────────────────────────────┘
```

**Key design choices:**

| Choice | Rationale |
|--------|-----------|
| SVG strings, not components | Zero abstraction tax. `innerHTML = svgString` is the simplest, fastest path. No virtual DOM, no template instantiation. |
| Per-icon modules as side-effect imports | Tree-shakeable — only imported icons are bundled. Consumer controls the bundle. |
| Module-scoped `Map`, not DOM-based | Synchronous, zero-overhead lookup. No DOM queries, no attribute parsing. |
| Light DOM rendering | Parent components can style child `<svg>` directly (e.g., `ui-button > svg { width: 1em }`). No shadow boundary to pierce. |
| `fill="currentColor"` on all SVGs | Color inherits from CSS `color` property. No separate icon color management. |
| Uniform `viewBox="0 0 256 256"` | All Phosphor regular-weight icons share this viewBox. CSS `width`/`height` controls rendered size. Internal coordinates are irrelevant to consumers. |

---

## 2. Two Consumption Paths

The system provides two distinct ways to use icons, serving different audiences:

### Path A: `<ui-icon>` Element (HTML authors, blocks, application code)

Declarative usage in HTML:

```html
<ui-icon name="house"></ui-icon>
<ui-icon name="gear" size="lg"></ui-icon>
<ui-icon name="bell" aria-label="Notifications"></ui-icon>
```

**Requires:** Importing the element registration (`ui-icon.ts`) AND the per-icon modules for each icon used on the page.

```html
<script type="module">
  import './icons/ui-icon.ts';
  import './icons/phosphor/house.ts';
  import './icons/phosphor/gear.ts';
  import './icons/phosphor/bell.ts';
</script>
```

### Path B: Direct SVG String Imports (internal component code)

Programmatic usage inside component implementations:

```ts
import { IconCaretDown, IconX } from '@/icons/icons.ts';

// Inside a component's setup() or build method:
this.innerHTML = IconCaretDown;
chevronEl.innerHTML = IconCaretDown;
```

**Does NOT use the registry.** These are plain exported string constants — no `registerIcon()` call, no `<ui-icon>` element. Components import exactly the SVG strings they need. Tree-shaking removes unused exports.

### When to Use Which

| Scenario | Path |
|----------|------|
| HTML template / block / application markup | Path A — `<ui-icon name="…">` |
| Component internal DOM construction | Path B — direct SVG string import |
| Consumer customization / dynamic icon swap | Path A — `name` attribute can change |
| Build-time determined, never changes | Path B — zero runtime overhead |

**Why two paths exist:** Components like `ui-calendar`, `ui-carousel`, `ui-select`, and `ui-combobox` need hardcoded chevron/caret icons that never change. Routing these through the registry + custom element adds unnecessary indirection, a DOM node, and a Map lookup for icons that are known at build time. Direct string imports are simpler and faster. The `<ui-icon>` element exists for the consumer-facing API where icons are specified in HTML and may need to change dynamically.

---

## 3. Icon Registry

### 3.1 Implementation

```ts
// src/icons/registry.ts

const icons = new Map<string, string>();
const subscribers = new Set<(name: string) => void>();

export function registerIcon(name: string, svg: string): void {
  icons.set(name, svg);
  subscribers.forEach((fn) => fn(name));
}

export function getIcon(name: string): string | undefined {
  return icons.get(name);
}

export function onIconRegistered(fn: (name: string) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
```

### 3.2 API Surface

| Export | Signature | Role |
|--------|-----------|------|
| `registerIcon` | `(name: string, svg: string) => void` | Store an SVG string in the registry. Notifies all subscribers. |
| `getIcon` | `(name: string) => string \| undefined` | Synchronous lookup by name. Returns `undefined` if not registered. |
| `onIconRegistered` | `(fn: (name: string) => void) => () => void` | Subscribe to future registrations. Returns an unsubscribe function. |

### 3.3 Design Constraints

| Constraint | Rationale |
|------------|-----------|
| Module-scoped `Map` | Singleton shared across the entire JS context. All components and consumers share one registry. |
| Synchronous `registerIcon` + subscriber notification | No async. Per-icon modules call `registerIcon()` as a top-level side effect — it executes the instant the module is evaluated. |
| Subscriber set for late registration | Solves the import-order problem (§12). Elements that upgrade before their icon modules load can subscribe and re-render when the icon arrives. |
| `registerIcon` overwrites existing entries | Enables hot-reload and consumer overrides. No error on duplicate registration. |
| No validation of SVG content | The registry stores raw strings. It does not parse, sanitize, or validate SVG. The consumer is responsible for providing valid SVG. |

---

## 4. The `<ui-icon>` Custom Element

### 4.1 Class Definition

```ts
// src/icons/ui-icon-element.ts

import { UIElement } from '@/core/ui-element.ts';
import { iconSheet } from './ui-icon.styles.ts';
import { getIcon, onIconRegistered } from './registry.ts';

export class UIIcon extends UIElement {
  static observedAttributes = ['name', 'size', 'aria-label'];
  static sheet = iconSheet;

  #unsubscribe: (() => void) | null = null;

  setup(): void {
    super.setup();
    this.#syncAria();
    this.#render();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === 'name') this.#render();
    if (name === 'aria-label') this.#syncAria();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  #syncAria(): void { /* ... */ }
  #render(): void { /* ... */ }
}
```

### 4.2 Rendering Logic

```
#render():
  1. Read name = this.getAttribute('name')
  2. If no name → clear innerHTML, unsubscribe, return
  3. Look up SVG from registry: getIcon(name)
  4. If found:
     a. this.innerHTML = svg
     b. Unsubscribe from late-registration listener (no longer needed)
  5. If NOT found:
     a. this.innerHTML = '' (empty — no placeholder, no fallback)
     b. Subscribe to onIconRegistered() if not already subscribed
     c. When the matching icon is registered, call #render() again
```

**Key behaviors:**

- **No reactive signals.** Unlike other components in the library, `UIIcon` does not use `signal()` or `addEffect()`. Icon rendering is a simple imperative read — there's no reactive graph to track. `attributeChangedCallback` directly triggers `#render()`.
- **`innerHTML` assignment.** The SVG string is injected as raw HTML. This means the SVG elements live in the light DOM as direct children of `<ui-icon>`.
- **No fallback/placeholder.** If an icon name is not registered, the element renders empty. No broken-image icon, no spinner, no error. Silent empty state.
- **Subscription cleanup.** The late-registration subscriber is removed as soon as the icon is found, or when the element disconnects. No leaked listeners.

### 4.3 Registration Wrapper

```ts
// src/icons/ui-icon.ts
export { UIIcon } from './ui-icon-element.ts';

import { UIIcon } from './ui-icon-element.ts';
import { defineWithStyles } from '@/core/define.ts';

defineWithStyles('ui-icon', UIIcon);
```

Follows the standard element split pattern: `-element.ts` (pure class) + `.ts` (registration side effect).

### 4.4 Observed Attributes

| Attribute | Type | Effect |
|-----------|------|--------|
| `name` | `string` | Icon name matching a registered icon. Triggers `#render()` on change. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | Maps to `--ui-icon-{size}` token via CSS variant rules. No JS handler — purely CSS. |
| `aria-label` | `string` | When present, switches from decorative to meaningful icon (§9). |

---

## 5. Per-Icon Codegen Modules

### 5.1 Source

Icons are sourced from `@phosphor-icons/core` (npm dependency), specifically the `assets/regular/` directory containing ~1,500 SVG files in the regular weight.

### 5.2 Generator Script

```js
// scripts/generate-icon-modules.mjs

// Input:  node_modules/@phosphor-icons/core/assets/regular/*.svg
// Output: src/icons/phosphor/{name}.ts (one per icon)
//         src/icons/phosphor/index.ts  (barrel that imports all)
```

**For each SVG file:**

1. Read the SVG file content.
2. Strip the `xmlns="..."` attribute (not needed for inline HTML rendering).
3. Trim whitespace.
4. Generate a TypeScript module:

```ts
// AUTO-GENERATED by scripts/generate-icon-modules.mjs — DO NOT EDIT
import { registerIcon } from '../registry.ts';
registerIcon('house', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="..."/></svg>');
```

**Barrel file (`index.ts`):**

```ts
// AUTO-GENERATED — imports ALL icons. Prefer per-icon imports for tree-shaking.
import './arrow-right.ts';
import './bell.ts';
import './house.ts';
// ... ~1,500 imports
```

### 5.3 Naming Convention

The icon name matches the SVG filename without extension:

| SVG File | Module | Registered Name | HTML Usage |
|----------|--------|-----------------|------------|
| `house.svg` | `phosphor/house.ts` | `'house'` | `<ui-icon name="house">` |
| `caret-down.svg` | `phosphor/caret-down.ts` | `'caret-down'` | `<ui-icon name="caret-down">` |
| `magnifying-glass.svg` | `phosphor/magnifying-glass.ts` | `'magnifying-glass'` | `<ui-icon name="magnifying-glass">` |
| `chat-circle.svg` | `phosphor/chat-circle.ts` | `'chat-circle'` | `<ui-icon name="chat-circle">` |

**Rules:**
- Kebab-case names, matching Phosphor's file naming.
- No `ph-` prefix — the registry is library-scoped, not Phosphor-scoped. If a consumer wants to register icons from another source (Lucide, Heroicons), they use the same `registerIcon()` API with their own names.
- No weight suffix — only the regular weight is generated. If other weights are needed, they can use a name convention like `house-bold`, `house-thin`.

### 5.4 Running the Generator

```bash
node scripts/generate-icon-modules.mjs
```

The script:
1. Deletes and recreates `src/icons/phosphor/` (clean generation).
2. Reads all `.svg` files from `@phosphor-icons/core/assets/regular/`.
3. Generates one `.ts` file per icon + the barrel `index.ts`.
4. Logs the count of generated modules.

The generated files are checked into version control. The script is run manually when updating the Phosphor version or adding new icons.

---

## 6. Direct SVG String Imports

### 6.1 The `icons.ts` Module

```ts
// src/icons/icons.ts
// Curated set of Phosphor icons used by library components internally.
// All SVGs from @phosphor-icons/core (regular weight).
// viewBox="0 0 256 256", fill="currentColor".

// --- Navigation: Carets ---
export const IconCaretLeft = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="..."/></svg>';
export const IconCaretRight = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="..."/></svg>';
export const IconCaretUp = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="..."/></svg>';
export const IconCaretDown = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="..."/></svg>';
export const IconCaretDoubleLeft = '<svg ...>';
export const IconCaretDoubleRight = '<svg ...>';
export const IconCaretUpDown = '<svg ...>';

// --- Actions ---
export const IconX = '<svg ...>';
export const IconMagnifyingGlass = '<svg ...>';
export const IconPaperPlaneRight = '<svg ...>';

// --- Objects ---
export const IconCalendarBlank = '<svg ...>';
export const IconSidebarSimple = '<svg ...>';
export const IconDotsThree = '<svg ...>';
export const IconPushPin = '<svg ...>';
export const IconPushPinFill = '<svg ...>';
export const IconClockCounterClockwise = '<svg ...>';
```

### 6.2 Naming Convention

| Pattern | Example |
|---------|---------|
| `Icon` + PascalCase Phosphor name | `IconCaretDown`, `IconMagnifyingGlass` |
| Filled variants get `Fill` suffix | `IconPushPinFill` |
| Multi-word names are PascalCase | `IconPaperPlaneRight`, `IconClockCounterClockwise` |

### 6.3 Usage in Components

Components import specific icons and use them as raw HTML strings:

```ts
// ui-calendar.ts
import { IconCaretLeft, IconCaretRight, IconCaretDoubleLeft, IconCaretDoubleRight } from '@/icons/icons.ts';

const CHEVRON_LEFT = IconCaretLeft;
const CHEVRON_RIGHT = IconCaretRight;

// In DOM construction:
prevBtn.innerHTML = CHEVRON_LEFT;
nextBtn.innerHTML = CHEVRON_RIGHT;
```

```ts
// ui-date-picker.ts
import { IconCalendarBlank, IconX } from '@/icons/icons.ts';

const CALENDAR_ICON = IconCalendarBlank;
const CLOSE_ICON = IconX;

triggerEl.innerHTML = CALENDAR_ICON;
clearBtn.innerHTML = CLOSE_ICON;
```

**Pattern:** Components often alias the imported constant to a semantic local name (`CHEVRON_LEFT`, `CALENDAR_ICON`) for readability at usage sites. This is a convention, not a requirement.

### 6.4 Components Using Direct Imports

| Component | Icons |
|-----------|-------|
| `ui-calendar` | `IconCaretLeft`, `IconCaretRight`, `IconCaretDoubleLeft`, `IconCaretDoubleRight` |
| `ui-carousel` | `IconCaretLeft`, `IconCaretRight`, `IconCaretUp`, `IconCaretDown` |
| `ui-chat-input` | `IconPaperPlaneRight` |
| `ui-chat-messages` | `IconCaretDown` |
| `ui-command-input` | `IconMagnifyingGlass` |
| `ui-command` | `IconPushPin`, `IconPushPinFill` |
| `ui-data-table` | `IconCaretRight`, `IconCaretDown` |
| `ui-date-picker` | `IconCalendarBlank`, `IconX` |
| `ui-nav-menu` | `IconCaretDown` |
| `ui-breadcrumb-ellipsis` | `IconDotsThree` |
| `ui-pagination-ellipsis` | `IconDotsThree` |
| `ui-pagination-next` | `IconCaretRight` |
| `ui-pagination-previous` | `IconCaretLeft` |

### 6.5 Why Not Use `<ui-icon>` Inside Components?

| Concern | Direct string | `<ui-icon>` element |
|---------|---------------|---------------------|
| DOM nodes | 1 (`<svg>`) | 2 (`<ui-icon>` + `<svg>`) |
| Registry lookup | None | Map lookup per render |
| Late-registration handling | N/A — icon is always available | Subscriber overhead |
| Tree-shaking | Dead-code eliminated by bundler | Requires importing the per-icon module |
| Style targeting | `ui-button > svg` works | `ui-button > ui-icon > svg` — extra specificity |
| Dynamic icon swap | Not possible | Possible via `name` attribute |

Components use fixed icons that never change. The overhead of the `<ui-icon>` element provides zero benefit in this context.

---

## 7. Sizing & Token Integration

### 7.1 Icon Size Tokens

Defined in `src/styles/tokens-units.css`:

```css
--ui-icon-xs: 12px;
--ui-icon-sm: 14px;
--ui-icon-md: 16px;
--ui-icon-lg: 18px;
--ui-icon-xl: 20px;
```

### 7.2 Control-Context Icon Sizing

When icons appear inside sized controls, the control's `[size]` attribute cascades an appropriate icon size token:

```css
/* In tokens-units.css */
:where([size="xs"]) { --ui-control-icon-size: var(--ui-icon-xs); }
:where([size="sm"]) { --ui-control-icon-size: var(--ui-icon-sm); }
:where([size="md"]) { --ui-control-icon-size: var(--ui-icon-md); }
:where([size="lg"]) { --ui-control-icon-size: var(--ui-icon-lg); }
:where([size="xl"]) { --ui-control-icon-size: var(--ui-icon-xl); }
```

The `--ui-control-icon-size` token is available for components to size inline SVGs appropriately. The `<ui-icon>` element uses its own `--ui-icon-size` token (controlled by its own `size` attribute or the default).

### 7.3 Size Mapping

| `<ui-icon>` `size` attribute | Token | Resolved value |
|------------------------------|-------|----------------|
| (none / default) | `--ui-icon-md` | 16px |
| `xs` | `--ui-icon-xs` | 12px |
| `sm` | `--ui-icon-sm` | 14px |
| `md` | `--ui-icon-md` | 16px |
| `lg` | `--ui-icon-lg` | 18px |
| `xl` | `--ui-icon-xl` | 20px |

---

## 8. Stylesheet

### 8.1 Full Stylesheet

```css
@layer components {
  :where(ui-icon) {
    --ui-icon-size: var(--ui-icon-md);
    --ui-icon-color: currentColor;

    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ui-icon-size);
    height: var(--ui-icon-size);
    color: var(--ui-icon-color);
    flex-shrink: 0;
    vertical-align: middle;
    line-height: 0;
  }

  :where(ui-icon) > :where(svg) {
    width: 100%;
    height: 100%;
  }
}

@layer variants {
  :where(ui-icon[size="xs"]) { --ui-icon-size: var(--ui-icon-xs); }
  :where(ui-icon[size="sm"]) { --ui-icon-size: var(--ui-icon-sm); }
  :where(ui-icon[size="md"]) { --ui-icon-size: var(--ui-icon-md); }
  :where(ui-icon[size="lg"]) { --ui-icon-size: var(--ui-icon-lg); }
  :where(ui-icon[size="xl"]) { --ui-icon-size: var(--ui-icon-xl); }
}

@layer utilities {
  @media (forced-colors: active) {
    :where(ui-icon) {
      --ui-icon-color: ButtonText;
    }
  }
}
```

### 8.2 Design Notes

| Property | Value | Rationale |
|----------|-------|-----------|
| `display: inline-flex` | — | Centers the SVG within the icon box. `inline` so it flows with text. |
| `flex-shrink: 0` | — | Prevents icons from being compressed in flex layouts. |
| `vertical-align: middle` | — | Aligns with adjacent text at the middle baseline. |
| `line-height: 0` | — | Prevents the inline-flex container from adding extra line-height space. |
| `color: var(--ui-icon-color)` | `currentColor` default | Inherits text color from parent. No separate icon color management. |
| `> svg { width: 100%; height: 100% }` | — | SVG fills the icon box. Actual size controlled by `--ui-icon-size`. |
| `:where()` wrappers | — | Zero specificity. Consumer overrides always win. |
| Three layers | `components`, `variants`, `utilities` | No `states` layer — icons are purely presentational, no interactive states. |

### 8.3 Consumer Customization

```css
/* Override icon size globally */
ui-icon { --ui-icon-size: 20px; }

/* Override icon color in a specific context */
.danger ui-icon { --ui-icon-color: oklch(55% 0.25 25); }

/* Override size for a specific icon */
ui-icon[name="logo"] { --ui-icon-size: 32px; }
```

---

## 9. Accessibility

### 9.1 Decorative vs Meaningful Icons

| State | Condition | ARIA |
|-------|-----------|------|
| **Decorative** (default) | No `aria-label` attribute | `aria-hidden="true"`, no `role` |
| **Meaningful** | `aria-label` attribute present | `role="img"`, `aria-hidden` removed |

### 9.2 Sync Logic

```ts
#syncAria(): void {
  if (this.hasAttribute('aria-label')) {
    this.setAttribute('role', 'img');
    this.removeAttribute('aria-hidden');
  } else {
    this.setAttribute('aria-hidden', 'true');
    this.removeAttribute('role');
  }
}
```

Called on `setup()` and whenever `aria-label` changes via `attributeChangedCallback`.

### 9.3 Rules

- **Most icons are decorative.** They accompany text that already conveys the meaning. Default `aria-hidden="true"` is correct.
- **Icon-only buttons** need `aria-label` on the **button**, not the icon: `<ui-button aria-label="Close"><ui-icon name="x"></ui-icon></ui-button>`. The icon remains decorative.
- **Standalone meaningful icons** (e.g., a status indicator with no adjacent text) need `aria-label` on the icon itself: `<ui-icon name="check-circle" aria-label="Approved"></ui-icon>`.
- **Never put `aria-label` on both** the icon and its parent control — screen readers would announce both.

---

## 10. Package Exports

The package exposes three entry points for icons:

```json
{
  "exports": {
    "./icons/phosphor/*": {
      "types": "./dist/icons/phosphor/*.d.ts",
      "import": "./dist/icons/phosphor/*.js"
    },
    "./icons/registry": {
      "types": "./dist/icons/registry.d.ts",
      "import": "./dist/icons/registry.js"
    },
    "./icons/ui-icon": {
      "types": "./dist/icons/ui-icon.d.ts",
      "import": "./dist/icons/ui-icon.js"
    }
  }
}
```

### Library Barrel Exports

```ts
// src/index.ts
export { UIIcon } from '@/icons/ui-icon-element.ts';    // Class only (no side effect)
export { iconSheet } from '@/icons/ui-icon.styles.ts';   // Stylesheet
export { registerIcon, getIcon } from '@/icons/registry.ts';  // Registry API
```

Note: The barrel exports the class from `-element.ts` (no registration side effect), the stylesheet, and the registry API. Per-icon modules are NOT exported from the barrel — consumers import them individually for tree-shaking.

### Consumer Import Patterns

```ts
// Register the <ui-icon> element
import 'nonoun-ui/icons/ui-icon';

// Register specific icons
import 'nonoun-ui/icons/phosphor/house';
import 'nonoun-ui/icons/phosphor/gear';
import 'nonoun-ui/icons/phosphor/bell';

// Or register ALL icons (not recommended for production)
import 'nonoun-ui/icons/phosphor/index';

// Or use the registry API directly for custom icons
import { registerIcon } from 'nonoun-ui/icons/registry';
registerIcon('my-custom-icon', '<svg viewBox="0 0 24 24">...</svg>');
```

---

## 11. Testing Contracts

### 11.1 Registry Tests

| Test | Assertion |
|------|-----------|
| `registerIcon` stores and `getIcon` retrieves | `getIcon(name) === svg` after `registerIcon(name, svg)` |
| `getIcon` returns `undefined` for unknown names | `getIcon('nonexistent') === undefined` |
| `registerIcon` overwrites existing entries | Second call replaces the first |
| Subscriber is called on registration | `onIconRegistered(fn)` — `fn` called with the registered name |
| Unsubscribe stops notifications | After calling the returned dispose function, `fn` is not called |

### 11.2 Element Tests

| Category | Test |
|----------|------|
| **Registration** | `customElements.get('ui-icon')` is defined |
| **Rendering** | `name="test-star"` → `querySelector('svg')` is not null, `innerHTML` contains `viewBox` |
| **Empty name** | No `name` attribute → `innerHTML` is empty |
| **Unknown name** | `name="does-not-exist"` → `innerHTML` is empty |
| **Name change** | Change `name` from one registered icon to another → new SVG renders |
| **Name removal** | Remove `name` attribute → `innerHTML` is empty |
| **Name to unknown** | Change to unregistered name → `innerHTML` is empty |
| **Sizing** | Each size value (`xs`/`sm`/`md`/`lg`/`xl`) is accepted as attribute |
| **Default size** | No `size` attribute → CSS defaults to `--ui-icon-md` |
| **Decorative default** | `aria-hidden="true"` present, no `role` |
| **Meaningful icon** | `aria-label="Favorite"` → `role="img"`, no `aria-hidden` |
| **Switch to decorative** | Remove `aria-label` → `aria-hidden="true"`, no `role` |
| **Switch to meaningful** | Add `aria-label` → `role="img"`, no `aria-hidden` |
| **Late registration** | Create element with unknown name, then register the icon → SVG renders |
| **Generated module** | Import a real `phosphor/{name}.ts` module → element renders the SVG |

### 11.3 Test Setup

```ts
// Register test icons before tests run (avoid depending on generated modules)
registerIcon('test-star', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128,0L168,80..."/></svg>');
registerIcon('test-circle', '<svg viewBox="0 0 256 256" fill="currentColor"><circle cx="128" cy="128" r="100"/></svg>');
```

---

## 12. Late Registration & Import Order

### 12.1 The Problem

In HTML `<script type="module">` blocks, import evaluation order is non-deterministic across modules. A common scenario:

```html
<script type="module">
  import './icons/ui-icon.ts';        // Registers <ui-icon> element
  import './icons/phosphor/house.ts'; // Registers "house" icon
</script>

<ui-icon name="house"></ui-icon>
```

When `ui-icon.ts` is evaluated first:
1. `customElements.define('ui-icon', UIIcon)` runs.
2. The `<ui-icon name="house">` element in the DOM upgrades immediately (synchronous).
3. `setup()` fires → `#render()` fires → `getIcon('house')` returns `undefined` (not yet registered).
4. The element renders empty.
5. Later, `phosphor/house.ts` is evaluated → `registerIcon('house', svg)` runs.
6. Without the subscriber mechanism, the element would stay empty forever.

### 12.2 The Solution

When `#render()` finds no icon in the registry, it subscribes to `onIconRegistered()`:

```ts
#render(): void {
  const name = this.getAttribute('name');
  if (!name) { this.innerHTML = ''; return; }

  const svg = getIcon(name);
  if (svg) {
    this.innerHTML = svg;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  } else {
    this.innerHTML = '';
    if (!this.#unsubscribe) {
      this.#unsubscribe = onIconRegistered((registered) => {
        if (registered === this.getAttribute('name')) this.#render();
      });
    }
  }
}
```

When `registerIcon('house', svg)` fires, it calls all subscribers. The `<ui-icon>` element's subscriber checks if the registered name matches its own `name` attribute. If so, it re-renders — now the icon is available.

### 12.3 Subscription Lifecycle

| Event | Subscriber state |
|-------|-----------------|
| `#render()` called, icon found | Unsubscribe (no longer needed) |
| `#render()` called, icon NOT found | Subscribe if not already subscribed |
| `name` attribute changes to a found icon | Unsubscribe |
| `name` attribute changes to unknown icon | Subscribe |
| `name` attribute removed | Unsubscribe, clear innerHTML |
| Element disconnects (`disconnectedCallback`) | Unsubscribe |

**No leaked subscribers.** Every code path that creates a subscription has a corresponding cleanup path.

---

## 13. Brand & Custom Icons

### 13.1 Brand SVGs

Brand icons (Google multi-color, GitHub, Apple) are NOT registered in the icon system. They remain as inline SVGs in HTML templates.

**Rationale (D260):** Brand SVGs have unique characteristics — multi-color fills, specific viewBox dimensions, trademark-specific paths. Forcing them through a `fill="currentColor"` single-color system would break their appearance. They are template content, not system icons.

### 13.2 Custom Icon Registration

Consumers can register their own icons alongside Phosphor icons:

```ts
import { registerIcon } from 'nonoun-ui/icons/registry';

registerIcon('my-logo', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>');
```

Then use in HTML:

```html
<ui-icon name="my-logo"></ui-icon>
```

**Rules for custom icons:**
- Use `fill="currentColor"` if you want the icon to inherit color from CSS.
- The `viewBox` can be any value — CSS controls the rendered size.
- The name must not conflict with Phosphor names (or it will overwrite them).

---

## 14. File Structure

```
src/icons/
├── registry.ts              ← Map + subscriber set (3 exports)
├── ui-icon-element.ts       ← Pure UIIcon class (no registration)
├── ui-icon.ts               ← Registration wrapper (defineWithStyles)
├── ui-icon.styles.ts        ← CSSStyleSheet via css``
├── ui-icon.schema.ts        ← Schema for HTML docs
├── ui-icon.html             ← Dev demo page
├── icons.ts                 ← Curated SVG string exports for internal use
└── phosphor/                ← AUTO-GENERATED (do not hand-edit)
    ├── index.ts             ← Barrel importing all ~1,500 icons
    ├── house.ts             ← registerIcon('house', '...')
    ├── gear.ts              ← registerIcon('gear', '...')
    ├── bell.ts              ← registerIcon('bell', '...')
    ├── caret-down.ts        ← registerIcon('caret-down', '...')
    └── ...                  ← ~1,500 total

scripts/
└── generate-icon-modules.mjs  ← Codegen script
```

---

## 15. Decision Log References

| Decision | Summary | Session |
|----------|---------|---------|
| **D260** | Blocks use inline SVG placeholders until icon system ships. Brand SVGs (Google, GitHub, Apple) remain inline permanently. | 059 |
| **D261** | Phosphor Icons imported at module level. All UI icon SVGs centralized in `icons.ts`. 13 component files migrated. No inline SVG constants remain in `src/components/`. | 060 |
| **D262** | Block icon migration to `<ui-icon>` deferred — blocks are HTML templates, not modules. | 060 |
| **D271** | 260 inline Lucide SVGs across 23 blocks replaced with Phosphor equivalents. Migration script mapped 63 Lucide patterns to Phosphor names. | 063 |
| **D347** | 13 remaining icons migrated to `<ui-icon>`, ~168 brand/decorative SVGs confirmed as intentionally inline. | 084 |
| **BACK-312** | Phosphor Icons at module level — the original initiative. | — |
| **BACK-377** | Icon system — `<ui-icon>` element + codegen + ~1,500 Phosphor modules + registry + tests + docs. | 083 |

### Evolution Timeline

1. **Pre-D261:** Components had inline SVG string constants scattered across individual files. Duplication (chevron-down in 4 files).
2. **D261 (session 060):** Centralized all component-internal icons into `icons.ts`. Components import from one place. No `<ui-icon>` element yet.
3. **D271 (session 063):** Blocks migrated from Lucide stroked SVGs to Phosphor filled SVGs. Still inline in HTML.
4. **BACK-377 (session 083):** Full icon system shipped — `<ui-icon>` element, registry, codegen, ~1,500 per-icon modules, tests, demo page.
5. **D347 (session 084):** Final migration pass — 13 remaining block icons moved to `<ui-icon>`. ~168 brand/decorative SVGs confirmed as permanently inline.

---

**Version:** 1.0.0
