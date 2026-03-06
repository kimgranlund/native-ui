/**
 * NAdapter — Common Protocol Adapter Interface
 *
 * All transport adapters (A2A, AG-UI, Direct) implement this interface.
 */

import type { NSessionManager } from '../session/session-manager.ts';
import type { NEventEmitter } from '../session/event-emitter.ts';
import type { NCatalog } from '../session/catalog.ts';

export interface NAdapterConfig {
  readonly sessionManager: NSessionManager;
  readonly eventEmitter: NEventEmitter;
  readonly defaultCatalog: NCatalog;
}

export interface NAdapter {
  connect(config: NAdapterConfig): Promise<void>;
  disconnect(): Promise<void>;
  readonly type: 'a2a' | 'ag-ui' | 'direct';
}
