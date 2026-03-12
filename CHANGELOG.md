# Changelog

All notable changes to `@nonoun/native-ui` and sub-packages.

## 0.7.216

### Added
- **`--n-pad-block`, `--n-pad-inline`, `--n-pad-gap` compound padding tokens** — New 3-tier CSS custom properties replace hardcoded padding/gap formulas across all interactive and container components. Density presets (`compact`, `default`, `loose`, `inline`) now control block padding, inline padding, and gap independently. Components consume tokens instead of formulas — zero visual change at default density.
- **Density-aware gap and block padding** — `density="compact"` now tightens gap (`--n-pad-gap: var(--n-space)`) in addition to narrowing inline padding. `density="inline"` zeroes block padding. Previously only `--n-space-k` (inline multiplier) changed.
- **n-header/n-footer token rename** — `--n-padding-block`/`--n-padding-inline` → `--n-pad-block`/`--n-pad-inline`. `padding="tight|regular|relaxed"` attribute selectors updated. Old tokens removed.

### Changed
- **17 component/container CSS files migrated** — button, input, textarea, select, listbox, command, tabs, segmented-control, accordion, tree, toolbar, container, body, pane, n-header, n-footer all consume `--n-pad-*` tokens.

### Changed (native-ai@1.0.123)
- **Training Library co-pilot chat** — Fixed 400 error on first message (empty `messages` array sent to Anthropic). Dedicated `copilot-prompt.json` system prompt for schema editing (separate from builder). Streaming schema preview applies live during LLM response (debounced, component-count gated). Chat bubble shows concise `reply` text instead of raw JSON. Follow-up seed suggestion chips rendered after each response.
- **Builder state injection** — Builder sends both current schema JSON and rendered HTML as `[CURRENT STATE]` context block to LLM.
- **Save → preview tile update** — Saving an edited pattern in the Training Library lightbox immediately re-renders the corresponding card preview tile on the grid page.
- **Version backup on save** — Each save pushes the previous version onto a `tl-pattern-{id}-backups` localStorage stack (capped at 10 versions).

### Changed (native-traits@0.1.13)
- **CSSInspectController** — Added `alwaysReady` option and `inspectRoot` getter for external bridge integration.

## 0.7.215

### Fixed
- **Adaptive grid columns for n-button/n-select** — Replaced single 3-column `grid-template-columns: auto 1fr auto` with adaptive templates that match which slots are actually present. Empty grid tracks created phantom gaps (gap is rendered between all tracks, including 0-width empty ones). Now: `leading + label` → `auto 1fr`, `label + trailing` → `1fr auto`, `all three` → `auto 1fr auto`. Fixes n-select caret alignment and any button with only one icon side.

### Changed (native-ai@1.0.122)
- **Builder: CSS Inspector auto-activates** — `CSSInspectController` is created on load with `alwaysReady: true`. Hover highlights descendants, click picks for 3D inspection — no Alt key or artifact click required. Toggle button starts `aria-pressed="true"`.
- **Env var rename** — All `VITE_CLAUDE_*` fallbacks removed from native-ui and native-ai. Canonical names: `VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`. Convention: `VITE_{PROVIDER}_{KEY_SPECIFICS}`. Template `src/.env` updated.

## 0.7.214

### Added
- **n-body `padding="none"` attribute** — New attribute API selector for zeroing n-body padding. Also accepts `padding="0"`.
- **`[aria-pressed="true"]` token resolution** — `aria-pressed="true"` now resolves the same token set as `[variant="selected"]` (white background, inverse ink, transparent border) in `components.tokens.css`. Enables proper toggle button styling via ARIA semantics.
- **n-chat-input-prompt background** — `n-chat-input-prompt` now owns its background (`--n-background: var(--n-control)`) instead of inheriting from `n-agent-input`. Matches n-input pattern where the bordered rect owns its fill.

### Fixed
- **force-active → aria-pressed migration** — All production `force-active` usage in A2UI Builder replaced with `aria-pressed="true"/"false"`. Affected: panel chip toggles, inspector toggle, lightbox mode, pipeline mode. `force-active` is debug-only.
- **n-agent-input background removed** — Stripped `background` from the base `n-agent-input` rule. The outer wrapper should be transparent; background belongs on `n-chat-input-prompt`.
- **Stale token references** — Renamed remaining `--n-padding-block`/`--n-padding-inline` → `--n-pad-block`/`--n-pad-inline` in A2UI Builder and Training Library CSS.
- **Builder/TL: removed component-internal overrides** — Stripped `--n-pad-block`, `--n-pad-inline`, `--n-background` token overrides from n-body and n-agent-input in builder and training library CSS. Components use `padding="none"` attribute instead.
- **Training Library chat pane** — Added `background: var(--n-body)` and `border="block"` so the chat pane is no longer transparent over the pattern grid.

### Changed
- **Demo pane bodies** — All `<n-body>` elements inside `<n-pane>` across pane demos, A2UI Builder, Training Library, and noodle demo now use `padding="none"` attribute instead of CSS token overrides.

## 0.7.212

### Added
- **Compound padding tokens** — New `--n-pad-block`, `--n-pad-inline`, `--n-pad-gap`, `--n-pad-inline-icon` CSS custom properties on `:root`. Components now consume these tokens instead of hardcoded `calc()` formulas, enabling independent control over block padding, inline padding, and gap at every density level.
- **Density gap/block control** — `[density="compact"]` now tightens gap (`--n-pad-gap: var(--n-space)`). `[density="loose"]` widens gap (`calc(var(--n-space) * 3)`). `[density="inline"]` zeroes block padding and tightens gap.
- **Icon-side optical padding compensation** — New `--n-pad-inline-icon` token (`pad-inline / 2`) reduces padding on the icon side of interactive elements so `icon-pad + gap ≈ text-pad`. Applied to n-button, n-select, n-tab, n-segment, n-option, n-command-item via two-value `padding-inline` shorthand. n-select auto-flips (full start padding, reduced end padding for trailing caret).

### Changed
- **17 components migrated** to `--n-pad-*` tokens: n-button, n-select, n-input, n-textarea, n-tab, n-option, n-option-group-header, n-command-input, n-command-group heading, n-segment, n-accordion summary + content, n-tree-item label, n-toolbar, n-container, n-body, n-header, n-footer.
- **Token rename** — `--n-padding-block` / `--n-padding-inline` on n-header, n-footer, n-body, n-pane header renamed to `--n-pad-block` / `--n-pad-inline` for consistency. The `[padding="none|tight|regular|relaxed"]` attribute API now sets the new token names.

