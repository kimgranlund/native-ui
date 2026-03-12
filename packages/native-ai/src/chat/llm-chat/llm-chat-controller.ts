/**
 * LLMChatController — Reusable contextual AI editor controller
 *
 * Manages a list of "contexts" (data stores, component states, schemas, etc.)
 * that the LLM can read from and write back to via conversational chat.
 * The active context determines what state is injected into the prompt,
 * what element gets the highlight outline, and how LLM output is applied.
 *
 * Designed for composition — the controller owns logic + state,
 * a pane element (NLLMChatPane) owns the visual chat UI.
 */

import { signal, computed } from '@nonoun/native-core';
import type { GatewayAdapter, ChatMessage, SendMessageStreamChunk } from '../gateway/adapter.ts';

// ── Context Binding ──

export interface LLMChatContext {
  /** Unique ID for this context binding. */
  id: string;
  /** Human-readable label shown in the chat UI context selector. */
  label: string;
  /** The DOM element this context is bound to (receives highlight outline). */
  element?: HTMLElement;
  /** Read current state as a string (injected into LLM prompt). */
  read: () => string;
  /** Apply LLM output back to the context. */
  apply: (output: string) => void;
  /** Additional system prompt fragment specific to this context. */
  systemPromptFragment?: string;
  /** Icon name for the context tag in the chat UI. */
  icon?: string;
}

// ── Controller Options ──

export interface LLMChatControllerOptions {
  /** Initial context bindings. */
  contexts?: LLMChatContext[];
  /** Base system prompt. */
  systemPrompt: string;
  /** Available model IDs. */
  models?: string[];
  /** Default model. */
  model?: string;
  /** Max messages to keep in context window. */
  maxContextMessages?: number;
  /** Factory for creating gateway adapters. */
  createAdapter: (system: string, model: string, maxTokens: number) => GatewayAdapter | null;
}

// ── Message Type ──

export interface LLMChatMessage {
  role: 'user' | 'assistant';
  content: string;
  datetime: number;
  contextId?: string;
  status: 'sent' | 'streaming' | 'error' | 'partial';
}

// ── Controller ──

const MAX_CONTEXT_MESSAGES = 50;

export class LLMChatController {
  // ── Public Signals ──

  /** Currently active context (determines prompt injection + highlight). */
  readonly activeContext = signal<LLMChatContext | null>(null);
  /** All registered contexts. */
  readonly contexts = signal<LLMChatContext[]>([]);
  /** Whether the assistant is currently streaming a response. */
  readonly streaming = signal(false);
  /** Chat message history. */
  readonly messages = signal<LLMChatMessage[]>([]);
  /** Current model. */
  readonly model = signal('claude-haiku-4-5');
  /** Max tokens for generation. */
  readonly maxTokens = signal(4096);
  /** Latest streaming delta (for live UI updates). */
  readonly streamDelta = signal('');

  /** Computed: whether any context is active. */
  readonly hasActiveContext = computed(() => this.activeContext.value !== null);

  // ── Private ──

  readonly #systemPrompt: string;
  readonly #createAdapter: LLMChatControllerOptions['createAdapter'];
  readonly #maxContextMessages: number;
  #abortController: AbortController | null = null;
  #previousHighlightEl: HTMLElement | null = null;

  constructor(options: LLMChatControllerOptions) {
    this.#systemPrompt = options.systemPrompt;
    this.#createAdapter = options.createAdapter;
    this.#maxContextMessages = options.maxContextMessages ?? MAX_CONTEXT_MESSAGES;

    if (options.model) this.model.value = options.model;
    if (options.contexts?.length) {
      this.contexts.value = [...options.contexts];
      this.activeContext.value = options.contexts[0];
    }
  }

  // ── Context Management ──

  addContext(ctx: LLMChatContext): void {
    this.contexts.value = [...this.contexts.value, ctx];
    if (!this.activeContext.value) this.activeContext.value = ctx;
  }

  removeContext(id: string): void {
    this.contexts.value = this.contexts.value.filter((c) => c.id !== id);
    if (this.activeContext.value?.id === id) {
      this.activeContext.value = this.contexts.value[0] ?? null;
    }
    this.#syncHighlight();
  }

  setActiveContext(id: string): void {
    const ctx = this.contexts.value.find((c) => c.id === id);
    if (ctx) {
      this.activeContext.value = ctx;
      this.#syncHighlight();
    }
  }

