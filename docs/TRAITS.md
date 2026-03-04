# Traits

28 composable behavioral controllers. Each has a **controller class** (imperative) and a **trait adapter** (for `<n-controller>`). Zero CSS -- styling is external.

## Usage Patterns

### Controller (imperative)

For component internals and JS. Create in `setup()`, destroy in `teardown()`.

```ts
import { PressController } from '@nonoun/native-ui';
class MyButton extends NativeElement {
  #press: PressController;
  setup() { this.#press = new PressController(this); }
  teardown() { this.#press.destroy(); }
}
```

### Provider (declarative)

`<n-controller>` applies traits to HTML elements. Options use namespaced attributes.

```html
<n-controller traits="pressable">
  <div>Click me</div>
</n-controller>
<n-controller traits="draggable" draggable-axis="vertical" draggable-selector=".item">
  <div><div class="item">A</div><div class="item">B</div></div>
</n-controller>
```

`registerAllTraits()` must run **before** any `define()`. In HTML, use two `<script type="module">` blocks.

## Trait Table

| Controller | Adapter | Events |
|-----------|---------|--------|
| `PressController` | `pressable` | `native:press` |
| `HoverController` | `hoverable` | `native:hover-start/end` |
| `DismissController` | `dismissable` | `native:dismiss` |
| `PopoverController` | `popoverable` | -- |
| `DialogController` | `dialogable` | `native:dismiss` |
| `PresentController` | `presentable` | `native:present`, `native:dismiss` |
| `FocusTrapController` | `focus-trappable` | -- |
| `RovingFocusController` | `roving-focusable` | -- |
| `ListNavigateController` | `list-navigable` | -- |
| `DragController` | `draggable` | `native:drag-start/move/over/drop/cancel` |
| `DropZoneController` | `droppable` | `native:drop-enter/leave/drop` |
| `RangeSelectController` | `range-selectable` | `native:range-change/select` |
| `ResizeController` | `resizable` | `native:resize-start/move/end` (detail includes `handle` in corner mode) |
| `CollapsibleController` | `collapsible` | `native:expand/collapse` |
| `SortController` | `sortable` | `native:sort` |
| `SelectionController` | `selectable` | `native:selection-change` |
| `SearchController` | `searchable` | `native:search` |
| `EditController` | `editable` | `native:edit-start/commit/cancel` |
| `CopyController` | `copyable` | `native:copy` |
| `ClipboardController` | `clippable` | `native:clip` |
| `SwipeController` | `swipeable` | `native:swipe` |
| `ToastController` | `toastable` | `native:toast` |
| `ValidateController` | `validatable` | `native:valid/invalid` |
| `IntersectController` | `intersectable` | `native:intersect` |
| `VirtualScrollController` | `virtualizable` | `native:virtual-change` |
| `SlashCommandController` | `slash-commandable` | `native:slash-query/select` |
| `ShortcutController` | `shortcutable` | `native:shortcut` |
| `GatewayController` | -- | -- |

**SlashCommandController** detects `/` at the caret position (preceded by whitespace or at text start) in contenteditable inputs. Creates a caret-anchored `n-listbox[popover]` with `position: fixed`. Filters commands by query. Arrow keys navigate, Enter selects, Tab selects with 2+ character query, Escape dismisses, `Cmd/Ctrl+/` toggles. On selection, replaces the `/query` text with a styled `<span data-slash-command>` tag. Events: `native:slash-query` (`{ query, commands }`), `native:slash-select` (`{ command }`). Command interface: `{ value, label, description?, icon? }`. Options render with visible description spans (muted, pushed right).

**ShortcutController** registers keyboard shortcuts with platform-adaptive modifier keys. Combo strings use `+` separators: `"mod+k"`, `"escape"`, `"shift+?"`. `mod` resolves to `meta` on Mac, `ctrl` elsewhere. Matching is exact — unspecified modifiers must be false. Editable elements (input/textarea/contenteditable) are filtered by default (`allowEditable: true` to override). Options: `shortcuts` (array of `ShortcutBinding`), `global` (listen on `document` capture phase instead of host). `ShortcutBinding`: `id`, `combo`, `handler?`, `when?`, `preventDefault?` (default true), `stopPropagation?` (default false), `allowEditable?` (default false). Runtime API: `add(binding)`, `remove(id)`, `destroy()`. First matching binding wins.

```ts
const ctrl = new ShortcutController(host, {
  shortcuts: [
    { id: 'search', combo: 'mod+k', handler: () => openSearch() },
    { id: 'help', combo: 'shift+?', when: () => !isSearchOpen() },
  ],
  global: true,
});
ctrl.add({ id: 'close', combo: 'escape', handler: () => close() });
ctrl.remove('search');
```