### Migration
- If you override `--n-padding-block` or `--n-padding-inline` on n-header, n-footer, or n-body, rename to `--n-pad-block` / `--n-pad-inline`.
- n-stack and n-grid still use `--n-padding-block` / `--n-padding-inline` (unchanged).

## 0.7.210

### Removed (native-ai@1.0.120)
- **Training Library: prev/next paddles removed** — Removed the unused prev/next surface stepper buttons, divider, `updatePaddles()` function, event listeners, and caret icon imports. All patterns are single-surface; the hidden buttons were leaking into the toolbar overflow menu as ghost "Action" entries.

## 0.7.209

### Changed (native-ai@1.0.119)
- **Training Library: floating toolbar size** — Both floating toolbars (compare bar + preview controls) bumped from `size="sm"` to `size="md"` for better click targets.
- **Training Library: fullscreen icon swap** — Fullscreen toggle shows `x` icon when active, reverts to `arrows-out-simple` when deactivated or lightbox closes.
- **Training Library: Option+hover cursor** — Elements highlighted via Option+hover now show a default pointer instead of the grab cursor.

## 0.7.208

### Fixed (native-ai@1.0.118)
- **Training Library: toolbar overflow labels** — Icon-only buttons in the floating preview toolbar now have `aria-label` attributes so the toolbar overflow menu shows meaningful names ("AI Chat", "CSS Inspector", "Center", "Reset zoom") instead of icon names ("Chat Dots", "Crosshair"). All buttons also have `overflow-pin` to prevent overflow entirely in the compact floating toolbar. Same fix applied to the fullscreen toggle in the top toolbar.

## 0.7.207

### Added (native-traits@0.1.11)
- **CSSInspectController: `alwaysReady` option** — New `alwaysReady: boolean` option bypasses the Alt-key requirement for hover highlighting and pick-to-inspect activation. Default `false` preserves existing behavior. Also wired in the `css-inspectable` trait adapter as `data-trait-css-inspectable-always-ready`.

### Added (native-ai@1.0.117)
- **Training Library: toggle button states** — Inspector, chat, and fullscreen toolbar buttons now use `force-active` attribute for clear on/off visual feedback.
- **Training Library: pane resize guard** — Dragging `n-panes` resize handles no longer triggers canvas panning.
- **Training Library: header overflow fix** — Lightbox top `n-header` constrained with `overflow: hidden; max-width: 100%` to prevent toolbar overflow when preview content is large.

## 0.7.206

### Added (native-ai@1.0.116)
- **Training Library: pan/zoom preview** — Preview pane is now pannable (pointer drag) and zoomable (scroll wheel). Pan is suppressed when hovering `[data-a2ui="Card"]` content to preserve normal interactions. New bottom toolbar buttons: **Center contents** (crosshair icon) and **Reset zoom to 100%** (arrows-in-cardinal icon). Canvas wrapper (`div.tl-canvas`) replaces direct mount rendering for CSS transform-based pan/zoom.
- **Training Library: inspector → editor bridge** — CSS Inspector selections now highlight the corresponding section in the active editor pane (Schema/HTML). MutationObserver watches the inspector's clone root for `inspect-selected` attribute changes and bridges to the editor's `selectRange()` API. Inspector stays active during selection — only Escape or clicking outside dismisses it.

## 0.7.204

### Added
- **Popover background tokens** — New `--n-popover-{family}` semantic token family (6 families × 4 states = 24 tokens) for floating surface backgrounds. Resolves to `brightest` — solid, fully opaque surfaces. Wired into all `[intent]` selectors and `[aria-disabled]` override. `n-listbox` and `n-command` now use `--n-popover` instead of `--n-control`.

### Changed
- **Option hover/active tokens** — `n-option` and `n-command-item` hover/active backgrounds changed from `--n-panel-hover` / `--n-panel-active` (opaque surface) to `--n-button-hover` / `--n-button-active` (scrim overlays). Options always live inside a solid popover container, so button-level scrims provide the correct subtle contrast.
- **Button scrim tokens shifted to weakest** — `--n-button-{family}` semantic tokens now use `scrim-weakest` (rest), `scrim-weaker` (hover), `scrim-weak` (active). Previously one step stronger. Controls remain one step below buttons. This gives default/secondary buttons a subtler, more recessed appearance.
- **Ink tokens shifted to 800-level** — `--n-ink-{family}` semantic tokens (all 6 families) now resolve to `--n-color-{family}-800` instead of `700`. Stronger contrast for intent-colored text throughout the system.
- **Secondary button text color** — `[variant="secondary"]` rest color changed from `--n-ink` to `--n-ink-strong` for better readability against the lighter scrim backgrounds.
- **Common transition pattern** — All interactive components now use a standardized 7-property transition: `background`, `color`, `border-color`, `border-radius`, `outline`, `opacity`, `transform`. Added `outline` and `border-radius` to 16 component CSS files (button, input, textarea, segmented-control, select, listbox, accordion, calendar, command, tabs, range, slideshow, input-otp, tree, checkbox, radio, switch).

### Fixed
- **Color system: adaptive scrim tokens** — New `--n-color-{family}-scrim-{intensity}` tokens using `light-dark(shade, tint)` in `colors.computed.css`. Shade darkens in light mode, tint lightens in dark mode. 7-step scale (weakest → strongest) × 6 families = 42 adaptive tokens. Control and button semantic grounds now use these adaptive scrims, making them surface-independent in both color schemes.
- **Color system: environment parameter comments** — Added explanatory comments to the OKLCH engine knobs (lightness range, chroma scaling, alpha) and family definitions (hue, chroma multiplier, lightness anchor) in `colors.computed.css`.
- **Control vs button background separation** — `[variant="default"]` and `[variant="secondary"]` now correctly use `--n-control-*` tokens for control elements (`n-input`, `n-textarea`, `n-segmented-control`) instead of the stronger `--n-button-*` tokens. Controls sit one scrim step below buttons across all states.
- **n-input / n-textarea / n-segmented-control** — Added missing `--n-background-active` and `--n-background-disabled` token declarations to base rules, completing the full rest→hover→active→disabled state chain.
- **n-segmented-control indicator** — Indicator background changed from `--n-color-neutral-scrim-tint-stronger` (73% alpha tint) to solid `white`, matching `[variant="selected"]` button appearance. Selected segment text uses `--n-ink-inverse` for proper contrast on white indicator.

