// ── Multi-step LLM pipeline for A2UI builder ──

import type { GatewayAdapter } from '../../chat/gateway/adapter.ts';
import type { ChatMessage, SendMessageStreamChunk } from '../../chat/gateway/types.ts';
import {
  interpretPrompt,
  conceptsPrompt,
  planPrompt,
  constructionContextPrefix,
} from './step-prompts.ts';

// ── Types ──

export interface PipelineStep {
  id: 'interpret' | 'concepts' | 'plan' | 'construct';
  label: string;
  activeLabel: string;
  doneLabel: string;
  maxTokens: number;
}

export const PIPELINE_STEPS: readonly PipelineStep[] = [
  { id: 'interpret',  label: 'Interpretation',     activeLabel: 'Interpreting',       doneLabel: 'Interpreted',     maxTokens: 512 },
  { id: 'concepts',   label: 'Concept Mapping',    activeLabel: 'Mapping concepts',   doneLabel: 'Mapped concepts', maxTokens: 1024 },
  { id: 'plan',       label: 'Planning',           activeLabel: 'Planning structure', doneLabel: 'Planned',         maxTokens: 1024 },
  { id: 'construct',  label: 'Constructing',       activeLabel: 'Building schema',    doneLabel: 'Built schema',    maxTokens: 4096 },
] as const;

export interface PipelineCallbacks {
  onStepStart: (step: PipelineStep, index: number) => void;
  onStepComplete: (step: PipelineStep, index: number, output: string) => void;
  onStreamChunk?: (delta: string, fullMessage: string) => void;
  onError: (step: PipelineStep, index: number, error: Error) => void;
}

export interface PipelineContext {
  query: string;
  currentSchema: Record<string, unknown> | null;
  componentRef: string;
  conversationHistory: Array<{ role: string; message: string }>;
}

export interface PipelineResult {
  interpretation: string;
  concepts: string;
  plan: string;
  raw: string;
}

// ── Iteration shortcut ──

const SIMPLE_EDIT_RE = /\b(add|remove|change|swap|make it|move|delete|rename|hide|show|disable|enable)\b/;

export function shouldSkipEarlySteps(query: string, hasSchema: boolean): boolean {
  if (!hasSchema) return false;
  return SIMPLE_EDIT_RE.test(query.toLowerCase());
}

// ── Pipeline orchestration ──

export async function runPipeline(
  ctx: PipelineContext,
  callbacks: PipelineCallbacks,
  buildStepAdapter: (systemPrompt: string, maxTokens: number) => GatewayAdapter | null,
  schemaSystemPrompt: string,
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const skip = shouldSkipEarlySteps(ctx.query, !!ctx.currentSchema);
  let interpretation = '';
  let concepts = '';
  let plan = '';

  const now = Date.now();

  // ── Step 1: Interpretation ──
  if (!skip) {
    callbacks.onStepStart(PIPELINE_STEPS[0], 0);
    const adapter = buildStepAdapter(interpretPrompt(), PIPELINE_STEPS[0].maxTokens);
    if (!adapter) throw new Error('No API key configured');

    const response = await adapter.sendMessage({
      id: crypto.randomUUID(),
      messages: [{ role: 'user' as const, message: ctx.query, datetime: now }],
      query: ctx.query,
      signal,
    });
    interpretation = response.message;
    callbacks.onStepComplete(PIPELINE_STEPS[0], 0, interpretation);
  }

  // ── Step 2: Concept Mapping ──
  if (!skip) {
    callbacks.onStepStart(PIPELINE_STEPS[1], 1);
    const adapter = buildStepAdapter(conceptsPrompt(), PIPELINE_STEPS[1].maxTokens);
    if (!adapter) throw new Error('No API key configured');

    const history: ChatMessage[] = [
      { role: 'user', message: ctx.query, datetime: now },
      { role: 'assistant', message: interpretation, datetime: now },
    ];
    const response = await adapter.sendMessage({
      id: crypto.randomUUID(),
      messages: history,
      query: 'Now analyze the design concepts needed.',
      signal,
    });
    concepts = response.message;
    callbacks.onStepComplete(PIPELINE_STEPS[1], 1, concepts);
  }

  // ── Step 3: Planning ──
  callbacks.onStepStart(PIPELINE_STEPS[2], 2);
  const planAdapter = buildStepAdapter(planPrompt(ctx.componentRef), PIPELINE_STEPS[2].maxTokens);
  if (!planAdapter) throw new Error('No API key configured');

  const planHistory: ChatMessage[] = skip
    ? [{ role: 'user' as const, message: ctx.query, datetime: now }]
    : [
        { role: 'user', message: ctx.query, datetime: now },
        { role: 'assistant', message: interpretation, datetime: now },
        { role: 'user', message: 'Analyze the design concepts.', datetime: now },
        { role: 'assistant', message: concepts, datetime: now },
      ];
  const planResponse = await planAdapter.sendMessage({
    id: crypto.randomUUID(),
    messages: planHistory,
    query: 'Now create the implementation plan.',
    signal,
  });
  plan = planResponse.message;
  callbacks.onStepComplete(PIPELINE_STEPS[2], 2, plan);

  // ── Step 4: Schema Construction (streamed) ──
  callbacks.onStepStart(PIPELINE_STEPS[3], 3);
  const schemaAdapter = buildStepAdapter(schemaSystemPrompt, PIPELINE_STEPS[3].maxTokens);
  if (!schemaAdapter) throw new Error('No API key configured');

  const prefix = constructionContextPrefix(interpretation, concepts, plan);
  const fullQuery = ctx.currentSchema
    ? `[CURRENT SCHEMA]\n${JSON.stringify(ctx.currentSchema, null, 2)}\n[/CURRENT SCHEMA]\n\n${prefix}${ctx.query}`
    : `${prefix}${ctx.query}`;

  // Map conversation history to ChatMessage[]
  const chatHistory: ChatMessage[] = ctx.conversationHistory.map(m => ({
    role: m.role as 'user' | 'assistant',
    message: m.message,
    datetime: now,
  }));

  const response = await schemaAdapter.sendMessageStream({
    id: crypto.randomUUID(),
    messages: chatHistory,
    query: fullQuery,
    signal,
    onChunk: (chunk: SendMessageStreamChunk) => {
      callbacks.onStreamChunk?.(chunk.delta, chunk.fullMessage);
    },
  });
  const raw = response.message;
  callbacks.onStepComplete(PIPELINE_STEPS[3], 3, raw);

  return { interpretation, concepts, plan, raw };
}
