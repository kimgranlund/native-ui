// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseNDJSON } from '../parse-ndjson.ts';

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
    headers: { 'Content-Type': 'application/x-ndjson' },
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

describe('parseNDJSON', () => {
  it('yields chunks from newline-delimited JSON', async () => {
    const res = mockResponse([
      '{"delta":"Hello"}\n',
      '{"delta":" world"}\n',
      '{"delta":"!","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));

    expect(chunks).toHaveLength(3);
    expect(chunks[0].delta).toBe('Hello');
    expect(chunks[0].fullMessage).toBe('Hello');
    expect(chunks[0].done).toBe(false);

    expect(chunks[1].delta).toBe(' world');
    expect(chunks[1].fullMessage).toBe('Hello world');
    expect(chunks[1].done).toBe(false);

    expect(chunks[2].delta).toBe('!');
    expect(chunks[2].fullMessage).toBe('Hello world!');
    expect(chunks[2].done).toBe(true);
  });

  it('skips empty lines', async () => {
    const res = mockResponse([
      '{"delta":"A"}\n',
      '\n',
      '   \n',
      '{"delta":"B","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks).toHaveLength(2);
    expect(chunks[0].delta).toBe('A');
    expect(chunks[1].delta).toBe('B');
  });

  it('handles done flag', async () => {
    const res = mockResponse([
      '{"delta":"x","done":false}\n',
      '{"delta":"y","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks[0].done).toBe(false);
    expect(chunks[1].done).toBe(true);
  });

  it('handles content field format', async () => {
    const res = mockResponse([
      '{"content":"direct","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks[0].delta).toBe('direct');
    expect(chunks[0].fullMessage).toBe('direct');
  });

  it('accumulates fullMessage across chunks', async () => {
    const res = mockResponse([
      '{"delta":"one"}\n',
      '{"delta":"two"}\n',
      '{"delta":"three","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks[2].fullMessage).toBe('onetwothree');
  });

  it('sets role to assistant', async () => {
    const res = mockResponse(['{"delta":"hi","done":true}\n']);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks[0].role).toBe('assistant');
  });

  it('skips malformed JSON lines', async () => {
    const res = mockResponse([
      'not-json\n',
      '{"delta":"valid","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].delta).toBe('valid');
  });

  it('handles chunked delivery (split across reads)', async () => {
    const res = mockResponse([
      '{"del',
      'ta":"split","done":true}\n',
    ]);

    const chunks = await collect(parseNDJSON(res));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].delta).toBe('split');
  });
});
