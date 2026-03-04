// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseSSE } from '../parse-sse.ts';
import { parseNDJSON } from '../parse-ndjson.ts';
import type { ChatStreamChunk } from '../types.ts';

function mockResponse(chunks: string[], contentType: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': contentType },
  });
}

async function collect(gen: AsyncGenerator<ChatStreamChunk>): Promise<ChatStreamChunk[]> {
  const results: ChatStreamChunk[] = [];
  for await (const chunk of gen) {
    results.push(chunk);
  }
  return results;
}

describe('parseSSE partial detection', () => {
  it('does NOT set partial on explicit [DONE]', async () => {
    const res = mockResponse([
      'data: {"delta":"Hello"}\n\n',
      'data: [DONE]\n\n',
    ], 'text/event-stream');

    const chunks = await collect(parseSSE(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBeUndefined();
  });

  it('does NOT set partial on OpenAI finish_reason', async () => {
    const res = mockResponse([
      'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\n',
    ], 'text/event-stream');

    const chunks = await collect(parseSSE(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBeUndefined();
  });

  it('sets partial when stream ends without [DONE]', async () => {
    const res = mockResponse([
      'data: {"delta":"Hello"}\n\n',
      'data: {"delta":" world"}\n\n',
      // No [DONE] — stream just ends
    ], 'text/event-stream');

    const chunks = await collect(parseSSE(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBe(true);
    expect(last.fullMessage).toBe('Hello world');
  });

  it('sets partial on remaining buffer flush', async () => {
    const res = mockResponse([
      'data: {"delta":"buf"}',
      // No trailing newline, no [DONE]
    ], 'text/event-stream');

    const chunks = await collect(parseSSE(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBe(true);
  });
});

describe('parseNDJSON partial detection', () => {
  it('does NOT set partial on explicit done:true', async () => {
    const res = mockResponse([
      '{"delta":"Hello"}\n',
      '{"delta":" world","done":true}\n',
    ], 'application/x-ndjson');

    const chunks = await collect(parseNDJSON(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBeUndefined();
  });

  it('sets partial when stream ends without done:true', async () => {
    const res = mockResponse([
      '{"delta":"Hello"}\n',
      '{"delta":" world"}\n',
      // No done:true — stream just ends
    ], 'application/x-ndjson');

    const chunks = await collect(parseNDJSON(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBe(true);
    expect(last.fullMessage).toBe('Hello world');
  });

  it('sets partial on remaining buffer flush', async () => {
    const res = mockResponse([
      '{"delta":"buf"}',
      // No trailing newline, no done
    ], 'application/x-ndjson');

    const chunks = await collect(parseNDJSON(res));
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.partial).toBe(true);
  });
});
