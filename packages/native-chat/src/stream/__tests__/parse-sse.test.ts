// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseSSE } from '../parse-sse.ts';

/** Helper: build a mock Response with a ReadableStream body. */
function mockResponse(chunks: string[]): Response {
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
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function collect(
  gen: AsyncGenerator<import('../types.ts').ChatStreamChunk>,
) {
  const results: import('../types.ts').ChatStreamChunk[] = [];
  for await (const chunk of gen) {
    results.push(chunk);
  }
  return results;
}

describe('parseSSE', () => {
  it('yields chunks from data: lines', async () => {
    const res = mockResponse([
      'data: {"delta":"Hello"}\n\n',
      'data: {"delta":" world"}\n\n',
      'data: [DONE]\n\n',
    ]);

    const chunks = await collect(parseSSE(res));

    expect(chunks).toHaveLength(3);
    expect(chunks[0].delta).toBe('Hello');
    expect(chunks[0].fullMessage).toBe('Hello');
    expect(chunks[0].done).toBe(false);

    expect(chunks[1].delta).toBe(' world');
    expect(chunks[1].fullMessage).toBe('Hello world');
    expect(chunks[1].done).toBe(false);

    expect(chunks[2].delta).toBe('');
    expect(chunks[2].fullMessage).toBe('Hello world');
    expect(chunks[2].done).toBe(true);
  });

  it('handles [DONE] sentinel', async () => {
    const res = mockResponse([
      'data: {"delta":"Hi"}\n\n',
      'data: [DONE]\n\n',
    ]);

    const chunks = await collect(parseSSE(res));

    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.fullMessage).toBe('Hi');
  });

  it('accumulates fullMessage across chunks', async () => {
    const res = mockResponse([
      'data: {"delta":"A"}\n',
      'data: {"delta":"B"}\n',
      'data: {"delta":"C"}\n',
      'data: [DONE]\n',
    ]);

    const chunks = await collect(parseSSE(res));
    // Last non-sentinel chunk should have accumulated message
    const contentChunks = chunks.filter((c) => c.delta !== '');
    expect(contentChunks[contentChunks.length - 1].fullMessage).toBe('ABC');
  });

  it('skips empty lines and comments', async () => {
    const res = mockResponse([
      ': this is a comment\n',
      '\n',
      'data: {"delta":"ok"}\n',
      '\n',
      'data: [DONE]\n',
    ]);

    const chunks = await collect(parseSSE(res));
    const contentChunks = chunks.filter((c) => c.delta !== '');
    expect(contentChunks).toHaveLength(1);
    expect(contentChunks[0].delta).toBe('ok');
  });

  it('skips malformed JSON lines', async () => {
    const res = mockResponse([
      'data: not-json\n',
      'data: {"delta":"valid"}\n',
      'data: [DONE]\n',
    ]);

    const chunks = await collect(parseSSE(res));
    const contentChunks = chunks.filter((c) => c.delta !== '');
    expect(contentChunks).toHaveLength(1);
    expect(contentChunks[0].delta).toBe('valid');
  });

  it('handles OpenAI-style choices format', async () => {
    const res = mockResponse([
      'data: {"choices":[{"delta":{"content":"Hey"}}]}\n',
      'data: {"choices":[{"delta":{"content":" there"},"finish_reason":"stop"}]}\n',
    ]);

    const chunks = await collect(parseSSE(res));
    expect(chunks).toHaveLength(2);
    expect(chunks[0].delta).toBe('Hey');
    expect(chunks[0].done).toBe(false);
    expect(chunks[1].delta).toBe(' there');
    expect(chunks[1].fullMessage).toBe('Hey there');
    expect(chunks[1].done).toBe(true);
  });

  it('handles content field format', async () => {
    const res = mockResponse([
      'data: {"content":"direct"}\n',
      'data: [DONE]\n',
    ]);

    const chunks = await collect(parseSSE(res));
    expect(chunks[0].delta).toBe('direct');
  });

  it('sets role to assistant', async () => {
    const res = mockResponse(['data: {"delta":"hi"}\n', 'data: [DONE]\n']);

    const chunks = await collect(parseSSE(res));
    for (const chunk of chunks) {
      expect(chunk.role).toBe('assistant');
    }
  });

  it('handles chunked delivery (split across reads)', async () => {
    // Simulate a data line split across two reads
    const res = mockResponse([
      'data: {"del',
      'ta":"split"}\n',
      'data: [DONE]\n',
    ]);

    const chunks = await collect(parseSSE(res));
    const contentChunks = chunks.filter((c) => c.delta !== '');
    expect(contentChunks).toHaveLength(1);
    expect(contentChunks[0].delta).toBe('split');
  });
});