### Fixed (native-ai@1.0.114)
- **LLM adapter factory: temperature passthrough** — `createAdapter()` in `model-registry.ts` now passes `temperature` to both `ClaudeGatewayAdapter` and `OpenAiGatewayAdapter` constructors. Previously the field was missing from `CreateAdapterOptions`, silently dropping pattern-level temperature settings during regeneration.
- **Training Library: temperature leak between patterns** — Opening a pattern without a `temperature` field now resets to 0.7 instead of inheriting the previous pattern's temperature.

## 0.7.201

### Added (native-ai@1.0.113)
- **LLMChatController** — Reusable contextual AI editor controller (`packages/native-ai/src/chat/llm-chat/`). Manages context bindings (read/apply), message history, streaming, model selection, and highlight state. Any component or data store can register as a "context" the LLM can read from and write back to.
- **`<n-llm-chat-pane>`** — Floating/dockable chat panel element. Stamps header (context selector), chat feed, and chat input. Supports `position="float"` (fixed overlay) and docked mode (flex child in `<n-panes>`). Context highlight via `[data-llm-context="active"]` outline on bound elements.
- **Training Library: AI Chat pane** — Docked chat pane in lightbox (toggle via chat-dots button in toolbar). Binds to the active pattern schema — chat queries inject the current pattern state, LLM responses auto-apply component changes to the preview. Third resizable pane alongside preview and editor.

## 0.7.200

### Added (native-ai@1.0.112)
- **Training Library: Before/After compare** — Toggle button in lightbox toolbar renders the original pattern alongside edits. Dashed outline + "ORIGINAL" label indicates compare mode. Auto-exits on schema edit or reset.
- **Training Library: CRUD actions** — Footer gains Reset (revert to original), Download (.json export), and Save (localStorage persistence). Dirty tracking enables/disables Reset. Saved patterns auto-load on next lightbox open. Save flashes green confirmation.

## 0.7.199

### Added (native-ai@1.0.111)
- **Pattern recommended temperature** — All 50 pattern JSON files now include a `temperature` field with category-appropriate LLM generation values (0.3–0.7). Training Library lightbox auto-sets the temperature slider when opening a pattern and shows a "(recommended)" indicator. Manual slider adjustment clears the indicator.

## 0.7.198

### Fixed (native-ai@1.0.110)
- **Training Library: click-to-highlight stays on current tab** — Clicking a preview element now highlights in the current editor tab (schema or output) if it has a match, only switching tabs as a fallback. Previously always jumped to schema first.

## 0.7.197

### Changed (native-ai@1.0.109)
- **Training Library: resizable panes** — Lightbox split replaced with `<n-panes handle="hover">` + `<n-pane>` — preview and editor panes are now drag-resizable with hover-proximity accent bar.
- **Training Library + Builder: component API for toggle state** — Replaced `data-active` CSS overrides with component attributes. Training Library chips toggle `variant="primary" intent="accent"` (on) / `variant="ghost"` (off). Builder chips use `force-active` attribute. Removed 4 CSS rules that manually overrode `--n-background`/`--n-color`.
- **Training Library: DOM→editor click-to-highlight** — Clicking a rendered element in the preview selects the corresponding component object in the schema JSON editor (or the opening tag in the output HTML editor) and scrolls it into view via CodeMirror selection API.
- **Training Library: output tab HTML syntax highlighting** — Output editor uses `htmlLang()` instead of `json()` for proper HTML syntax coloring.
- **Training Library: no text wrapping in editors** — Schema and output editors no longer soft-wrap; horizontal scroll instead.

## 0.7.194

### Changed (native-ai@1.0.106)
- **n-chat-feed + n-agent-input: adopt standard `--n-padding-block`/`--n-padding-inline` tokens** — Replaced chat-specific `--n-chat-feed-padding-*` and `--n-chat-input-padding-*` tokens with the universal `--n-padding-block`/`--n-padding-inline` system. Both elements now automatically support `padding="none|tight|regular|relaxed"` and `density="compact|default|loose"` via the existing global attribute selectors — no component-specific overrides needed. Defaults scale with density via `calc(var(--n-space) * var(--n-space-k))`. Builder chat uses `density="compact"` on feed and input instead of CSS token overrides.

## 0.7.193

### Fixed (native-ai@1.0.104)
- **A2UI Builder: Pane gripper no longer triggers canvas pan** — Clicking and dragging the resize gripper bars between panes could accidentally initiate preview canvas panning. The pointerdown handler now checks `target.closest('n-gripper')` and bails out.

## 0.7.192

### Fixed (native-ai@1.0.103)
- **A2UI Builder: Reasoning pane syncs with response type** — The Reasoning pane was showing "Interpretation → Concepts → Plan → Construction" even when the LLM asked clarifying questions instead of building UI. Now type-aware:
  - **Single-shot**: `populateInsightsFromResult()` checks `result.type` — question responses show "Clarification" (not "Response" + "Concepts" + "Construction"), schema results show the full reasoning chain. Concepts/Templates/Construction entries only appear when a schema was actually built.
  - **Pipeline**: `fillConstruct()` detects non-schema output (questions, text responses) and relabels the entry to "Outcome" with appropriate text. After final parse, the progress step label updates to match the actual result verb ("Responded" instead of "Built schema").
  - **Fallback heuristic**: When JSON parse fails in construct step, short text or text with `?` shows "Responded" instead of "Schema constructed".

## 0.7.191

### Fixed (native-ai@1.0.102)
- **A2UI Builder: Preview content re-centers on pane resize** — `ResizeObserver` on the preview body resets the pan offset to (0,0) when the pane dimensions change. Added `max-width: calc(100% - 2rem)` to `#preview-mount` so generated UI constrains to the available width.

## 0.7.190

### Enhanced (native-ai@1.0.101)
- **A2UI Builder: Reasoning pane shows matched learning templates** — After concepts are identified, `matchPatterns()` runs against the 50-pattern catalog and the top 3 matches appear as a new "Templates" reasoning step. Each shows label, tier, category, and component count. Works in both single-shot (progressive reveal) and pipeline (`onStepComplete`) modes.

## 0.7.189

