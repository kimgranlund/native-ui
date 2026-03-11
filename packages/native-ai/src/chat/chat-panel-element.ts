import { NativeElement, signal } from '@nonoun/native-core';
import type { GatewayAdapter, GatewayConfig, GatewayAdapterFactoryContext } from './gateway/adapter';
import type { ChatMessage, SendMessageStreamChunk } from './gateway/types';
import { createOpenAiGatewayAdapter } from './gateway/adapter-chatgpt';
import { createClaudeGatewayAdapter } from './gateway/adapter-claude';
import { createMockGatewayAdapter } from './gateway/adapter-mock';
import { createRequestId } from './gateway/runtime';
import type { NChatMessageText } from './message/chat-message-text-element';
import type { NChatInput } from './chat-input-element';

// ── Types ──

export type AutoFocusPolicy = 'open-request' | 'ready' | 'never';

export interface ChatPanelOpenOptions {
  focusComposer?: boolean;
  reason?: string;
}

export interface FocusComposerOptions {
  cursor?: 'start' | 'end' | 'preserve';
}

export interface ModelOption {
  value: string;
  label?: string;
}

/**
 * Stamped panel for the chat interface.
 *
 * Creates `<header>` (icon, title), `<section>` containing
 * `<n-chat-content>`, and `<footer>` with `<n-chat-input>` directly
 * as children. The host element itself is the panel surface.
 *
 * ## Extension Points
 *
 * **Header trailing slot** — move consumer-provided controls into the header:
 * ```html
 * <native-chat-panel>
 *   <div slot="header-trailing"><n-button variant="ghost">Custom</n-button></div>
 * </native-chat-panel>
 * ```
 *
 * **Footer leading slot** — insert content before the chat input:
 * ```html
 * <native-chat-panel>
 *   <div slot="footer-leading">Powered by AI</div>
 * </native-chat-panel>
 * ```
 *
 * **Stop / Restart buttons** — toggle via attributes:
 * ```html
 * <native-chat-panel show-stop></native-chat-panel>
 * ```
 * @attr {boolean} show-stop - Show a stop button in the header; fires `native:chat-stop`
 * @attr {boolean} show-restart - Show a restart button in the header; fires `native:chat-restart`
 * @attr {string} auto-focus-policy - When to auto-focus the composer: 'open-request' (default), 'ready', 'never'
 * @attr {string} model - Currently selected model value
 * @fires native:chat-stop - Fired when the stop button is pressed
 * @fires native:chat-restart - Fired when the restart button is pressed
 * @fires native:send - Fired on submit with `{ value }` detail
 * @fires native:chat-opened - Fired when the panel opens
 * @fires native:chat-closed - Fired when the panel closes
 * @fires native:composer-focused - Fired when the composer receives focus via API/policy
 * @fires native:composer-focus-failed - Fired when focusComposer() fails after retries
 * @fires native:model-change - Fired when user selects a different model. Detail: `{ value, previousValue }`
 * @attr {string} models - Comma-separated model IDs (e.g. 'claude-haiku-4-5-20251001,gpt-4.1-mini'). Parsed into ModelOption[] with value=label=id.
 * @attr {string} gateway - Gateway adapter: 'openai' or 'claude'. When set, panel handles send/stream automatically
 * @attr {string} gateway-url - Base URL for the gateway API (e.g. '/api/chat' or 'https://api.openai.com/v1')
 * @attr {string} gateway-config - JSON config for the adapter (model, apiKey, system, etc.)
 * @attr {string} gateway-urls - JSON map of provider prefixes to URLs (e.g. '{"claude":"/api/anthropic","openai":"/api/openai"}'). When set, auto-switches gateway based on model prefix.
 */
export class NChatPanel extends NativeElement {
  static readonly MAX_CONTEXT_MESSAGES = 50;
  static observedAttributes = ['show-stop', 'show-restart', 'auto-focus-policy', 'open', 'model', 'models', 'gateway', 'gateway-url', 'gateway-config', 'gateway-urls'];

  #showStop = signal(false);
  #showRestart = signal(false);
  #autoFocusPolicy = signal<AutoFocusPolicy>('open-request');
  #open = signal(false);
  #models = signal<ModelOption[]>([]);
  #model = signal<string | null>(null);

