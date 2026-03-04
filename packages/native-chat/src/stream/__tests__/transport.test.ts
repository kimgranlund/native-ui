// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createChatTransport, detectFormat } from '../create-transport.ts';
import type { TransportStatus } from '../types.ts';

function mockFetchResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function sseResponse(chunks: string[]): Response {
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
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('detectFormat', () => {
  it('detects SSE', () => {
    expect(detectFormat('text/event-stream')).toBe('sse');
  });

  it('detects NDJSON', () => {
    expect(detectFormat('application/x-ndjson')).toBe('ndjson');
    expect(detectFormat('application/ndjson')).toBe('ndjson');
  });

  it('defaults to json', () => {
    expect(detectFormat('application/json')).toBe('json');
    expect(detectFormat('')).toBe('json');
  });
});

describe('createChatTransport', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('emits sending → streaming → ready on success', async () => {
    const states: TransportStatus[] = [];
    fetchSpy.mockResolvedValueOnce(sseResponse([
      'data: {"delta":"hi"}\n\n',
      'data: [DONE]\n\n',
    ]));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      onStateChange: (s) => states.push({ ...s }),
    });

    const gen = await transport.send({ message: 'test' });
    for await (const _chunk of gen) { /* consume */ }

    const stateNames = states.map((s) => s.state);
    expect(stateNames).toContain('sending');
    expect(stateNames).toContain('streaming');
    expect(stateNames).toContain('ready');
  });

  it('emits auth-required on 401', async () => {
    const states: TransportStatus[] = [];
    fetchSpy.mockResolvedValueOnce(mockFetchResponse(401, 'Unauthorized'));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      onStateChange: (s) => states.push({ ...s }),
    });

    await expect(transport.send({})).rejects.toThrow();
    expect(states.some((s) => s.state === 'auth-required')).toBe(true);
  });

  it('emits rate-limited on 429 with Retry-After', async () => {
    const states: TransportStatus[] = [];
    fetchSpy.mockResolvedValueOnce(mockFetchResponse(429, 'Too Many Requests', {
      'Retry-After': '5',
    }));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      onStateChange: (s) => states.push({ ...s }),
    });

    await expect(transport.send({})).rejects.toThrow();
    const rateLimited = states.find((s) => s.state === 'rate-limited');
    expect(rateLimited).toBeDefined();
    expect(rateLimited!.retryInMs).toBe(5000);
  });

  it('emits server-error on 500', async () => {
    const states: TransportStatus[] = [];
    fetchSpy.mockResolvedValueOnce(mockFetchResponse(500, 'Internal Server Error'));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      onStateChange: (s) => states.push({ ...s }),
    });

    await expect(transport.send({})).rejects.toThrow();
    expect(states.some((s) => s.state === 'server-error')).toBe(true);
  });

  it('emits offline on network error', async () => {
    const states: TransportStatus[] = [];
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      onStateChange: (s) => states.push({ ...s }),
    });

    await expect(transport.send({})).rejects.toThrow();
    expect(states.some((s) => s.state === 'offline')).toBe(true);
  });

  it('retries on 500 when retry configured', async () => {
    const states: TransportStatus[] = [];
    fetchSpy
      .mockResolvedValueOnce(mockFetchResponse(500, 'Error'))
      .mockResolvedValueOnce(sseResponse([
        'data: {"delta":"ok"}\n\n',
        'data: [DONE]\n\n',
      ]));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      retry: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50 },
      onStateChange: (s) => states.push({ ...s }),
    });

    const gen = await transport.send({});
    for await (const _chunk of gen) { /* consume */ }

    expect(states.some((s) => s.state === 'retrying')).toBe(true);
    expect(states.some((s) => s.state === 'streaming')).toBe(true);
    expect(states.some((s) => s.state === 'ready')).toBe(true);
  });

  it('sends X-Client-Id header when clientId set', async () => {
    fetchSpy.mockResolvedValueOnce(sseResponse(['data: [DONE]\n\n']));

    const transport = createChatTransport({
      baseUrl: 'http://test/chat',
      clientId: 'test-123',
    });

    await transport.send({});

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://test/chat',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Client-Id': 'test-123',
        }),
      }),
    );
  });
});