### Changed (native-ai@1.0.100)
- **A2UI Builder: Insights → Reasoning** — Renamed the "Insights" pane to "Reasoning" throughout (header, chip, TS label). The pane now auto-scrolls to the latest content as each reasoning step is appended — both in single-shot progressive reveal and pipeline `onStepComplete` paths.

## 0.7.188

### Enhanced (native-ai@1.0.99)
- **A2UI Builder insights — progressive reveal** — Insight entries now appear one at a time with a staggered animation instead of all at once. Each step shows a pulsing placeholder first, then fills with content after a short delay (400ms step interval, 300ms fill delay). Applies to both single-shot and mock response paths. Pipeline mode already had step-by-step reveal via `onStepStart`/`onStepComplete` callbacks.

## 0.7.187

### Fixed (native-ai@1.0.98)
- **A2UI Builder insights panel not hydrated in single-shot mode** — The Insights panel was only populated during multi-step pipeline mode. Single-shot (default) and mock responses now also populate insights with: Response summary, Concepts (from `concepts[]`), Construction summary (component count + surface), CSS/JS indicators, and Gap reports. Both paths call `populateInsightsFromResult()` after the LLM response is parsed.

## 0.7.186

### Fixed (native-dashboard@0.4.23)
- **Sidebar search button full width** — `n-button` inside `n-sidebar-item` no longer shrinks to content width. Added `width: 100%` rule so inline-level buttons stretch to fill the sidebar item.

## 0.7.185

### Fixed
- **n-stack flex centering passthrough** (T0236) — `min-height: 0` on the base rule prevented n-stack from inheriting its parent's height, so `justify="center"` had no effect when the stack was a flex child in a full-viewport container. Changed to `min-height: inherit` — the stack now inherits the parent's `min-height` (e.g., `100dvh`), giving it height to distribute children vertically.

## 0.7.184

### Fixed
- **Changelog page structure** — Wrapped content in `<header>` + `<section>` to match the standard demo page structure (`main > header / section`). Previously `<h1>` and all version entries were directly inside `<main>`, missing the shared `spa-pages.css` sticky header and section padding.

## 0.7.183

### Fixed (native-ai@1.0.97)
- **Training Library settings — floating point jitter** — Temperature slider displayed `0.7000000000000001` due to IEEE 754 float arithmetic. Values now rounded to 2 decimal places before display. Max Tokens also rounded to integer.

## 0.7.182

### Fixed (native-ai@1.0.96)
- **A2UI Builder preview JS sandbox** — LLM-generated JS that sets up event listeners could throw uncaught errors when callbacks reference undefined properties (e.g., `NInput.value.replace()`). The sandbox now wraps all `addEventListener` callbacks registered during code execution in try/catch, logging errors as warnings instead of crashing. The prototype patch is restored via `finally` block after execution.

## 0.7.181

### Changed (native-ai@1.0.95)
- **A2UI Builder insights pane — multi-step content** — Insights now show placeholder entries with pulsing animation as each pipeline step starts, then fill with parsed content on completion. Added `Construct` step entry (component count + surface badge). Insights clear between pipeline runs.
- **A2UI Builder pane legibility** — Bumped font sizes across all panes: pre/code/prompt editors from `0.6875rem` → `0.8125rem`, map table from `0.75rem` → `0.8125rem`. Added `line-height: 1.7`, `letter-spacing: 0.01em`, and `padding: 0.75rem 1rem` to all content areas. Insight entries use themed `--pg-*` tokens for consistent dark-chrome contrast.

## 0.7.180

### Changed (native-ai@1.0.94)
- **Chat feed/input default padding** — `--n-chat-feed-padding-inline` now defaults to `calc(var(--n-space) * 2)` instead of `0`. `n-agent-input` padding fallbacks changed from `0` to `var(--n-space)` (block) and `calc(var(--n-space) * 2)` (inline). Consumers get sensible padding out of the box; override with tokens to customize.

## 0.7.179

### Changed (native-ai@1.0.93)
- **Training Library card overlay** — Removed `density="compact"` from the Edit overlay button.

## 0.7.178

### Fixed (native-ai@1.0.93)
- **Training Library dialog stuck after Escape** — `display: flex` on `.tl-lightbox` was overriding the UA `dialog:not([open]) { display: none }`, keeping the dialog visible after close. Moved flex layout to `.tl-lightbox[open]`. Close handler now also clears `data-fullscreen` and empties the preview mount.
- **Training Library settings controls not wired** — `n-range` fires `native:input` not standard `input`. Temperature and Max Tokens sliders now listen on the correct event. Pipeline toggle reads `checked` from event detail.
- **Training Library card overlay button** — Replaced hand-styled `<span>Edit</span>` with proper `<n-button variant="primary" intent="accent" size="sm">` with pencil icon.

## 0.7.177

_Changelog and version bump only — no code changes._

## 0.7.176

### Changed (native-ai@1.0.92)
- **Training Library full-width toolbar** — Tab toggles (Schema/Insights/Output/Settings) moved into the top toolbar as chip buttons, replacing the `<n-tabs>` component. Added fullscreen toggle icon button. Toolbar spans the full dialog width matching the A2UI Builder pattern.
- **Training Library preview centering** — Lightbox preview pane now flex-centers the rendered artifact with `max-width: 640px` so patterns sit in the middle of the pane instead of top-left.
- **Training Library text legibility** — Bumped font sizes and spacing across all editor panes: code editor/output `0.6875rem → 0.8125rem` with `line-height: 1.7`, insights text `0.875rem` with `1.6` leading, settings form `0.875rem` with wider padding. Consistent `1.25rem` inline padding across all panels.

## 0.7.175

### Added (native-ai@1.0.91)
- **Training Library bidirectional schema↔preview highlighting** — Clicking or navigating in the schema editor now highlights the corresponding DOM element in the preview pane (outline + scroll-into-view). Detects which JSON component object the cursor is inside by parsing enclosing `{ }` braces and finding the nearest `"id"` field. Complements the existing preview→schema click highlighting.

## 0.7.174

### Changed (native-ai@1.0.90)
- **Training Library lightbox header** — Replaced slot-based `n-header` layout with `n-toolbar` inside `n-header`, matching the A2UI Builder pattern (title + `<span fill>` + trailing action buttons).

## 0.7.173

### Changed (native-ai@1.0.89)
- **Training Library card previews** — Preview container now centers content (`align-items: center; justify-content: center`) with `transform-origin: center center` for scale-down. Inner mount marked `inert` to prevent tabbing/click into scaled previews.

