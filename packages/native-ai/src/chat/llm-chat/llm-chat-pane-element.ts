/**
 * <n-llm-chat-pane> — Floating/dockable AI chat panel
 *
 * Visual surface for LLMChatController. Stamps a chat UI with:
 * - Header: title, context selector, close button
 * - Body: chat feed with message history
 * - Footer: chat input with submit
 *
 * @attr {boolean} open       - Whether the pane is visible
 * @attr {string}  position   - Layout mode: 'float' (default) | 'right' | 'bottom' | 'left'
 * @fires native:llm-chat-close - Close button pressed
 */

import { NativeElement, signal, effect } from '@nonoun/native-core';
import type { LLMChatController, LLMChatMessage } from './llm-chat-controller.ts';

export class NLLMChatPane extends NativeElement {
  static observedAttributes = ['open', 'position'];

  // ── Public ──

  #controller: LLMChatController | null = null;
  #open = signal(false);
  #position = signal('float');

  // ── DOM refs (stamped once) ──

  #header: HTMLElement | null = null;
  #contextSelect: HTMLElement | null = null;
  #chatFeed: HTMLElement | null = null;
  #chatInput: HTMLElement | null = null;
  #contextLabel: HTMLElement | null = null;
  #effectCleanups: Array<() => void> = [];

  get controller(): LLMChatController | null {
    return this.#controller;
  }

  set controller(ctrl: LLMChatController | null) {
    // Clean up previous
    this.#effectCleanups.forEach((fn) => fn());
    this.#effectCleanups = [];
    this.#controller = ctrl;
    if (ctrl) this.#bindController(ctrl);
  }

  get open(): boolean {
    return this.#open.value;
  }

  set open(val: boolean) {
    this.#open.value = val;
    this.toggleAttribute('open', val);
  }

  // ── Attribute Sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'open') this.#open.value = val !== null;
    if (name === 'position') this.#position.value = val ?? 'float';
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    this.#open.value = this.hasAttribute('open');
    this.#position.value = this.getAttribute('position') ?? 'float';

    this.#stampDOM();

    // Visibility effect
    this.addEffect(() => {
      this.toggleAttribute('open', this.#open.value);
    });
  }

  teardown(): void {
    this.#effectCleanups.forEach((fn) => fn());
    this.#effectCleanups = [];
    this.#controller = null;
    super.teardown();
  }

  // ── DOM Stamping ──

  #stampDOM(): void {
    // Header
    const header = document.createElement('n-header');
    header.setAttribute('dividers', '');
    header.innerHTML = `
      <n-icon name="chat-dots" slot="leading"></n-icon>
      <span slot="label">AI Editor</span>
    `;

    // Context selector (populated by controller binding)
    const contextWrap = document.createElement('span');
    contextWrap.className = 'llm-chat-context';

    const contextLabel = document.createElement('span');
    contextLabel.className = 'llm-chat-context-label';
    contextWrap.appendChild(contextLabel);
    this.#contextLabel = contextLabel;

    const contextSelect = document.createElement('n-select');
    contextSelect.setAttribute('variant', 'ghost');
    contextSelect.setAttribute('size', 'sm');
    contextSelect.setAttribute('density', 'compact');
    const listbox = document.createElement('n-listbox');
    listbox.setAttribute('popover', '');
    contextSelect.appendChild(listbox);
    contextWrap.appendChild(contextSelect);
    this.#contextSelect = contextSelect;

    const trailing = document.createElement('span');
    trailing.setAttribute('slot', 'trailing');

    const closeBtn = document.createElement('n-button');
    closeBtn.setAttribute('variant', 'ghost');
    closeBtn.setAttribute('size', 'sm');
    closeBtn.innerHTML = '<n-icon name="x"></n-icon>';
    closeBtn.addEventListener('pointerup', () => {
      this.open = false;
      this.dispatchEvent(new CustomEvent('native:llm-chat-close', { bubbles: true }));
    });
    trailing.appendChild(contextWrap);
    trailing.appendChild(closeBtn);
    header.appendChild(trailing);
    this.#header = header;

    // Body with chat feed
    const body = document.createElement('n-body');
    const chatFeed = document.createElement('n-chat-feed');
    chatFeed.setAttribute('auto-scroll', '');
    body.appendChild(chatFeed);
    this.#chatFeed = chatFeed;

