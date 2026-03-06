# Release Notes — 0.7.37

**Date:** March 2026
**Packages:**

| Package | Version | Changes |
|---------|---------|---------|
| `@nonoun/native-ui` | 0.7.37 | CSS fixes, lifecycle hardening, sub-container alignment |
| `@nonoun/native-a2ui` | 0.2.2 | Session layer, adapters, 4 demo pages, tests |
| `@nonoun/native-app` | 0.3.17 | Sidebar nav fix |
| `@nonoun/native-cdn` | 0.2.11 | Version bump |
| `@nonoun/native-chart` | 0.1.7 | Version bump |
| `@nonoun/native-chat` | 0.5.23 | Version bump |
| `@nonoun/native-codemirror` | 0.2.20 | Version bump |
| `@nonoun/native-editor` | 0.2.15 | Version bump |
| `@nonoun/native-playground` | 0.2.15 | Version bump |
| `@nonoun/native-tokens` | 0.5.15 | Version bump |

---

## Headline: A2UI Session Layer

`@nonoun/native-a2ui` gains a complete session management system — the runtime that sits between agent protocols (A2A, AG-UI) and the A2UI surface rendering pipeline.

### What is A2UI?

A2UI (Agent-to-Agent UI) is our protocol for agents to render UI. An agent sends a flat array of declarative component descriptions, and the kernel converts them to live DOM. The previous release (0.1.x) established the component protocol, converter, and kernel integration. This release adds the **session layer** — the coordination fabric that manages *who* can render *where*, and *how* agent protocols connect.

### Architecture

```
Agent Protocol (A2A / AG-UI / Direct)
        ↓
    Adapter (translates to A2UI messages)
        ↓
    AgentSession (owns surfaces, tracks state)
        ↓
    NSurfaceRegistry (mount point → DOM)
        ↓
    Kernel (a2uiToUINode → conversionToPlan → executePlan → live DOM)
```

### New Modules

#### `NSessionManager`
Creates and manages `AgentSession` instances. Provides `createSession()`, `terminateAll()`, and session lookup. Holds the shared kernel reference and surface registry.

#### `AgentSession`
Represents a single agent's connection. Key responsibilities:
- **Surface ownership** — Sessions own named surfaces. Only the owning session can write to a surface.
- **Component updates** — `session.receive({ updateComponents: { surfaceId, components } })` renders an agent's component array into its owned surface.
- **Status lifecycle** — `idle` → `active` → `paused` → `terminated`. Events dispatched on each transition.
- **Event emitter** — `session.on('status-change', fn)`, `session.on('error', fn)`, `session.on('component-update', fn)`.

#### `NSurfaceRegistry`
Named render targets (DOM mount points). Key operations:
- `registerMount(surfaceId, element)` — associates a DOM element with a surface name.
- `setOwner(surfaceId, sessionId)` / `clearOwner()` / `getOwner()` — single-owner write gating.
- `isOwner(surfaceId, session)` — ownership check before rendering.

#### `buildCatalogFromRegistry(preset)`
Builds a typed catalog of available A2UI components. Presets:
- `'core-only'` — Column, Row, Text, Icon, Button, Input, Slider, Toggle, Select, ChoicePicker, TextArea, Badge, Divider, Card, Image, Video, Audio, Tabs, Accordion.

#### Adapters
Protocol adapters bridge external systems to the A2UI session layer:
- **`DirectAdapter`** — In-process adapter for local agents. Used in simulation mode, testing, and the tic-tac-toe demo.
- **`A2AAdapter`** — Google A2A protocol adapter. Handles task delegation, streaming results, and component updates from A2A-compliant agents.
- **`AgUIAdapter`** — AG-UI protocol adapter. Handles agent-generated UI streaming from AG-UI-compliant agents.

#### `EventEmitter`
Lightweight typed event emitter. `on(event, fn)` / `off(event, fn)` / `emit(event, ...args)`. Used internally by `AgentSession`.

### Tests
5 new test suites (all passing):
- `catalog.test.ts` — catalog building, preset filtering
- `direct-adapter.test.ts` — in-process message routing
- `event-emitter.test.ts` — subscribe, emit, unsubscribe
- `session-manager.test.ts` — session lifecycle, termination
- `surface-registry.test.ts` — mount registration, ownership, write gating

---

## A2A Tic-Tac-Toe Demo

A full end-to-end demo at `packages/native-a2ui/src/a2a-tictactoe.html` showcasing all A2UI session layer concepts in a playable game.

### Features

**Dual independent surfaces** — Each player (X and O) has its own `n-card` with an A2UI surface mount. Both boards render the same game state independently via `session.receive()`.

**Model selection** — Footer selects let you pick any combination:
- X player: Human, Claude Haiku 4.5
- O player: Human, GPT-5 mini, GPT-5 nano, GPT-4.1 mini, GPT-4.1 nano

**Human play** — When a player is set to "Human", the game waits for a cell click. Uses a Promise-based `waitForHumanMove()` with a pending cell queue for click-to-start scenarios. Clicks work on either board.

**Click-to-start** — Clicking an empty cell when no game is active automatically sets that side to Human, starts a new game, plays the clicked cell, and enters auto-play mode.

**Simulation mode** — Toggle enables local minimax AI (win → block → center → corner → edge) for instant play without API calls.

**Auto-play** — Runs the full game automatically. All controls (selects, buttons, switch) are disabled during auto-play.

**API integration** — Parameterized by model value:
- Models starting with `claude` → Anthropic Messages API (`/api/anthropic/messages`)
- Other models → OpenAI Chat Completions API (`/api/openai/chat/completions`)

