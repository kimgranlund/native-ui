# A2A Porting Guide — For the Astro Host

This guide explains the A2UI session layer and how to port the A2A demo pages to the Astro docs site. The demos live in `packages/native-a2ui/src/` and run in the Vite dev server today. They need to be adapted for the Astro host's page layout, CSS loading, and script patterns.

---

## What is A2A / A2UI?

### The Problem

AI agents need to render UI. Today, agents return text or markdown. But for interactive use cases — dashboards, forms, games, workflows — agents need to produce real UI components that the user can see and interact with.

### The Solution: Two Protocols

**A2UI (Agent-to-Agent UI)** is our protocol for agents to declaratively describe UI. An agent sends a flat array of component descriptions:

```json
[
  { "id": "root", "component": "Column", "children": ["title", "btn"], "style": "gap:8px" },
  { "id": "title", "component": "Text", "value": "Hello" },
  { "id": "btn", "component": "Button", "label": "Click me" }
]
```

The kernel converts this to live DOM: `a2uiToUINode()` → `conversionToPlan()` → `kernel.executePlan()` → real `<n-stack>`, `<n-text>`, `<n-button>` elements.

**A2A (Agent-to-Agent)** is Google's protocol for agents to delegate tasks to each other. In our tic-tac-toe demo, two "agents" (Claude and ChatGPT) take turns making moves, each rendering their board state through their own A2UI surface.

### Key Concepts

| Concept | What it is |
|---------|------------|
| **Surface** | A named DOM mount point where an agent renders UI. Registered via `manager.surfaces.registerMount('board', element)`. |
| **Session** | An `AgentSession` — represents one agent's connection. Has an ID, status lifecycle, event emitter, and surface ownership list. |
| **Session Manager** | `NSessionManager` — creates sessions, holds the shared kernel and surface registry. |
| **Ownership** | Each surface has at most one owner session. Only the owner can write to a surface. Ownership can be transferred. |
| **Catalog** | A typed list of A2UI components an agent is allowed to use. Built from the kernel's component registry. |
| **Adapter** | Bridges an external agent protocol (A2A, AG-UI) to the A2UI session layer. `DirectAdapter` is for in-process/local agents. |

### The Rendering Pipeline

```
Agent sends component array
  → session.receive({ updateComponents: { surfaceId, components } })
    → NSurfaceRegistry checks ownership
      → a2uiToUINode(components) converts flat array to tree
        → conversionToPlan(tree) creates kernel execution plan
          → kernel.executePlan(plan, mountElement) stamps live DOM
```

### Surface Ownership Pattern

Two modes demonstrated in the demos:

1. **Independent surfaces** (Tic-Tac-Toe) — Each agent owns its own surface permanently. Both render the same game state into their respective mounts. No ownership transfer needed.

2. **Shared surface with transfer** (Ownership demo) — One surface, ownership transfers between agents. Only the current owner can write. `manager.transferSurfaceOwnership('board', nextSession.id)`.

---

## Demo Pages to Port

All four demos live in `packages/native-a2ui/src/`:

### 1. `a2a-tictactoe.html` — The Flagship Demo

**Purpose:** Two AI agents play Tic-Tac-Toe. Showcases independent surfaces, session management, human interaction, and real API calls.

**Layout:**
- `<h1>` + description `<n-text>`
- Outer `<n-container>` with:
  - `<n-header>` containing `<n-toolbar>` with: Auto Play (primary), Next Move (default), Simulation switch, spacer, New Game button
  - `<n-body>` containing `<n-grid cols="2">` with two `<n-container>` boards (each has `<n-body padding="none">` with a `.surface-mount` div)
  - `<n-footer justify="space-between">` with: X model select, score display, O model select
- Collapsible `<details>` event log

**Key details for porting:**
- Inline `<style>` block with pulsing outline animations, cell hover states, icon transitions, score typography
- Two `<script type="module">` blocks are NOT needed — the demo uses a single `<script>` that imports everything
- API calls go to `/api/anthropic/messages` and `/api/openai/chat/completions` — the Astro host needs proxy routes or direct API access
- Env vars: `VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`
- Icon imports: `x.ts` and `circle.ts` from `src/icons/phosphor/` must be explicitly imported (they self-register)
- The `native-dashboard-spa` wrapper is dev-only — replace with Astro layout

### 2. `a2a-sessions.html` — Session Lifecycle

**Purpose:** Create, pause, resume, terminate sessions. Shows status transitions.

### 3. `a2a-ownership.html` — Surface Ownership

**Purpose:** Two agents competing for write access. Ownership gating and transfer.

### 4. `a2a-catalog.html` — Component Catalog

**Purpose:** Browse available A2UI components and their capabilities.

---

## Import Map

The demos import from relative paths. In the Astro host, these become package imports:

