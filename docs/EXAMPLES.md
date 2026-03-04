# Examples

Fifteen copy-pasteable patterns for `@nonoun/native-ui`. Assumes CSS and JS are loaded:

```html
<link rel="stylesheet" href="native-ui.css" />
<script type="module">
  import '@nonoun/native-ui/register';
</script>
```

---

## 1. Button with intent and variant

```html
<n-button variant="primary" intent="accent">Save</n-button>
<n-button variant="ghost" intent="danger">Delete</n-button>
<n-button>Default Button</n-button>
```

Three buttons: filled accent, ghost danger, and default (neutral chrome, intent-colored text).

- `variant` -- `primary`, `secondary`, `default`, `ghost`, `outline`, `selected`, `plain`
- `intent` -- `accent`, `danger`, `success`, `warning`, `info` (inherits from parent)
- `size` -- `xs`, `sm`, `md`, `lg`, `xl`; `radius` -- `round`, `rounded`, `sharp`
- `inline` -- shrink-wraps instead of filling width; `disabled` -- boolean
- Slots: `leading`, `label`, `trailing`; `justify="spread"` for dropdown triggers

---

## 2. Form field with validation

```html
<n-field required>
  <label slot="label">Email</label>
  <span slot="description">We will never share your email.</span>
  <n-input type="email" required placeholder="you@example.com" name="email"></n-input>
  <span slot="error">Please enter a valid email</span>
</n-field>
```

Labeled email input. Error slot hidden by default, shown when `n-field` has `[invalid]`. `[required]` on `n-field` adds `*` to label.

- `n-field` slots: `label`, `description`, `error`
- `n-input`: `type`, `placeholder`, `name`, `required`, `disabled`, `readonly`, `value`
- `n-input` slots: `leading`, `trailing`
- Events: `native:input` (keystroke), `native:change` (blur)

---

## 3. Select dropdown

```html
<n-select>
  <n-button justify="spread">
    <span slot="label">Choose a fruit</span>
    <n-icon name="caret-up-down" slot="trailing"></n-icon>
  </n-button>
  <n-listbox popover>
    <n-option value="apple">Apple</n-option>
    <n-option value="banana">Banana</n-option>
    <n-option value="cherry">Cherry</n-option>
  </n-listbox>
</n-select>
```

Button trigger opens a popover listbox. Arrow keys navigate. Selection dispatches `native:change` with `{ value, label }`.

- Always use `justify="spread"` on the trigger button
- `n-listbox` must have the `popover` attribute
- `n-select`: `value`, `name`, `disabled`
- Data-driven mode: `<n-select placeholder="Pick" options='[{"value":"us","label":"US"}]'></n-select>`

---

## 4. Card with header, body, and footer

```html
<n-card>
  <n-header>
    <n-icon slot="leading" name="user"></n-icon>
    <span slot="label">User Profile</span>
    <n-button slot="trailing" variant="ghost" size="sm">
      <n-icon name="dots-three"></n-icon>
    </n-button>
  </n-header>
  <n-body>
    <p>Card content goes here.</p>
  </n-body>
  <n-footer>
    <n-button variant="ghost">Cancel</n-button>
    <n-button variant="primary" intent="accent">Save</n-button>
  </n-footer>
</n-card>
```

Card with 3-column header (leading/label/trailing), scrollable body, right-aligned footer. Context borders added automatically.

- `n-card`: `size`, `interactive`, `dividers`, `padding` (`none`/`tight`/`regular`/`relaxed`)
- `n-header`: slots `leading`/`label`/`trailing`/`content`; `align` (`center`/`end`), `sticky`, `dividers`
- `n-body`: `show-scrollbar`; `n-footer`: `justify` (`start`/`center`/`spread`), `sticky`
- With `n-body` present, card delegates overflow to body (header/footer stay fixed)

---

## 5. Dialog modal

