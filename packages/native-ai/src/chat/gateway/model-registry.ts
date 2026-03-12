// ── Model registry — provider detection + adapter factory ──
//
// Centralizes LLM provider identification and adapter instantiation so
// consumers don't need to hard-code provider-specific logic.

import type { GatewayAdapter } from './adapter.ts';
import { ClaudeGatewayAdapter } from './adapter-claude.ts';
import { OpenAiGatewayAdapter } from './adapter-chatgpt.ts';

// ── Provider detection ──

/** Known model prefixes / aliases for Anthropic Claude models. */
const CLAUDE_ALIASES = ['opus-4.6', 'sonnet-4.6', 'haiku-4.5'];

/** Returns `true` if `model` identifies an Anthropic Claude model. */
export function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-') || CLAUDE_ALIASES.includes(model);
}

/** Returns `true` if `model` identifies an OpenAI model. */
export function isOpenAiModel(model: string): boolean {
  return model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o3-') || model.startsWith('o4-');
}

/** Detect the provider family for a given model string. */
export function detectProvider(model: string): 'anthropic' | 'openai' | 'unknown' {
  if (isClaudeModel(model)) return 'anthropic';
  if (isOpenAiModel(model)) return 'openai';
  return 'unknown';
}

// ── Adapter factory ──

export interface CreateAdapterOptions {
  clientId: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  system?: string;
  /** Sampling temperature (0.0–1.0 for Claude, 0.0–2.0 for OpenAI). */
  temperature?: number;
  apiKey?: string | null;
  /** Anthropic API version header (required for Claude). Defaults to '2023-06-01'. */
  anthropicVersion?: string;
}

/**
 * Create a `GatewayAdapter` for the given model, auto-detecting the provider.
 *
 * Returns `null` if no API key is provided.
 *
 * @example
 * ```ts
 * const adapter = createAdapter({
 *   clientId: 'my-app',
 *   baseUrl: '/api/anthropic',
 *   model: 'claude-sonnet-4-6-20250514',
 *   maxTokens: 4096,
 *   system: 'You are a helpful assistant.',
 *   apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
 * });
 * ```
 */
export function createAdapter(opts: CreateAdapterOptions): GatewayAdapter | null {
  if (!opts.apiKey) return null;

  if (isClaudeModel(opts.model)) {
    return new ClaudeGatewayAdapter({
      clientId: opts.clientId,
      baseUrl: opts.baseUrl,
      model: opts.model,
      maxTokens: opts.maxTokens,
      system: opts.system,
      temperature: opts.temperature,
      apiKey: opts.apiKey,
      anthropicVersion: opts.anthropicVersion ?? '2023-06-01',
    });
  }

  return new OpenAiGatewayAdapter({
    clientId: opts.clientId,
    baseUrl: opts.baseUrl,
    model: opts.model,
    maxTokens: opts.maxTokens,
    system: opts.system,
    temperature: opts.temperature,
    apiKey: opts.apiKey,
  });
}