  // ── Gateway signals ──
  #gateway = signal<string | null>(null);
  #gatewayUrl = signal<string | null>(null);
  #gatewayConfig = signal<GatewayConfig | null>(null);
  #gatewayUrls = signal<Record<string, string> | null>(null);
  #streaming = signal(false);

  // ── Gateway state ──
  #adapter: GatewayAdapter | null = null;
  #messages: ChatMessage[] = [];
  #abortController: AbortController | null = null;

  // Stamped DOM references (set once in setup, cleared in teardown)
  #footer: HTMLElement | null = null;
  #chatFeed: HTMLElement | null = null;
  #stopBtn: HTMLElement | null = null;
  #restartBtn: HTMLElement | null = null;
  #headerTrailingContainer: HTMLElement | null = null;
  #inputActions: HTMLElement | null = null;
  #modelSelect: HTMLElement | null = null;
  #modelListbox: HTMLElement | null = null;

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'show-stop':
        this.#showStop.value = val !== null;
        break;
      case 'show-restart':
        this.#showRestart.value = val !== null;
        break;
      case 'auto-focus-policy':
        this.#autoFocusPolicy.value = (val as AutoFocusPolicy) ?? 'open-request';
        break;
      case 'open': {
        const wasOpen = this.#open.value;
        this.#open.value = val !== null;
        if (!wasOpen && val !== null) {
          this.#emitOpened(undefined, false);
        } else if (wasOpen && val === null) {
          this.#emitClosed(undefined);
        }
        break;
      }
      case 'model':
        this.#model.value = val;
        break;
      case 'models':
        if (val) {
          this.#models.value = val.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ value: id, label: id }));
        } else {
          this.#models.value = [];
        }
        break;
      case 'gateway':
        this.#gateway.value = val;
        break;
      case 'gateway-url':
        this.#gatewayUrl.value = val;
        break;
      case 'gateway-config':
        try {
          this.#gatewayConfig.value = val ? JSON.parse(val) as GatewayConfig : null;
        } catch {
          this.#gatewayConfig.value = null;
        }
        break;
      case 'gateway-urls':
        try {
          this.#gatewayUrls.value = val ? JSON.parse(val) as Record<string, string> : null;
        } catch {
          this.#gatewayUrls.value = null;
        }
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Public API ──