```html
<n-button id="open-btn">Open Dialog</n-button>

<n-dialog id="my-dialog">
  <n-card>
    <n-header><span slot="label">Confirm Action</span></n-header>
    <n-body><p>Are you sure you want to continue?</p></n-body>
    <n-footer>
      <n-button id="cancel-btn">Cancel</n-button>
      <n-button id="confirm-btn" intent="accent">Confirm</n-button>
    </n-footer>
  </n-card>
</n-dialog>

<script>
  const dialog = document.getElementById('my-dialog');
  document.getElementById('open-btn')
    .addEventListener('native:press', () => dialog.showModal());
  document.getElementById('cancel-btn')
    .addEventListener('native:press', () => dialog.close());
  document.getElementById('confirm-btn')
    .addEventListener('native:press', () => dialog.close());
</script>
```

Centered modal. Closes on backdrop click, Escape, or `close()`. Content wraps in `n-card`.

- API: `showModal()`, `close()`
- `no-close-on-escape`, `no-close-on-backdrop` -- close prevention
- Event: `close`

---

## 6. Tabs with panels

```html
<n-tabs value="overview">
  <n-tab value="overview">Overview</n-tab>
  <n-tab value="features">Features</n-tab>
  <n-tab value="pricing">Pricing</n-tab>
  <n-tab-panels>
    <n-tab-panel value="overview"><p>Overview content.</p></n-tab-panel>
    <n-tab-panel value="features"><p>Features content.</p></n-tab-panel>
    <n-tab-panel value="pricing"><p>Pricing content.</p></n-tab-panel>
  </n-tab-panels>
</n-tabs>
```

Horizontal tab bar with sliding underline indicator. Arrow keys navigate tabs.

- `n-tabs`: `value` (active tab), `orientation="vertical"`, `size`
- `n-tab`: `value`, `disabled`; icons: `<n-tab value="x"><n-icon name="code"></n-icon> Code</n-tab>`
- Event: `native:change` with `{ value }`

---

## 7. Drawer panel

```html
<n-button id="open-drawer"><span slot="label">Open Drawer</span></n-button>

<n-drawer id="my-drawer">
  <n-header>
    <span slot="label">Settings</span>
    <n-button slot="trailing" variant="ghost" id="close-drawer">
      <n-icon name="x"></n-icon>
    </n-button>
  </n-header>
  <n-body>
    <n-field>
      <label slot="label">Display name</label>
      <n-input placeholder="Kim Granlund"></n-input>
    </n-field>
  </n-body>
  <n-footer justify="spread">
    <n-button variant="ghost">Cancel</n-button>
    <n-button variant="primary" intent="accent">Save Changes</n-button>
  </n-footer>
</n-drawer>

<script>
  const drawer = document.getElementById('my-drawer');
  document.getElementById('open-drawer')
    .addEventListener('native:press', () => drawer.showModal());
  document.getElementById('close-drawer')
    .addEventListener('native:press', () => drawer.close());
</script>
```

Slide-in panel from the right edge. Header/footer stay fixed, body scrolls.

- `side` -- `right` (default), `left`, `top`, `bottom`
- `no-close-on-escape`, `no-close-on-backdrop`
- API: `showModal()`, `close()`

---

## 8. Draggable list (slot mode)

```html
<n-controller traits="draggable" draggable-mode="slot" draggable-selector=".item">
  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    <div class="item">Item A</div>
    <div class="item">Item B</div>
    <div class="item">Item C</div>
  </div>
</n-controller>
```

Reorderable list. A placeholder appears between items during drag to show insertion point.

- `traits` -- space-separated names (e.g. `"draggable"`, `"pressable"`)
- `draggable-mode` -- `slot` (reorder) or `drop` (highlight target)
- `draggable-selector` -- CSS selector for draggable items
- `draggable-axis` -- `vertical`, `horizontal`, or omit for both
- Events: `native:drag-start`, `native:drag-move`, `native:drop` (`{ item, fromIndex, toIndex, insertBefore }`)

