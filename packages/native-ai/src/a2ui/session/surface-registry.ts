/**
 * NSurfaceRegistry — Cross-Session Surface Coordination
 *
 * Tracks surfaces, ownership (single writer), observers (read-only),
 * mount points, and state snapshots. Provides event notifications
 * for surface updates and removals.
 */

import type { NSurfaceState } from './types.ts';

// Forward type reference to avoid circular dependency
import type { NAgentSession } from './agent-session.ts';

// ── Internal Record ──

interface SurfaceRecord {
  surfaceId: string;
  mount: HTMLElement;
  owner: NAgentSession | null;
  observers: Set<NAgentSession>;
  state: NSurfaceState | null;
}

// ── Event Types ──

type SurfaceUpdatedHandler = (surfaceId: string, state: NSurfaceState) => void;
type SurfaceRemovedHandler = (surfaceId: string) => void;

// ── NSurfaceRegistry ──

export class NSurfaceRegistry {
  #surfaces = new Map<string, SurfaceRecord>();
  #updatedHandlers = new Set<SurfaceUpdatedHandler>();
  #removedHandlers = new Set<SurfaceRemovedHandler>();

  // ── Mount Points ──

  registerMount(surfaceId: string, element: HTMLElement): void {
    const existing = this.#surfaces.get(surfaceId);
    if (existing) {
      existing.mount = element;
    } else {
      this.#surfaces.set(surfaceId, {
        surfaceId,
        mount: element,
        owner: null,
        observers: new Set(),
        state: null,
      });
    }
  }

  getMount(surfaceId: string): HTMLElement | undefined {
    return this.#surfaces.get(surfaceId)?.mount;
  }

  unregisterMount(surfaceId: string): void {
    const record = this.#surfaces.get(surfaceId);
    if (!record) return;
    this.#surfaces.delete(surfaceId);
    for (const handler of this.#removedHandlers) handler(surfaceId);
  }

  // ── Ownership ──

  setOwner(surfaceId: string, session: NAgentSession): void {
    const record = this.#surfaces.get(surfaceId);
    if (!record) throw new Error(`Surface "${surfaceId}" not registered`);
    record.owner = session;
  }

  getOwner(surfaceId: string): NAgentSession | undefined {
    return this.#surfaces.get(surfaceId)?.owner ?? undefined;
  }

  clearOwner(surfaceId: string): void {
    const record = this.#surfaces.get(surfaceId);
    if (record) record.owner = null;
  }

  isOwner(surfaceId: string, session: NAgentSession): boolean {
    return this.#surfaces.get(surfaceId)?.owner === session;
  }

  transferOwnership(surfaceId: string, to: NAgentSession): void {
    const record = this.#surfaces.get(surfaceId);
    if (!record) throw new Error(`Surface "${surfaceId}" not registered`);
    record.owner = to;
  }

  // ── Observers ──

  addObserver(surfaceId: string, session: NAgentSession): void {
    const record = this.#surfaces.get(surfaceId);
    if (!record) throw new Error(`Surface "${surfaceId}" not registered`);
    record.observers.add(session);
  }

  removeObserver(surfaceId: string, session: NAgentSession): void {
    this.#surfaces.get(surfaceId)?.observers.delete(session);
  }

  getObservers(surfaceId: string): readonly NAgentSession[] {
    const record = this.#surfaces.get(surfaceId);
    return record ? Array.from(record.observers) : [];
  }

  // ── State Snapshots ──

  updateState(surfaceId: string, state: NSurfaceState): void {
    const record = this.#surfaces.get(surfaceId);
    if (!record) return;
    record.state = state;
    for (const handler of this.#updatedHandlers) handler(surfaceId, state);
  }

  getState(surfaceId: string): NSurfaceState | undefined {
    return this.#surfaces.get(surfaceId)?.state ?? undefined;
  }

  // ── Events ──

  on(event: 'surface-updated', handler: SurfaceUpdatedHandler): () => void;
  on(event: 'surface-removed', handler: SurfaceRemovedHandler): () => void;
  on(event: 'surface-updated' | 'surface-removed', handler: SurfaceUpdatedHandler | SurfaceRemovedHandler): () => void {
    if (event === 'surface-updated') {
      const h = handler as SurfaceUpdatedHandler;
      this.#updatedHandlers.add(h);
      return () => { this.#updatedHandlers.delete(h); };
    }
    const h = handler as SurfaceRemovedHandler;
    this.#removedHandlers.add(h);
    return () => { this.#removedHandlers.delete(h); };
  }

  // ── Lifecycle ──

  destroy(): void {
    this.#surfaces.clear();
    this.#updatedHandlers.clear();
    this.#removedHandlers.clear();
  }
}
