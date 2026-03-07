/**
 * NSessionManager — Multi-Session Orchestrator
 *
 * Host-facing singleton that manages all active agent sessions.
 * Creates sessions, resolves catalogs, and controls surface ownership transfers.
 */

import type { A2UIKernelBridge } from '../protocol/kernel-bridge.ts';
import type { NSessionConfig } from './types.ts';
import { NAgentSession } from './agent-session.ts';
import { NSurfaceRegistry } from './surface-registry.ts';
import { NCatalog, buildCatalogFromRegistry } from './catalog.ts';

export class NSessionManager {
  readonly surfaces: NSurfaceRegistry;
  #kernel: A2UIKernelBridge;
  #sessions = new Map<string, NAgentSession>();

  constructor(kernel: A2UIKernelBridge) {
    this.#kernel = kernel;
    this.surfaces = new NSurfaceRegistry();
  }

  /** Create a new agent session with the given configuration. */
  createSession(config: NSessionConfig): NAgentSession {
    // Resolve catalog
    let catalog: NCatalog;
    if (config.catalog === 'full') {
      catalog = buildCatalogFromRegistry('full');
    } else if (config.catalog === 'core-only') {
      catalog = buildCatalogFromRegistry('core-only');
    } else {
      catalog = config.catalog;
    }

    const session = new NAgentSession(this.#kernel, this.surfaces, {
      agentId: config.agentId,
      catalog,
      surfaces: config.surfaces,
    });

    this.#sessions.set(session.id, session);

    // Auto-assign ownership for pre-authorized surfaces
    if (config.surfaces) {
      for (const surfaceId of config.surfaces) {
        if (!this.surfaces.getOwner(surfaceId)) {
          this.surfaces.setOwner(surfaceId, session);
        }
      }
    }

    return session;
  }

  /** Get a session by ID. */
  getSession(id: string): NAgentSession | undefined {
    return this.#sessions.get(id);
  }

  /** Get all active sessions. */
  getSessions(): readonly NAgentSession[] {
    return Array.from(this.#sessions.values());
  }

  /**
   * Transfer surface ownership between sessions.
   * Only the session manager (orchestrator) can perform transfers.
   */
  transferSurfaceOwnership(surfaceId: string, toSessionId: string): void {
    const session = this.#sessions.get(toSessionId);
    if (!session) throw new Error(`Session "${toSessionId}" not found`);
    this.surfaces.transferOwnership(surfaceId, session);
  }

  /** Terminate a single session and clean up. */
  terminateSession(id: string): void {
    const session = this.#sessions.get(id);
    if (!session) return;
    session.terminate();
    this.#sessions.delete(id);
  }

  /** Terminate all sessions. */
  terminateAll(): void {
    for (const session of this.#sessions.values()) session.terminate();
    this.#sessions.clear();
  }

  /** Destroy the session manager and all sessions. */
  destroy(): void {
    this.terminateAll();
    this.surfaces.destroy();
  }
}