---

## 9. Theme customization

Override color env parameters to reskin the entire design system.

```css
:root {
  --n-env-hue-accent: 280;        /* shift accent to purple (default 230) */
  --n-env-chroma: 0.25;           /* increase global saturation (default 0.20) */
  --n-env-lightness-min: 0.20;    /* darken lowest stop (default 0.15) */
  --n-env-lightness-max: 0.95;    /* lightest stop (default 1.0) */
}
```

Nine global env parameters: `--n-env-lightness-min`, `--n-env-lightness-max`, `--n-env-lightness-delta`, `--n-env-chroma`, `--n-env-chroma-k-muted`, `--n-env-chroma-k-vivid`, `--n-env-chroma-k-edge`, `--n-env-alpha`, `--n-env-alpha-delta`.

Per-family overrides: `--n-env-hue-{family}`, `--n-env-chroma-{family}`, `--n-env-lightness-{family}` (families: `neutral`, `accent`, `info`, `success`, `warning`, `danger`).

Light/dark mode: set `color-scheme: dark` on `:root`. Color primitives use `light-dark()` internally.

---

## 10. Icons with name and weight

```html
<!-- Outline (default) -->
<n-icon name="heart"></n-icon>

<!-- Filled variant -->
<n-icon name="heart" weight="fill"></n-icon>

<!-- Inside a button with label -->
<n-button variant="primary" intent="accent">
  <n-icon name="plus" slot="leading"></n-icon>
  <span slot="label">Add Item</span>
</n-button>

<!-- Icon-only button (auto-detects, becomes square) -->
<n-button variant="ghost" aria-label="Close">
  <n-icon name="x"></n-icon>
</n-button>
```

Phosphor icons. Inherit `color` from parent, size from `--n-icon-size`.

- `name` -- kebab-case Phosphor name (`house`, `magnifying-glass`, `caret-up-down`)
- `weight` -- `fill` for solid; omit for outline
- `size` -- `xs`, `sm`, `md`, `lg`, `xl`
- `aria-label` -- gives icon `role="img"`; without it, icon is `aria-hidden="true"`
- Custom: `registerIcon(name, svgString)` from `@nonoun/native-ui`

---

## 11. Signals (reactive state)

native-ui includes a minimal signal system for reactive state management. Five functions: `signal`, `computed`, `effect`, `batch`, `untrack`.

```html
<script type="module">
  import { signal, computed, effect, batch } from '@nonoun/native-ui';

  // Mutable reactive value
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  // Auto-tracking side effect -- re-runs when dependencies change
  effect(() => {
    document.getElementById('output').textContent = `Count: ${count.value}, Doubled: ${doubled.value}`;
  });

  // Update triggers effect
  document.getElementById('inc').addEventListener('click', () => {
    count.value++;
  });

  // Batch multiple writes -- effects flush once at end
  document.getElementById('reset').addEventListener('click', () => {
    batch(() => {
      count.value = 0;
    });
  });
</script>

<span id="output"></span>
<button id="inc">+1</button>
<button id="reset">Reset</button>
```

- `signal(initial)` -- mutable value, read/write via `.value`, `.peek()` reads without tracking
- `computed(fn)` -- lazy derived value, recomputes when dependencies change
- `effect(fn)` -- side effect, auto-tracks signal reads, re-runs on change, returns dispose function
- `batch(fn)` -- groups writes, effects flush once at end
- `untrack(fn)` -- read signals inside `fn` without creating dependencies
- Same-value writes are skipped (`Object.is` comparison)

---

## 12. Traits (composable behaviors)

26 trait controllers that add interactive behavior to any HTML element. Use declaratively via `<n-controller>` or imperatively via controller classes.

```html
<!-- Pressable: adds native:press event to any element -->
<n-controller traits="pressable">
  <div class="my-card">Click or Enter to activate</div>
</n-controller>

<script>
  document.querySelector('.my-card').addEventListener('native:press', () => {
    console.log('Pressed!');
  });
</script>
```

