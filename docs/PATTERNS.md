# Patterns

Implementation patterns used throughout `@nonoun/native-ui`.

---

## 1. Coordinator Pattern

`n-select`, `n-combobox`, `n-command` wire existing primitives together with no visual presence.

- `display: contents` -- no box
- Discover children via `:scope >` queries in `setup()`
- Wire ARIA + events between trigger and listbox
- Drive popover via `showPopover()` / `hidePopover()`

**Two modes:**

```html
<!-- Manual: author writes children -->
<n-select>
  <n-button justify="spread">
    <span slot="label">Pick</span>
    <n-icon name="caret-up-down" slot="trailing"></n-icon>
  </n-button>
  <n-listbox popover>
    <n-option value="us">United States</n-option>
  </n-listbox>
</n-select>

<!-- Data-driven: component stamps children from data -->
<n-select placeholder="Pick" options='[{"value":"us","label":"United States"}]'></n-select>
```

Mode detected at `setup()` via `hasAttribute('options') || hasAttribute('src')`. Data-driven mode calls `#stampDOM()` synchronously before wiring.

**Event guard** -- use `stopImmediatePropagation()` (not `stopPropagation()`) to block same-element listeners:

```ts
this.addEventListener('native:change', (e: Event) => {
  if (e.target !== this) e.stopImmediatePropagation();
});
```

---

## 2. Popover Pattern

`PopoverController` uses `DismissController` (composition, not inheritance) for full popover lifecycle.

```ts
this.#popover = new PopoverController(this);
this.#popover.wirePopover(trigger, listbox);  // sets anchor-name / position-anchor
this.addEffect(() => this.#popover.syncPopover(open.value));
this.addEventListener('native:dismiss', () => controller.hide());
```

`syncPopover(open)` wraps `showPopover()` / `hidePopover()` in try/catch (both throw if already in target state). Call `this.#popover.destroy()` in `teardown()`.

**CSS:**

```css
:where(n-select) > :where(n-listbox[popover]) {
  position: fixed;
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block;
  min-width: anchor-size(inline);
}
```

**Gotcha:** Author `display` overrides UA `display: none` for `[popover]`. Always add:

```css
:where(n-listbox[popover]):not(:popover-open) { display: none; }
```

---

## 3. Form Pattern

`FormAssociable` is a mixin (spec requires `static formAssociated = true` on the class).

```ts
class NSelect extends FormAssociable(NativeElement) {
  #internals = this.attachInternals();

  setup(): void {
    this.addEffect(() => this.#internals.setFormValue(this.value ?? ''));
  }

  override onFormDisabled(disabled: boolean): void { this.#disabled.value = disabled; }
  override onFormReset(): void { this.#controller.reset(); }
  override onFormStateRestore(state: string | FormData | null): void {
    if (typeof state === 'string' && state) this.value = state;
  }
}
```

The mixin delegates browser callbacks (`formDisabledCallback`, `formResetCallback`, `formStateRestoreCallback`) to overridable `onForm*` methods.

---

## 4. Disabled Pipeline

`createDisabledEffect` from `src/core/effects.ts`:

```ts
#disabled = signal(false);

setup(): void {
  this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
}
```

It toggles `[disabled]`, sets `aria-disabled="true"` via `setAttribute()` (NOT `internals.ariaDisabled` -- CSS needs the DOM attribute), optionally manages `tabindex` (`{ manageTabindex: true }` for standalone focusable elements), and dispatches `native:disabled`.

**Coordinator cascade** -- second effect propagates to children:

```ts
this.addEffect(() => {
  const val = this.#disabled.value;
  if (trigger) trigger.toggleAttribute('disabled', val);
  if (val && this.#controller.open.peek()) this.#controller.hide();
});
```

**CSS** -- always `[aria-disabled="true"]`, never `opacity`:

```css
:where(n-button)[aria-disabled="true"] {
  background: var(--n-background-disabled);
  color: var(--n-color-disabled);
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## 5. Signal Effects

`addEffect(fn)` registers a reactive effect, auto-disposed on `disconnectedCallback`.

**`deferChildren(fn)`** defers to microtask when element has no children. Effects without child dependency must be OUTSIDE `deferChildren`:

```ts
setup(): void {
  // OUTSIDE -- no child dependency
  this.addEffect(() => this.#popover.syncPopover(open.value));

  // INSIDE -- needs children present
  this.deferChildren(() => {
    this.addEffect(() => { /* sync [active] on options */ });
  });
}
```

**Same-value skip** -- signals skip notification on identical values. Read an extra signal to force re-run:

```ts
this.addEffect(() => {
  this.#store.query.value;          // track to re-run after filtering
  const idx = this.#store.activeIndex.value;
  // ... apply [active] to visible items
});
```

---

## 6. Focus Ring

| Context | Style |
|---------|-------|
| Buttons | `outline: 2px solid var(--n-focus-ring); outline-offset: 2px` |
| Inputs | `outline: 1px solid var(--n-focus-ring); outline-offset: 0` |
| Options/items | `outline: 2px solid var(--n-focus-ring); outline-offset: -2px` |

`--n-focus-ring` is accent-based, does NOT follow intent. Focus indicators are globally consistent.

---

## 7. Filled State

Inputs/textareas differentiate empty vs filled via `:state(empty)` (`CustomStateSet`):

```css
:where(n-input) {
  background: var(--n-control);         /* empty: bordered, discoverable */
  border-color: var(--n-border-rest);
}

:where(n-input):not(:state(empty)) {
  background: var(--n-panel);           /* filled: elevated, no border */
  color: var(--n-ink-strong);
  border-color: transparent;
}
```

---

## 8. CSS Specificity

| Selector | Specificity | `:where()`? |
|----------|-------------|-------------|
| Component base | (0,0,0) | Yes: `:where(n-button)` |
| Attribute selectors | (0,1,0) | No: `[variant="primary"]` |

Rules: no `!important`, no fallback chains `var(--x, var(--y))`, components set explicit defaults that attributes override deterministically.

---

## 9. Event Naming

Colon prefix: `native:press`, `native:change`, `native:dismiss`, `native:select`.

NOT hyphen (`native-press` is wrong).

Coordinators re-dispatch: internal `native:select` from listbox becomes public `native:change` from coordinator. Event guard (pattern 1) prevents internal event leaking.

---

## 10. Debug State Attributes

| Pseudo | Attribute |
|--------|-----------|
| `:hover` | `[force-hover]` |
| `:active` | `[force-active]` |
| `:focus` | `[force-focus]` |
| `:focus-visible` | `[force-focus-visible]` |

```css
:where(n-button):hover,
:where(n-button)[force-hover] { background: var(--n-background-hover); }
```

Lean CSS variants (`components-lean.css`, `native-ui-lean.css`) strip `force-*` selectors for production.
