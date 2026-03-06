/**
 * A2AAdapter — Google A2A Protocol Adapter
 *
 * Implements the Google Agent-to-Agent (A2A) JSON-RPC protocol.
 * Uses SSE for streaming inbound task updates and HTTP POST for outbound interactions.
 *
 * Agent discovery: serves an AgentCard built from the session's NCatalog.
 * Task lifecycle: submitted → working → completed/failed.
 */

import type { NInteractionEvent } from '../session/types.ts';
import type { NAgentSession } from '../session/agent-session.ts';
import type { NAdapter, NAdapterConfig } from './adapter-types.ts';
import { parseServerMessage } from '../protocol/a2ui-types.ts';

// ── A2A Types ──

export interface A2AAdapterOptions {
  readonly endpoint: string;
  readonly agentName?: string;
  readonly agentDescription?: string;
  readonly surfaces?: readonly string[];
  readonly onTaskRequest?: (request: A2ATaskRequest) => boolean | Promise<boolean>;
}

export interface A2ATaskRequest {
  readonly taskId: string;
  readonly agentId: string;
  readonly payload: unknown;
}

// ── A2AAdapter ──

export class A2AAdapter implements NAdapter {
  readonly type = 'a2a' as const;

  #options: A2AAdapterOptions;
  #config: NAdapterConfig | null = null;
  #session: NAgentSession | null = null;
  #eventSource: EventSource | null = null;
  #eventUnsub: (() => void) | null = null;

  constructor(options: A2AAdapterOptions) {
    this.#options = options;
  }

  /**
   * Build an AgentCard from the session's catalog for A2A discovery.
   */
  getAgentCard(): object {
    const catalog = this.#config?.defaultCatalog;
    return {
      name: this.#options.agentName ?? 'native-ui-agent',
      description: this.#options.agentDescription ?? 'NativeUI rendering agent',
      url: this.#options.endpoint,
      capabilities: {
        a2ui: catalog?.toManifest() ?? {},
      },
    };
  }

  /** Connect: open SSE stream and create a session. */
  async connect(config: NAdapterConfig): Promise<void> {
    this.#config = config;
    this.#session = config.sessionManager.createSession({
      agentId: `a2a:${this.#options.endpoint}`,
      catalog: config.defaultCatalog,
      surfaces: this.#options.surfaces,
    });

    // Wire interaction events to POST back to the A2A endpoint
    this.#eventUnsub = this.#session.eventEmitter.on((event: NInteractionEvent) => {
      this.#postInteraction(event);
    });

    // Open SSE stream for inbound A2UI payloads
    this.#openSSE();
  }

  /** Disconnect: close SSE and terminate session. */
  async disconnect(): Promise<void> {
    this.#eventSource?.close();
    this.#eventSource = null;
    this.#eventUnsub?.();
    this.#eventUnsub = null;
    if (this.#session && this.#config) {
      this.#config.sessionManager.terminateSession(this.#session.id);
    }
    this.#session = null;
    this.#config = null;
  }

  get session(): NAgentSession | null {
    return this.#session;
  }

  // ── Internals ──

  #openSSE(): void {
    const url = this.#options.endpoint;
    this.#eventSource = new EventSource(url);

    this.#eventSource.onmessage = (event: MessageEvent) => {
      const msg = parseServerMessage(event.data as string);
      if (msg) this.#session?.receive(msg);
    };

    this.#eventSource.onerror = () => {
      // EventSource auto-reconnects; no manual handling needed
    };
  }

  async #postInteraction(event: NInteractionEvent): Promise<void> {
    try {
      await fetch(this.#options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'interaction',
          surfaceId: event.surfaceId,
          componentId: event.componentId,
          eventType: event.eventType,
          payload: event.payload,
          timestamp: event.timestamp,
        }),
      });
    } catch {
      // Silently fail — the agent may have disconnected
    }
  }
}