## 0.7.172

### Fixed (native-ai@1.0.88)
- **Training Library empty previews** — Pattern JSON loading via dynamic `import()` with `{ with: { type: 'json' } }` failed silently in Vite dev mode (variable paths not statically analyzable). Replaced with `import.meta.glob` (eager, `import: 'default'`) to pre-load all pattern JSON files at build time. Also flattens nested `properties` sub-objects to flat A2UI component format before passing to the adapter.

## 0.7.170

### Fixed (native-ai@1.0.86)
- **Training Library 500 error** — Fixed incorrect relative import paths for chat gateway/parsing modules (`../../chat/` → `../chat/`).

## 0.7.169

### Added
- **n-picture `contained` attr** — Boolean attribute strips background color, border-radius, and placeholder icon for inline/embedded use where the container chrome is unwanted.

### Fixed (native-ai@1.0.85)
- **n-chat-feed padding tokens** — `--n-chat-feed-padding-block` and `--n-chat-feed-padding-inline` now defined as proper tokens in the chat token block. Removes fallback chains from the `padding-block`/`padding-inline` declarations.

## 0.7.168

### Fixed (native-ai@1.0.84)
- **Training Library 500 error** — Fixed missing icon imports (`trending-up` → `trend-up`, `trending-down` → `trend-down`).

### Added
- **n-picture placeholder** — `n-picture` now shows a neutral background with a centered image icon placeholder when the `<img>` has no `src`, an empty `src`, or fails to load. Broken images are hidden so the placeholder shows through instead of the browser's broken-image icon. (0.7.168, native-kernel@0.1.2)

## 0.7.167

### Fixed
- **CSS Inspector clone duplication** — `CSSInspectController` deep-clones elements for 3D inspection, but cloned custom elements (n-input, n-button, etc.) already contain stamped internal DOM. When the clone is inserted into the document, `connectedCallback` → `setup()` fires and duplicates content (double surfaces, double labels). Fix: CSSInspectController now marks all custom elements in the clone with `data-inspect-clone` before DOM insertion; NativeElement skips `setup()` when this attribute is present.

## 0.7.166

### Added (native-ai@1.0.83)
- **Training Library CSS Inspector** — Toggle button in preview pane header activates `CSSInspectController` with `pick: true, labels: true`. Strong accent selected state (matching Flask pattern: `data-active` + `intent="accent"`). Full label rendering CSS for 3D exploded layers, hover/selected outlines, and counter-rotated monospace labels. Inspector dismissed on lightbox close or Escape key.

## 0.7.165

### Added (native-ai@1.0.82)
- **Training Library Insights pane** — New "Insights" tab in the editor lightbox shows pipeline reasoning at every step. Displays `[Reasoning state: {step}]` placeholder while each step is in-flight, then streams in structured summaries (interpretation, concepts with accent badges, plan with traits/layout, construct completion) on step completion. Mirrors the builder's insight rendering pattern.

## 0.7.164

### Added (native-ai@1.0.81)
- **A2UI Training Library page** — Dev tool for browsing, inspecting, and regenerating all 50 UI composition patterns. Grid with lazy-rendered Kernel previews, tier/category filters, editor lightbox with live schema editing, DOM inspection (click element → highlight in schema), LLM regeneration (direct + multi-step pipeline), and Export Improvement for generating Claude Code instructions from before/after schema diffs.

## 0.7.163

### Added (native-ai@1.0.80)
- **A2UI Pattern Library** — 50 reusable UI composition patterns (25 micro, 25 blocks) for grounding AI generation in proven component arrangements. Patterns cover auth flows, forms, e-commerce, dashboards, data tables, media players, chat, navigation, and interactive elements. System of Record catalog (`pattern-catalog.json`) with concept-based matching for the reasoning pipeline. TypeScript types, loader utility, and `matchPatterns()` API for concept → pattern retrieval.

## 0.7.162

### Fixed
- **Listbox popover guard** — CSS rule hides `<n-listbox>` without `[popover]` inside `n-select` / `n-combobox` to prevent flash before JS upgrade. All HTML-authored listboxes must have `popover` attribute.
- **Figma export** — Restructured token paths into nested folders (`color/source/`, `color/{family}/scrim/`, `scrim-tint/`, `elevation/`, `brightness/`). Fixes group/variable conflict that caused only 7 colors to import. Output format is hex (Figma requires it).
- **Colors page** — Added missing `popover` attribute to all `<n-listbox>` elements (export, theme, scheme selects).

### Changed (native-ai@1.0.79)
- **n-chat-feed** — `scrollbar-width: none` replaces `thin` on `[scrollable]` variant. Feed remains scrollable; scrollbar is hidden.

## 0.7.161

### Breaking
- **Controls display** — `n-button`, `n-select` now `inline-grid`; `n-input` now `inline-flex`; `n-textarea` now `inline-block`. Controls no longer stretch to `width: 100%` by default. In flex/grid parents this is transparent; in flow layout controls will shrink-wrap to content. Add `width: 100%` or `display: grid` on the parent to restore stretch behavior. The `[inline]` attribute is now a no-op (kept for backward compatibility).

### Changed
- **Colors page** — Modernized to standard demo template (`header > h1 + desc` / `section`). Export buttons replaced with `<n-select>` dropdown. Theme and scheme controls now use `<n-select>` instead of native `<select>` and custom toggle. Added `spa-pages.css` import; removed bare element selectors from `colors.demo.css`.

## 0.7.160

### Added
- **Icon registry** — `getIconNames()` API returns all registered icon names. Exported from `@nonoun/native-core` and `@nonoun/native-ui`.
- **Icon demo** — Searchable all-icons grid (3,119 Phosphor icons) with real-time filtering and count badge.
- **Colors page** — 4 export buttons: All Tokens CSS, Computed Colors CSS, Semantic Colors CSS, Figma Variables JSON. All exports toggle light/dark color scheme for dual-mode output.

### Fixed
- **n-feed** — Horizontal overflow no longer visible. Base rule sets `overflow: hidden`; `[scroll]` variant explicitly sets `overflow-x: hidden`.
- **LinkPasteController** — Trailing whitespace trimmed from selected text before wrapping in link.

## 0.7.159

