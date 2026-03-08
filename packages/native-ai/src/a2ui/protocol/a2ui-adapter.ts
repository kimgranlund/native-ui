/**
 * A2UI Adapter
 *
 * Top-level facade for Google A2UI protocol compatibility.
 * Integrates SurfaceManager, converter, and component map
 * to provide a unified API for receiving and emitting A2UI messages.
 */

import type {
  A2UIServerMessage,
  A2UIClientMessage,
  A2UIUpdateComponents,
  A2UIProtocolVersion,
  A2UICatalogResponse,
} from './a2ui-types.ts';
import { parseServerMessage, isCatalogRequest } from './a2ui-types.ts';
import { uiNodeToA2UI } from './a2ui-converter.ts';
import type { ToA2UIOptions } from './a2ui-converter.ts';
import { getSupportedTypes } from './a2ui-component-map.ts';
import type { ComponentRegistry } from './a2ui-component-map.ts';
import { SurfaceManager } from './a2ui-surface.ts';
import type { SurfaceState } from './a2ui-surface.ts';
import type { A2UIKernelBridge as Kernel } from './kernel-bridge.ts';
import type { UIPlan } from './kernel-bridge.ts';
import type { PlanResult } from './kernel-bridge.ts';

// ── Options ──

export interface A2UIAdapterOptions {
  readonly version?: A2UIProtocolVersion;
  readonly onClientMessage?: (msg: A2UIClientMessage) => void;
  readonly onRender?: (surfaceId: string, container: HTMLElement) => void;
  readonly registry?: ComponentRegistry;
}

// ── Adapter ──

export class A2UIAdapter {
  readonly #surfaceManager: SurfaceManager;
  readonly #options: A2UIAdapterOptions;

  constructor(kernel: Kernel, options?: A2UIAdapterOptions) {
    this.#options = options ?? {};
    this.#surfaceManager = new SurfaceManager(
      kernel,
      (msg) => { this.#options.onClientMessage?.(msg); },
      (surfaceId, container) => { this.#options.onRender?.(surfaceId, container); },
      this.#options.registry,
    );
  }

  // ── Inbound: Server → Client ──

  /**
   * Process a raw A2UI server message.
   * Accepts either a parsed object or JSON string.
   * If a container is provided, it is used as the render target for new surfaces.
   */
  receive(message: A2UIServerMessage | string, container?: HTMLElement): void {
    const msg = typeof message === 'string'
      ? parseServerMessage(message)
      : message;

    if (!msg) {
      this.#options.onClientMessage?.({
        error: {
          surfaceId: '',
          code: 'PARSE_ERROR',
          message: 'Failed to parse A2UI message',
        },
      });
      return;
    }

    // Catalog request is handled at the adapter level, not by surface manager
    if (isCatalogRequest(msg)) {
      this.#handleCatalogRequest(msg.requestCatalog.surfaceId);
      return;
    }

    this.#surfaceManager.handleMessage(msg, container);
  }

  #handleCatalogRequest(surfaceId?: string): void {
    const types = this.#options.registry?.getSupportedTypes() ?? getSupportedTypes();
    const response: A2UICatalogResponse = {
      catalog: {
        ...(surfaceId ? { surfaceId } : {}),
        supportedTypes: [...types],
        version: this.#options.version ?? '0.9',
      },
    };
    this.#options.onClientMessage?.(response);
  }

  /**
   * Parse a JSON string into a typed A2UI server message.
   * Returns null if invalid.
   */
  parse(json: string): A2UIServerMessage | null {
    return parseServerMessage(json);
  }

  // ── Outbound: Client → Server (plan emission) ──

  /**
   * Convert a UIPlan to A2UI updateComponents format.
   */
  emit(plan: UIPlan, surfaceId?: string): A2UIUpdateComponents {
    const sid = surfaceId ?? plan.id;
    const options: ToA2UIOptions = {
      surfaceId: sid,
      version: this.#options.version,
      registry: this.#options.registry,
    };

    const components = uiNodeToA2UI(plan.root, options);

    return {
      updateComponents: {
        surfaceId: sid,
        components,
      },
    };
  }

  /**
   * Convert a Planner result to A2UI updateComponents format.
   */
  emitPlanResult(result: PlanResult, surfaceId?: string): A2UIUpdateComponents {
    return this.emit(result.plan, surfaceId);
  }

  // ── Surface Access ──

  getSurface(surfaceId: string): SurfaceState | null {
    return this.#surfaceManager.getSurface(surfaceId);
  }

  getSurfaceIds(): readonly string[] {
    return this.#surfaceManager.getSurfaceIds();
  }

  getDataModel(surfaceId: string): Record<string, unknown> | null {
    return this.#surfaceManager.getDataModel(surfaceId);
  }

  // ── Catalog ──

  /**
   * Returns the list of A2UI component types supported by this adapter.
   */
  getSupportedTypes(): readonly string[] {
    return this.#options.registry?.getSupportedTypes() ?? getSupportedTypes();
  }

  // ── Lifecycle ──

  destroy(): void {
    this.#surfaceManager.destroy();
  }
}

export function createA2UIAdapter(kernel: Kernel, options?: A2UIAdapterOptions): A2UIAdapter {
  return new A2UIAdapter(kernel, options);
}
