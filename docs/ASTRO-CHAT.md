# Astro + native-chat-panel Integration Playbook

Canonical recipe for wiring `native-chat-panel` into an Astro project. Assumes you've already set up the base native-ui integration per [ASTRO.md](ASTRO.md).

---

## 1. Install

```bash
npm install @nonoun/native-ui @nonoun/native-chat
```

native-chat has a peer dependency on `@nonoun/native-ui >= 0.6.0`.

---

## 2. CSS Load Order

In your base layout's `<style is:global>`, add native-chat CSS **after** native-ui:

```css
@import '@nonoun/native-ui/css/foundation';   /* 1. colors, tokens, themes, base */
@import '@nonoun/native-ui/css/components';    /* 2. component styles */
@import '@nonoun/native-chat/css';             /* 3. chat panel + message styles */
```

Foundation must come before components. Chat CSS must come after both — it reads `--n-*` tokens defined by foundation and extends component selectors.

---

## 3. Registration Script

native-chat requires **explicit** registration (unlike `@nonoun/native-app` which auto-registers):

```ts
// src/scripts/setup.ts
import '@nonoun/native-ui/register';
import '@nonoun/native-chat/register';
import { registerAllTraits } from '@nonoun/native-ui';

registerAllTraits(); // optional — only if using <n-controller>
```

`@nonoun/native-chat/register` registers 11 chat elements + 11 dogfooded core elements (`n-button`, `n-textarea`, `n-icon`, `n-toolbar`, `n-dialog`, `n-card`, `n-listbox`, `n-option`, `n-option-group`, `n-option-group-header`, `n-select`) + 11 Phosphor icons used internally.

---

## 4. Minimal Panel Setup

`native-chat-panel` stamps its own children (header, feed, composer). You only need the element:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Chat">
  <native-chat-panel
    auto-focus-policy="open-request"
    show-stop
  ></native-chat-panel>
</BaseLayout>
```

### Panel Attributes

| Attribute | Values | Default | Purpose |
|-----------|--------|---------|---------|
| `auto-focus-policy` | `open-request`, `ready`, `never` | `open-request` | When composer auto-focuses |
| `show-stop` | boolean | `false` | Show stop button during streaming |
| `show-restart` | boolean | `false` | Show restart button |

### Slot API

Insert custom content into the panel's header or footer:

```astro
<native-chat-panel auto-focus-policy="open-request">
  <!-- Trailing header actions (model picker, settings) -->
  <n-toolbar slot="header-trailing" variant="blank">
    <n-button variant="ghost" size="sm">
      <n-icon name="gear"></n-icon>
    </n-button>
  </n-toolbar>

  <!-- Leading footer content (file attachments) -->
  <div slot="footer-leading">
    <n-button variant="ghost" size="sm">
      <n-icon name="paperclip"></n-icon>
    </n-button>
  </div>
</native-chat-panel>
```

---

## 5. Event Wiring

All events bubble and are composed (cross shadow DOM). Listen on the panel or any ancestor.

### Sending Messages

```ts
const panel = document.querySelector('native-chat-panel');

panel.addEventListener('native:send', (e) => {
  const { value } = e.detail;

  if (!value.trim()) {
    e.preventDefault(); // block auto-clear, ignore empty
    return;
  }

  // Send to your API
  myTransport.send(value);
});
```

### Lifecycle Events

```ts
panel.addEventListener('native:chat-opened', (e) => {
  console.log('opened', e.detail.source);
});

panel.addEventListener('native:chat-closed', (e) => {
  console.log('closed', e.detail.reason);
});

panel.addEventListener('native:chat-stop', () => {
  transport.abort(); // cancel in-flight stream
});
```

### Message Actions

```ts
panel.addEventListener('native:message-action', (e) => {
  const { action, messageId } = e.detail;

  switch (action) {
    case 'copy':
      navigator.clipboard.writeText(getMessageText(messageId));
      break;
    case 'regenerate':
      regenerateMessage(messageId);
      break;
  }
});
```

### Seed and Structured Input

```ts
panel.addEventListener('native:seed-select', (e) => {
  const { value } = e.detail;
  // User selected a seed prompt
});
```

### Full Event Reference

| Event | Detail | Cancelable |
|-------|--------|------------|
| `native:send` | `{ value: string }` | Yes |
| `native:chat-opened` | `{ source?: string, focusComposer: boolean }` | No |
| `native:chat-closed` | `{ reason?: string }` | No |
| `native:composer-focused` | `{ by: 'api' \| 'user' \| 'policy' }` | No |
| `native:composer-focus-failed` | `{ reason: string, attempts: number }` | No |
| `native:chat-stop` | — | No |
| `native:chat-restart` | — | No |
| `native:message-action` | `{ action: string, messageId: string }` | No |
| `native:model-change` | `{ value: string, previousValue: string }` | No |

---

## 6. Host Orchestration

### Imperative API

```ts
const panel = document.querySelector('native-chat-panel');

// Open panel with composer focus
panel.open({ focusComposer: true, reason: 'deeplink' });

// Close panel
panel.close('user-dismiss');

// Focus composer programmatically
panel.focusComposer({ cursor: 'end' }, 'api');
```

### Model Picker

Set available models via the `models` property:

```ts
panel.models = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'claude', label: 'Claude' },
];