| Demo import | Astro host import |
|-------------|-------------------|
| `'../../../src/components/button/button.ts'` | `import '@nonoun/native-ui/components/button/button.js'` or register via CDN bundle |
| `'../../../src/kernel/kernel.ts'` | `import { Kernel, resetKernel } from '@nonoun/native-ui/kernel'` |
| `'./session/session-manager.ts'` | `import { NSessionManager } from '@nonoun/native-ai'` |
| `'./session/catalog.ts'` | `import { buildCatalogFromRegistry } from '@nonoun/native-ai'` |
| `'./protocol/a2ui-converter.ts'` | `import { a2uiToUINode, conversionToPlan } from '@nonoun/native-ai'` |
| `'../../../src/icons/phosphor/x.ts'` | `import '@nonoun/native-ui/icons/phosphor/x.js'` |
| `'../../../src/icons/phosphor/circle.ts'` | `import '@nonoun/native-ui/icons/phosphor/circle.js'` |

### CSS Loading

The demos load CSS via `<link>`:
```html
<link rel="stylesheet" href="../../../src/styles/index.css" />
<link rel="stylesheet" href="../../../src/styles/components.css" />
```

In the Astro host, this is already handled by your global CSS setup. The A2UI pages need no additional CSS beyond what's already loaded — all components used (card, button, select, listbox, switch, toolbar, grid, stack, text, icon, header, body, footer) are in the standard component bundle.

### Component Registration

The demos manually import each component's registration module. In the Astro host, if you're using the CDN bundle or a global registration script, these individual imports may not be needed. But ensure these components are registered:

- `n-button`, `n-select`, `n-listbox`, `n-option`, `n-switch`
- `n-container`, `n-toolbar`, `n-grid`, `n-stack`, `n-text`
- `n-header`, `n-body`, `n-footer`
- `n-icon` (plus explicit icon module imports for `x` and `circle`)

### Kernel Setup

Every A2UI page needs:

```js
import { Kernel, resetKernel } from '@nonoun/native-ui/kernel';
import { NSessionManager } from '@nonoun/native-ai';
import { buildCatalogFromRegistry } from '@nonoun/native-ai';
import { a2uiToUINode, conversionToPlan } from '@nonoun/native-ai';

resetKernel();
const kernel = new Kernel({ allowUnregistered: true });
const manager = new NSessionManager(kernel);
const catalog = buildCatalogFromRegistry('core-only');
```

`resetKernel()` clears any previous kernel state — important for SPA navigation where the kernel might persist across page loads.

---

## API Proxy Routes

The tic-tac-toe demo calls two APIs. The Astro host needs proxy routes (to avoid CORS and key exposure):

### Anthropic (Claude)
```
POST /api/anthropic/messages
Headers: x-api-key, anthropic-version, Content-Type
Body: { model, max_tokens, messages }
```

### OpenAI (ChatGPT)
```
POST /api/openai/chat/completions
Headers: Authorization (Bearer), Content-Type
Body: { model, max_completion_tokens, messages }
```

These should proxy to the respective APIs with server-side key injection. The demo currently reads keys from `import.meta.env` and sends them in headers — in production, the Astro server route should inject keys server-side.

---

## Step-by-Step Porting Checklist

1. **Create Astro pages** for each demo (e.g., `src/pages/a2ui/tictactoe.astro`)
2. **Copy the HTML** from each demo's `<main>` content into the Astro layout slot
3. **Copy the `<style>` block** into the Astro page's `<style>` or a scoped stylesheet
4. **Adapt the `<script>` block:**
   - Change relative imports to package imports (see import map above)
   - Remove `native-dashboard-spa` wrapper (Astro layout handles this)
   - Remove dev-specific imports (`src/nav/native-dashboard.ts`)
5. **Set up API proxy routes** for Anthropic and OpenAI (server-side key injection)
6. **Add environment variables** for API keys (server-side only)
7. **Add navigation entries** in the sidebar for the new A2UI section
8. **Test:** Auto-play simulation mode works without API keys. Human play works by clicking cells. API play works with valid keys.

---

## File Reference

| File | Purpose |
|------|---------|
| `packages/native-a2ui/src/a2a-tictactoe.html` | Complete tic-tac-toe demo (HTML + CSS + JS) |
| `packages/native-a2ui/src/a2a-sessions.html` | Session lifecycle demo |
| `packages/native-a2ui/src/a2a-ownership.html` | Surface ownership demo |
| `packages/native-a2ui/src/a2a-catalog.html` | Component catalog explorer |
| `packages/native-a2ui/src/session/session-manager.ts` | `NSessionManager` class |
| `packages/native-a2ui/src/session/agent-session.ts` | `AgentSession` class |
| `packages/native-a2ui/src/session/surface-registry.ts` | `NSurfaceRegistry` class |
| `packages/native-a2ui/src/session/catalog.ts` | `buildCatalogFromRegistry()` |
| `packages/native-a2ui/src/session/event-emitter.ts` | `EventEmitter` class |
| `packages/native-a2ui/src/adapters/` | Protocol adapters (A2A, AG-UI, Direct) |
| `packages/native-a2ui/src/protocol/a2ui-converter.ts` | `a2uiToUINode()`, `conversionToPlan()` |
| `docs/RELEASE-0.7.37.md` | Full release notes |
