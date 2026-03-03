# Examples

Ten copy-pasteable patterns for `@nonoun/native-ui`. Assumes CSS and JS are loaded:

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
