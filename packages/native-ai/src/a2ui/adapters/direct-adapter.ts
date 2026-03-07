/**
 * DirectAdapter — Same-Origin Protocol Adapter
 *
 * For testing, Web Workers, same-origin iframes, and direct function calls.
 * The simplest adapter — no transport layer, just direct method calls.
 */

import type { A2UIServerMessage } from '../protocol/a2ui-types.ts';
import type { NInteractionEvent } from '../session/types.ts';
import type { NAgentSession } from '../session/agent-session.ts';
import type { NAdapter, NAdapterConfig } from './adapter-types.ts';

// ── Configuration ──

export interface DirectAdapterOptions {
  readonly agentId?: string;
  readonly surfaces?: readonly string[];
}

// ── DirectAdapter ──

export class DirectAdapter implements NAdapter {
  readonly type = 'direct' as const;

  #options: DirectAdapterOptions;
  #config: NAdapterConfig | null = null;
  #session: NAgentSession | null = null;
  #eventUnsub: (() => void) | null = null;

  constructor(options?: DirectAdapterOptions) {
    this.#options = options ?? {};
  }

  /** Connect the adapter and create a session. */
  async connect(config: NAdapterConfig): Promise<void> {
    this.#config = config;
    this.#session = config.sessionManager.createSession({
      agentId: this.#options.agentId ?? 'direct-agent',
      catalog: config.defaultCatalog,
      surfaces: this.#options.surfaces,
    });
  }

  /** Inject an A2UI payload directly (no transport). */
  send(message: A2UIServerMessage | string): void {
    if (!this.#session) throw new Error('DirectAdapter not connected');
    this.#session.receive(message);
  }

  /** Subscribe to interaction events from rendered surfaces. */
  onInteraction(handler: (e: NInteractionEvent) => void): () => void {
    if (!this.#session) throw new Error('DirectAdapter not connected');
    this.#eventUnsub = this.#session.eventEmitter.on(handler);
    return () => {
      this.#eventUnsub?.();
      this.#eventUnsub = null;
    };
  }

  /** Get the underlying session (for testing / advanced use). */
  get session(): NAgentSession | null {
    return this.#session;
  }

  /** Disconnect and terminate the session. */
  async disconnect(): Promise<void> {
    this.#eventUnsub?.();
    this.#eventUnsub = null;
    if (this.#session && this.#config) {
      this.#config.sessionManager.terminateSession(this.#session.id);
    }
    this.#session = null;
    this.#config = null;
  }
}
