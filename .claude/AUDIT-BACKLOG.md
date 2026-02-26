# Audit Backlog

Tournament 1: 2026-02-25 | 10 teams, 8 phases | Fixed: 2026-02-26 | 17 files, 2432 tests
Tournament 2: 2026-02-26 | 6 teams, 6 areas (lifecycle, ARIA, CSS cascade, signals, forms, exports)

## P0 — Critical

- [x] **ui-button.css: `:disabled` pseudo-class doesn't work on custom elements** — CSS uses `:disabled` selector (line 68) but custom elements don't support this pseudo-class. Must use `[aria-disabled="true"]` to match `createDisabledEffect()` output. Disabled buttons are visually broken. *(PHOENIX)*
- [x] **collapsible-controller: Untracked setTimeout in expand()/collapse()** — Lines 52, 81: setTimeout callbacks not stored in fields. If destroy() called during animation, timeouts leak and manipulate destroyed host. *(WRAITH)*
- [x] **swipe-controller: Untracked setTimeout for attribute cleanup** — Line 107: `setTimeout(() => host.removeAttribute(...), 300)` not tracked. If destroy() called within 300ms, leaks and accesses destroyed element. *(WRAITH, KRAKEN)*
- [x] **ui-calendar: querySelector results cast as HTMLElement without null guards** — Lines 134-142, 149-151: `querySelector(...) as HTMLElement` followed by `.addEventListener()`. If innerHTML fails (CSP, parser error), crashes with TypeError. *(SPHINX)*
- [x] **UIRadio: Missing aria-checked in standalone mode** — Standalone `<ui-radio>` (outside `<ui-radio-group>`) doesn't set initial `aria-checked` state. *(COBRA)*

## P1 — High

- [x] **ui-button.css: Missing standard 5-property transition block** — No transition property at all on base `:where(ui-button)`. Missing: `background, color, border-color, opacity, transform`. *(VIPER)*
- [x] **ui-input.css: Missing standard transition block** — No transition on base `:where(ui-input)`. *(VIPER)*
- [x] **ui-textarea.css: Missing standard transition block** — No transition on base `:where(ui-textarea)`. *(VIPER)*
- [x] **ui-input-otp.css: Incomplete transition** — Only transitions `border-color`. Missing: `background, color, opacity, transform`. *(VIPER)*
- [x] **ui-breadcrumb.css: Incomplete transition** — Only transitions `color`. Missing: `background, border-color, opacity, transform`. *(VIPER)*
- [x] **ui-nav.css: Incomplete nav-item transition** — Only transitions `background, color`. Missing: `border-color, opacity, transform`. *(VIPER)*
- [x] **UILayoutInspector: Missing export from main barrel** — Class exists but not exported from `src/index.ts`. *(PHANTOM)*
- [x] **Core utilities missing from barrel** — 10 APIs in `src/core/index.ts` not re-exported: `FormAssociable`, `getTraitRuntime`, `DismissStack`, `ToastManager`, `TraitRuntime` (type), `RuntimeToastOptions` (type), `parseTraitAttribute`, `collectTraitOptions`, `GestureRouter`, `GestureParticipant` (type). *(PHANTOM)*
- [x] **resizable-adapter: Missing `reverse` option in update()** — `ResizeController.reverse` property not handled in adapter's `update()` method. Dynamic attribute changes ignored. *(WRAITH)*
- [x] **ui-slideshow: Untracked setTimeout + missing listener cleanup for dots** — `#stampIndicators()` attaches click listeners to dot buttons without cleanup in teardown(). setTimeout also untracked. *(KRAKEN)*
- [x] **ui-calendar: Non-null assertions on rangeStart** — Lines 254, 287: `this.#store.rangeStart.value!` uses `!` operator. If state machine enters "selecting" without rangeStart set, passes null silently. *(SPHINX)*
- [x] **drag-controller: hidePopover() on potentially disconnected ghost** — Line 415: Missing `isConnected` check before `hidePopover()`. *(SPHINX)*
- [x] **ui-layout-sidebar: Padding violations** — Hard-coded padding values instead of token formulas. *(SCORPION)*

## P2 — Medium