  get showStop(): boolean { return this.#showStop.value; }
  set showStop(val: boolean) {
    this.#showStop.value = val;
    this.toggleAttribute('show-stop', val);
  }

  get showRestart(): boolean { return this.#showRestart.value; }
  set showRestart(val: boolean) {
    this.#showRestart.value = val;
    this.toggleAttribute('show-restart', val);
  }

  get autoFocusPolicy(): AutoFocusPolicy { return this.#autoFocusPolicy.value; }
  set autoFocusPolicy(val: AutoFocusPolicy) {
    this.#autoFocusPolicy.value = val;
    this.setAttribute('auto-focus-policy', val);
  }

  /** List of available models for the model picker. */
  get models(): ModelOption[] { return this.#models.value; }
  set models(val: ModelOption[]) {
    this.#models.value = val;
    // Reflect as comma-separated attribute
    if (val.length > 0) {
      this.setAttribute('models', val.map(m => m.value).join(','));
    } else {
      this.removeAttribute('models');
    }
    // Auto-select first model if no model is currently selected
    if (val.length > 0 && this.#model.value === null) {
      this.#model.value = val[0].value;
      this.setAttribute('model', val[0].value);
    }
  }

  /** Currently selected model value. */
  get model(): string | null { return this.#model.value; }
  set model(val: string | null) {
    this.#model.value = val;
    if (val !== null) {
      this.setAttribute('model', val);
    } else {
      this.removeAttribute('model');
    }
  }

  /** Gateway adapter type: 'openai' or 'claude'. When set, panel handles send/stream automatically. */
  get gateway(): string | null { return this.#gateway.value; }
  set gateway(val: string | null) {
    this.#gateway.value = val;
    if (val) this.setAttribute('gateway', val);
    else this.removeAttribute('gateway');
  }

  /** Base URL for the gateway API. */
  get gatewayUrl(): string | null { return this.#gatewayUrl.value; }
  set gatewayUrl(val: string | null) {
    this.#gatewayUrl.value = val;
    if (val) this.setAttribute('gateway-url', val);
    else this.removeAttribute('gateway-url');
  }

  /** Configuration for the gateway adapter (model, apiKey, system, etc.). */
  get gatewayConfig(): GatewayConfig | null { return this.#gatewayConfig.value; }
  set gatewayConfig(val: GatewayConfig | null) {
    this.#gatewayConfig.value = val;
    if (val) this.setAttribute('gateway-config', JSON.stringify(val));
    else this.removeAttribute('gateway-config');
  }

  /** Map of provider prefixes to gateway URLs. Enables auto-switching gateway based on model prefix. */
  get gatewayUrls(): Record<string, string> | null { return this.#gatewayUrls.value; }
  set gatewayUrls(val: Record<string, string> | null) {
    this.#gatewayUrls.value = val;
    if (val) this.setAttribute('gateway-urls', JSON.stringify(val));
    else this.removeAttribute('gateway-urls');
  }

  /** Whether the panel is currently streaming a response. Read-only. */
  get streaming(): boolean { return this.#streaming.value; }

  /** Open the panel. Optionally focus the composer. */
  open(options?: ChatPanelOpenOptions): void {
    const wasOpen = this.#open.value;
    this.#open.value = true;
    this.toggleAttribute('open', true);

    const policy = this.#autoFocusPolicy.value;
    const shouldFocus = options?.focusComposer ?? false;
    const wantsFocus = policy !== 'never' && (policy === 'open-request' ? shouldFocus : false);

    if (!wasOpen) {
      this.#emitOpened(options?.reason, wantsFocus);
    }

    if (wantsFocus) {
      this.focusComposer({ cursor: 'end' }, 'api');
    }
  }

  /** Close the panel. */
  close(reason?: string): void {
    const wasOpen = this.#open.value;
    this.#open.value = false;
    this.removeAttribute('open');

    if (wasOpen) {
      this.#emitClosed(reason);
    }
  }

  /** Focus the composer input. */
  focusComposer(options?: FocusComposerOptions, by: 'api' | 'user' | 'policy' = 'api'): void {
    this.#attemptFocus(options ?? {}, by, 0);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Sync initial open attribute
    if (this.hasAttribute('open')) {
      this.#open.value = true;
    }

    // ── Header ──
    const header = document.createElement('n-header');
    header.setAttribute('dividers', '');

    const leading = document.createElement('nav');
    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'chat-dots');
    leading.appendChild(icon);
    header.appendChild(leading);

    const label = document.createElement('span');
    label.textContent = 'Assistant';
    header.appendChild(label);

    // Header trailing container — hosts stop/restart buttons + consumer slot
    const headerTrailing = document.createElement('aside');
    headerTrailing.className = 'n-chat-panel-header-trailing';
    header.appendChild(headerTrailing);
    this.#headerTrailingContainer = headerTrailing;

    // ── Body ──
    const body = document.createElement('n-body');
    const chatContent = document.createElement('n-chat-content');

    const chatFeed = document.createElement('n-chat-feed');
    chatFeed.setAttribute('auto-scroll', '');
    chatContent.appendChild(chatFeed);
    this.#chatFeed = chatFeed;

    body.appendChild(chatContent);

    // ── Footer ──
    const footer = document.createElement('n-footer');
    footer.setAttribute('dividers', '');
    this.#footer = footer;

    const chatInput = document.createElement('n-chat-input');

    const textarea = document.createElement('n-textarea');
    textarea.setAttribute('placeholder', 'Ask anything');
    textarea.setAttribute('autogrow', '');
    textarea.setAttribute('rows', '3');
    chatInput.appendChild(textarea);

    const actions = document.createElement('n-chat-input-actions');
    this.#inputActions = actions;

    const plusBtn = document.createElement('n-button');
    plusBtn.setAttribute('variant', 'ghost');
    plusBtn.setAttribute('inline', '');
    const plusIcon = document.createElement('n-icon');
    plusIcon.setAttribute('name', 'plus');
    plusBtn.appendChild(plusIcon);
    actions.appendChild(plusBtn);

    const micBtn = document.createElement('n-button');
    micBtn.setAttribute('variant', 'ghost');
    micBtn.setAttribute('inline', '');
    const micIcon = document.createElement('n-icon');
    micIcon.setAttribute('name', 'microphone');
    micBtn.appendChild(micIcon);
    actions.appendChild(micBtn);

    const submitBtn = document.createElement('n-button');
    submitBtn.setAttribute('variant', 'primary');
    submitBtn.setAttribute('intent', 'accent');
    submitBtn.setAttribute('radius', 'round');
    submitBtn.setAttribute('inline', '');
    submitBtn.setAttribute('disabled', '');
    submitBtn.dataset.submit = '';
    submitBtn.dataset.role = 'submit';
    const submitIcon = document.createElement('n-icon');
    submitIcon.setAttribute('name', 'arrow-up');
    submitBtn.appendChild(submitIcon);
    actions.appendChild(submitBtn);

    chatInput.appendChild(actions);

    footer.appendChild(chatInput);

    // ── Assemble ──
    this.append(header, body, footer);

    // ── Effects (no child dependency — registered outside deferChildren) ──

    // Stop button: stamp/remove reactively
    this.addEffect(() => {
      const show = this.#showStop.value;
      if (show && !this.#stopBtn) {
        const btn = document.createElement('n-button');
        btn.setAttribute('variant', 'ghost');
        btn.setAttribute('inline', '');
        btn.setAttribute('aria-label', 'Stop');
        const stopIcon = document.createElement('n-icon');
        stopIcon.setAttribute('name', 'stop');
        btn.appendChild(stopIcon);
        btn.addEventListener('native:press', this.#onStop);
        this.#stopBtn = btn;
        this.#headerTrailingContainer?.prepend(btn);
      } else if (!show && this.#stopBtn) {
        this.#stopBtn.removeEventListener('native:press', this.#onStop);
        this.#stopBtn.remove();
        this.#stopBtn = null;
      }
    });

    // Restart button: stamp/remove reactively
    this.addEffect(() => {
      const show = this.#showRestart.value;
      if (show && !this.#restartBtn) {
        const btn = document.createElement('n-button');
        btn.setAttribute('variant', 'ghost');
        btn.setAttribute('inline', '');
        btn.setAttribute('aria-label', 'Restart');
        const restartIcon = document.createElement('n-icon');
        restartIcon.setAttribute('name', 'arrow-counter-clockwise');
        btn.appendChild(restartIcon);
        btn.addEventListener('native:press', this.#onRestart);
        this.#restartBtn = btn;
        // Insert after stop (if present), before consumer content
        const insertBefore = this.#stopBtn?.nextSibling ?? this.#headerTrailingContainer?.firstChild ?? null;
        this.#headerTrailingContainer?.insertBefore(btn, insertBefore);
      } else if (!show && this.#restartBtn) {
        this.#restartBtn.removeEventListener('native:press', this.#onRestart);
        this.#restartBtn.remove();
        this.#restartBtn = null;
      }
    });

    // Model picker: stamp/remove reactively based on models array
    this.addEffect(() => {
      const models = this.#models.value;

      if (models.length > 0 && !this.#modelSelect) {
        const select = document.createElement('n-select');
        select.setAttribute('aria-label', 'Select model');
        select.setAttribute('data-role', 'model-picker');
        select.setAttribute('variant', 'ghost');
        select.setAttribute('inline', '');
        select.addEventListener('native:change', this.#onModelSelect);
        const triggerIcon = document.createElement('n-icon');
        triggerIcon.setAttribute('name', 'dots-three-outline-fill');
        triggerIcon.setAttribute('slot', 'label');
        const listbox = document.createElement('n-listbox');
        listbox.setAttribute('popover', 'manual');
        select.append(triggerIcon, listbox);
        this.#modelSelect = select;
        this.#modelListbox = listbox;
        // Keep model chooser in the composer action strip.
        const submit = this.#inputActions?.querySelector('[data-submit]');
        if (submit) this.#inputActions?.insertBefore(select, submit);
        else this.#inputActions?.appendChild(select);
      } else if (models.length === 0 && this.#modelSelect) {
        this.#destroyModelPicker();
      }
    });

    // Model picker: sync options + selected value reactively
    this.addEffect(() => {
      const models = this.#models.value;
      const selected = this.#model.value;
      const select = this.#modelSelect as (HTMLElement & { value?: string | null }) | null;
      const listbox = this.#modelListbox;

      if (!select || !listbox || models.length === 0) return;

      const nextValue = selected ?? models[0]?.value ?? null;
      if (nextValue === null) return;

      listbox.innerHTML = '';
      for (const [group, items] of this.#groupModels(models)) {
        const groupEl = document.createElement('n-option-group');
        const groupHeader = document.createElement('n-option-group-header');
        groupHeader.textContent = group;
        groupEl.appendChild(groupHeader);
        for (const m of items) {
          const option = document.createElement('n-option');
          const isSelected = m.value === nextValue;
          option.setAttribute('value', m.value);
          option.setAttribute('aria-selected', String(isSelected));
          option.textContent = m.label ?? m.value;
          groupEl.appendChild(option);
        }
        listbox.appendChild(groupEl);
      }

      if (selected === null) {
        this.#model.value = nextValue;
        this.setAttribute('model', nextValue);
      }

      select.value = nextValue;
    });

    // ── Gateway: auto-resolve from model on initial load when gateway-urls is set ──
    this.addEffect(() => {
      const urls = this.#gatewayUrls.value;
      const model = this.#model.value;
      if (!urls || !model) return;

      // Only auto-resolve if gateway is not already explicitly set
      const currentGateway = this.#gateway.value;
      const currentUrl = this.#gatewayUrl.value;
      if (currentGateway && currentUrl) return;

      const resolved = this.#resolveGatewayFromModel(model);
      if (resolved) {
        this.#gateway.value = resolved.gateway;
        this.setAttribute('gateway', resolved.gateway);
        this.#gatewayUrl.value = resolved.url;
        this.setAttribute('gateway-url', resolved.url);
      }
    });

    // ── Gateway adapter: create/destroy reactively ──
    this.addEffect(() => {
      const gateway = this.#gateway.value;
      const url = this.#gatewayUrl.value;
      const config = this.#gatewayConfig.value;

      if (!gateway || !url) {
        this.#adapter = null;
        return;
      }

      const context: GatewayAdapterFactoryContext = {
        clientId: createRequestId(),
        baseUrl: url,
        gatewayConfig: config ?? {},
      };

      let adapter: GatewayAdapter | null = null;
      if (gateway === 'openai') {
        adapter = createOpenAiGatewayAdapter(context);
      } else if (gateway === 'claude') {
        adapter = createClaudeGatewayAdapter(context);
      } else if (gateway === 'mock') {
        adapter = createMockGatewayAdapter(context);
      }

      this.#adapter = adapter;

      // Bootstrap the session
      if (adapter) {
        adapter.bootstrapSession().catch(() => {
          // Bootstrap failure is non-fatal — adapter is still usable
        });
      }
    });

    // ── Gateway mode: auto-manage stop button visibility ──
    this.addEffect(() => {
      if (this.#gateway.value) {
        this.#showStop.value = this.#streaming.value;
      }
    });

    // ── Listen for native:send (gateway handles it when adapter exists) ──
    this.addEventListener('native:send', this.#onSend);

    // ── Listen for stop/restart in gateway mode ──
    this.addEventListener('native:chat-stop', this.#onStopStream);
    this.addEventListener('native:chat-restart', this.#onRestartChat);

    // ── Slot relocation (needs children present) ──
    this.deferChildren(() => {
      this.#relocateSlots();
    });

    // ── Auto-focus policy: 'ready' ──
    if (this.#autoFocusPolicy.value === 'ready') {
      queueMicrotask(() => {
        if (this.isConnected) {
          this.focusComposer({ cursor: 'end' }, 'policy');
        }
      });
    }
  }

  teardown(): void {
    this.#abortController?.abort();
    this.removeEventListener('native:send', this.#onSend);
    this.removeEventListener('native:chat-stop', this.#onStopStream);
    this.removeEventListener('native:chat-restart', this.#onRestartChat);
    if (this.#stopBtn) {
      this.#stopBtn.removeEventListener('native:press', this.#onStop);
    }
    if (this.#restartBtn) {
      this.#restartBtn.removeEventListener('native:press', this.#onRestart);
    }
    this.#destroyModelPicker();
    this.#adapter = null;
    this.#messages = [];
    this.#abortController = null;
    this.#footer = null;
    this.#chatFeed = null;
    this.#stopBtn = null;
    this.#restartBtn = null;
    this.#headerTrailingContainer = null;
    this.#inputActions = null;
    this.#modelListbox = null;
    this.innerHTML = '';
    super.teardown();
  }

  // ── Slot relocation ──

  #relocateSlots(): void {
    // Header trailing: move consumer's [slot="header-trailing"] into the header trailing container
    const headerTrailingSlot = this.querySelector(':scope > [slot="header-trailing"]');
    if (headerTrailingSlot && this.#headerTrailingContainer) {
      this.#headerTrailingContainer.appendChild(headerTrailingSlot);
    }

    // Footer leading: move consumer's [slot="footer-leading"] before the chat input
    const footerLeadingSlot = this.querySelector(':scope > [slot="footer-leading"]');
    if (footerLeadingSlot && this.#footer) {
      const chatInput = this.#footer.querySelector(':scope > n-chat-input');
      this.#footer.insertBefore(footerLeadingSlot, chatInput);
    }
  }

  // ── Focus with retry (T0065) ──

  #attemptFocus(options: FocusComposerOptions, by: 'api' | 'user' | 'policy', attempt: number): void {
    const MAX_ATTEMPTS = 3;
    const composer = this.#findComposer();

    if (!composer) {
      if (attempt < MAX_ATTEMPTS - 1) {
        queueMicrotask(() => this.#attemptFocus(options, by, attempt + 1));
        return;
      }
      this.#emitFocusFailed('composer-unavailable', MAX_ATTEMPTS);
      return;
    }

    if ((composer as NChatInput).disabled) {
      if (attempt < MAX_ATTEMPTS - 1) {
        queueMicrotask(() => this.#attemptFocus(options, by, attempt + 1));
        return;
      }
      this.#emitFocusFailed('disabled', MAX_ATTEMPTS);
      return;
    }

    // Find the actual focusable element (n-textarea inside n-chat-input)
    const textarea = composer.querySelector('n-textarea') as HTMLElement | null;
    const target = textarea ?? composer;

    try {
      target.focus();
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        queueMicrotask(() => this.#attemptFocus(options, by, attempt + 1));
        return;
      }
      this.#emitFocusFailed('blocked', MAX_ATTEMPTS);
      return;
    }

    // Cursor placement on contenteditable
    if (options.cursor && options.cursor !== 'preserve' && textarea) {
      this.#placeCursor(textarea, options.cursor);
    }

    this.dispatchEvent(
      new CustomEvent('native:composer-focused', {
        bubbles: true,
        composed: true,
        detail: { by },
      }),
    );
  }

  #findComposer(): HTMLElement | null {
    return this.querySelector('n-chat-input');
  }

  #placeCursor(textarea: HTMLElement, position: 'start' | 'end'): void {
    const sel = textarea.ownerDocument.getSelection?.();
    if (!sel) return;

    // n-textarea uses contenteditable — get first text node or the element itself
    const node = textarea.firstChild ?? textarea;
    const offset = position === 'end'
      ? (node.textContent?.length ?? 0)
      : 0;

    try {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // Range operations can fail if the node isn't in the document
    }
  }

  // ── Event dispatchers ──

  #emitOpened(source: string | undefined, focusComposer: boolean): void {
    this.dispatchEvent(
      new CustomEvent('native:chat-opened', {
        bubbles: true,
        composed: true,
        detail: { source, focusComposer },
      }),
    );
  }

  #emitClosed(reason: string | undefined): void {
    this.dispatchEvent(
      new CustomEvent('native:chat-closed', {
        bubbles: true,
        composed: true,
        detail: { reason },
      }),
    );
  }

  #emitFocusFailed(reason: 'composer-unavailable' | 'disabled' | 'blocked', attempts: number): void {
    this.dispatchEvent(
      new CustomEvent('native:composer-focus-failed', {
        bubbles: true,
        composed: true,
        detail: { reason, attempts },
      }),
    );
  }

  // ── Event handlers ──

  #onStop = (): void => {
    this.dispatchEvent(
      new CustomEvent('native:chat-stop', { bubbles: true, composed: true }),
    );
  };

  #onRestart = (): void => {
    this.dispatchEvent(
      new CustomEvent('native:chat-restart', { bubbles: true, composed: true }),
    );
  };

  /** Resolve gateway + URL from model prefix using the gateway-urls map. */
  #resolveGatewayFromModel(modelId: string): { gateway: string; url: string } | null {
    const urls = this.#gatewayUrls.value;
    if (!urls) return null;

    const lower = modelId.toLowerCase();

    // Well-known provider prefixes
    if (lower.startsWith('claude') || lower.startsWith('anthropic')) {
      const url = urls['claude'];
      if (url) return { gateway: 'claude', url };
    }
    if (lower.startsWith('gpt') || lower.startsWith('chatgpt') || lower.startsWith('openai')) {
      const url = urls['openai'];
      if (url) return { gateway: 'openai', url };
    }

    // Fallback: check all keys for a prefix match
    for (const key of Object.keys(urls)) {
      if (lower.startsWith(key.toLowerCase())) {
        return { gateway: key, url: urls[key] };
      }
    }

    return null;
  }

  #onModelSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const newValue = detail?.value ?? null;
    if (newValue === null) return;

    const previousValue = this.#model.value;
    if (newValue === previousValue) {
      return;
    }

    this.#model.value = newValue;
    this.setAttribute('model', newValue);

    // Auto-switch gateway based on model prefix (only when gateway-urls is set)
    const resolved = this.#resolveGatewayFromModel(newValue);
    if (resolved) {
      this.#gateway.value = resolved.gateway;
      this.setAttribute('gateway', resolved.gateway);
      this.#gatewayUrl.value = resolved.url;
      this.setAttribute('gateway-url', resolved.url);
    }

    this.dispatchEvent(
      new CustomEvent('native:model-change', {
        bubbles: true,
        composed: true,
        detail: { value: newValue, previousValue },
      }),
    );
  };

  // ── Gateway: send handler ──

  #onSend = (e: Event): void => {
    if (!this.#adapter) return;
    const detail = (e as CustomEvent).detail;
    const value = detail?.value;
    if (!value?.trim()) return;
    e.stopImmediatePropagation();
    this.#sendMessage(value);
  };

  async #sendMessage(query: string): Promise<void> {
    const adapter = this.#adapter;
    if (!adapter || this.#streaming.value) return;

    // Abort any previous stream
    this.#abortController?.abort();
    const abort = new AbortController();
    this.#abortController = abort;

    // Add user message to history
    const userMsg: ChatMessage = {
      role: 'user',
      message: query,
      datetime: Date.now(),
    };
    this.#messages.push(userMsg);

    // Trim context window to avoid unbounded growth
    const maxMessages = (this.constructor as typeof NChatPanel).MAX_CONTEXT_MESSAGES;
    if (this.#messages.length > maxMessages) {
      this.#messages = this.#messages.slice(-maxMessages);
    }

    // Stamp user message in DOM
    this.#stampMessage(userMsg);

    // Create assistant placeholder
    const assistantId = `msg-${createRequestId()}`;
    const assistantMsgEl = this.#stampAssistantPlaceholder(assistantId);
    const textEl = assistantMsgEl?.querySelector('n-chat-message-text');
    assistantMsgEl?.setAttribute('status', 'typing');

    this.#streaming.value = true;
    const composer = this.#findComposer();
    if (composer) (composer as any).busy = true;

    try {
      const response = await adapter.sendMessageStream({
        id: createRequestId(),
        messages: this.#messages,
        query,
        model: this.#model.value ?? undefined,
        signal: abort.signal,
        onChunk: (chunk: SendMessageStreamChunk) => {
          if (assistantMsgEl?.getAttribute('status') === 'typing') {
            assistantMsgEl.setAttribute('status', 'streaming');
          }
          if (textEl) (textEl as NChatMessageText).content = chunk.fullMessage;
          if (chunk.done) {
            assistantMsgEl?.setAttribute('status', chunk.partial ? 'partial' : 'sent');
          }
        },
      });

      // Add assistant message to history
      this.#messages.push({
        role: 'assistant',
        message: response.message,
        datetime: response.datetime ?? Date.now(),
        partial: response.partial,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        assistantMsgEl?.setAttribute('status', 'partial');
        return;
      }
      assistantMsgEl?.setAttribute('status', 'error');
      const currentContent = textEl ? (textEl as NChatMessageText).content : '';
      if (textEl) {
        if (currentContent.trim()) {
          // Preserve partial content, append error note
          (textEl as NChatMessageText).content = currentContent + `\n\n---\n*Error: ${(err as Error).message}*`;
        } else {
          (textEl as NChatMessageText).content = `Error: ${(err as Error).message}`;
        }
      }
    } finally {
      this.#streaming.value = false;
      this.#abortController = null;
      const composer2 = this.#findComposer();
      if (composer2) (composer2 as any).busy = false;
    }
  }

  #stampMessage(msg: ChatMessage): void {
    const feed = this.#chatFeed;
    if (!feed) return;

    const group = document.createElement('n-agent-dialogue');
    group.setAttribute('data-role', msg.role);
    group.setAttribute('sender', msg.role === 'user' ? 'You' : 'Assistant');

    const message = document.createElement('n-agent-dialogue-item');
    message.setAttribute('data-role', msg.role);
    message.setAttribute('message-id', `msg-${createRequestId()}`);
    message.setAttribute('status', 'sent');

    const text = document.createElement('n-chat-message-text');
    (text as NChatMessageText).content = msg.message;

    message.appendChild(text);
    group.appendChild(message);
    feed.appendChild(group);
  }

  #stampAssistantPlaceholder(id: string): HTMLElement | null {
    const feed = this.#chatFeed;
    if (!feed) return null;

    const group = document.createElement('n-agent-dialogue');
    group.setAttribute('data-role', 'assistant');
    group.setAttribute('sender', 'Assistant');

    const message = document.createElement('n-agent-dialogue-item');
    message.setAttribute('data-role', 'assistant');
    message.setAttribute('message-id', id);
    message.setAttribute('status', 'streaming');

    const text = document.createElement('n-chat-message-text');
    message.appendChild(text);
    group.appendChild(message);
    feed.appendChild(group);

    return message;
  }

  // ── Gateway: stop/restart ──

  #onStopStream = (): void => {
    if (!this.#adapter) return;
    this.#abortController?.abort();
    this.#streaming.value = false;
    const composer = this.#findComposer();
    if (composer) (composer as any).busy = false;
  };

  #onRestartChat = (): void => {
    if (!this.#adapter) return;
    this.#abortController?.abort();
    this.#streaming.value = false;
    const composer = this.#findComposer();
    if (composer) (composer as any).busy = false;
    this.#messages = [];
    if (this.#chatFeed) this.#chatFeed.innerHTML = '';
  };

  #groupModels(models: ModelOption[]): Array<[string, ModelOption[]]> {
    const map = new Map<string, ModelOption[]>();
    const groupFor = (m: ModelOption): string => {
      const text = `${m.label ?? ''} ${m.value}`.toLowerCase();
      if (text.includes('claude')) return 'Claude';
      if (text.includes('gpt') || text.includes('openai')) return 'ChatGPT';
      if (text.includes('gemini')) return 'Gemini';
      return 'Models';
    };
    for (const m of models) {
      const group = groupFor(m);
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(m);
    }
    const order = ['Claude', 'ChatGPT', 'Gemini', 'Models'];
    return Array.from(map.entries()).sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }

  #destroyModelPicker(): void {
    if (this.#modelSelect) {
      this.#modelSelect.removeEventListener('native:change', this.#onModelSelect);
      this.#modelSelect.remove();
      this.#modelSelect = null;
    }
    this.#modelListbox = null;
  }
}
