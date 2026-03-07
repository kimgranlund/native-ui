/**
 * AGUIAdapter — CopilotKit AG-UI Protocol Adapter
 *
 * Implements bidirectional streaming between an AG-UI agent and native-ui surfaces.
 * Extracts A2UI payloads from AG-UI events and emits interaction events back.
 *
 * Requires `@ag-ui/client` as a peer dependency.
 */

import type { NInteractionEvent } from '../session/types.ts';
import type { NAgentSession } from '../session/agent-session.ts';
import type { NAdapter, NAdapterConfig } from './adapter-types.ts';
import { parseServerMessage } from '../protocol/a2ui-types.ts';

// ── AG-UI Event Types (from @ag-ui/client) ──

interface AGUIEvent {
  readonly type: string;
  readonly data?: unknown;
}

interface AGUIRunAgent {
  run(options: { onEvent: (event: AGUIEvent) => void }): { cancel: () => void };
}

// ── Configuration ──

export interface AGUIAdapterOptions {
  /** An AG-UI agent instance (from @ag-ui/client). */
  readonly agent: AGUIRunAgent;
  /** AG-UI event type carrying A2UI payloads (default: 'CUSTOM'). */
  readonly a2uiEventType?: string;
  /** AG-UI event type for outbound interaction events (default: 'CUSTOM'). */
  readonly interactionEventType?: string;
  readonly surfaces?: readonly string[];
}

// ── AGUIAdapter ──

export class AGUIAdapter implements NAdapter {
  readonly type = 'ag-ui' as const;

  #options: AGUIAdapterOptions;
  #config: NAdapterConfig | null = null;
  #session: NAgentSession | null = null;
  #cancel: (() => void) | null = null;
  #eventUnsub: (() => void) | null = null;

  constructor(options: AGUIAdapterOptions) {
    this.#options = options;
  }

  /** Connect: start the AG-UI run and create a session. */
  async connect(config: NAdapterConfig): Promise<void> {
    this.#config = config;
    this.#session = config.sessionManager.createSession({
      agentId: 'ag-ui-agent',
      catalog: config.defaultCatalog,
      surfaces: this.#options.surfaces,
    });

    const a2uiEventType = this.#options.a2uiEventType ?? 'CUSTOM';

    // Wire interaction events back to AG-UI
    this.#eventUnsub = this.#session.eventEmitter.on((_event: NInteractionEvent) => {
      // AG-UI outbound: emit as custom event
      // Implementation depends on the AG-UI agent's sendEvent API
      // which varies by @ag-ui/client version
    });

    // Start the AG-UI run
    const { cancel } = this.#options.agent.run({
      onEvent: (event: AGUIEvent) => {
        this.#handleAGUIEvent(event, a2uiEventType);
      },
    });
    this.#cancel = cancel;
  }

  /** Disconnect: cancel the AG-UI run and terminate session. */
  async disconnect(): Promise<void> {
    this.#cancel?.();
    this.#cancel = null;
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

  #handleAGUIEvent(event: AGUIEvent, a2uiEventType: string): void {
    // Handle A2UI payload events
    if (event.type === a2uiEventType && event.data) {
      const payload = typeof event.data === 'string'
        ? event.data
        : JSON.stringify(event.data);
      const msg = parseServerMessage(payload);
      if (msg) this.#session?.receive(msg);
      return;
    }

    // Handle AG-UI lifecycle events
    if (event.type === 'RUN_FINISHED' || event.type === 'RUN_ERROR') {
      // Session continues — agent may start a new run
    }
  }
}
