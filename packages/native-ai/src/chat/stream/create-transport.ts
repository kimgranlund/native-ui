import type { ChatStreamChunk, StreamFormat, ChatTransportOptions, TransportStatus } from './types.ts';
import { parseSSE } from './parse-sse.ts';
import { parseNDJSON } from './parse-ndjson.ts';
import { parseJSON } from './parse-json.ts';
import { classifyHttpError, backoffDelay } from './classify.ts';

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
 * streaming async generator. Supports retry/backoff and transport state callbacks.
 */
export function createChatTransport(
  options: ChatTransportOptions,
): ChatTransport {
  const emit = (status: TransportStatus): void => {
    options.onStateChange?.(status);
  };

  const maxAttempts = options.retry?.maxAttempts ?? 1;
  const baseDelay = options.retry?.baseDelayMs ?? 1000;
  const maxDelay = options.retry?.maxDelayMs ?? 30000;

  return {
    async send(body: unknown): Promise<AsyncGenerator<ChatStreamChunk>> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (options.clientId) {
        headers['X-Client-Id'] = options.clientId;
      }

      let lastError: Error | undefined;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        emit({ state: attempt === 0 ? 'sending' : 'retrying', attempt, maxAttempts });

        let response: Response;
        try {
          response = await fetch(options.baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: options.signal,
          });
        } catch (err) {
          // Network errors (offline, DNS failure, etc.)
          lastError = err instanceof Error ? err : new Error(String(err));
          const isOffline = lastError.name === 'TypeError';
          emit({
            state: isOffline ? 'offline' : 'server-error',
            error: lastError,
            attempt,
            maxAttempts,
          });

          if (attempt + 1 < maxAttempts) {
            const delay = backoffDelay(attempt, baseDelay, maxDelay);
            emit({ state: 'retrying', retryInMs: delay, attempt: attempt + 1, maxAttempts });
            await sleep(delay);
            continue;
          }
          break;
        }

        if (!response.ok) {
          const state = classifyHttpError(response.status);
          lastError = new Error(
            `Chat transport error: ${response.status} ${response.statusText}`,
          );

          // Parse Retry-After for 429
          let retryInMs: number | undefined;
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              const seconds = Number(retryAfter);
              retryInMs = Number.isFinite(seconds)
                ? seconds * 1000
                : Date.parse(retryAfter) - Date.now();
            }
          }

          emit({
            state,
            statusCode: response.status,
            retryInMs,
            error: lastError,
            attempt,
            maxAttempts,
          });

          // Retry on 429 and 5xx if attempts remain
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt + 1 < maxAttempts) {
            const delay = retryInMs ?? backoffDelay(attempt, baseDelay, maxDelay);
            emit({ state: 'retrying', retryInMs: delay, attempt: attempt + 1, maxAttempts });
            await sleep(delay);
            continue;
          }
          break;
        }

        // Success — stream the response
        emit({ state: 'streaming' });
        const stream = createChatStream(response, options.format);

        // Wrap to emit ready state when stream completes
        return wrapStream(stream, emit);
      }

      // All attempts exhausted
      throw lastError ?? new Error('Chat transport failed');
    },
  };
}

/**
 * Wraps an async generator to emit `ready` state when the stream finishes.
 */
async function* wrapStream(
  stream: AsyncGenerator<ChatStreamChunk>,
  emit: (status: TransportStatus) => void,
): AsyncGenerator<ChatStreamChunk> {
  try {
    yield* stream;
    emit({ state: 'ready' });
  } catch (err) {
    emit({
      state: 'server-error',
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