```html
<!-- Draggable: reorder items with drag-and-drop -->
<n-controller traits="draggable" draggable-selector=".item" draggable-axis="vertical" draggable-mode="slot">
  <div id="list">
    <div class="item">First</div>
    <div class="item">Second</div>
    <div class="item">Third</div>
  </div>
</n-controller>

<script>
  document.getElementById('list').addEventListener('native:drop', (e) => {
    const { item, insertBefore } = e.detail;
    if (insertBefore) insertBefore.before(item);
    else list.appendChild(item);
  });
</script>
```

```html
<!-- Collapsible: animated expand/collapse -->
<n-controller traits="collapsible">
  <div>
    <button>Toggle</button>
    <div class="content">Collapsible content here.</div>
  </div>
</n-controller>
```

- `registerAllTraits()` must run before component `define()` calls
- Options use namespaced attributes: `draggable-axis`, `draggable-mode`, etc.
- Full trait table: see [TRAITS.md](TRAITS.md)
- Key traits: `pressable`, `draggable`, `hoverable`, `dismissable`, `collapsible`, `resizable`, `toastable`, `sortable`, `editable`, `swipeable`

---

## 13. OKLCH color system

All colors are computed from 9 environment parameters using OKLCH (`oklch(L C H)`). Dark mode is automatic via `light-dark()` -- zero JS.

```html
<!-- Automatic dark mode: just set color-scheme -->
<html style="color-scheme: light dark">

<!-- Override the 9 env knobs to reskin everything -->
<style>
  :root {
    --n-env-hue-neutral: 155;       /* green-tinted neutrals */
    --n-env-hue-accent: 155;        /* green accent */
    --n-env-chroma-neutral: 0.25;   /* more saturated neutrals */
    --n-env-chroma: 0.25;           /* global chroma ceiling */
  }
</style>

<!-- Or use a built-in theme -->
<html theme="forest">
```

**6 color families**: `neutral`, `accent`, `info`, `success`, `warning`, `danger`. Each has its own hue, chroma, and lightness.

**Elevation tokens** (UI layering -- "higher" always means more elevated):

| Token | Usage |
|-------|-------|
| `--n-body` | Page background |
| `--n-control` | Empty form inputs |
| `--n-panel` | Toolbars, sidebars |
| `--n-button` | Button chrome |
| `--n-card` | Card surfaces |
| `--n-modal` | Dialog surfaces |

**Semantic tokens** (two-tier resolution):

```css
/* Tier 1: per-family definition */
--n-panel-accent        /* panel ground, accent family */
--n-ink-muted-danger    /* muted text, danger family */

/* Tier 2: resolved by [intent] attribute */
--n-panel               /* resolves to --n-panel-{family} based on intent */
--n-ink-muted           /* resolves to --n-ink-muted-{family} */

/* Components read Tier 2 */
background: var(--n-background);  /* set by variant selector */
color: var(--n-color);
```

Full details: see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)

---

## 14. Component variants

All interactive components support `variant` and `intent` attributes. Variant controls the chrome (visual treatment), intent controls the color family.

```html
<!-- Variants -->
<n-button variant="primary" intent="accent">Filled accent</n-button>
<n-button variant="secondary">Bordered neutral</n-button>
<n-button variant="default" intent="danger">Neutral chrome, danger text</n-button>
<n-button variant="ghost">No background</n-button>
<n-button variant="outline" intent="info">Border only</n-button>
<n-button variant="plain">Text only, no radius</n-button>

<!-- Sizes -->
<n-button size="xs">Extra small</n-button>
<n-button size="sm">Small</n-button>
<n-button size="md">Medium (default)</n-button>
<n-button size="lg">Large</n-button>
<n-button size="xl">Extra large</n-button>

<!-- Density -->
<n-button density="compact">Tight spacing</n-button>
<n-button density="loose">Relaxed spacing</n-button>

<!-- Radius -->
<n-button radius="sharp">Square corners</n-button>
<n-button radius="rounded">Soft corners</n-button>
<n-button radius="round">Pill corners (default)</n-button>

<!-- Intent inherits to children -->
<div intent="danger">
  <n-button variant="primary">Danger filled</n-button>
  <n-button variant="ghost">Danger ghost</n-button>
  <n-input placeholder="Danger input"></n-input>
</div>
```

