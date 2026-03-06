# @nonoun/native-chat

Chat UI components for `@nonoun/native-ui` — message feed, composer input, streaming transport, and a top-level panel with imperative host-integration APIs.

## Install

```bash
npm install @nonoun/native-chat @nonoun/native-ui
```

## Quick Start

```html
<link rel="stylesheet" href="node_modules/@nonoun/native-ui/dist/native-ui.css" />
<link rel="stylesheet" href="node_modules/@nonoun/native-chat/dist/native-chat.css" />

<script type="module">
  import '@nonoun/native-ui/register';
  import '@nonoun/native-chat/register';
</script>

<native-chat-panel auto-focus-policy="open-request">
  <!-- panel stamps its own children: header, feed, composer -->
</native-chat-panel>
```

## Architecture

Components follow three patterns:

| Pattern | Elements | Description |
|---------|----------|-------------|
| **Orchestrator** | `native-chat-panel`, `n-chat-input` | Stamp their own children (header, feed, composer) and manage lifecycle. Host writes a single tag; JS builds the tree. |
| **Container** | `n-chat-feed`, `n-chat-messages`, `n-chat-message` | Arrange author-provided or panel-stamped children. CSS layout works without JS; JS adds auto-scroll, MutationObserver routing, action toolbars. |
| **Renderer** | `n-chat-message-text`, `n-chat-message-activity`, `n-chat-message-seed`, `n-chat-message-genui`, `n-chat-input-structured`, `n-chat-avatar` | Transform data (markdown, JSON, schema) into DOM. JS-essential — content is dynamic and stream-driven. |

Chat is a **real-time, stream-driven UI** — JavaScript is fundamental, not optional. See `docs/PRINCIPLES.md` for the exception clause covering interactive components.

## Gateway Mode (Claude + ChatGPT)

`native-chat-panel` can run fully managed send/stream behavior when `gateway` and `gateway-url` are set. All configuration is attribute-driven — no JavaScript required:

```html
<native-chat-panel
  gateway="claude"
  gateway-url="/api/anthropic"
  model="claude-haiku-4-5-20251001"
  models="claude-haiku-4-5-20251001,claude-sonnet-4-6-20250514,gpt-4.1-mini,gpt-4.1"
  gateway-urls='{"claude":"/api/anthropic","gpt":"/api/openai"}'
  open
></native-chat-panel>
```

The `models` attribute accepts a comma-separated list of model IDs. The `gateway-urls` attribute is a JSON map of provider prefixes to URLs — when the user selects a model, the panel auto-resolves the correct gateway and URL from the prefix (e.g., `gpt-4.1` matches the `gpt` prefix → switches to `/api/openai`).

For advanced configuration, use JS properties:

```ts
const panel = document.querySelector('native-chat-panel');
panel.gatewayConfig = { maxTokens: 1024 };
```

### Required server routes

Use first-party backend routes in production (do not call providers directly from browser):

- `POST /api/anthropic/messages`
- `GET /api/anthropic/models`
- `POST /api/openai/chat/completions`
- `GET /api/openai/models`

Provider keys must stay server-side.

## Components

| Element | Description |
|---------|-------------|
| `native-chat-panel` | Top-level panel — owns lifecycle, focus policy, header actions |
| `n-chat-feed` | Scrollable message feed with optional virtualization |
| `n-chat-messages` | Message list wrapper (inside feed) |
| `n-chat-message` | Single message container with role, status, actions |
| `n-chat-message-text` | Markdown-rendered text bubble |
| `n-chat-message-activity` | Typing / system activity indicator |
| `n-chat-message-seed` | Seed prompt card |
| `n-chat-message-genui` | Generative UI node renderer |
| `n-chat-avatar` | Message avatar |
| `n-chat-input` | Composer with submit, formatting, slash commands |
| `n-chat-input-structured` | Multi-option structured input picker |

---

## Embedding Guide

### Panel Host API

`native-chat-panel` exposes three imperative methods for host orchestration:

#### `open(options?)`

```ts
panel.open();
panel.open({ focusComposer: true, reason: 'deeplink' });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusComposer` | `boolean` | `false` | Request composer focus after opening |
| `reason` | `string` | — | Why the panel opened (telemetry / debugging) |

Sets the `[open]` attribute. Idempotent — calling `open()` when already open does not re-emit events.

#### `close(reason?)`

```ts
panel.close();
panel.close('user-dismiss');
```

Removes the `[open]` attribute. Idempotent.

#### `focusComposer(options?, by?)`

```ts
panel.focusComposer();
panel.focusComposer({ cursor: 'end' }, 'api');
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cursor` | `'start' \| 'end' \| 'preserve'` | `'end'` | Caret placement after focus |
| `by` | `'api' \| 'user' \| 'policy'` | `'api'` | Focus source (included in events) |