### Changed
- **A2UI Builder** — Preview re-centers with scale+opacity transition on new generations. Seed suggestions now drawn from a pool of 18 options (4 random picks per session). Added inline SVG icon generation instruction to system prompt.

## 0.7.158

### Fixed
- **A2A Tic-Tac-Toe** — Grid boards no longer collapse. Added `min-width: 18rem`, `max-width: 24rem`, `width: 100%` to board containers. Replaced `anchor-center` with `center` for broader support.

## 0.7.157

### Fixed
- **TextTriggerController** — Enter and click selection now work in slash commands and mentions. Replaced listbox arrow-key delegation (which stole focus from the input via `RovingFocusController`) with internal virtual-focus navigation. First option is auto-activated on render. Listbox now uses `virtual-focus` attribute to prevent focus theft.

## 0.7.156

### Fixed
- **LinkPasteController** — Removed trailing non-breaking space (`\u00A0`) inserted after pasted links. Cursor now lands directly after the `<a>` element.

## 0.7.155

### Changed
- **BacktickWrapController** — Inline code tags now use warning button colors (`--n-panel-warning` bg, `--n-ink-warning` text) with default `--n-radius` border-radius and mono font.

## 0.7.154

### Changed
- **n-pane** — Hidden scrollbars (`scrollbar-width: none`) on pane body content and all `[scrollable]` variants.

## 0.7.153

### Fixed
- **state-grid** — n-select reclassified from "coordinator" to "interactive" with full button states (hover, active, focus-visible, aria-disabled). Added missing components: n-gripper, n-progress, n-feed, n-pane.
- **reference** — n-select Interactive States row updated from all "–" to matching n-button states (shares `:where(n-button, n-select)` CSS). Added n-gripper, n-progress, n-feed, n-pane to Interactive States, Component-Specific Attributes, Events, and ARIA Roles tables.

## 0.7.152

### Changed
- **sitemap** — Removed "Updates" group (3 duplicate entries already in their proper groups). Removed "Toast" duplicate from Components (already listed as "Toastable" in Traits). Cleared stale "new"/"updated" badges on established entries — kept only on Feed, Pane, Backtick Wrap, Link Paste, Mention, A2UI Builder, and A2A demos. Alphabetized entries within each group.

## 0.7.151

### Fixed
- **avatar-group** — Removed banned fallback chain `var(--n-ground, var(--n-body-neutral))` → `var(--n-ground)` (`--n-ground` already defaults to `--n-body`).
- **data-dashboard-stats block** — Migrated `font-size`/`font-weight` overrides on `n-header`/`n-footer` to `--n-font-size`/`--n-font-weight` tokens.
- **reference.demo.css** — Removed unnecessary `!important` on `.cat-header td` background.
- **a2a-tictactoe.demo.css** — Removed unnecessary `!important` on hover background.

## 0.7.150 / native-ai 1.0.78

### Added
- **n-body** — New `--n-font-family` token (default: `inherit`). Enables monospace body content via token instead of direct `font-family` override.
- **n-body** — New `scrollbar` attribute: `scrollbar="none"` hides scrollbars, `scrollbar="thin"` shows thin scrollbars (alias for existing `show-scrollbar`).
- **n-body** — New `overflow` attribute: `overflow="hidden"`, `overflow="auto"`, `overflow="scroll"`.
- **n-body** — New `[relative]` boolean attribute for `position: relative`.
- **n-body** — Fixed `--n-background` fallback chain (`var(--n-background, transparent)` → explicit definition).
- **n-chat-message-text** — New tokens: `--n-chat-bubble-border`, `--n-chat-bubble-border-radius`, `--n-chat-bubble-font-size`.

### Fixed
- **A2UI Builder CSS** (T0221) — Eliminated 14+ component boundary violations:
  - n-header typography: direct `font-*`/`text-transform`/`letter-spacing` → `--n-font-*`/`--n-text-transform`/`--n-letter-spacing` tokens
  - n-body: direct `scrollbar-width`/`font-family`/`font-size`/`line-height`/`overflow`/`position` → tokens + attrs
  - n-icon: deep `.builder n-header n-icon { font-size }` → `--n-icon-size` on header
  - Button hover/active: deep `.builder n-header n-button:hover` → `--n-background-hover`/`--n-color` tokens
  - Nav/aside layout: deep `.builder n-header > nav/aside` → `slot="leading"`/`slot="trailing"` attrs
  - Chat messages: deep `n-agent-dialogue-item n-chat-message-text { border, font-size }` → parent-level tokens
  - Removed `!important` from `.map-detail > td`

## 0.7.149

### Added
- **n-header** — New typography tokens: `--n-font-weight`, `--n-text-transform`, `--n-letter-spacing`, `--n-background`. Enables compact IDE-style pane headers via tokens instead of direct CSS overrides (T0219).
- **n-picture** — New dimension tokens: `--n-picture-width`, `--n-picture-height`, `--n-picture-max-width`. Replaces inline `style="width/height"` on picture elements (T0217).
- **n-divider** — New `--n-divider-size` token for vertical divider height. Replaces inline `style="height"` (T0218).

### Fixed
- **pane.css** — Eliminated 5 fallback chains (`var(--n-X, var(--n-Y))`). `--n-pane-handle-accent` and `--n-pane-border-color` now defined in `:where(n-pane)` base rule (T0222).
- **segmented-control.css** — Eliminated fallback chain for `--n-indicator-background`, now defined in base rule (T0222).
- **noodleable.demo.css** — Removed 8 gratuitous `!important` declarations on port indicator states. Replaced 3 direct component overrides (n-header display/background, n-body padding) with token API (`--n-background`, `--n-padding-block/inline`).
- **n-layout.css** — Removed dead `@supports not (color: light-dark(...))` fallback block with hardcoded hex colors. `light-dark()` is now baseline.
- **8 trait demo CSS files** — Scoped bare `h3 {}` and `p {}` selectors to `section h3 {}` / `section p {}` to prevent global style leaking.

## 0.7.148

### Fixed
- **n-toolbar** — Overflow spillover menu now dispatches `native:press` on the source button before calling `.click()`. Previously, buttons using PressController (which listens for pointer/keyboard events, not `click`) were silently ignored when activated from the overflow menu. Affects all toolbar consumers.
- **Noodleable demo** — Fixed broken CSS import referencing old `codemirror.css` path (renamed to `editor.css` in native-code package split).

## 0.7.147