    // Footer with chat input
    const footer = document.createElement('n-footer');
    const chatInput = document.createElement('n-chat-input');
    const textarea = document.createElement('n-textarea');
    textarea.setAttribute('autogrow', '');
    textarea.setAttribute('rows', '2');
    textarea.setAttribute('placeholder', 'Ask about this pattern...');
    chatInput.appendChild(textarea);
    footer.appendChild(chatInput);
    this.#chatInput = chatInput;

    // Listen for submit
    chatInput.addEventListener('native:send', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.value && this.#controller) {
        this.#controller.send(detail.value);
      }
    });

    this.append(header, body, footer);
  }

  // ── Controller Binding ──

  #bindController(ctrl: LLMChatController): void {
    // Sync context selector
    const cleanup1 = effect(() => {
      const contexts = ctrl.contexts.value;
      const active = ctrl.activeContext.value;
      this.#updateContextSelector(contexts, active);
    });
    this.#effectCleanups.push(cleanup1);

    // Listen for context changes from select
    const onCtxChange = () => {
      const sel = this.#contextSelect as HTMLElement & { value: string };
      if (sel?.value) ctrl.setActiveContext(sel.value);
    };
    this.#contextSelect?.addEventListener('native:change', onCtxChange);
    this.#effectCleanups.push(() => {
      this.#contextSelect?.removeEventListener('native:change', onCtxChange);
    });

    // Sync messages → feed
    const cleanup2 = effect(() => {
      const messages = ctrl.messages.value;
      this.#renderMessages(messages);
    });
    this.#effectCleanups.push(cleanup2);

    // Sync streaming → busy
    const cleanup3 = effect(() => {
      const streaming = ctrl.streaming.value;
      const input = this.#chatInput as HTMLElement & { busy: boolean } | null;
      if (input) input.busy = streaming;
    });
    this.#effectCleanups.push(cleanup3);

    // Highlight management
    const cleanup4 = effect(() => {
      const _ctx = ctrl.activeContext.value;
      // Trigger highlight sync via reading the signal
      ctrl.hasActiveContext.value;
    });
    this.#effectCleanups.push(cleanup4);
  }

  #updateContextSelector(contexts: Array<{ id: string; label: string; icon?: string }>, active: { id: string } | null): void {
    const listbox = this.#contextSelect?.querySelector('n-listbox');
    if (!listbox) return;

    // Update label
    if (this.#contextLabel) {
      this.#contextLabel.textContent = active
        ? contexts.find((c) => c.id === active.id)?.label ?? ''
        : '';
    }

    // Hide selector if only one context
    if (this.#contextSelect) {
      (this.#contextSelect as HTMLElement).hidden = contexts.length <= 1;
    }

    // Rebuild options
    listbox.innerHTML = '';
    for (const ctx of contexts) {
      const option = document.createElement('n-option');
      option.setAttribute('value', ctx.id);
      if (active && ctx.id === active.id) option.setAttribute('selected', '');
      option.textContent = ctx.label;
      listbox.appendChild(option);
    }
  }

  // ── Message Rendering ──

  #renderedCount = 0;

  #renderMessages(messages: LLMChatMessage[]): void {
    if (!this.#chatFeed) return;

    // Only render new messages (append-only)
    for (let i = this.#renderedCount; i < messages.length; i++) {
      const msg = messages[i];
      this.#stampMessage(msg, i);
    }

    // Update last message content if streaming
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      const lastEl = this.#chatFeed.querySelector(`[data-msg-idx="${messages.length - 1}"] n-chat-message-text`);
      if (lastEl && last.status === 'streaming') {
        (lastEl as HTMLElement & { content: string }).content = last.content;
      }
    }

    this.#renderedCount = messages.length;
  }

  #stampMessage(msg: LLMChatMessage, idx: number): void {
    if (!this.#chatFeed) return;

    const group = document.createElement('n-agent-dialogue');
    group.setAttribute('data-role', msg.role);
    group.setAttribute('data-msg-idx', String(idx));

    const item = document.createElement('n-agent-dialogue-item');
    item.setAttribute('data-role', msg.role);
    item.setAttribute('status', msg.status);
    item.setAttribute('actions', 'none');

    const text = document.createElement('n-chat-message-text');
    (text as HTMLElement & { content: string }).content = msg.content;

    item.appendChild(text);
    group.appendChild(item);
    this.#chatFeed.appendChild(group);
  }
}
