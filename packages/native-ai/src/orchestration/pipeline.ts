// ── Generic multi-step LLM pipeline runner ──
//
// Orchestrates a sequence of LLM calls (steps), each with its own system
// prompt and token budget. Steps can be skipped, streamed, and observed
// via callbacks. The builder's 4-step pipeline is one consumer of this
// generic runner.

import type { GatewayAdapter } from '../chat/gateway/adapter.ts';
import type { ChatMessage, SendMessageStreamChunk } from '../chat/gateway/types.ts';

// ── Types ──

export interface PipelineStep<TId extends string = string> {
  id: TId;
  label: string;
  activeLabel: string;
  doneLabel: string;
  maxTokens: number;
  /** If true, the final step streams via `sendMessageStream`. */
  stream?: boolean;
}

export interface PipelineCallbacks<TId extends string = string> {
  onStepStart: (step: PipelineStep<TId>, index: number) => void;
  onStepComplete: (step: PipelineStep<TId>, index: number, output: string) => void;
  onStreamChunk?: (delta: string, fullMessage: string) => void;
  onError: (step: PipelineStep<TId>, index: number, error: Error) => void;
}

export interface PipelineStepExec<TId extends string = string> {
  step: PipelineStep<TId>;
  /** Build the system prompt for this step. Receives outputs of all previous steps. */
  buildSystemPrompt: (priorOutputs: Map<string, string>) => string;
  /** Build the messages array for this step. Receives outputs of all previous steps. */
  buildMessages: (priorOutputs: Map<string, string>) => ChatMessage[];
  /** The query string for this step. */
  buildQuery: (priorOutputs: Map<string, string>) => string;
  /** If `true`, skip this step entirely. */
  skip?: boolean;
}

/**
 * Run a multi-step LLM pipeline.
 *
 * Each step gets an adapter (via `adapterFactory`), sends a message,
 * and stores its output keyed by `step.id`. Steps with `stream: true`
 * use `sendMessageStream` and fire `onStreamChunk` callbacks.
 *
 * @returns A map of step ID → output string for all executed steps.
 */
export async function runPipeline<TId extends string = string>(
  steps: PipelineStepExec<TId>[],
  callbacks: PipelineCallbacks<TId>,
  adapterFactory: (systemPrompt: string, maxTokens: number) => GatewayAdapter | null,
  signal?: AbortSignal,
): Promise<Map<TId, string>> {
  const outputs = new Map<TId, string>();

  for (let i = 0; i < steps.length; i++) {
    const { step, buildSystemPrompt, buildMessages, buildQuery, skip } = steps[i];

    if (skip) continue;

    callbacks.onStepStart(step, i);

    const systemPrompt = buildSystemPrompt(outputs);
    const adapter = adapterFactory(systemPrompt, step.maxTokens);
    if (!adapter) throw new Error('No API key configured');

    const messages = buildMessages(outputs);
    const query = buildQuery(outputs);

    let output: string;

    if (step.stream) {
      const response = await adapter.sendMessageStream({
        id: crypto.randomUUID(),
        messages,
        query,
        signal,
        onChunk: (chunk: SendMessageStreamChunk) => {
          callbacks.onStreamChunk?.(chunk.delta, chunk.fullMessage);
        },
      });
      output = response.message;
    } else {
      const response = await adapter.sendMessage({
        id: crypto.randomUUID(),
        messages,
        query,
        signal,
      });
      output = response.message;
    }

    outputs.set(step.id, output);
    callbacks.onStepComplete(step, i, output);
  }

  return outputs;
}