| Variant | Background | Text | Border | Best for |
|---------|-----------|------|--------|----------|
| `primary` | Filled (`--n-surface`) | White (`--n-surface-ink`) | transparent | Primary actions |
| `secondary` | Subtle (`--n-button`) | Intent-colored | Muted border | Secondary actions |
| `default` | Neutral chrome | Intent-colored text | Neutral border | Default state |
| `ghost` | transparent | Intent-colored | transparent | Toolbar actions |
| `outline` | transparent | Intent-colored | Intent border | Outlined actions |
| `selected` | White | Dark (`--n-ink-inverse`) | transparent | Active/selected state |
| `plain` | transparent | Intent-colored | transparent, no radius | Inline text actions |

- `variant` controls the visual chrome -- background, border, text contrast
- `intent` controls the color family -- `neutral` (default), `accent`, `info`, `success`, `warning`, `danger`
- `intent` inherits via CSS custom properties -- set on a parent, all children follow
- `size`, `density`, `radius` are independent of variant/intent -- combine freely

---

## 15. Chat interface (`@nonoun/native-chat`)

```html
<link rel="stylesheet" href="native-ui.css" />
<link rel="stylesheet" href="native-chat.css" />
<script type="module">
  import '@nonoun/native-ui/register';
  import '@nonoun/native-chat/register';
</script>

<native-chat-panel show-stop>
  <div slot="header-trailing"><n-badge intent="success">Online</n-badge></div>

  <n-chat-feed auto-scroll>
    <n-chat-messages role="user" sender="You">
      <n-chat-avatar name="You"></n-chat-avatar>
      <n-chat-message role="user" message-id="1">
        <n-chat-message-text content="What is **OKLCH**?"></n-chat-message-text>
      </n-chat-message>
    </n-chat-messages>

    <n-chat-messages role="assistant" sender="Assistant">
      <n-chat-avatar icon="robot"></n-chat-avatar>
      <n-chat-message role="assistant" message-id="2">
        <n-chat-message-text content="OKLCH is a perceptual color space..."></n-chat-message-text>
      </n-chat-message>
    </n-chat-messages>

    <n-chat-message-activity type="thinking" active></n-chat-message-activity>
  </n-chat-feed>
</native-chat-panel>
```

Full chat interface with message bubbles, avatars, and typing indicator.

- **`native-chat-panel`**: shell with header/footer; `show-stop`/`show-restart` stamp action buttons
- **`n-chat-feed`**: scrollable thread coordinator; `auto-scroll` keeps view pinned to bottom
- **`n-chat-messages`**: message group (cluster from same sender); `role` controls alignment (user=right, assistant=left)
- **`n-chat-message`**: individual bubble with action toolbar (copy/edit/retry/feedback on hover)
- **`n-chat-avatar`**: avatar with `src` (image), `icon`, or `name` (initials) fallback
- **`n-chat-message-text`**: markdown renderer + HTML sanitizer; set `content` property
- **`n-chat-message-activity`**: typing/thinking indicator; `active` shows animation + elapsed timer
- **`n-chat-message-seed`**: suggestion chips; `options='[{"value":"x","label":"Y"}]'`
- **`n-chat-input`**: composer with `busy` mode, `focusComposer()`/`blurComposer()` API
- Events: `native:message-action`, `native:seed-select`, `native:feed-scroll`, `native:send`
- Slots: `slot="header-trailing"`, `slot="footer-leading"` on panel for app-level controls
