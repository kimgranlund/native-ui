# Component Reference

All components render correctly with zero attributes. CSS uses `:where()` (zero specificity) so consumer styles always win. Events use the `native:` prefix with colon separator (e.g. `native:press`).

**Global attributes** on interactive components: `size` (xs/sm/md/lg/xl), `density` (compact/default/loose), `radius` (sharp/rounded/round), `intent` (neutral/accent/info/success/warning/danger), `disabled`.

**Display convention**: Field-level components fill width (block). Toggle widgets shrink-wrap (inline). Block components support `[inline]` attribute to restore shrink-wrap.

**Form association**: Most inputs use `ElementInternals`. Set `name` for form data.

---

## Buttons and Actions

### `n-button`
Interactive button. Display: `grid` (fills width; `[inline]` for `inline-grid`).

Attributes: `variant` (default/primary/secondary/ghost/outline/selected/plain), `intent`, `size`, `density`, `radius`, `inline`, `disabled`, `justify` (spread). Slots: `leading`, `label`, `trailing`. Events: `native:press`. Form-associated.

Default variant is `default` (neutral chrome, intent-colored text). Icon-only mode auto-activates with `<n-icon>` as only child. Use `justify="spread"` on trigger buttons inside `n-select`.

### `n-icon`
Phosphor icon. Display: `inline-flex`.

Attributes: `name` (e.g. "house"), `weight` (regular/fill; default regular), `intent` (accent/success/warning/danger/info/muted). Empty icons collapse to zero size.

---

## Text Inputs

### `n-input`
Single-line text input (`contenteditable`). Display: `flex` (fills width; `[inline]` for `inline-flex`).

Attributes: `type` (text/password/email/url/tel/search), `placeholder`, `value`, `disabled`, `readonly`, `required`, `name`, `maxlength`, `pattern`, `formatting` (space-separated: `code`). Slots: `leading`, `trailing`. Events: `native:input` (keystroke), `native:change` (blur), `native:format` (`{ type, value }`). Form-associated.

**Formatting**: `formatting="code"` enables inline code formatting. `applyFormat('code')` wraps/unwraps selected text with backticks. Keyboard shortcut: `Cmd/Ctrl+E`.

Uses `:state(empty)` for empty/filled visual differentiation. Filled inputs elevate from `--n-control` to `--n-panel` and drop border.

### `n-textarea`
Multi-line text input (`contenteditable`). Display: `block`.

Attributes: `placeholder`, `value`, `disabled`, `readonly`, `required`, `name`, `rows` (1/2/3/4/5/6/8/10; default 3), `maxlength`, `autogrow`, `formatting` (space-separated: `code bold italic`). Events: `native:input`, `native:change`, `native:format` (`{ type, value }`). Form-associated. `[autogrow]` auto-sizes height and disables manual resize.