### Fixed
- **MagnetController** — Snap threshold, guide line positions, and drag translate now account for CSS transform scale on the host or its ancestors (e.g. zoomed-out infinite canvas). Previously, guides were misaligned and snap distances were wrong when zoomed out via `transform: scale()`. `@nonoun/native-traits@0.1.6`.
- **ResizeController** — Pointer delta and step snapping now account for CSS transform scale on the host or its ancestors. Previously, resizing at 50% zoom would only move half the expected distance. `@nonoun/native-traits@0.1.6`.
- **NoodleController** — Removed verbose `[noodle]` debug `console.log` statements that shipped in production dist (T0213). `@nonoun/native-traits@0.1.6`.

## 0.7.145

### Changed
- **Component styling boundary audit** — Removed all external CSS overrides that reached into component internals (padding, margin, gap, display). Added token-based APIs instead:
  - `n-header`: `--n-background` token (default: `transparent`)
  - `n-body`: `--n-background` token (default: `transparent`)
  - `n-tab-panel`: `--n-padding` token (default: `calc(var(--n-space) * 4)`)
  - `n-chat-feed`: `--n-chat-feed-padding-block`, `--n-chat-feed-padding-inline` tokens
  - `n-agent-input`: `--n-chat-input-padding-block`, `--n-chat-input-padding-inline`, `--n-chat-input-border`, `--n-chat-input-border-radius`, `--n-background` tokens
- **a2ui-builder.css** — All internal overrides on `n-header`, `n-body`, `n-chat-feed`, `n-agent-input`, `n-chat-message-text` replaced with token-based configuration
- **data-detail-page.css** — `n-tab-panel { padding: 0 }` → `--n-padding: 0`

## 0.7.144

### Added
- **LinkPasteController** — Select text + paste URL → auto-hyperlink. Creates a styled `<a>` element with `target="_blank"` and `rel="noopener noreferrer"`. Accepts `https://`, `http://`, `ftp://`, and protocol-relative URLs. Event: `native:link-paste`.
- **`link-pasteable` trait adapter** — Declarative link paste support via `<n-controller traits="link-pasteable">`.

## 0.7.143

### Added
- **BacktickWrapController** — Watches for paired backtick delimiters in contenteditable inputs. Closing backtick auto-wraps text in a styled `<code>` element. Also wraps selected text when backtick is typed with an active selection. Single-line only. Event: `native:backtick-wrap`.
- **`backtick-wrappable` trait adapter** — Declarative backtick wrap support via `<n-controller traits="backtick-wrappable">`.

## 0.7.142

### Added
- **TextTriggerController** — Abstract base class for trigger-char-at-caret → popover → select → action pattern. Extracted from SlashCommandController to enable multiple trigger types.
- **MentionController** — `@` mention trigger. Shows caret-anchored popover of mentionable items, inserts accent-colored `@Name` tags. Events: `native:mention-query`, `native:mention-select`. Supports avatar rendering in listbox options.
- **`mentionable` trait adapter** — Declarative mention support via `<n-controller traits="mentionable">`.

### Changed
- **SlashCommandController** now extends TextTriggerController (zero breaking changes — same constructor, events, and API). `SlashCommand` is now a type alias for `TextTriggerItem`.

## 0.7.141

### Added
- **`<n-noodles>` component** — Declarative SVG noodle canvas. Wraps NoodleController with a zero-config custom element. Children declare ports via `data-noodle-port`, element handles SVG overlay, coordinate system, and stacking context. Attributes: `editable`, `color`, `stroke-width`, `tension`, `show-ports`, `port-size`, `curve`, `animated`, `disabled`. Demo page with 3 interactive demos.

## 0.7.140

### Changed
- Updated docs (INTERNALS, PATTERNS, TRAITS) with correct `packages/*/` paths after package split

## 0.7.139

### Fixed
- **All 35 trait demo pages broken** — HTML/TS files had stale `../../` relative imports after move from `src/traits/` to `packages/native-traits/src/traits/`. Fixed to `../../../../../src/`.
- **Kernel demo page broken** — HTML/inline scripts had stale `../styles/` and `../nav/` after move to `packages/native-kernel/src/kernel/`.
- **Context API demo page broken** — same stale relative path issue after move to `packages/native-core/src/core/`.
- **Sitemap paths updated** — all 35 trait paths, kernel path, and context API path now point to `packages/*/` locations.

## 0.7.138

### Fixed
- **A2UI Builder 500 error** — 7 demo/source files had stale relative imports to `src/kernel/kernel.ts` (moved to `@nonoun/native-kernel` in 0.7.135). Fixed: `a2ui-builder.ts`, all A2A demo files, `a2ui-components.demo.ts`, `a2ui-protocol.demo.ts`.

## @nonoun/native-ai 1.0.77

### Fixed
- Stale `src/kernel/` relative imports → `@nonoun/native-kernel` in 7 demo/source files

## 0.7.137

### Added
- **n-feed demo page** — four interactive demos: basic feed, bottom-anchored (chat-style), auto-scroll with pin detection, virtual scroll (10k items)
- **n-feed registered** in `register-all.ts` (was exported but not registered)
- **n-feed YAML record** (`records/components/feed.yaml`)
- n-feed added to sitemap navigation

## 0.7.136

### Changed
- Updated T0208 ticket with full package split details (kernel extraction, import migrations, dependency graph)

## 0.7.135

### Added
- **`@nonoun/native-kernel@0.1.0`** — kernel extracted to standalone package (command bus, plan executor, planner, data binding, schema catalog). `@nonoun/native-ui/kernel` continues to work via re-export.

### Changed
- **native-code** imports migrated from `@nonoun/native-ui` to `@nonoun/native-core` + `@nonoun/native-traits` (8 files)
- **native-ai** imports migrated from `@nonoun/native-ui` to `@nonoun/native-core` + `@nonoun/native-traits` (25 files)

## @nonoun/native-ai 1.0.76

### Changed
- Imports migrated to `@nonoun/native-core`, `@nonoun/native-traits`, `@nonoun/native-kernel`
- Only component class imports remain on `@nonoun/native-ui`

## @nonoun/native-code 1.0.12

### Changed
- Imports migrated to `@nonoun/native-core` + `@nonoun/native-traits`
- Only `NSegmentedControl`/`NSegment` remain on `@nonoun/native-ui`

---

## 0.7.133

