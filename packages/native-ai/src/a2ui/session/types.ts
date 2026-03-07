/**
 * Session Layer — Shared Types
 *
 * Core type definitions for multi-session A2A support.
 */

import type { A2UIComponent } from '../protocol/a2ui-types.ts';

// ── Session Status ──

export type NSessionStatus = 'connecting' | 'active' | 'suspended' | 'terminated';

// ── Session Configuration ──

export interface NSessionConfig {
  readonly agentId: string;
  readonly catalog: import('./catalog.ts').NCatalog | 'full' | 'core-only';
  readonly surfaces?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ── Interaction Event (outbound: surface → agent) ──

export interface NInteractionEvent {
  readonly surfaceId: string;
  readonly componentId: string;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
}

// ── Surface State Snapshot (for observers) ──

export interface NSurfaceState {
  readonly surfaceId: string;
  readonly components: readonly A2UIComponent[];
  readonly dataModel: Readonly<Record<string, unknown>>;
  readonly updatedAt: number;
}