**GatewayController** has no adapter. Provides `load(url)`, `save(url, content)`, and reactive signals: `loading`, `saving`, `error`, `dirty`.

## DragController

Most complex trait. Three modes via `mode` option:

| Mode | Behavior | `native:drop` detail |
|------|----------|---------------------|
| `drop` | Highlights hovered target (`[drag-over]`) | `{ item, target, fromIndex, toIndex }` |
| `slot` | Inserts placeholder between items | `{ item, fromIndex, toIndex, insertBefore }` |
| `preview` | Moves real item in DOM during drag | `{ item, fromIndex, toIndex }` |

Options: `selector` (required), `dropZoneSelector` (separate drop targets), `axis` (`horizontal`/`vertical`/`both`), `animate` (view transitions for preview mode). Ghost uses `[popover]` for top-layer rendering and inherits CSS custom properties.

## ResizeController

Edge and corner resize handles. Options: `handleSelector` (required), `axis`, `min`, `max`, `reverse`, `disabled`.

**Corner mode**: `handleMode: 'corner'` enables corner handles. `handles` array specifies which corners (`top-left`, `top-right`, `bottom-left`, `bottom-right`). Handle elements use `data-handle` attribute. Per-corner sign logic: bottom-right grows on +dx/+dy, top-left shrinks. Additional per-axis constraints: `minWidth`, `maxWidth`, `minHeight`, `maxHeight`. Event detail includes `handle` property in corner mode.

## PopoverController

Uses `DismissController` (composition, not inheritance). Manages anchor-positioned popover lifecycle.

```ts
const popover = new PopoverController(this);
popover.wirePopover(trigger, listbox);  // sets anchor-name / position-anchor
this.addEffect(() => popover.syncPopover(store.open.value));
this.addEventListener('native:dismiss', () => store.open.value = false);
```

`syncPopover()` guards `showPopover()`/`hidePopover()` with try/catch and manages the dismiss layer.

## PresentController

Shows any element in a full-viewport modal dialog overlay. Used by `<native-a2ui>`, `<native-playground>`, and `<native-editor>` for expand buttons.

```ts
const ctrl = new PresentController(host);
ctrl.present();   // wraps host in <dialog>, calls showModal()
ctrl.dismiss();   // unwraps host back to original position
ctrl.destroy();   // dismiss + cleanup (call in teardown)
```

**Options**: `inset` (safety margin from viewport, default `'2rem'`), `closeButton` (auto-inject X button, default `true`).

**Events**: `native:present` (after open), `native:dismiss` (after close and unwrap).

**How it works**: Creates a `<dialog>` at the host's exact DOM position, moves host inside a centering wrapper (`display: grid; place-items: center`), calls `showModal()`. Sets `[presented]` attribute on the host — CSS uses this to switch from bounded to full-viewport sizing. On dismiss: `dialog.replaceWith(host)` restores original DOM, removes `[presented]`.

**CSS pattern** — add a `[presented]` rule to any component that uses PresentController:
```css
:where(my-element)[presented] {
  width: 100%; height: 100%;
  justify-self: stretch; align-self: stretch;
  border: none; border-radius: 0;
}
```

**Key principle**: Dialog is inserted where the host was (not on `document.body`). `showModal()` promotes to top layer for rendering while the element stays in the DOM tree — CSS custom properties from ancestors inherit normally.

## n-controller Modes

- **Wrapper** (default) -- applies traits to first element child
- **Selector** (`for="..."`) -- applies to matching descendants, MutationObserver watches additions
- **Provider** (`provides="..."`) -- future context API, not yet implemented

## Controller Lifecycle

`constructor(host, options)` — some controllers call `attach()` in constructor (e.g. DragController), others don't (e.g. PopoverController). `attach()`/`detach()` are idempotent. `destroy()` calls `detach()` + cleans up. Event handlers use arrow-function properties for auto-binding.

## File Layout

```
src/traits/
  {name}-controller.ts         -- controller class
  adapters/{name}-adapter.ts   -- TraitAdapter for n-controller
  register-all.ts              -- registerAllTraits() (28 adapters)
  runtime.ts                   -- DismissStack, ToastOptions, TraitRuntime
```

**ToastController** owns its own container and creates `<n-toast>` custom elements (not raw divs). Each controller manages its own container within its host element — no global singleton. The container uses `[popover="manual"]` for top-layer rendering. `position: fixed` places it at a fixed viewport position regardless of DOM location. `destroy()` dismisses all toasts and removes the container. Component files: `src/components/toast/` (element + CSS).