### Added
- **Package split**: `@nonoun/native-core@0.1.0` (reactivity, NativeElement, define, registries) and `@nonoun/native-traits@0.1.0` (34 trait controllers, adapters, gesture-router) extracted as standalone packages
- Backwards compatible — `@nonoun/native-ui` re-exports everything from both packages

### Changed
- All internal imports updated from relative paths to `@nonoun/native-core` / `@nonoun/native-traits`
- Build scripts and YAML records updated for new package locations

## @nonoun/native-ai 1.0.74

### Added
- **LLM utilities extracted from A2UI builder**: `parseJsonFromResponse`, `stripFences` (JSON parsing), `createAdapter`, `detectProvider` (model registry), `runPipeline` (multi-step orchestration)

## @nonoun/native-code 1.0.11

### Changed
- Version bump (no functional changes beyond renames from 1.0.10)

---

## 0.7.132

### Added
- **`<n-feed>`** component — generic scrollable feed container extracted from `n-chat-feed`. Supports `align`, `scroll`, `auto-scroll`, virtual scroll. (`src/components/feed/`)

## @nonoun/native-ai 1.0.72

### Changed
- **Chat → Agent renames**: `n-chat-input-advanced` → `n-agent-input`, `n-chat-messages` → `n-agent-dialogue`, `n-chat-message` → `n-agent-dialogue-item`
- **A2UI Builder**: `.builder-chat` class → `[data-panel="agent-chat"]` attribute

## @nonoun/native-code 1.0.10

### Changed
- **Tag renames**: `native-codemirror` → `n-editor` (`NCodeEditor`), `native-editor` → `n-markdown-editor` (`NMarkdownEditor`), `native-playground` → `n-playground`
- **File/folder reorganization**: `src/codemirror/` files renamed to match `n-editor`, `src/editor/` → `src/markdown-editor/`
- **Playground**: `.pg-split`/`.pg-editor`/`.pg-preview` → `n-panes`/`n-pane[data-panel="editor|preview"]`
- **Markdown editor**: `.native-editor-surface` → `n-pane[data-panel="surface"]`, `.native-editor-resize-handle` → `[data-role="resize-handle"]`

---

## 0.7.69

### Fixed
- **Noodleable demo**: Flow node colors switched from raw semantic tokens (`--n-surface-accent`) to button-level resolved tokens via `intent` attributes — proper colors from the two-tier system
- **Noodleable demo**: Cleaned up style drift — removed redundant `main`/`h3` overrides, `.hint` → `.demo-desc`, `<n-body>` → `<div class="body">`, `<n-container>` → `<article>`

## 0.7.68

### Added
- **Demo pages**: `n-audio`, `n-picture`, `n-video`, `n-progress` container demos
- **Demo pages**: `.body` container demo (`src/containers/body/body.html`)
- **Sitemap**: Registered Audio, Picture, Video, Progress, Body in dev navigation

### Fixed
- **Block pages**: Added missing `spa-pages.css` stylesheet to all 19 block demo pages

## 0.7.67

### Added
- **API Reference sections** on all 68 demo pages — attributes, slots, events, CSS selectors, keyboard, accessibility tables
- **Shared CSS**: `.api-section`, `.api-table` rules in `spa-pages.css`
- **Shared CSS**: `main` max-width: 64rem

### Changed
- **23 trait pages**: Stripped duplicated inline `.api-*` CSS (now in shared stylesheet)
- **4 pages** (slideshow, badge, pressable, controller): Removed style drift overrides

## 0.7.66

### Changed
- **Container consolidation**: `<article>` bare element selectors migrated to `<n-container>` custom element tag selectors
- **Bare element migration**: `<hr>` → `<n-divider>`, layout `<aside>` → `<n-aside>`
- All CSS selectors now target custom element tag names, not bare HTML elements

## 0.7.65

### Added
- **NoodleController**: SVG noodle connection trait — bezier/step/straight curves, editable mode, port indicators, animated flow
- **MagnetController**: Snap-to-edge and snap-to-sibling alignment guides

### Changed
- **Badge/Avatar/Kbd**: Migrated from CSS class selectors to undefined custom element tag selectors (`<n-badge>`, `<n-avatar>`, `<n-kbd>`)

## 0.7.64

### Changed
- **Sub-container reversal**: `<n-header>` / `<n-body>` / `<n-footer>` across all packages — unified pattern

## 0.7.63

### Changed
- **CSS specificity**: All attribute API selectors (`[variant]`, `[intent]`, `[size]`, `[density]`, `[radius]`) moved outside `@layer ui` — real (0,1,0) specificity beats unlayered consumer CSS

## 0.7.62

### Changed
- **Container consolidation**: `n-card` → `n-container`, `n-section` removed
- `NContainer` CE with `data-kind="panel"` for panel mode

## 0.7.61

### Changed
- **CSS source reorganization**: Foundation files moved to `src/styles/css/`
- **Granular dist bundles**: `foundation.css`, `components.css`, `components-lean.css`, `native-ui.css`, `native-ui-lean.css`
- **Container-to-component moves**: Media containers (`n-audio`, `n-picture`, `n-video`, `n-progress`) moved to `src/components/`
- **Base layer stylesheet**: Box-sizing reset, body defaults, reduced-motion `--n-duration: 0s`

---

## Sub-packages

### @nonoun/native-ai 1.0.15

- **SCHEMA pane**: Editable schema viewer in A2UI workbench
- **ComponentRegistry**: Central registry for A2UI component definitions
- **Card sub-container pattern**: All presets use Card > Header | Body | Footer root
- **Preset IDs**: Standardized — no abbreviations, consistent naming
- **Component map fixes**: Divider mapped to `n-divider` after bare-element migration

### @nonoun/native-dashboard 0.4.8

- **Sidebar section label**: `<n-sidebar-section-label>` CSS element (T0132)
- **Semantic layout parity**: Padding/gap variables, `[show-scrollbar]` fix (T0135–T0138)
- **Content typography**: Opt-in `main h1/h2/h3` using design tokens
- **DOM architecture**: Canonical page templates, CSS contract

### @nonoun/native-cdn 0.2.17

- Rebuilt IIFE bundle from native-ui@0.7.68

### @nonoun/native-code 1.0.7

- Register.js build fix (T0131) — separate Vite build pass with `treeshake: false`

### @nonoun/native-design 0.6.6

- Tag renames: `<native-tokens-panel>` → `<native-design-panel>`, `<native-tokens>` → `<native-design>`