  // ── Highlight Management ──

  /** Sync the data-llm-context attribute on the active element. */
  #syncHighlight(): void {
    // Remove from previous
    if (this.#previousHighlightEl) {
      this.#previousHighlightEl.removeAttribute('data-llm-context');
      this.#previousHighlightEl = null;
    }
    // Add to new
    const el = this.activeContext.value?.element;
    if (el) {
      el.setAttribute('data-llm-context', 'active');
      this.#previousHighlightEl = el;
    }
  }

  // ── Send Message ──

  async send(query: string): Promise<void> {
    const ctx = this.activeContext.value;
    if (!ctx || this.streaming.value) return;

    // Build system prompt with context
    const contextState = ctx.read();
    const systemParts = [this.#systemPrompt];
    if (ctx.systemPromptFragment) systemParts.push(ctx.systemPromptFragment);
    systemParts.push(`\n\nCurrent state of "${ctx.label}":\n\`\`\`\n${contextState}\n\`\`\``);
    const system = systemParts.join('\n\n');

    // Create adapter
    const adapter = this.#createAdapter(system, this.model.value, this.maxTokens.value);
    if (!adapter) return;

    // Abort previous
    this.#abortController?.abort();
    const abort = new AbortController();
    this.#abortController = abort;

    // Add user message
    const userMsg: LLMChatMessage = {
      role: 'user',
      content: query,
      datetime: Date.now(),
      contextId: ctx.id,
      status: 'sent',
    };

    // Add assistant placeholder
    const assistantMsg: LLMChatMessage = {
      role: 'assistant',
      content: '',
      datetime: Date.now(),
      contextId: ctx.id,
      status: 'streaming',
    };

    const msgs = [...this.messages.value, userMsg, assistantMsg];
    // Trim context window
    if (msgs.length > this.#maxContextMessages) {
      msgs.splice(0, msgs.length - this.#maxContextMessages);
    }
    this.messages.value = msgs;

    this.streaming.value = true;
    this.streamDelta.value = '';

    // Build history for adapter (exclude the placeholder)
    const history: ChatMessage[] = msgs
      .filter((m) => m.status === 'sent')
      .map((m) => ({
        role: m.role,
        message: m.content,
        datetime: m.datetime,
      }));

    try {
      const response = await adapter.sendMessageStream({
        id: crypto.randomUUID(),
        messages: history.slice(0, -1), // Exclude current user message (it's the query)
        query,
        model: this.model.value,
        signal: abort.signal,
        onChunk: (chunk: SendMessageStreamChunk) => {
          this.streamDelta.value = chunk.fullMessage;
          // Update the last message (assistant placeholder)
          const updated = [...this.messages.value];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: chunk.fullMessage };
            this.messages.value = updated;
          }
        },
      });

      // Finalize assistant message
      const final = [...this.messages.value];
      const last = final[final.length - 1];
      if (last?.role === 'assistant') {
        final[final.length - 1] = {
          ...last,
          content: response.message,
          status: 'sent',
        };
        this.messages.value = final;
      }

      // Apply output to context
      ctx.apply(response.message);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Mark as partial
        const partial = [...this.messages.value];
        const last = partial[partial.length - 1];
        if (last?.role === 'assistant') {
          partial[partial.length - 1] = { ...last, status: 'partial' };
          this.messages.value = partial;
        }
        return;
      }
      // Mark as error
      const errMsgs = [...this.messages.value];
      const last = errMsgs[errMsgs.length - 1];
      if (last?.role === 'assistant') {
        errMsgs[errMsgs.length - 1] = {
          ...last,
          content: `Error: ${(err as Error).message}`,
          status: 'error',
        };
        this.messages.value = errMsgs;
      }
    } finally {
      this.streaming.value = false;
      this.#abortController = null;
    }
  }

  /** Abort the current stream. */
  stop(): void {
    this.#abortController?.abort();
  }

  /** Clear all messages. */
  clear(): void {
    this.messages.value = [];
    this.streamDelta.value = '';
  }

  /** Tear down: remove highlights, abort streams. */
  destroy(): void {
    this.stop();
    this.#syncHighlight(); // Remove highlight
    this.activeContext.value = null;
    this.contexts.value = [];
    this.messages.value = [];
  }
}