Retries up to 3 times via microtask if the composer is not yet available or disabled. On success dispatches `native:composer-focused`; on failure dispatches `native:composer-focus-failed`.

---

### Lifecycle Events

All events bubble and are composed (cross shadow DOM). Listen on the panel or any ancestor:

```ts
const panel = document.querySelector('native-chat-panel');

panel.addEventListener('native:chat-opened', (e) => {
  console.log('opened', e.detail.source, e.detail.focusComposer);
});

panel.addEventListener('native:chat-closed', (e) => {
  console.log('closed', e.detail.reason);
});

panel.addEventListener('native:send', (e) => {
  console.log('user sent:', e.detail.value);
  // Call e.preventDefault() to block auto-clear
});
```

| Event | Detail | Notes |
|-------|--------|-------|
| `native:chat-opened` | `{ source?: string, focusComposer: boolean }` | After panel opens |
| `native:chat-closed` | `{ reason?: string }` | After panel closes |
| `native:composer-focused` | `{ by: 'api' \| 'user' \| 'policy' }` | Composer received focus |
| `native:composer-focus-failed` | `{ reason: string, attempts: number }` | All focus retries exhausted |
| `native:send` | `{ value: string }` | User submitted message (**cancelable**) |
| `native:chat-stop` | — | User clicked stop button |
| `native:chat-restart` | — | User clicked restart button |
| `native:message-action` | `{ action: string, messageId: string }` | Message action triggered |

---

### Focus Policy

The `auto-focus-policy` attribute controls when the composer auto-focuses:

| Value | Behavior |
|-------|----------|
| `open-request` (default) | Focus composer only when `open({ focusComposer: true })` is called |
| `ready` | Auto-focus once at panel initialization |
| `never` | Never auto-focus — host must call `focusComposer()` explicitly |

**Recommended default:** `open-request` — gives the host full control over focus timing.

#### Focus Failure Handling

When `focusComposer()` cannot reach the textarea (not rendered, disabled, or blocked), the panel emits `native:composer-focus-failed` after 3 retry attempts:

```ts
panel.addEventListener('native:composer-focus-failed', (e) => {
  const { reason, attempts } = e.detail;
  // reason: 'composer-unavailable' | 'disabled' | 'blocked'
  // Show a fallback hint or retry button
});
```

**Recommended UX:** Keep the panel open, show a subtle status hint, and let the user retry manually.

---

### Host Orchestration Patterns

#### Deeplink

```ts
// Parse URL: ?openChat=1
if (new URLSearchParams(location.search).has('openChat')) {
  panel.open({ focusComposer: true, reason: 'deeplink' });
}
```

#### Notification or External Action

```ts
notificationButton.addEventListener('click', () => {
  panel.open({ focusComposer: false, reason: 'notification' });
});
```

#### Intercepting Send

```ts
panel.addEventListener('native:send', (e) => {
  const { value } = e.detail;
  if (!value.trim()) {
    e.preventDefault(); // block auto-clear, ignore empty
    return;
  }
  myTransport.send(value);
});
```

---

### Transport Error & Retry

`createChatTransport()` provides a streaming transport layer with built-in error classification and retry logic.

#### Transport States

```
idle → sending → streaming → ready
                 ↘ retrying → sending (retry loop)
                 ↘ rate-limited     (429)
                 ↘ auth-required    (401/403)
                 ↘ server-error     (5xx / network)
                 ↘ offline          (DNS / TypeError)
```

#### Usage

```ts
import { createChatTransport } from '@nonoun/native-chat';

const transport = createChatTransport({
  baseUrl: '/api/chat',
  format: 'sse',
  retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
  onStateChange(status) {
    // status: { state, statusCode?, retryInMs?, attempt?, maxAttempts?, error? }
    switch (status.state) {
      case 'sending':     showSpinner(); break;
      case 'streaming':   hideSpinner(); break;
      case 'retrying':    showRetryBanner(status.retryInMs); break;
      case 'rate-limited': showRateLimitNotice(status.retryInMs); break;
      case 'auth-required': redirectToLogin(); break;
      case 'server-error': showErrorBanner(status.error); break;
      case 'offline':     showOfflineBanner(); break;
      case 'ready':       clearAllBanners(); break;
    }
  },
});
```

#### Defaults & Behavior