**Visual indicators:**
- **Active turn** — 3px outline on the active player's card and select button, in the player's color (accent for X, danger for O). Pulsing animation fades the outline to 30% opacity and back over 2 seconds.
- **Winner** — 6px solid outline on the winning card (accent for X, danger for O). Overrides the pulsing animation.
- **Draw** — All outlines cleared.
- **Cell hover** — Empty cells show `--n-panel-hover` background on hover. Occupied cells show default cursor.
- **Icon transitions** — New icons scale in from 50% with opacity fade over 200ms (`icon-in` keyframe).

**Board rendering:**
- 3×3 CSS grid with 1px gap lines (`background: var(--n-border-muted)`)
- Cells are A2UI `Column` components with inline styles
- Icons: Phosphor `x` (accent color) and `circle` (danger color) at 75% cell size
- Win cells: colored backgrounds (`--n-button-accent` / `--n-button-danger`) with white icons
- Empty cells carry `data-empty` attribute for CSS hover targeting
- Initial empty board renders on page load via kernel directly (bypassing sessions)

**Score tracking** — Tabular-nums score display (2.25rem) in the footer between the model selects.

**Event log** — Collapsible `<details>` with monospace log of all game events, API calls, responses, and errors.

---

## CSS Changes — Full Detail

### `n-button` (`button.css`)
- **Added:** `max-height: var(--n-size)` to `:where(n-button)` base rule.
- **Why:** Prevents buttons from stretching vertically when placed in flex containers with `align-items: stretch`. Buttons should always respect their size scale height.

### `n-input` (`input.css`)
- **Added:** `max-height: var(--n-size)` to `:where(n-input)` base rule.
- **Why:** Same vertical containment as button. Inputs in flex rows were growing taller than intended.

### `n-select` popover (`select.css`)
- **Removed:** `margin-inline: var(--n-popover-viewport-margin)` from `:where(n-select) > :where(n-listbox[popover])`.
- **Why:** This caused the dropdown listbox to be inset by ~4px from the trigger button edge, creating a visible misalignment. The viewport margin is only needed for block direction (top/bottom clipping prevention), not inline.

### `n-card` (`card.css`)
- **Changed:** `gap: calc(var(--n-space) * 0)` → `gap: 0`.
- **Why:** Simplified; the multiplication was unnecessary.

### `n-stack` (`stack.css`)
- **Changed:** `flex: 1 1 100%` → `flex: 1 1 0%`.
- **Why:** `flex-basis: 100%` caused stacks to overflow their containers. `flex-basis: 0%` is the standard flex-grow behavior — items share space proportionally without claiming 100% as their starting size.

### `n-header` (`header.css`)
- **Changed:** Default `--n-header-padding-block` from `calc(var(--n-space) * 2)` to `calc(var(--n-space) * 4)`.
- **Changed:** Padding variants now match footer scale:
  - `tight`: block `space × 2`, inline `space × 4`
  - `regular`: block `space × 4`, inline `space × 6`
  - `relaxed`: block `space × 6`, inline `space × 8`
- **Changed:** `min-height` formula updated to `calc(var(--n-size) + var(--n-header-padding-block) * 2)`.
- **Why:** Headers and footers at the same padding variant now produce identical heights. Previously headers were shorter than footers.

### `n-footer` (`footer.css`)
- **Changed:** Padding variants aligned to same scale as header (see above).
- **Why:** Consistency across sub-containers.

### `n-body` (`body.css`)
- **Changed:** Padding variants aligned. Default `--n-body-padding-block` and `--n-body-padding-inline` both `calc(var(--n-space) * 4)`.
- **Changed:** Divider breathing room rules updated for new padding values.

### `n-components.shared.css`
- Updated shared control text defaults.

### `n-tokens.css`
- Minor token adjustments for consistency.

---

## Lifecycle Hardening

### NativeElement (`native-element.ts`)
- **Renewable `ready` promise:** The `ready` getter returns `#readyPromise`, which is recreated fresh on each `connectedCallback`. Previously resolved promises stay resolved — new connections get a new promise.
- **`deferChildren` retries:** Three-attempt strategy: sync check → microtask → RAF → RAF. The `#pendingDefers` counter gates the ready promise.
- **`#alive` guard:** Prevents double-setup when elements are rapidly moved between DOM locations. `disconnectedCallback` checks `_reparenting` before teardown.

### NController (`controller-element.ts`)
- Calls `renewReady()` in own `connectedCallback` (intentionally skips `super.connectedCallback` to avoid double-setup).
- `#retryApplyFirstChild` for wrapper mode: handles case where the first child element isn't ready/upgraded yet.

### DragController (`drag-controller.ts`)
- **Re-entry fix:** `lostpointercapture` listener is removed *before* calling `releasePointerCapture`, preventing the listener from firing during cleanup.
- **Leak prevention:** Document-level listeners (`pointermove`, `pointerup`) are removed *before* dispatching `native:drop`, preventing leaks when event handlers navigate away.

### Sidebar Nav (`sidebar-nav-element.ts`)
- Minor lifecycle fix for sidebar navigation in `@nonoun/native-app`.

---

## Breaking Changes

### `n-stack` flex-basis change
**`flex: 1 1 100%` → `flex: 1 1 0%`**

This is the most impactful change. If you relied on `n-stack` claiming 100% of available space as its flex-basis, layouts may shift. In most cases this is a *fix* — stacks now behave like standard flex-grow items. If you need the old behavior, add `style="flex-basis: 100%"` explicitly.

### `n-header` padding increase
**Default block padding doubled from `space × 2` to `space × 4`.**

Headers will be taller by default. If you need compact headers, use `padding="tight"`.

### `n-select` popover alignment
**Dropdown listbox no longer has inline margins.**

Dropdowns now align flush with the trigger button's left edge. If you were compensating for the previous inset with custom margins, remove those overrides.
