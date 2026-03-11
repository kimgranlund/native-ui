/**
 * NAgentSession — Per-Agent Session
 *
 * Represents a single agent-to-renderer connection. Each session wraps
 * a dedicated A2UIAdapter (1:1) and validates ownership + catalog
 * before delegating to the existing protocol layer.
 */

import { uid } from '@nonoun/native-core';
import type {
  A2UIServerMessage,
  A2UIClientMessage,
  A2UIComponent,
} from '../protocol/a2ui-types.ts';
import {
  parseServerMessage,
  isUpdateComponents,
  isCreateSurface,
  isUpdateDataModel,
  isDeleteSurface,
  isActionMessage,
} from '../protocol/a2ui-types.ts';
import { A2UIAdapter } from '../protocol/a2ui-adapter.ts';
import type { A2UIKernelBridge } from '../protocol/kernel-bridge.ts';
import type { NSessionStatus, NInteractionEvent, NSurfaceState } from './types.ts';
import { NEventEmitter } from './event-emitter.ts';
import type { NCatalog } from './catalog.ts';
import type { NSurfaceRegistry } from './surface-registry.ts';

// ── Session Events ──

interface SessionEventMap {
  'interaction': (e: NInteractionEvent) => void;
  'surface-ready': (surfaceId: string) => void;
  'status-change': (status: NSessionStatus) => void;
  'catalog-violation': (type: string, componentId: string) => void;
}

// ── Config (internal) ──

export interface NAgentSessionConfig {
  readonly agentId: string;
  readonly catalog: NCatalog;
  readonly surfaces?: readonly string[];
}

// ── NAgentSession ──

export class NAgentSession {
  readonly id: string;
  readonly agentId: string;
  readonly catalog: NCatalog;
  readonly eventEmitter: NEventEmitter;

  #adapter: A2UIAdapter;
  #registry: NSurfaceRegistry;
  #status: NSessionStatus = 'connecting';
  #listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  #authorizedSurfaces: Set<string>;
  #lastComponents = new Map<string, readonly A2UIComponent[]>();

  constructor(
    kernel: A2UIKernelBridge,
    registry: NSurfaceRegistry,
    config: NAgentSessionConfig,
  ) {
    this.id = uid('session');
    this.agentId = config.agentId;
    this.catalog = config.catalog;
    this.#registry = registry;
    this.#authorizedSurfaces = new Set(config.surfaces ?? []);

    this.eventEmitter = new NEventEmitter();

    // Create a dedicated A2UIAdapter per session
    this.#adapter = new A2UIAdapter(kernel, {
      onClientMessage: (msg: A2UIClientMessage) => {
        if (isActionMessage(msg)) {
          const action = msg.action;
          const event: NInteractionEvent = {
            surfaceId: action.surfaceId,
            componentId: action.sourceComponentId,
            eventType: action.name,
            payload: (action.context as Readonly<Record<string, unknown>>) ?? {},
            timestamp: Date.now(),
          };
          this.eventEmitter.emit(event);
          this.#notify('interaction', event);
        }
      },
      onRender: (surfaceId: string, _container: HTMLElement) => {
        this.#notify('surface-ready', surfaceId);
        // Update surface state snapshot for observers
        const dataModel = this.#adapter.getDataModel(surfaceId);
        const components = this.#lastComponents.get(surfaceId) ?? [];
        const state: NSurfaceState = {
          surfaceId,
          components,
          dataModel: dataModel ?? {},
          updatedAt: Date.now(),
        };
        this.#registry.updateState(surfaceId, state);
      },
    });

    this.#setStatus('active');
  }

  get status(): NSessionStatus { return this.#status; }

  /**
   * Inbound: agent sends A2UI payload.
   * Validates ownership and catalog before forwarding to the internal adapter.
   */
  receive(message: A2UIServerMessage | string): void {
    if (this.#status === 'terminated') return;

    const msg = typeof message === 'string'
      ? parseServerMessage(message)
      : message;
    if (!msg) return;

    // Extract surfaceId from the message
    const surfaceId = extractSurfaceId(msg);

    if (surfaceId) {
      // Ownership check: pre-authorized surfaces bypass registry check
      if (!this.#authorizedSurfaces.has(surfaceId) && !this.#registry.isOwner(surfaceId, this)) {
        this.#notify('catalog-violation', surfaceId, '');
        return;
      }
    }

    // Catalog validation for updateComponents messages
    if (isUpdateComponents(msg)) {
      const filtered = this.catalog.filterComponents(
        msg.updateComponents.components,
        (type, id) => this.#notify('catalog-violation', type, id),
      );
      // Track components for state snapshots
      this.#lastComponents.set(msg.updateComponents.surfaceId, filtered);
      // Reconstruct with filtered components
      const filteredMsg = {
        updateComponents: {
          surfaceId: msg.updateComponents.surfaceId,
          components: filtered as readonly A2UIComponent[],
        },
      };
      const mount = this.#registry.getMount(msg.updateComponents.surfaceId);
      this.#adapter.receive(filteredMsg, mount);
      return;
    }

    // Forward non-updateComponents messages directly
    const mount = surfaceId ? this.#registry.getMount(surfaceId) : undefined;
    this.#adapter.receive(msg, mount);
  }

  /** Subscribe to session events. */
  on<K extends keyof SessionEventMap>(event: K, handler: SessionEventMap[K]): () => void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    const handlers = this.#listeners.get(event)!;
    handlers.add(handler as (...args: unknown[]) => void);
    return () => { handlers.delete(handler as (...args: unknown[]) => void); };
  }

  /** Terminate the session and clean up. */
  terminate(): void {
    this.#adapter.destroy();
    this.eventEmitter.destroy();
    this.#listeners.clear();
    this.#lastComponents.clear();
    this.#setStatus('terminated');
  }

  // ── Internal ──

  #setStatus(status: NSessionStatus): void {
    if (this.#status === status) return;
    this.#status = status;
    this.#notify('status-change', status);
  }

  #notify(event: string, ...args: unknown[]): void {
    const handlers = this.#listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) handler(...args);
  }
}

// ── Helpers ──

function extractSurfaceId(msg: A2UIServerMessage): string | undefined {
  if (isCreateSurface(msg)) return msg.createSurface.surfaceId;
  if (isUpdateComponents(msg)) return msg.updateComponents.surfaceId;
  if (isUpdateDataModel(msg)) return msg.updateDataModel.surfaceId;
  if (isDeleteSurface(msg)) return msg.deleteSurface.surfaceId;
  return undefined;
}
