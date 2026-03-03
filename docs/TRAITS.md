# Traits

26 composable behavioral controllers. Each has a **controller class** (imperative) and a **trait adapter** (for `<n-controller>`). Zero CSS -- styling is external.

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
| `ResizeController` | `resizable` | `native:resize-start/move/end` |
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
| `GatewayController` | -- | -- |

**GatewayController** has no adapter. Provides `load(url)`, `save(url, content)`, and reactive signals: `loading`, `saving`, `error`, `dirty`.

## DragController

Most complex trait. Three modes via `mode` option:

| Mode | Behavior | `native:drop` detail |
|------|----------|---------------------|
| `drop` | Highlights hovered target (`[drag-over]`) | `{ item, target, fromIndex, toIndex }` |
| `slot` | Inserts placeholder between items | `{ item, fromIndex, toIndex, insertBefore }` |
| `preview` | Moves real item in DOM during drag | `{ item, fromIndex, toIndex }` |

Options: `selector` (required), `dropZoneSelector` (separate drop targets), `axis` (`horizontal`/`vertical`/`both`), `animate` (view transitions for preview mode). Ghost uses `[popover]` for top-layer rendering and inherits CSS custom properties.

## PopoverController

Uses `DismissController` (composition, not inheritance). Manages anchor-positioned popover lifecycle.

```ts
const popover = new PopoverController(this);
popover.wirePopover(trigger, listbox);  // sets anchor-name / position-anchor
this.addEffect(() => popover.syncPopover(store.open.value));
this.addEventListener('native:dismiss', () => store.open.value = false);
```

`syncPopover()` guards `showPopover()`/`hidePopover()` with try/catch and manages the dismiss layer.

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
  register-all.ts              -- registerAllTraits()
  runtime.ts                   -- DismissStack, ToastOptions, TraitRuntime
```

**ToastController** owns its own container and creates `<n-toast>` custom elements (not raw divs). Each controller manages its own container within its host element — no global singleton. The container uses `[popover="manual"]` for top-layer rendering. `position: fixed` places it at a fixed viewport position regardless of DOM location. `destroy()` dismisses all toasts and removes the container. Component files: `src/components/toast/` (element + CSS).