| Behavior | Default |
|----------|---------|
| Retry | Disabled (`maxAttempts: 1`) |
| Retryable errors | 429 (rate-limited), 5xx (server error) |
| Non-retryable | 401/403 (auth-required) — never retried |
| 429 delay | Respects `Retry-After` header (seconds or HTTP-date) |
| Backoff | Exponential: `min(maxDelay, baseDelay * 2^attempt + jitter)` |
| Stream formats | `'sse'`, `'ndjson'`, `'json'` (auto-detected via `detectFormat()`) |

#### Stream End Classification

```ts
import { classifyStreamEnd } from '@nonoun/native-chat';

// Returns: 'complete' | 'partial' | 'error' | 'stopped'
```

| Reason | Meaning |
|--------|---------|
| `complete` | Server sent explicit done signal |
| `partial` | Stream ended without completion (truncated) |
| `error` | Transport or parse error |
| `stopped` | Consumer aborted (user clicked stop) |

Use `partial` status on messages to offer a "Continue" action.

---

### Message Actions

Messages show contextual action buttons (copy, regenerate, edit, feedback):

```html
<n-chat-message role="assistant" actions="copy,regenerate,thumbs-up,thumbs-down">
  <n-chat-message-text>Hello!</n-chat-message-text>
</n-chat-message>
```

| Attribute | Values | Default |
|-----------|--------|---------|
| `actions` | Comma-separated action IDs, or `"none"` | Role-based defaults |
| `actions-style` | `'icon' \| 'label' \| 'icon-label'` | `'icon'` |
| `actions-position` | `'below' \| 'inside'` | `'below'` |

Listen for actions on any ancestor:

```ts
panel.addEventListener('native:message-action', (e) => {
  const { action, messageId } = e.detail;
  if (action === 'copy') navigator.clipboard.writeText(getMessageText(messageId));
});
```

---

### Feed Virtualization

For long transcripts, enable virtual scrolling on the feed:

```html
<n-chat-feed virtual virtual-item-height="80" virtual-overscan="5">
  <n-chat-messages>...</n-chat-messages>
</n-chat-feed>
```

Only visible items (plus overscan buffer) are rendered. The feed emits `native:range-change` with `{ start, end, total }` as the viewport scrolls.

---

## Exports

```ts
// Components
import {
  NChatPanel, NChatInput, NChatFeed, NChatMessage,
  NChatMessages, NChatMessageText, NChatMessageActivity,
  NChatAvatar, NChatMessageSeed, NChatMessageGenUI,
  NChatInputStructured,
} from '@nonoun/native-chat';

// Stream / Transport
import {
  createChatTransport, createChatStream,
  parseSSE, parseNDJSON, parseJSON, detectFormat,
  classifyHttpError, classifyStreamEnd, backoffDelay,
} from '@nonoun/native-chat';

// Types
import type {
  AutoFocusPolicy, ChatPanelOpenOptions, FocusComposerOptions,
  ChatTransportOptions, TransportState, TransportStatus, RetryOptions,
  ChatStreamEvent, ChatStreamChunk, StreamFormat, StreamEndReason,
} from '@nonoun/native-chat';

// Utilities
import { renderMarkdown, renderInline, sanitizeHtml } from '@nonoun/native-chat';
```

## Starter Surface

Compose seed prompts and structured input into a starter card using the `.n-chat-starter` class. It harmonizes spacing between components — no custom CSS needed.

```html
<n-card class="n-chat-starter">
  <n-body>
    <n-chat-message-seed></n-chat-message-seed>
    <n-chat-input-structured
      question="What would you like help with?"
      type="single">
    </n-chat-input-structured>
  </n-body>
</n-card>
```

Add `compact` for tighter spacing (sidebars, small cards):

```html
<n-card class="n-chat-starter" compact>
  <n-body>
    <n-chat-message-seed></n-chat-message-seed>
    <n-chat-input-structured question="Quick start" type="single">
    </n-chat-input-structured>
  </n-body>
</n-card>
```

### Starter Tokens

| Token | Default | Starter | Compact |
|-------|---------|---------|---------|
| `--n-chat-seed-padding-inline` | `var(--n-chat-bubble-padding-inline)` | `0` | `0` |
| `--n-chat-seed-padding-block` | `var(--n-space)` | `0` | `0` |
| `--n-chat-seed-gap` | `var(--n-space)` | *(inherited)* | `space × 0.5` |
| `--n-chat-structured-padding` | `space × 3` | `space × 2` | `space × 1` |
| `--n-chat-structured-gap` | `space × 2` | `space × 1` | `space × 0.5` |

---

## Astro Integration

See the [Astro + native-chat-panel Playbook](../../docs/ASTRO-CHAT.md) for the canonical Astro recipe: CSS load order, registration, event wiring, View Transitions, and troubleshooting.

## Peer Dependency

Requires `@nonoun/native-ui >= 0.6.0`.

## License

MIT