panel.addEventListener('native:model-change', (e) => {
  console.log('switched to', e.detail.value);
});
```

### Deeplink Pattern

```ts
if (new URLSearchParams(location.search).has('openChat')) {
  panel.open({ focusComposer: true, reason: 'deeplink' });
}
```

---

## 7. Astro View Transitions

With `<ClientRouter />`, wire events in `astro:page-load` to survive navigations:

```ts
document.addEventListener('astro:page-load', () => {
  const panel = document.querySelector('native-chat-panel');
  if (!panel) return;

  panel.addEventListener('native:send', (e) => {
    myTransport.send(e.detail.value);
  });
});
```

If the chat panel persists across pages (e.g. in a sidebar), wire events once outside `astro:page-load` instead.

---

## 8. Starter Surface (Seeds + Structured Input)

Compose seed prompts and structured input in a starter card:

```astro
<native-chat-panel auto-focus-policy="open-request">
  <!-- Panel stamps its own feed; seed/structured go inside messages -->
</native-chat-panel>
```

Populate via JS after panel setup:

```ts
const feed = panel.querySelector('n-chat-feed');
const messages = feed?.querySelector('n-chat-messages');

// Seed prompt chips
const seed = document.createElement('n-chat-message-seed');
seed.setAttribute('options', JSON.stringify([
  { label: 'Summarize this page', value: 'summarize' },
  { label: 'Draft a reply', value: 'draft-reply' },
  { label: 'Explain like I\'m 5', value: 'eli5' },
]));

messages?.appendChild(seed);
```

### Spacing Tokens

Override seed/structured spacing via CSS custom properties on any ancestor:

| Token | Default | Purpose |
|-------|---------|---------|
| `--n-chat-seed-gap` | `var(--n-space)` | Gap between seed chip buttons |
| `--n-chat-seed-padding-block` | `var(--n-space)` | Vertical padding around seed area |
| `--n-chat-seed-padding-inline` | `var(--n-chat-bubble-padding-inline)` | Horizontal padding |
| `--n-chat-structured-gap` | `calc(var(--n-space) * 2)` | Gap between structured input sections |
| `--n-chat-structured-padding` | `calc(var(--n-space) * 3)` | Padding around structured input |

```css
/* Compact starter surface */
.my-starter {
  --n-chat-seed-padding-inline: 0;
  --n-chat-seed-padding-block: 0;
  --n-chat-seed-gap: calc(var(--n-space) * 0.5);
}
```

---

## 9. Styling Rules

1. **Use component API only.** Attributes (`variant`, `size`, `intent`, `density`) and `--n-*` tokens — never target internal selectors.
2. **Don't reset sub-container padding.** `n-header`, `n-body`, `n-footer` have deliberate padding. Override with tokens, not `:where(... n-header) { padding: 0 }`.
3. **Use `n-toolbar variant="blank"` for header actions.** Not raw `<div>` wrappers.
4. **Prefer `n-stack` for layout.** `<n-stack direction="row" wrap gap="1">` instead of custom flex containers.

---

## 10. Troubleshooting

### Boot Check

Verify all required elements are registered:

```ts
const required = [
  'native-chat-panel', 'n-chat-feed', 'n-chat-messages',
  'n-chat-message', 'n-chat-message-text', 'n-chat-input',
  'n-button', 'n-icon', 'n-toolbar',
];

const missing = required.filter(tag => !customElements.get(tag));
if (missing.length) {
  console.error('Missing registrations:', missing);
  console.error('Did you import @nonoun/native-chat/register?');
}
```

### Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Panel renders as empty box | Missing `@nonoun/native-chat/register` import | Add to setup script |
| Unstyled elements (no colors/spacing) | Missing foundation CSS | Add `@import '@nonoun/native-ui/css/foundation'` |
| Chat-specific styles missing | Missing chat CSS | Add `@import '@nonoun/native-chat/css'` |
| Toolbar actions clipped without overflow menu | Toolbar in header trailing slot without `fill` | Add `fill` attribute to toolbar |
| Panel works in dev, blank in production | Tree-shaking removed `register` side effects | Ensure register imports are not dead-code-eliminated |
| Elements styled but non-interactive | JS loaded but SSR pass ran first | Ensure `<script>` is client-side (not in frontmatter) |
| Focus policy not working | `auto-focus-policy` attribute missing | Add `auto-focus-policy="open-request"` |
| Icons show as empty squares | Icons not registered | native-chat registers its own icons; check for custom icons |

### CSS Load Order Check

```ts
// Verify CSS loaded in correct order
const root = getComputedStyle(document.documentElement);
const hasFoundation = root.getPropertyValue('--n-space').trim() !== '';
const hasTokens = root.getPropertyValue('--n-panel').trim() !== '';

if (!hasFoundation) console.error('Foundation CSS not loaded');
if (!hasTokens) console.error('Token CSS not loaded');
```

---

## 11. Complete Example

Minimal working Astro page with native-chat:

```astro
---
// src/pages/chat.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Chat">
  <style is:global>
    @import '@nonoun/native-chat/css';

    .chat-container {
      height: calc(100vh - 4rem);
      display: flex;
    }

    .chat-container native-chat-panel {
      flex: 1;
    }
  </style>

  <div class="chat-container">
    <native-chat-panel
      auto-focus-policy="open-request"
      show-stop
    ></native-chat-panel>
  </div>

  <script>
    const panel = document.querySelector('native-chat-panel');

    panel?.addEventListener('native:send', ((e: CustomEvent) => {
      const { value } = e.detail;
      console.log('User sent:', value);
      // Wire to your API / transport here
    }) as EventListener);

    // Open with composer focus
    panel?.open({ focusComposer: true });
  </script>
</BaseLayout>
```

**Base layout** must already include (per [ASTRO.md](ASTRO.md)):
```css
@import '@nonoun/native-ui/css/foundation';
@import '@nonoun/native-ui/css/components';
```

**Setup script** must already include:
```ts
import '@nonoun/native-ui/register';
import '@nonoun/native-chat/register';
```
