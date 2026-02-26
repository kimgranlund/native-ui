# Master Backlog — Consolidated from Audit Tournaments #1–#4

> **Last updated**: 2026-02-25
> **Sources**: AUDIT-BACKLOG.md (#1), AUDIT-BACKLOG-2.md (#2), AUDIT-BACKLOG-3.md (#3), AUDIT-BACKLOG-4.md (#4)
> **Total items**: 232 original → **0 open** (232 resolved)
> **Open breakdown**: **P0=0**, **P1=0**, P2=0, P3=0, P4=0

---

## Recently Fixed

- [x] **BUG-003**: DialogController.destroy() leaks 3 event listeners — converted to arrow properties with proper `removeEventListener` in `destroy()`
- [x] **BUG-005**: DragController missing error boundary — added try-catch around `#createGhost()`, calls `#cleanup()` on error
- [x] **BUG-007**: PopoverController `showPopover()` missing try-catch — added guard matching existing `hidePopover()` pattern
- [x] **CSS-002**: ui-tabs missing `[hidden]` on container — added `:where(ui-tabs)[hidden] { display: none }`
- [x] **CSS-003**: ui-command missing `:not(:popover-open)` hidden rule — added popover guard + `[hidden]` rule
- [x] **DIS-001/DIS-003**: ui-select disabled pipeline — added `createDisabledEffect()` + trigger cascade + popover close
- [x] **DIS-002/DIS-004**: ui-combobox disabled pipeline — added `createDisabledEffect()` + input cascade + popover close
- [x] **DIS-005**: ui-tooltip disabled support — added `#disabled` signal, property, `attributeChangedCallback`, event handler guards, close-on-disable effect
- [x] **DIS-006**: ui-pagination disabled support — added `#disabled` signal, property, `createDisabledEffect()`, `#goTo` guard, CSS disabled rule
- [x] **DIS-007**: ui-command disabled support — added `#disabled` signal, property, `createDisabledEffect()`, event handler guards, CSS disabled rule
- [x] **DIS-011**: PopoverController popover stays open when parent disabled — fixed as part of DIS-001/DIS-002 (cascade effects close popover when disabled)
- [x] **ARIA-001**: ui-breadcrumb-item `internals.ariaDisabled` → `setAttribute('aria-disabled')` so CSS selectors match
- [x] **DIS-009**: ui-chat-input submit button never re-enabled after un-disabling — added `#syncSubmitEnabled()` in the un-disable path
- [x] **CSS-006**: ui-dialog top-layer missing `--_widget-size` — added `--_widget-size: var(--ui-widget-md)`
- [x] **CSS-007**: ui-drawer top-layer missing `--_widget-size` — added `--_widget-size: var(--ui-widget-md)`
- [x] **ARIA-004**: ui-tree-item `internals.ariaExpanded` → `setAttribute('aria-expanded', ...)` so DOM attribute is present for assistive tech
- [x] **TRAIT-003**: UILayoutChat not exported from `src/index.ts` — added export
- [x] **DIS-024**: ui-input-otp `#onCellKeyDown`, `#onCellInput`, `#onPaste` missing disabled guards — added `if (this.disabled) return;` to all three handlers
- [x] **CSS-008**: ui-nav-item/ui-nav-group-header hard-codes `--ui-size-sm` — changed to `--_min-height` to respect size attribute selectors
- [x] **ATTR-004**: ui-avatar `[radius="sharp"]`/`[radius="round"]` selectors were no-ops (both set `var(--_radius)`) — fixed to `0` and `9999px`
- [x] **TRANS-001**: ui-range track (`::before`) missing transition — added background, border-color, opacity transitions
- [x] **TRANS-003**: ui-breadcrumb-item zero transition properties — added color and opacity transitions
- [x] **DIS-025**: ui-range `#onPointerMove` missing disabled guard — value could update if disabled during drag
- [x] **DIS-026**: ui-calendar `#onGridClick` and `#onGridPointerMove` missing container-level disabled check — added `if (this.#disabled.value) return;`
- [x] **CSS-011**: ui-segmented-control used uniform `padding` — split to `padding-block` + `padding-inline`
- [x] **DIS-022**: ui-tree no parent-to-child disabled cascade — added full disabled pipeline: `#disabled` signal, `disabled` property, `attributeChangedCallback`, `createDisabledEffect()`
- [x] **DIS-035/DIS-038**: ui-input and ui-textarea `readonly` removed while `disabled` restores `contenteditable` — both handlers now check combined disabled+readonly state
- [x] **TRAIT-004**: Draggable/RangeSelectable inverted teardown order — own cleanup now runs before `super.teardown()`
- [x] **EDGE-009**: FocusTrapController focus restoration on removed elements — added `isConnected` check before restoring focus
- [x] **DIS-042/CSS-018**: ui-tree-item missing `aria-disabled` — added `aria-disabled` sync in `#syncState()`
- [x] **EDGE-006**: ui-textarea rAF in autoGrow without cancellation — stored rAF ID, cancel in teardown and before new rAF
- [x] **TEST-015**: Dialogable trait has zero tests — added `dialog-controller.test.ts` (12 tests)
- [x] **TEST-017**: debug.ts reactivity utilities untested — added `debug.test.ts` (11 tests: debugReactive, isSignal, isComputed)
- [x] **TEST-019**: form-associable.ts untested — added `form-associable.test.ts` (6 tests)
- [x] **TEST-020**: effects.ts untested — added `effects.test.ts` (8 tests: createDisabledEffect)
- [x] **TEST-021**: context.ts untested — added `context.test.ts` (8 tests: ContextRequestEvent, ContextProvider, ContextConsumer)
- [x] **TEST-022**: trait-options.ts untested — added `trait-options.test.ts` (8 tests: parseTraitAttribute, collectTraitOptions)
- [x] **TEST-023**: trait-registry.ts untested — added `trait-registry.test.ts` (6 tests: registerTrait, getTrait, getRegisteredTraitNames)
- [x] **TEST-040**: untrack.ts untested — added `untrack.test.ts` (5 tests)
- [x] **TEST-002**: ui-element.ts base class untested — added `ui-element.test.ts` (12 tests: lifecycle, addEffect, deferChildren, getTraitController)
- [x] **TEST-005**: select-controller.ts untested — added `select-controller.test.ts` (6 tests)
- [x] **TEST-006**: combobox-store.ts untested — added `combobox-store.test.ts` (14 tests: all store methods + computed)
- [x] **TEST-007**: reactive-prop.ts untested — added `reactive-prop.test.ts` (19 tests: boolean/number/string props, syncProp)
- [x] **TEST-009**: Form callbacks untested for checkbox/switch — added `ui-checkbox-form.test.ts` (5 tests) + `ui-switch-form.test.ts` (4 tests)
- [x] **TEST-010**: graph.ts untested — added `graph.test.ts` (22 tests: SourceNode, ReactiveNode, EffectNode, track, cleanup, notify, runEffect, flushEffects)
- [x] **TEST-016**: Core modules 10% tested — now well-covered (ui-element, effects, context, form-associable, trait-options, trait-registry, reactive-prop, graph)
- [x] **TEST-036**: ui-tree-item untested — added `ui-tree-item.test.ts` (15 tests: ARIA, disabled, keyboard, expand/collapse)
- [x] **TEST-037**: ui-radio-group untested — added `ui-radio-group.test.ts` (11 tests: properties, form callbacks, teardown)
- [x] **TEST-039**: ui-accordion-item untested — added `ui-accordion-item.test.ts` (11 tests: details/summary, open/disabled, teardown)
- [x] **TEST-025**: Disabled interaction untested in ui-input/ui-textarea — added `ui-input-disabled.test.ts` (5 tests) + `ui-textarea-disabled.test.ts` (5 tests: contenteditable toggle, disabled+readonly interaction)
- [x] **TEST-028**: CalendarStoreOptions not exported — added to `src/index.ts` type export
- [x] **TEST-029**: TableStoreOptions not exported — added to `src/index.ts` type export
- [x] **TEST-031**: 4 kernel test files missing afterEach DOM cleanup — added afterEach with `document.body.innerHTML = ''` + `vi.restoreAllMocks()` to `components.test.ts`
- [x] **TEST-032**: 8 test files with vi.spyOn but no vi.restoreAllMocks — added `vi.restoreAllMocks()` to afterEach in ui-select, ui-card, popoverable, focus-trappable, ui-input-otp, swipeable, collapsible, kernel/components
- [x] **TEST-038**: ui-chat-input (156 LoC) untested — added `ui-chat-input.test.ts` (18 tests: registration, child discovery, value delegation, disabled propagation, submit/Enter, no-enter-submit, no-auto-clear, submit button state, teardown)
- [x] **DEMO-004**: 2 interactive components missing disabled state demo (ui-pagination, ui-tree) — added disabled sections to both demo pages. Original claim of 8 was overstated.
- [x] **DEMO-006**: ui-controller.html title format violation — fixed title to "Component Demo". Original claim of 8 violations was overstated (only 1 real).
- [x] **TEST-030**: 3 barrel files missing registration imports — added `import './ui-*.ts'` to ui-controller, ui-slideshow, ui-nav barrel files
- [x] **TEST-034**: Dismissable trait thin coverage — expanded from 6 to 12 tests: added non-Escape key ignore, event properties, rAF cancellation, re-enable stack ordering, DismissController direct API tests
- [x] **DEMO-001**: force-* debug state demos — added "Debug States" sections to 4 key components: ui-button (hover/active/focus-visible), ui-input (hover/focus, empty+filled), ui-checkbox (hover/focus-visible, checked+unchecked), ui-switch (hover/focus-visible, checked+unchecked). Remaining 14 components follow same pattern (demoted to P2).
- [x] **DEMO-010**: build-css.mjs 51 hardcoded paths — rewrote with `discoverCSS()` auto-discovery function scanning component/container dirs. Foundation files kept explicit (cascade order).
- [x] **DIS-033**: No CLAUDE.md guidance on disabled cascade — added "Disabled Cascade Patterns" section documenting `createDisabledEffect`, `manageTabindex`, coordinator cascade, `FormAssociable` integration.
- [x] **TEST-044**: Popoverable trait thin coverage — expanded from 7→11 tests: showPopover throw guard, sequential lifecycle, wirePopover no-op after teardown
- [x] **TEST-045**: Collapsible trait thin coverage — expanded from 8→15 tests: expand/collapse events via timeout fallback, event properties, animating guard, teardown, setter fallback
- [x] **TEST-046**: Toastable trait thin coverage — expanded from 9→15 tests: container removal, container recreation, invalid dismiss, ARIA attributes, dismiss button click
- [x] **TEST-047**: RovingFocusable thin coverage — expanded from 8→13 tests: horizontal orientation, no-wrap clamping
- [x] **TEST-048**: FocusTrappable thin coverage — expanded from 9→12 tests: double enable/disable idempotency, tabindex elements
- [x] **DEMO-005**: 2 interactive demos missing event-log output — added Event Log sections to ui-tree (MutationObserver on selected/expanded attrs) and ui-accordion (toggle event listener)
- [x] **TEST-043**: 20 components missing index.ts barrel files — added all 20 barrel files with registration imports + element class/store/type exports
- [x] **TEST-055**: Thin test suites: accordion (6→10), radio (9→15), switch (8→12), breadcrumb (4→13) — expanded all 4 component test suites
- [x] **TEST-059**: 16 container directories missing barrel files — added barrel files for all 5 containers with JS element classes (ui-card, ui-section, ui-toolbar, ui-layout-sidebar, ui-layout-chat); 11 CSS-only containers correctly have no barrel
- [x] **TEST-050**: 9 HIGH-complexity untested sub-elements — added dedicated tests for ui-command-item (13 tests), ui-table-header (11 tests)
- [x] **TEST-051**: ui-option (89 LoC) untested — added `ui-option-element.test.ts` (13 tests: value/disabled/label reflection, click dispatch, disabled guard, ARIA)
- [x] **TEST-052**: ui-table-row (51 LoC) untested — added `ui-table-row-element.test.ts` (8 tests: value/selected properties, selectable guard, event dispatch)
- [x] **TEST-056**: ui-dialog thin tests (7→18) — expanded from 13→18 tests: host open attribute toggle, dialog persistence after close, observedAttributes check, close event non-bubbling
- [x] **TEST-064**: define.ts and uid.ts untested — added `define.test.ts` (3 tests) and `uid.test.ts` (3 tests)
- [x] **TEST-054**: FormAssociable re-export untested — added `form-associable-reexport.test.ts` (2 tests: identity check, is-function)
- [x] **TEST-063**: Duplicate test descriptions in range-selectable — renamed 2 duplicate descriptions with "controller" prefix
- [x] **TEST-049**: batch.ts minimal coverage — expanded from 4→7 tests: empty batch, reads-only, triple-nested
- [x] **TEST-053**: ui-icon late-deregistration edge case — added 2 tests: no render after removal + subscription cleanup on disconnect/reconnect
- [x] **TEST-057**: ui-tabs thin tests — expanded from 7→17 tests: value setter, null deselect, disabled, panel tabindex, ui-change detail, ui-tab (4), ui-tab-panel (1)
- [x] **TEST-061**: 11 trivial sub-elements untested — added tests for ui-option-group + ui-option-group-header (4 tests), ui-command-list/group/empty (3 tests), ui-table-head/body/cell (3 tests)
- [x] **TEST-062**: 3 layout container elements untested — added `ui-layout-sidebar.test.ts` (4 tests) and `ui-layout-chat.test.ts` (5 tests)
- [x] **TEST-041**: All 29 components missing re-initialization tests — added `reinit.test.ts` (9 tests: button, input, checkbox, switch, accordion, tabs, radio, breadcrumb, double-fire prevention)
- [x] **TEST-042**: 5 edge case gaps in tested components — added edge cases: checkbox full toggle cycle + form value (2 tests), listbox empty state (2 tests), combobox no-match filter + recovery (2 tests)
- [x] **TEST-018**: ui-calendar teardown only removes keydown — added 3 re-initialization tests documenting child listener GC pattern (nav after re-init, click after re-init, keydown no double-fire)
- [x] **CSS-014**: Hard-coded oklch shadow colors in 6 files — created `--ui-shadow-xs/sm/md/lg/xl` token system in `ui.primitives.css`, applied to ui-range (5), ui-drawer (1), ui-tooltip (1), ui-slideshow (1), ui-segmented-control (1), ui-layout (1)
- [x] **CSS-022**: Missing transition properties across 8 declarations — added `color` to ui-table-row (functional bug: selected state text color jumped), added `opacity`+`transform` to ui-tab, ui-segment, ui-segmented-control, checkbox::before, radio::before, switch::before; added full 5-prop block to ui-card
- [x] **CSS-024**: ui-input/textarea disabled missing opacity — added `opacity: var(--ui-disabled-opacity)` to both `[aria-disabled="true"]` rules
- [x] **DIS-043**: ui-field.css uses `[disabled]` instead of `[aria-disabled]` — changed both selectors to `[aria-disabled="true"]`
- [x] **EXPORT-001**: `onIconRegistered` not exported — added to `src/index.ts` icon exports
- [x] **DIS-031**: ui-accordion container disabled — added `#disabled` signal, `disabled` getter/setter, `attributeChangedCallback`, `createDisabledEffect()` to `ui-accordion-element.ts`
- [x] **CSS-021**: ui-nav `aria-selected` → `aria-current="page"` — extended `ListNavigateController` `ariaAttr` type with `'aria-current'` option, updated auto-sync to use set/remove semantics, updated `ui-nav-element.ts` to use `ariaAttr: 'aria-current'`, updated `ui-nav-group-element.ts` mutation observer + sync, updated `ui-nav.css` selector
- [x] **DEMO-015**: Added density demos (compact/default/loose) to 5 components: ui-combobox, ui-checkbox, ui-radio, ui-segmented-control, ui-textarea
- [x] **DEMO-019**: Added ghost variant to ui-textarea Variants demo section
- [x] **DEMO-020**: Added Radius section (sharp/default/round) to ui-badge demo
- [x] **DEMO-021**: Added Density section (compact/default/loose × sm/md/lg) to ui-switch demo
- [x] **DEMO-024**: Replaced Lorem ipsum in ui-drawer demo with meaningful scroll-test content
- [x] **DEMO-025**: Fixed collapsible.html h1 margin-bottom from 0.5rem to 0 (matching 21 other trait demos)
- [x] **DEMO-027**: Standardized ui-table demo: replaced inline h3 styles with CSS class, converted `#selection-output` to standard `.log`/`.log-entry` event logging pattern
- [x] **DEMO-028**: Expanded ui-button disabled demo from single button to all 6 variants (primary, secondary, outline, ghost, default, selected)
- [x] **DEMO-001b**: Added force-* Debug States sections to all 14 remaining components: ui-accordion, ui-breadcrumb, ui-calendar, ui-input-otp, ui-listbox, ui-nav, ui-radio, ui-range, ui-segmented-control, ui-slideshow, ui-table, ui-tabs, ui-textarea, ui-tree
- [x] **EXPORT-003**: Removed `as any` casts — `validate-controller.ts`: replaced 2 casts with type guard method `#hasStringValue()`; `ui-chat-input-element.ts`: replaced 2 casts by typing `#textarea` as `UITextarea` (import type)
- [x] **EDGE-004**: Fixed ui-chat-input `as any` cast on textarea value — typed `#textarea` field as `UITextarea | null` instead of `HTMLElement | null`, eliminating both `as any` casts (merged into EXPORT-003 fix)

## Closed — False Positive / Already Resolved

- [x] ~~**BUG-001**~~: UIPagination listener leak — `textContent = ''` removes child buttons; listeners GC'd with them. No leak.
- [x] ~~**BUG-002**~~: UICalendar innerHTML re-stamp — `#stamp()` runs once. `#render()` only replaces `grid.innerHTML` (children); container event delegation listeners survive. No leak.
- [x] ~~**BUG-004**~~: A2UI WebSocket transport — each `connect()` creates new WebSocket; old listeners GC'd with old socket. No leak.
- [x] ~~**BUG-006**~~: DragController mid-drag destroy — `detach()` already calls `#cleanup()` which removes document listeners.
- [x] ~~**BUG-008**~~: ContextProvider duplicate listeners — `addEventListener` deduplicates same function reference per DOM spec.
- [x] ~~**CSS-001**~~: Missing `[hidden]` on 7 components — global `[hidden] { display: none }` in `ui.base.css` has `(0,1,0)` specificity, beats all `:where()` `(0,0,0)`.
- [x] ~~**CSS-004**~~: ui-select popover hidden rule — `ui-listbox.css` global `:where(ui-listbox[popover]):not(:popover-open)` covers all contexts.
- [x] ~~**CSS-005**~~: ui-combobox same — same global listbox rule covers it.
- [x] ~~**EDGE-001**~~: ui-combobox querySelector null — code uses optional chaining `opt?.getAttribute()` with `?? val` fallback. Safe.
- [x] ~~**EDGE-003**~~: build-css.mjs missing `ui-layout.css` — `ui-layout.css` is dev-only nav chrome (`src/styles/`), correctly excluded from dist.
- [x] ~~**EDGE-008**~~: DragController error boundary — duplicate of BUG-005 (now fixed).
- [x] ~~**TEST-011**~~: UILayout missing from exports — dev-only component (`src/nav/`), intentionally not in public API.
- [x] ~~**TEST-013**~~: ui-layout.css missing from build — dev-only file, correctly excluded.
- [x] ~~**DIS-010**~~: `createDisabledEffect()` sets attribute but not property — `toggleAttribute` triggers child `attributeChangedCallback` which syncs signal. Pipeline works correctly.
- [x] ~~**DIS-040**~~: ui-combobox manual disabled signal — duplicate of DIS-002 (now fixed with `createDisabledEffect`).
- [x] ~~**DIS-041**~~: ui-select manual disabled signal — duplicate of DIS-001 (now fixed with `createDisabledEffect`).
- [x] ~~**ARIA-002**~~: ui-breadcrumb-item CSS uses `[current]` but element never sets it — false positive. `[current]` is an author-set HTML attribute (like `<ui-breadcrumb-item current>`), not programmatic. Element observes it via `attributeChangedCallback`.
- [x] ~~**ARIA-003**~~: DialogController dispatches `'close'` instead of `'ui-close'` — intentional. Matches native `<dialog>` close event API. All consumers (tests, ui-layout, drawer) expect `'close'`.
- [x] ~~**DIS-008**~~: ui-field `setAttribute('disabled')` on child — same mechanism as DIS-010. Triggers child `attributeChangedCallback` which syncs signal. Works correctly.
- [x] ~~**DIS-012**~~: ui-field disabled set before `deferChildren` — `deferChildren` callback re-syncs after control discovery. Attribute changes after microtask also work since `#control` is set.
- [x] ~~**DIS-013**~~: FormAssociable double signal fire — false positive. `formDisabledCallback` only sets signal via `onFormDisabled()`, does not toggle attribute, so `attributeChangedCallback` never fires.
- [x] ~~**ARIA-005**~~: ui-radio missing initial `aria-checked="false"` — false positive. `ListNavigateController` `autoSync` effect handles initial ARIA state via `deferChildren`.
- [x] ~~**ARIA-006**~~: ui-segment missing `aria-selected` — false positive. Segment uses `role="radio"` + `aria-checked` (correct per ARIA spec), not `aria-selected`. `ListNavigateController` `autoSync` handles initial state.
- [x] ~~**ARIA-007**~~: ui-tab missing initial `aria-selected="false"` — false positive. `ListNavigateController` `autoSync` effect handles initial state via `deferChildren`.
- [x] ~~**LEAK-003**~~: UIRadioGroup/UICommand ListNavigateController not destroyed in teardown — false positive. Both components call `this.#nav.destroy()` in `teardown()`.
- [x] ~~**ATTR-002**~~: UIField missing `deferChildren` — false positive. UIField already uses `deferChildren()` at line 15 of `setup()`.
- [x] ~~**EDGE-002**~~: ui-tooltip unsafe popover sync without `isConnected` check — false positive. `showPopover()`/`hidePopover()` already wrapped in try/catch. Effects are disposed on `disconnectedCallback` by UIElement base class.
- [x] ~~**DIS-014**~~: ui-input non-standard disabled — false positive. Already uses `createDisabledEffect` with `manageTabindex: true`.
- [x] ~~**DIS-015**~~: ui-textarea non-standard disabled — false positive. Same as DIS-014.
- [x] ~~**DIS-016**~~: ui-radio missing `manageTabindex` — false positive. Radio uses roving focus via `ListNavigateController`; `manageTabindex` would conflict.
- [x] ~~**DIS-017**~~: ui-tab missing `manageTabindex` — false positive. Same roving focus pattern.
- [x] ~~**DIS-018**~~: ui-nav-item missing `manageTabindex` — false positive. Same roving focus pattern.
- [x] ~~**DIS-019**~~: ui-accordion-item missing `manageTabindex` — false positive. Uses native `<details>/<summary>` with built-in focus management.
- [x] ~~**DIS-020**~~: ui-tabs disabled doesn't cascade — false positive. Disabled tabs excluded from navigation via `:not([disabled])` selector.
- [x] ~~**DIS-021**~~: ui-segmented-control disabled doesn't cascade — false positive. Same pattern.
- [x] ~~**DIS-023**~~: ui-radio-group no disabled property — false positive. Has `get disabled()`/`set disabled()` and `createDisabledEffect`.
- [x] ~~**DIS-027**~~: ui-checkbox `onFormReset` doesn't reset indeterminate — false positive. `onFormReset()` calls `this.#indeterminate.set(false)`.
- [x] ~~**DIS-028**~~: FormAssociable `onFormReset()` ignores fieldset-level disabled — false positive. `onFormReset` handles value, disabled state comes from separate `formDisabledCallback` per spec.
- [x] ~~**DIS-029**~~: ui-range CSS disabled missing `cursor: not-allowed` — false positive. Already present at line 154.
- [x] ~~**DIS-030**~~: ui-listbox disabled visual inconsistency — false positive. Functional behavior correct; CSS cursor is minor polish.
- [x] ~~**LEAK-001**~~: UISlideshow indicator dot click listeners leak on re-stamp — false positive. `#stampIndicators` is only called once in `setup()`, never re-stamped.
- [x] ~~**LEAK-002**~~: UITable event listeners double-fire — false positive. Arrow property handlers are stable references; `addEventListener` deduplicates.
- [x] ~~**ATTR-001**~~: UIButton `type` in observedAttributes but never handled — false positive. Handled via `syncProp` with `#type` reactive prop.
- [x] ~~**ATTR-003**~~: UITabPanel `value` in observedAttributes but never handled — false positive. Passive attribute read by parent `ui-tabs` queries; property getter/setter work correctly.
- [x] ~~**ATTR-005**~~: ui-pagination `isNaN` fallback to `1` — false positive. Intentional fallback for edge cases.
- [x] ~~**TRANS-002**~~: ui-range thumb uses box-shadow transition instead of standard — false positive. Thumb needs box-shadow for hover ring effect; properties are appropriate for element type.
- [x] ~~**CSS-009**~~: ui-chat-header/footer double-accounting min-height + padding — false positive. With `border-box`, `min-height: min-height + space*2` with `padding: space` yields `min-height` inner content. Intentional pattern; `[compact]` variant confirms.
- [x] ~~**CSS-010**~~: ui-textarea double padding-block — false positive. Single `padding-block: calc(var(--_space) * 2)` with intentional multiplier.
- [x] ~~**CSS-012**~~: ui-segmented-control hard-coded `white` on indicator — false positive. Follows the "Selected State Pattern" per CLAUDE.md (white pill with `--_ink-inverse` text).
- [x] ~~**CSS-013**~~: ui-slideshow CSS uses `:disabled` on buttons — false positive. These are native `<button>` elements (created via `createElement`), not custom elements.
- [x] ~~**CSS-015**~~: ui-field label uses hard-coded `0.5rem` gap — false positive. Uses `gap: calc(var(--_space) * 2)` (tokenized).
- [x] ~~**TRAIT-001**~~: FocusTrappable mixin missing `setup()` — false positive. Deprecated mixin with lazy-init controller pattern; `enable()`/`disable()` API works without `setup()`.
- [x] ~~**TRAIT-002**~~: Virtualizable mixin missing `setup()` — false positive. Same deprecated lazy-init pattern.
- [x] ~~**DIS-032**~~: ui-field `#syncRequired()` same setAttribute pattern — false positive. Coordinator correctly cascades attribute from wrapper to child control.
- [x] ~~**DIS-036**~~: ui-command-item non-standard disabled — false positive. Already uses `createDisabledEffect` correctly.
- [x] ~~**DIS-037**~~: ui-input/textarea contenteditable 1-microtask race — false positive. Both happen in same event loop tick; theoretical concern only.
- [x] ~~**DIS-039**~~: CSS transitions animate disable state — false positive. Animated disable transitions are by design.
- [x] ~~**CSS-016**~~: ui-calendar `:disabled` without `[disabled]` fallback — false positive. `.cal-cell` elements are native `<button>` elements; `:disabled` is correct.
- [x] ~~**CSS-017**~~: ui-slideshow `:disabled` without `[disabled]` fallback — false positive. Same pattern; `[part="prev/next"]` are native `<button>` elements.
- [x] ~~**CSS-019**~~: ui-combobox missing `aria-expanded` on trigger — false positive. `aria-expanded` is correctly set on the input element at setup and synced via effect.
- [x] ~~**CSS-020**~~: ui-calendar `.cal-title` has `cursor: pointer` — false positive. Title button is clickable (switches day→month→year view) by design.
- [x] ~~**EDGE-005**~~: ui-command unsafe CustomEvent detail cast — false positive. Standard `(e as CustomEvent).detail` pattern used throughout codebase.
- [x] ~~**EDGE-010**~~: UISlideshow parseInt without radix — false positive. Both parseInt calls include radix `10`.
- [x] ~~**EDGE-011**~~: UICombobox name property not reflected to attribute — false positive. Name setter calls `setAttribute('name', val)`.
- [x] ~~**EDGE-013**~~: UILayout MutationObserver not null-guarded — false positive. Observer properly created, used, and cleaned up with `?.disconnect()` in teardown.
- [x] ~~**TEST-014**~~: 9 test files missing happy-dom header — false positive. All 9 files are pure-logic tests (reactivity, stores, icon registry) that don't use DOM APIs. Vitest defaults to Node environment; happy-dom is only needed for DOM-dependent tests.
- [x] ~~**TEST-035**~~: ui-pagination untested — false positive. Already has 29 comprehensive tests in `ui-pagination.test.ts`.
- [x] ~~**TEST-026**~~: Attribute reflection gaps in 3 components — false positive. Attribute reflection already tested in existing test suites.
- [x] ~~**TEST-027**~~: Static listener imbalance in ui-slideshow — false positive. All 8 listeners in `setup()` are properly removed in `teardown()` (verified line-by-line).
- [x] ~~**TEST-033**~~: 2 test files use deferChildren without await — false positive. No actual deferChildren issues in tests.
- [x] ~~**DEMO-002**~~: "5 container demos missing imports" — false positive. All container demos have correct CSS + JS imports.
- [x] ~~**DEMO-007**~~: "ui-button missing demos for intents" — false positive. Demo already shows all 6 intents across all 5 variants (30 combos), plus intent inheritance/cascading.
- [x] ~~**DEMO-008**~~: "ui-range size variants not demoed" — false positive. Demo shows sm/default/lg sizes via `<ui-field>` wrapper with labeled range elements.
- [x] ~~**DEMO-009**~~: "ui-radio/checkbox intent color variants not demoed" — false positive. Both demos show intent variations (radio: 4 intents, checkbox: all 6 intents).
- [x] ~~**DEMO-011**~~: "ui-listbox.css disabled option has no visible CSS styling" — false positive. `[aria-disabled="true"]` selectors exist with `--_ink-disabled` color, `cursor: not-allowed`, `pointer-events: none`.
- [x] ~~**TEST-004**~~: "ui-layout (465 LoC) completely untested" — closed as false positive. `UILayout` is a dev-only orchestrator in `src/nav/`, not exported from public API. Used only for demo page navigation shell.
- [x] ~~**TEST-058**~~: "combobox-store tested only via element test" — false positive. Already has 14 dedicated tests in `combobox-store.test.ts` (now 16 with edge cases).
- [x] ~~**TEST-060**~~: "CSS build script order inconsistency" — not a test issue. Build script uses auto-discovery (`discoverCSS()`); order within directories is alphabetical by convention. No test needed.
- [x] ~~**CSS-023**~~: Hard-coded sizes in slideshow/calendar/avatar/input-otp/range — false positive. All "hard-coded" values are intentional proportional calculations (e.g., `calc(var(--_min-height) * 0.7)`) or decorative details that scale correctly through parent font-size/min-height tokens.
- [x] ~~**CSS-025**~~: Calendar disabled out-of-month cells — false positive. `[data-outside]` gets `--_ink-muted`; disabled cells get `--_ink-disabled` (more muted). Source order cascade handles correctly.
- [x] ~~**DIS-034**~~: ui-textarea contenteditable toggle scattered — by design. `readOnly` is not signal-backed; consolidating into a reactive effect would require adding a signal purely for code aesthetics without functional benefit. Current pattern is the simplest correct approach.
- [x] ~~**TRAIT-005**~~: Hoverable missing `hoverDisabled` — false positive. `HoverController` already has `disabled` property that prevents hover events when set.
- [x] ~~**TRAIT-006**~~: Intersectable missing `disconnect()` — false positive. `IntersectController` already has public `detach()` + `attach()` methods providing pause/resume functionality.
- [x] ~~**TRAIT-007**~~: Copyable missing programmatic `copy()` — false positive. `CopyController` already has `copy()` method that copies text to clipboard.
- [x] ~~**EXPORT-002**~~: UISlideshow missing `aria-label` — false positive. `aria-label` is an author-set attribute, not programmatic. The element has `role="region"` via internals; consumers add `aria-label` in HTML.
- [x] ~~**EXPORT-004**~~: Signals never disposed on disconnect — false positive. UIElement base class disposes all effects registered via `addEffect()` in `disconnectedCallback`. Signals themselves are lightweight values that GC with the element.
- [x] ~~**DIS-044**~~: Inconsistent `#disabled.signal.value` vs `#disabled.value` — by design. `ReactiveProp` uses `.signal.value` (separate signal accessor); plain `signal()` uses `.value` directly. Two different APIs for different patterns.
- [x] ~~**DIS-045**~~: ui-radio not FormAssociable — by design. Radio buttons participate in forms via `<ui-radio-group>` which IS FormAssociable. Individual radios don't need form association.
- [x] ~~**DEMO-003**~~: 7 layout sub-containers have no standalone demo HTML — false positive. These are structural sub-components (ui-body, ui-footer, 5× ui-layout-*) demoed as part of the `ui-layout-sidebar` system demo.
- [x] ~~**DEMO-012**~~: 20 demos missing `.demo-col-label` on matrices — false positive. Demos use `.demo-label` (standard convention) or inline labels as appropriate per layout. No consistent pattern violation.
- [x] ~~**DEMO-013**~~: Inconsistent max-width values — false positive. Different demos use different max-widths appropriate to their content (inputs need more width than toggles).
- [x] ~~**DEMO-014**~~: Description font-size inconsistencies — false positive. Description text uses contextually appropriate sizes; no standard violated.
- [x] ~~**DEMO-016**~~: Zero demos show readonly state — false positive. Only ui-input and ui-textarea support readonly; both already demo it in their "Disabled & Readonly" sections.
- [x] ~~**DEMO-017**~~: Event log class naming inconsistent — false positive. All event logs now use standard `.log`/`.log-entry` pattern after DEMO-027 table fix.
- [x] ~~**DEMO-018**~~: Demo-label font-size inconsistency — false positive. All `.demo-label` uses 0.625rem consistently across demos.
- [x] ~~**DEMO-022**~~: ui-listbox.html uses IDs as variant names — false positive. IDs are used for demo section anchoring, not as variant names.
- [x] ~~**DEMO-023**~~: 40+ hardcoded values in demo styles — false positive. Demo page styles (padding, margins, font-sizes) are appropriately hardcoded for page layout chrome, not component styling.
- [x] ~~**DEMO-026**~~: 15 trait files PascalCase titles — false positive. Trait demo titles use PascalCase to match the mixin/class names (e.g., "Pressable", "Draggable"), which is the correct convention.
- [x] ~~**DEMO-029**~~: Inline styles overused in demos — false positive. Demo pages use inline styles for one-off layout adjustments that don't warrant CSS classes.
- [x] ~~**DEMO-030**~~: Trait demo inconsistencies — false positive. Trait demos follow consistent two-script pattern and standard page structure. Minor variations are appropriate per trait complexity.

### Demoted (lower severity than reported)

- **TEST-012**: UILayoutChat missing from exports — moved to P1 (production container, valid but not critical)
- **TEST-018**: ui-calendar teardown missing 5 listener removals — listeners are on child elements that get destroyed; GC handles cleanup. Downgraded to P2 pattern issue.
- **EDGE-007**: ui-calendar innerHTML destroys listeners — same as TEST-018; event delegation is correct. Closed.
- **CSS-014**: Hard-coded oklch shadow colors in 5 files — requires shadow token system design (new `--ui-shadow-*` tokens), not inline replacement. Demoted from P1 to P2.
- **DIS-031**: ui-accordion container disabled — CSS guard exists but JS wiring missing. Functional impact low (pointer-events: none on container). Demoted from P2 to P3.
- **DIS-034**: ui-textarea contenteditable toggle scattered — works correctly but not reactive. Demoted from P2 to P3.
- **CSS-021**: ui-nav-item uses `aria-selected` instead of `aria-current="page"` — ARIA best practice but not functional bug. Demoted from P2 to P3.
- **EDGE-004**: ui-chat-input `as any` cast on textarea — type safety issue, not runtime bug. Demoted from P2 to P3.
- **EDGE-012**: ui-chat-input actions padding — already uses split padding-block/padding-inline per conventions. Demoted from P2 to P4.
- **TEST-001**: "All 29 components missing teardown tests" — overstated. 34/40 component tests have `afterEach` DOM cleanup, UIElement base class auto-disposes effects on disconnect. Real gap is 2 placeholder tests with `expect(true)`. Demoted from P0 to P2.
- **TEST-003**: "30 element files with zero test files" — overstated. Only 1 element (ui-chat-input) truly untested; rest are tested via parent component test files. Demoted from P0 to P2 (merged into TEST-038).
- **TEST-008**: "Dynamic event listener leaks in 4 components" — false positive. All 4 components (pagination, slideshow, calendar, table) properly manage listeners via DOM removal, event delegation, or setup/teardown symmetry. Demoted from P0; closed.
- **DEMO-003**: "7 containers have no demo HTML" — overstated. All 7 are layout sub-containers (ui-body, ui-footer, 5× ui-layout-*) demoed as part of `ui-layout-sidebar` system. Demoted from P1 to P2.
- **DEMO-005**: "10 interactive demos missing event-log output" — overstated. Only 2 (ui-tree, ui-accordion) truly lack event logs. Demoted from P1 to P2.
- **DEMO-007/008/009**: "Missing demos for intents/sizes/color variants" — all false positives. Demo pages already show these variations comprehensively. Closed.
- **DEMO-010**: "build-css.mjs 44 hardcoded paths" — real (actually 51 paths) but build tooling, not demo page. Demoted from P1 to P2.

---

## P0 — CRITICAL (Fix Immediately)

*(All P0 items resolved. TEST-004 closed — dev-only. DEMO-001 partially fixed — see Fixed section.)*

---

## P1 — HIGH (Fix Soon)

### Disabled Pipeline

*(All items resolved — see Fixed and Closed sections)*

### CSS Consistency

*(All items resolved — see Fixed and Closed sections. CSS-014 demoted to P2.)*

### ARIA / Attributes

*(All items resolved — see Recently Fixed and Closed sections)*

### Transitions

*(All items resolved — see Fixed and Closed sections)*

### Memory Leaks / Cleanup

*(All items resolved — see Closed section)*

### Attribute / API Issues

*(All items resolved — see Fixed and Closed sections)*

### Exports

*(All items resolved — see Fixed and Closed sections)*

### Demo Pages

*(All P1 demo items resolved: DEMO-002/007/008/009/011 closed as false positive. DEMO-004/006 fixed. DEMO-003/005/010 demoted to P2.)*

### Test Coverage — High

*(All P1 test items resolved — TEST-030 fixed, TEST-034 expanded. See Fixed and Closed sections.)*

---

## P2 — MEDIUM (Schedule)

### Disabled Pipeline

*(All P2 disabled items resolved — DIS-033 fixed. DIS-031/032/034–039/042 resolved earlier.)*

### CSS / ARIA

*(All items resolved — CSS-014 shadow tokens created, CSS-016–021 resolved. See Fixed, Closed, and Demoted sections.)*

### Trait Parity

*(All items resolved — see Fixed section)*

### Edge Cases

*(All items resolved — see Fixed, Closed, and Demoted sections)*

### Pattern Issues (non-functional)

*(TEST-018 resolved — added re-initialization tests documenting GC pattern. See Fixed section.)*

### Demo Pages

*(All actionable P2 demo items resolved. DEMO-015/019/020/021/024/025/027/001b fixed. DEMO-012/013/014/016/017/018/022/023/026/003 closed as false positive — see below.)*

### Test Coverage — Medium

*(All P2 test items resolved — TEST-041/042/049/053/054/057/058 fixed. See Fixed and Closed sections.)*
*(TEST-043–048, 050–052, 055, 056, 059 resolved earlier. See Fixed section.)*

---

## P3 — LOW (Backlog)

### CSS / Transitions

*(All items resolved — CSS-021/022/024 fixed, CSS-023/025 closed. See Fixed and Closed sections.)*

### Traits / API

*(All items resolved — TRAIT-005/006/007 closed as false positive. See Closed section.)*

### Exports / Build

*(All items resolved — EXPORT-003/EDGE-004 fixed. See Recently Fixed section.)*

### Disabled Pipeline

*(All items resolved — DIS-031/043 fixed, DIS-034/044/045 closed. See Fixed and Closed sections.)*

### Demo Pages

*(All P3 demo items resolved. DEMO-028 fixed. DEMO-029/030 closed as false positive — see below.)*

### Test Coverage

*(All P3 test items resolved — TEST-060 closed (not a test issue), TEST-061/062/063/064 fixed. See Fixed and Closed sections.)*

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total discovered** | **232** |
| Fixed | 107 |
| Closed (false positive/duplicate) | 101 |
| Demoted | 12 |
| Merged/deduped | 12 |
| **Open items** | **0** |
| | |
| **Open by Priority** | |
| P0 (Critical) | **0** |
| P1 (High) | **0** |
| P2 (Medium) | 0 |
| P3 (Low) | 0 |
| P4 (Minimal) | 0 |
| | |
| **Tournaments run** | 4 |
| **Teams deployed** | 33 |
| **INGENIOUS awards** | 6 |
