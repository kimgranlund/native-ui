/**
 * NEventEmitter — Typed Interaction Event Pub/Sub
 *
 * Routes user interaction events from rendered surfaces back to agent sessions.
 * Each NAgentSession creates one NEventEmitter instance.
 */

import type { NInteractionEvent } from './types.ts';

export class NEventEmitter {
  #handlers = new Set<(event: NInteractionEvent) => void>();

  /** Emit an interaction event to all subscribers. */
  emit(event: NInteractionEvent): void {
    for (const handler of this.#handlers) handler(event);
  }

  /** Subscribe to interaction events. Returns an unsubscribe function. */
  on(handler: (event: NInteractionEvent) => void): () => void {
    this.#handlers.add(handler);
    return () => { this.#handlers.delete(handler); };
  }

  /** Remove all subscribers. */
  destroy(): void {
    this.#handlers.clear();
  }
}
