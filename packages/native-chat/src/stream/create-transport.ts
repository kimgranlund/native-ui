import type { ChatStreamChunk, StreamFormat, ChatTransportOptions } from './types.ts';
import { parseSSE } from './parse-sse.ts';
import { parseNDJSON } from './parse-ndjson.ts';
import { parseJSON } from './parse-json.ts';

/**
 * Detect the stream format from a Content-Type header value.
 */
export function detectFormat(contentType: string): StreamFormat {
  const ct = contentType.toLowerCase();
  if (ct.includes('text/event-stream')) return 'sse';
  if (ct.includes('ndjson') || ct.includes('x-ndjson')) return 'ndjson';
  return 'json';
}

/**
 * Create an async generator that yields ChatStreamChunk values from a
 * Response, auto-detecting the format from Content-Type when not specified.
 */
export async function* createChatStream(
  response: Response,
  format?: StreamFormat,
): AsyncGenerator<ChatStreamChunk> {
  const resolved =
    format ?? detectFormat(response.headers.get('content-type') ?? '');

  switch (resolved) {
    case 'sse':
      yield* parseSSE(response);
      break;
    case 'ndjson':
      yield* parseNDJSON(response);
      break;
    case 'json':
      yield* parseJSON(response);
      break;
  }
}

export interface ChatTransport {
  send(body: unknown): Promise<AsyncGenerator<ChatStreamChunk>>;
}

/**
 * Create a reusable chat transport that sends requests and returns a
 * streaming async generator.
 */
export function createChatTransport(
  options: ChatTransportOptions,
): ChatTransport {
  return {
    async send(body: unknown): Promise<AsyncGenerator<ChatStreamChunk>> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (options.clientId) {
        headers['X-Client-Id'] = options.clientId;
      }

      const response = await fetch(options.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: options.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Chat transport error: ${response.status} ${response.statusText}`,
        );
      }

      return createChatStream(response, options.format);
    },
  };
}