**Formatting**: `formatting="code bold italic"` enables inline text formatting. `applyFormat(type)` wraps/unwraps selected text with markers (`` ` `` for code, `**` for bold, `_` for italic). Keyboard shortcuts when enabled: `Cmd/Ctrl+E` (code), `Cmd/Ctrl+B` (bold), `Cmd/Ctrl+I` (italic).

### `n-range`
Slider input. Display: `flex` (fills width).

Attributes: `min`, `max`, `step`, `value`, `disabled`, `name`. Events: `native:input` (drag), `native:change` (release). Form-associated.

### `n-input-otp`
One-time password input with digit cells. Display: `inline-flex`.

Attributes: `length`, `value`, `name`, `disabled`, `mask` (dots). Events: `native:change`. Form-associated.

---

## Selection Controls

### `n-checkbox`
Checkbox toggle. Display: `inline-flex`. Label text as children.

Attributes: `checked`, `disabled`, `indeterminate`, `name`, `value`. Events: `native:change`. ARIA: `aria-checked="true"` / `"mixed"`. Form-associated.

### `n-radio`
Radio button (use inside `n-radio-group`). Display: `inline-flex`.

Attributes: `value`, `checked`, `disabled`, `name`. Events: `native:change`. `n-radio-group`: display `flex column`, attribute `orientation` (horizontal). Form-associated.

### `n-switch`
Toggle switch. Display: `inline-flex`. Label text as children.

Attributes: `checked`, `disabled`, `name`. Events: `native:change`. Form-associated.

### `n-segmented-control`
Segmented button group. Display: `grid` (fills width; `[inline]` for `inline-grid`).

Children: `n-segment` elements. Attributes: `disabled`, `inline`. Events: `native:change`. Selected segment uses floating white indicator with `--n-ink-inverse` text.

---

## Dropdowns (Coordinator Pattern)

Coordinators use `display: contents` (no visual box). They wire child elements via events and ARIA.

### `n-select`
Select dropdown. Display: `contents`.

Attributes: `placeholder`, `value`, `disabled`, `name`, `options` (JSON array), `src` (remote URL). Events: `native:change` (`{ value, label }`). Form-associated.

**Manual mode**: Author writes `n-button` (trigger with `justify="spread"`) + `n-listbox[popover]` > `n-option`.
**Data-driven mode**: Set `options` or `src` attribute. Component stamps its own children.

### `n-combobox`
Filterable select. Display: `contents`. Wraps `n-input` + `n-listbox[popover]`.

Attributes: `placeholder`, `value`, `disabled`, `name`, `options`, `src`. Events: `native:change`. Form-associated.

### `n-command`
Command palette. Display: `flex column`.

Attributes: `placeholder`, `disabled`, `popover`. Children: `n-command-input` + `n-command-list` > `n-command-group` > `n-command-item`. Events: `native:change`, `native:dismiss`. Typically placed inside `n-dialog`.

### `n-listbox`
Scrollable option list. Display: `flex column`. Default bg: `--n-control`.

Attributes: `popover`, `multiple`, `disabled`. Children: `n-option` (attrs: `value`, `disabled`), `n-option-group` > `n-option-group-header`. Events: `native:select`. Supports anchor-positioned popover with animated open/close.

---

## Form Layout

### `n-field`
Form field wrapper. Display: `flex column`.

Attributes: `required` (shows asterisk), `invalid` (shows error slot), `disabled`. Slots: `label`, `description`, `error` + default slot for input.

---

## Navigation and Disclosure

### `n-tabs`
Tab interface with sliding indicator. Display: `grid`.

Attributes: `orientation` (vertical), `inline`, `disabled`. Children: `n-tab` + `n-tab-panels` > `n-tab-panel`. Events: `native:change` (`{ value, label }`).

### `n-breadcrumb`
Breadcrumb trail. Display: `flex` (wraps).

Children: `n-breadcrumb-item` (attrs: `current`, `href`). Separator customizable via `--n-breadcrumb-separator`.

### `n-pagination`
Page navigation. Display: `inline-flex`.

Attributes: `total`, `current`, `per-page`, `disabled`. Events: `native:change`.

### `n-pagination-dots`
Dot indicator with sliding pill. Display: `inline-flex`. Standalone alternative to `n-pagination` for small sets.

Attributes: `total`, `current`, `disabled`. Events: `native:change` (`{ current }`). Active dot uses a sliding pill indicator (same animation technique as `n-tabs`/`n-segmented-control`). Use for slideshows, onboarding wizards, or compact paging where numbered navigation is unnecessary.

### `n-tree`
Hierarchical tree view. Display: `flex column`.

Attributes: `disabled`. Children: `n-tree-item` (nestable; attrs: `expanded`, `disabled`; slot: `label`). Nesting depth via `--n-tree-depth`.

### `n-accordion`
Expandable disclosure sections (native `<details>`/`<summary>`). Display: `flex column`.

Attributes: `disabled`. Children: `n-accordion-item`. Items share borders between siblings. Animated chevron.

---

## Display

### `n-avatar`
User avatar. Display: `inline-flex`.

Attributes: `src` (image URL), `size`, `radius`, `intent`. Falls back to text content (initials) or child `<n-icon>`.

### `n-badge`
Status badge. Display: `inline-flex`. Default radius: pill.

Attributes: `intent`, `dot` (small dot), `floating` (absolute positioned).

### `n-tooltip`
Tooltip popover. Display: `contents` (closed), top-layer when open.

Attributes: `placement` (top/bottom/left/right), `content`. Anchor-positioned, auto-flips via `position-try-fallbacks`.

### `n-kbd`
Keyboard shortcut indicator. Display: `inline-flex`. Monospace.

### `n-calendar`
Date picker calendar. Display: `inline-flex column`.

Attributes: `value`, `view` (day/month/year), `min`, `max`, `disabled`. Events: `native:change`, `native:range-select` (`{ start, end }`). Supports single and range selection.

### `n-table`
Data table (CSS subgrid). Display: `grid`.

Attributes: `variant` (default/plain), `selectable`, `sticky-header`, `sticky-column`, `resizable`, `reorderable`. Children: `n-table-head` > `n-table-row` > `n-table-header`, `n-table-body` > `n-table-row` > `n-table-cell`. Events: `native:table-sort`, `native:table-select`.

`n-table-header` attrs: `sortable`, `sort` (asc/desc). `n-table-row` attr: `colspan` (full-width section header).

### `n-slideshow`
Content carousel (CSS scroll-snap). Display: `grid`.

Attributes: `per-view`, `controls`, `indicators`, `autoplay`, `direction` (vertical), `gap`, `peek`, `loop`. Children: `n-slide`. Events: `native:slide-change` (`{ index, slide }`).

---

## Overlays

### `n-dialog`
Modal dialog (native `<dialog>`). Display: `contents`.

Attributes: `no-close-on-escape`, `no-close-on-backdrop`. API: `showModal()`, `close()`. Events: `close`. Sizing: `--n-dialog-width`, `--n-dialog-shadow`. Typically wraps `n-card`.

### `n-drawer`
Slide-out panel (native `<dialog>`). Display: `contents`.

Attributes: `side` (left/right/top/bottom; default right). API: `showModal()`, `close()`. Events: `close`. Sizing: `--n-drawer-width`, `--n-drawer-height`. Contains `n-drawer-panel`.

---

## Feedback

### `n-toast`
Toast notification. Display: `flex`. Created by `ToastController` — not authored in HTML directly.

Attributes: `message`, `intent` (info/success/warning/danger), `dismissible`. Events: `native:dismiss` (close button). Role: `alert` via internals.

Use via `ToastController`: each controller owns its own `.n-toast-container[popover="manual"]` inside its host. `toast()` creates `<n-toast>`, `dismissToast(id)` removes one, `dismissAllToasts()` clears all, `destroy()` tears down the container.
