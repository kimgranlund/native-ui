# Changelog

All notable changes to `@nonoun/native-chat` will be documented in this file.

## [0.5.18] - 2026-03-05

### Fixed
- ARIA role collision: `role` attribute changed to `data-role` to avoid invalid ARIA semantics (CSS selectors updated: `[role="user"]` → `[data-role="user"]`)
- Chat panel aside transition (T0105): removed redundant `:where()` aside rules that conflicted with base `[aside]` transition
- Stream reader cleanup: `reader.releaseLock()` + `TextDecoder` flush in both adapters
- Shared SSE parser (`parseSseEvent`) extracted to runtime, deduplicating code between adapters
- Non-stream fallback: parses existing response instead of re-fetching
- Timer leak: activity element now stops previous timer before starting new one
- GenUI lightbox: dialog reference tracked and cleaned up in teardown
- Mid-stream error: preserves partial content, appends error as markdown note instead of replacing
- HTML sanitization: markdown output wrapped with `sanitizeHtml()` defense-in-depth

### Added
- Fetch timeout: 30s default via `AbortSignal.timeout()`, composable with caller signal
- `noRetry` option: streaming requests skip retry logic
- Typing indicator: `status="typing"` with CSS dot animation before first chunk arrives
- Session bootstrap: `bootstrapSession()` called on adapter creation (non-fatal)
- Message context limit: `MAX_CONTEXT_MESSAGES = 50` prevents unbounded growth
- `models` attribute: comma-separated model IDs for declarative configuration
- `gateway-urls` attribute: JSON map for automatic gateway/URL switching by model prefix
- `DEFAULT_REQUEST_TIMEOUT_MS` and `DEFAULT_RETRY_DELAYS_MS` exported constants

### Changed
- Deprecated `ChatGatewayController` and `GatewayController` aliases removed
- Structured input: split into structural + selection-sync effects for better performance
- Markdown rendering: debounced via `requestAnimationFrame` during streaming
- Message IDs: `crypto.randomUUID()` instead of `Date.now()`
- Inline styles replaced with CSS class `n-chat-panel-header-trailing`
- Icon creation uses `createElement` instead of `innerHTML`
- `[compact]` selector moved outside `:where()` for real specificity
- Padding split to `padding-block`/`padding-inline` per native-ui conventions
- Font-weight values use `--n-button-font-weight` token
- Magic numbers replaced with CSS custom properties (`--n-chat-model-picker-max-width`, `--n-chat-activity-max-height`, etc.)

### Breaking
- `[role="user"]` and `[role="assistant"]` CSS selectors changed to `[data-role="user"]` and `[data-role="assistant"]`. If the host has custom CSS targeting these selectors, update them.
- `ChatGatewayController` and `GatewayController` removed. Use `LLMGatewayController` instead.
