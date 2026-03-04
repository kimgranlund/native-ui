# Embedding Guide — `@nonoun/native-chat`

Host integration patterns for `native-chat-panel`. Covers open/close, focus management, lifecycle events, auto-focus policy, and error recovery.

## Quick Start

```html
<script type="module">
  import '@nonoun/native-chat/register';
</script>
<link rel="stylesheet" href="@nonoun/native-chat/css" />

<native-chat-panel id="chat"></native-chat-panel>
```

## Open / Close API

```ts
const panel = document.querySelector('native-chat-panel');

// Open with composer focus
panel.open({ focusComposer: true, reason: 'deeplink' });

// Open without focus (e.g. background prefetch)
panel.open();

// Close
panel.close('user-dismissed');
```

**Attribute-driven:** Set `[open]` to show, remove to hide. Lifecycle events fire in both modes.

```html
<native-chat-panel open></native-chat-panel>
```

## Focus Management

```ts
// Focus composer with cursor at end
panel.focusComposer({ cursor: 'end' });

// Focus with cursor at start
panel.focusComposer({ cursor: 'start' });

// Preserve existing cursor position
panel.focusComposer({ cursor: 'preserve' });
```

**Retry behavior:** `focusComposer()` retries up to 3 times via microtask if the composer is unavailable or disabled. On failure, dispatches `native:composer-focus-failed`.

## Lifecycle Events

| Event | Detail | When |
|-------|--------|------|
| `native:chat-opened` | `{ source?, focusComposer }` | Panel opens (API or attribute) |
| `native:chat-closed` | `{ reason? }` | Panel closes |
| `native:composer-focused` | `{ by: 'api' \| 'user' \| 'policy' }` | Composer receives focus via API or policy |
| `native:composer-focus-failed` | `{ reason, attempts }` | Focus retry exhausted |

```ts
panel.addEventListener('native:chat-opened', (e) => {
  console.log('Opened:', e.detail.source);
  if (e.detail.focusComposer) {
    // Focus was requested — composer will receive focus
  }
});

panel.addEventListener('native:composer-focus-failed', (e) => {
  // reason: 'composer-unavailable' | 'disabled' | 'blocked'
  console.warn('Focus failed after', e.detail.attempts, 'attempts:', e.detail.reason);
});
```

## Auto-Focus Policy

Controls when the composer auto-focuses.

| Value | Behavior |
|-------|----------|
| `open-request` (default) | Focus only when `open({ focusComposer: true })` is called |
| `ready` | Auto-focus on setup (panel mount) |
| `never` | No automatic focus — consumer manages focus manually |

```html
<!-- Auto-focus when panel mounts -->
<native-chat-panel auto-focus-policy="ready"></native-chat-panel>

<!-- Never auto-focus (keyboard-nav-friendly layouts) -->
<native-chat-panel auto-focus-policy="never"></native-chat-panel>
```

## Header Controls

```html
<native-chat-panel show-stop show-restart>
  <div slot="header-trailing">
    <n-badge intent="success">Online</n-badge>
  </div>
</native-chat-panel>
```

| Attribute | Event | Purpose |
|-----------|-------|---------|
| `show-stop` | `native:chat-stop` | Stop generation |
| `show-restart` | `native:chat-restart` | Restart conversation |

Both are signal-backed — toggle at runtime: `panel.showStop = true`.

## Message Display

### Actions Position

```html
<!-- Default: actions inside bubble (hover-to-show) -->
<n-chat-message role="assistant"></n-chat-message>

<!-- Below bubble: toolbar as sibling after message -->
<n-chat-message role="assistant" actions-position="below"></n-chat-message>
```

### Avatar Alignment

```html
<!-- Default: avatar at top of message group -->
<n-chat-messages role="assistant"></n-chat-messages>

<!-- Center or bottom alignment -->
<n-chat-messages role="assistant" avatar-align="center"></n-chat-messages>
<n-chat-messages role="assistant" avatar-align="bottom"></n-chat-messages>
```

### Asymmetric Bubble Radius

```css
native-chat-panel {
  /* Smaller radius on avatar side, larger on far side */
  --n-chat-bubble-radius-avatar-side: 0.25rem;
  --n-chat-bubble-radius-far-side: 1rem;
}
```

## Section Surface Tokens

Override these CSS custom properties on `native-chat-panel` to theme panel sections without targeting internal DOM.

| Token | Default | Controls |
|-------|---------|----------|
| `--n-chat-panel-header-background` | `transparent` | Header background |
| `--n-chat-panel-header-border` | `--n-border-muted` | Header bottom border color |
| `--n-chat-panel-header-label-font-weight` | `inherit` | Header label emphasis |
| `--n-chat-panel-header-label-letter-spacing` | `inherit` | Header label tracking |
| `--n-chat-panel-body-background` | `transparent` | Transcript body background |
| `--n-chat-panel-footer-background` | `transparent` | Footer/composer area background |
| `--n-chat-panel-footer-border` | `--n-border-muted` | Footer top border color |

```css
native-chat-panel {
  /* Stronger footer separation */
  --n-chat-panel-footer-border: var(--n-border-rest);
  --n-chat-panel-footer-background: var(--n-card);

  /* Bolder header label */
  --n-chat-panel-header-label-font-weight: 700;
  --n-chat-panel-header-label-letter-spacing: -0.01em;

  /* Subtle body tint */
  --n-chat-panel-body-background: var(--n-control);
}
```

All tokens use `inherit` or `transparent` defaults — the panel renders identically to before unless overridden.

## Recommended Defaults

```html
<native-chat-panel
  auto-focus-policy="open-request"
  show-stop
>
  <div slot="header-trailing">
    <n-badge intent="success">Online</n-badge>
  </div>
</native-chat-panel>
```

```ts
// Deeplink / notification opens panel with focus
panel.open({ focusComposer: true, reason: 'deeplink' });

// Sidebar toggle opens without stealing focus
panel.open({ focusComposer: false });

// Listen for generation control
panel.addEventListener('native:chat-stop', () => transport.abort());
panel.addEventListener('native:chat-restart', () => {
  transcript.clear();
  panel.focusComposer({ cursor: 'end' });
});
```