- [x] **ui-segmented-control.css: Hard-coded `white` color** — Line 47: `background: white` on indicator. Should use token `var(--_indicator-background, white)`. *(DRAGON)*
- [~] **ui-option.css: Uniform padding** — FALSE POSITIVE: already uses `padding-inline` only (no `padding` shorthand). *(SCORPION)*
- [~] **ui-accordion.css: Incomplete transition** — FALSE POSITIVE: already has full 5-property block. *(VIPER)*
- [~] **ui-tree.css: Non-standard transition** — FALSE POSITIVE: already has full 5-property block. *(VIPER)*
- [~] **ui-slideshow.css: Non-standard transition** — CORRECT: dots use targeted 2-property transition (sub-elements). *(VIPER)*
- [x] **swipe-controller: Unconditional transient listener removal in detach()** — Lines 47-49: Removes pointerup/pointercancel listeners even if never attached. Harmless but poor state tracking. *(WRAITH)*
- [~] **ui-breadcrumb.css: Hard-coded 1rem gap** — FALSE POSITIVE: uses `calc(var(--_space) * 1)` token formula. *(SCORPION)*
- [~] **ui-badge.css: Hard-coded 9999px radius** — ACCEPTABLE: standard pill shape pattern. *(SCORPION)*
- [~] **ui-avatar.css: Hard-coded 50% radius** — ACCEPTABLE: standard circle pattern. *(SCORPION)*
- [~] **ui-chat-input: Missing padding-block** — FALSE POSITIVE: wrapper element, children handle padding. *(SCORPION)*
- [~] **ui-calendar: `as HTMLElement` casts hide null** — FIXED: covered by P0 querySelector null guards fix. *(SPHINX)*

## P3 — Low

- [~] **ui-pagination: Hard-coded 0.25rem gap** — FALSE POSITIVE: already uses `calc(var(--_space) * 1)` token formula. *(SCORPION)*

---

## Deduplication Notes

| Finding | Teams | Resolution |
|---------|-------|------------|
| swipe-controller setTimeout leak | WRAITH + KRAKEN | Merged — KRAKEN gets -2 dedup penalty |
| ui-slideshow dot listener leak | KRAKEN (unique) | No dedup needed |
| ui-button disabled CSS | PHOENIX (unique) | No dedup needed |
| Calendar querySelector null | SPHINX (unique) | No dedup needed |

## Statistics

| Metric | Value |
|--------|-------|
| Total raw findings | 42 |
| After dedup | 30 |
| False positives | 8 (SPHINX self-corrected 6, PHOENIX 1, KRAKEN 1) |
| P0 Critical | 5 (5 fixed) |
| P1 High | 14 (14 fixed) |
| P2 Medium | 11 (2 fixed, 8 false positive/acceptable, 1 covered by P0) |
| P3 Low | 1 (1 false positive) |
| Clean audits | HYDRA (0 issues — exemplary CSS architecture) |
| **Resolution** | **22 fixed, 8 dismissed, 0 remaining** |

---

# Tournament 2 Findings (2026-02-26)

## P0 — Critical

- [x] **Combobox signal same-value skip** — `ui-combobox-element.ts:265`: active sync effect reads only `activeIndex.value`, not `view.value`. When filtering resets activeIndex to -1 (already -1), effect skips. `[active]` attribute stales. Fix: add `this.#list.view.value;` dependency. *(SPHINX)*

- [x] **Input-OTP cell listener leak** — `ui-input-otp-element.ts:127-129`: adds input/keydown/focus listeners to cells but `teardown()` never removes them. Accumulates on cell re-stamp. *(WRAITH)*

- [x] **Calendar grid listener leak** — `ui-calendar-element.ts:149-155`: adds click/pointermove with anonymous arrows to prev/next/title/grid. `teardown()` only removes main keydown. *(WRAITH)*

- [x] **Slideshow indicator listener leak** — `ui-slideshow-element.ts:276`: anonymous click listeners on dots. `teardown()` clears innerHTML without removing. *(WRAITH)*

## P1 — High

- [x] **Missing `[hidden]` overrides (13 components)** — Components set `display` but lack `:where(el[hidden]) { display: none }`. UA hidden loses to author-layer display. Affected: ui-field, ui-accordion, ui-radio, ui-range, ui-chat, ui-breadcrumb, ui-avatar, ui-badge, ui-pagination, ui-input-otp, ui-slideshow, ui-tree, ui-segmented-control. *(HYDRA)*

- [x] **No constraint validation (setValidity)** — 4 components accept `required` but never call `internals.setValidity()`: ui-input, ui-textarea, ui-checkbox, ui-radio-group. *(PHOENIX)*

