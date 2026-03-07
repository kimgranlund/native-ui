import type { ChatStreamChunk } from './types.ts';

/**
 * Parse a newline-delimited JSON (NDJSON) response stream into ChatStreamChunk values.
 *
 * Each non-empty line is parsed as a standalone JSON object.
 * Accumulates the full message across chunks.
 */
export async function* parseNDJSON(
  response: Response,
): AsyncGenerator<ChatStreamChunk> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let fullMessage = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          continue;
        }

        let delta = '';
        if (typeof parsed.delta === 'string') {
          delta = parsed.delta;
        } else if (typeof parsed.content === 'string') {
          delta = parsed.content;
        }

        fullMessage += delta;

        const chunkDone = parsed.done === true;

        yield {
          delta,
          fullMessage,
          role: 'assistant',
          datetime: Date.now(),
          done: chunkDone,
        };

        if (chunkDone) return;
      }
    }

    // Flush remaining buffer — no explicit done in chunks, so mark as partial
    const remaining = (buffer + decoder.decode()).trim();
    if (remaining !== '') {
      try {
        const parsed = JSON.parse(remaining) as Record<string, unknown>;
        let delta = '';
        if (typeof parsed.delta === 'string') {
          delta = parsed.delta;
        } else if (typeof parsed.content === 'string') {
          delta = parsed.content;
        }
        fullMessage += delta;
        yield {
          delta,
          fullMessage,
          role: 'assistant',
          datetime: Date.now(),
          done: true,
          partial: true,
        };
        return;
      } catch {
        // Ignore malformed trailing data
      }
    }

    // Stream consumed without explicit done — this is a partial/truncated response
    if (fullMessage.length > 0) {
      yield {
        delta: '',
        fullMessage,
        role: 'assistant',
        datetime: Date.now(),
        done: true,
        partial: true,
      };
    }
  } finally {
    reader.releaseLock();
  }
}
