# A2UI Builder

Interactive Gen UI tool that converts natural-language descriptions into live native-ui interfaces via the A2UI protocol.

## Architecture

```
a2ui-builder.html   ← Page shell (pure HTML, no inline code)
a2ui-builder.ts     ← All behavior: LLM adapter, chat, panels, resize, welcome screen
a2ui-builder.css    ← All styles: dark chrome, light chat, panels, welcome, resize handles
```

### Data Flow

```
User prompt → sendMessage()
  ├─ LLM mode:  GatewayAdapter.sendMessage() → JSON response → applyResult()
  └─ Mock mode:  mockResponse() → pattern-matched MockResult → applyResult()

applyResult()
  ├─ addMessage()      → n-chat-message in chat feed
  ├─ renderConcepts()  → n-badge list in Concepts pane
  ├─ renderSchema()    → JSON pretty-print in Schema pane
  ├─ renderPreview()   → Kernel + A2UIAdapter → live DOM in Preview pane
  └─ addSeedChips()    → n-chat-message-seed follow-up suggestions
```

### LLM Integration

The builder supports multiple LLM backends via a factory pattern:

| Model prefix | Adapter | Env var |
|-------------|---------|---------|
| `claude-*` | `ClaudeGatewayAdapter` | `VITE_ANTHROPIC_API_KEY` |
| `gpt-*` | `OpenAiGatewayAdapter` | `VITE_OPENAI_API_KEY` |
| `human` | `null` (mock mode) | — |

`buildAdapter(model)` returns the correct adapter based on the model string. The model picker (`n-select`) fires `native:change` to rebuild the adapter at runtime.

Without API keys, the builder falls back to mock mode with keyword-matched responses (login, settings, dashboard, contact form) and iterative refinement patterns (add, remove, remap, make horizontal).

### Response Protocol

The LLM returns one of three JSON response types:

- **`schema`** — Generate or update a UI schema. Contains `reply`, `concepts[]`, and `schema` (A2UI adjacency list).
- **`question`** — Ask a clarifying question. Contains `reply`, optional `concepts[]`, and optional `suggestions[]` for seed chips.
- **`remap`** — Swap component types. Contains `reply`, `remaps[]` with `from`/`to`/`reason`, and the updated `schema`.

### Component Map

31 A2UI types mapped to native-ui tags across 7 categories:

| Category | Types |
|----------|-------|
| layout | Row, Column |
| container | Card, Header, Body, Footer, Modal, Accordion, AccordionItem |
| display | Text, Icon, Image, Badge, Avatar, Divider, Progress |
| input | TextField, TextArea, CheckBox, Switch, Select, Slider, DateTimeInput |
| nav | Tabs, List, ListItem, Breadcrumb |
| action | Button |
| data | Table |
| media | Video, AudioPlayer |
| feedback | Toast |

## Layout

Split-pane IDE layout with coordinated resize:

```
┌─────────────────────────────────────────────────┐
│ n-header: [A2UI Builder] [fill] [panel chips…]  │
├──────────────┬──────────┬───────────┬───────────┤
│              │          │           │           │
│  Chat feed   │ Preview  │ Concepts  │ Schema    │
│  (light bg)  │ (light)  │ (dark)    │ (dark)    │
│              │          │           │           │
├──────────────┤          │           │           │
│ n-footer     │          │           │           │
│ (composer)   │          │           │           │
└──────────────┴──────────┴───────────┴───────────┘
```

- **Chat region**: Light context (`color-scheme: light`), `n-chat-feed` + `n-chat-input-advanced` composer
- **Panes**: Dark chrome, togglable via header chips or close buttons. Preview + Concepts visible by default; Map + Prompt hidden.
- **Resize handles**: Pointer-drag on `.resize-handle` dividers. Widths convert to flex-grow ratios on release.

## Welcome Screen

Centered editorial start screen inside the chat feed:
- `<h1>` heading (2.25rem, 700 weight, -0.03em tracking)
- Model name subtitle (muted)
- Starter chips (`density="inline"`, outlined, pill radius)

Fades out (opacity transition) on:
- Clicking a starter chip
- Focusing the textarea
- Typing in the textarea

## Chat Composer

`n-chat-input-advanced` with three zones:

1. **Header bar**: Model picker (`n-select`) + agent indicator + settings/history buttons
2. **Prompt container**: `n-textarea` (autogrow, single row) + sparkle improve button + toolbar with ghost round icon buttons. Send via Cmd/Ctrl+Enter.
3. **Suggestion chips**: Contextual action buttons (Clarify problem, Define context, Select deliverable, Refine requirements)

## CSS Token Context

The builder uses a dark/light split:

- `.builder` — Dark chrome tokens (`--pg-chrome`, `--pg-editor-bg`, `--pg-text-*`)
- `.builder-chat` — Forces `color-scheme: light` for the chat region
- `.builder-pane[data-panel="preview"]` — Forces `color-scheme: light` for rendered preview

Chat bubble tokens (from `chat.css`):
- User: `--n-chat-bubble-user: var(--n-surface-accent)` (accent background)
- Assistant: `--n-chat-bubble-assistant: transparent` (no background)

## Dependencies

```ts
// Core
import 'register-all.ts';        // All native-ui components
import 'chat/register.ts';        // Chat components (n-chat-*)
import 'kernel/kernel.ts';        // A2UI kernel
import 'a2ui-adapter.ts';         // A2UI → DOM adapter

// LLM adapters
import 'adapter-claude.ts';       // Anthropic API
import 'adapter-chatgpt.ts';      // OpenAI API

// Icons (24 Phosphor icons registered individually)
import 'phosphor/{eye,tag,brackets-curly,...}.ts';
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key for Claude models |
| `VITE_OPENAI_API_KEY` | OpenAI API key for GPT models |

Both are optional. Without either key, the builder uses mock responses.