- [x] **FormAssociable missing callbacks** — Mixin lacks `formStateRestoreCallback()` and `formAssociatedCallback()`. Autofill/bfcache restore won't work. *(PHOENIX)*

- [x] **Hard-coded backdrop oklch()** — `ui-dialog.css:33`, `ui-drawer.css:36` use `oklch(0% 0 0)` instead of token. *(HYDRA)*

- [x] **Hard-coded font sizes** — `ui-listbox.css:120`, `ui-table.css:207` use `0.625rem` for group headers. *(HYDRA)*

- [~] **Pagination button listener accumulation** — FALSE POSITIVE: buttons are removed from DOM on re-render (textContent = ''), GC collects listeners with nodes. *(WRAITH)*

- [x] **ColumnResize document listener leak** — `column-resize-controller.ts:80-83`: document-level listeners during resize not cleaned if element removed mid-drag. *(WRAITH)*

## P2 — Medium

- [ ] **Missing `required` on 6 form controls** — ui-range, ui-select, ui-combobox, ui-input-otp, ui-calendar, ui-segmented-control lack `required` in `observedAttributes`. *(PHOENIX)*

- [x] **Inconsistent initial value capture** — ui-range and ui-input-otp read current attribute on reset instead of setup-time capture. *(PHOENIX)*

- [x] **Calendar setup missing batch()** — `ui-calendar-element.ts:93-98`: sets value/min/max without batching → 3 intermediate recomputes. *(SPHINX)*

- [ ] **Z-index strategy undocumented** — Table z-index 1-5, sidebar 10. No tokens or doc. *(HYDRA)*

- [x] **Slideshow hard-coded control sizes** — `ui-slideshow.css:129` uses `2rem`, dots `1.25rem`. *(HYDRA)*

- [x] **ARIA: internals.ariaLabel without setAttribute** — pagination, radio-group, avatar, breadcrumb, tree set `internals.ariaLabel` only. *(COBRA)*

## P3 — Low

- [x] **CalendarStore month navigation not batched** — Two sequential signal writes in `prevMonth()`. *(SPHINX)*
- [ ] **ReactiveProp boolean/number setters don't guard** — Missing `getAttribute()` check before DOM write. *(SPHINX)*
- [x] **Textarea ariaMultiLine via internals only** — `internals.ariaMultiLine` without DOM attribute. *(COBRA)*

---

## Tournament 2 Scoring

| Team | Findings | CRIT | HIGH | MED | LOW | Points |
|------|----------|------|------|-----|-----|--------|
| WRAITH (Lifecycle) | 7 real | 3 | 4 | 0 | 0 | **50** |
| PHOENIX (Forms) | 6 real | 0 | 3 | 3 | 0 | **21** |
| HYDRA (CSS) | 5 real | 1 | 2 | 2 | 0 | **24** |
| SPHINX (Signals) | 4 real | 1 | 0 | 1 | 2 | **14** |
| COBRA (ARIA) | 2 real | 0 | 0 | 1 | 1 | **3** |
| PHANTOM (Exports) | 0 | 0 | 0 | 0 | 0 | **0** |

## Tournament 2 Awards

- **1st Place**: Team WRAITH (50 pts) — 3 critical memory leaks + 4 high lifecycle gaps
- **2nd Place**: Team HYDRA (24 pts) — `[hidden]` override gap across 13 components
- **3rd Place**: Team PHOENIX (21 pts) — Systemic form validation gap
- **Ingenious Discovery**: Team SPHINX — Combobox signal same-value skip (3x bonus = 30 pts)
- **Most Impactful Finding**: Team HYDRA — 13-component `[hidden]` override gap
- **Most Lethal**: Team WRAITH — 7 findings, 3 critical
- **Cleanest Audit**: Team COBRA — 2 findings, 0 false positives
- **Wall of Shame**: Team PHANTOM — 0 findings (export surface is spotless)

## Tournament 2 Statistics

| Metric | Value |
|--------|-------|
| Files audited | ~170 (TS + CSS) |
| Total findings | 24 unique |
| P0 Critical | 4 |
| P1 High | 7 |
| P2 Medium | 6 |
| P3 Low | 3 |
| False positives | 0 |
| Clean areas | Exports, ARIA (near-perfect), `:where()`, `@layer`, popover guards |
