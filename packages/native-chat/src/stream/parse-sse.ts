import type { ChatStreamChunk } from './types.ts';

/**
 * Parse a Server-Sent Events (SSE) response stream into ChatStreamChunk values.
 *
 * Reads `data:` lines from the response body, skips empty lines and comments,
 * handles the `[DONE]` sentinel, and accumulates the full message across chunks.
 */
export async function* parseSSE(
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
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (trimmed === '' || trimmed.startsWith(':')) continue;

        // Only process data lines
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice('data:'.length).trim();

        // Handle [DONE] sentinel
        if (payload === '[DONE]') {
          yield {
            delta: '',
            fullMessage,
            role: 'assistant',
            datetime: Date.now(),
            done: true,
          };
          return;
        }

        // Parse JSON payload
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(payload);
        } catch {
          // Skip malformed JSON lines
          continue;
        }

        // Extract delta content — support common SSE JSON shapes:
        //   { delta: "..." }
        //   { choices: [{ delta: { content: "..." } }] }   (OpenAI-style)
        //   { content: "..." }
        let delta = '';
        if (typeof parsed.delta === 'string') {
          delta = parsed.delta;
        } else if (Array.isArray(parsed.choices)) {
          const first = parsed.choices[0] as
            | { delta?: { content?: string } }
            | undefined;
          if (typeof first?.delta?.content === 'string') {
            delta = first.delta.content;
          }
        } else if (typeof parsed.content === 'string') {
          delta = parsed.content;
        }

        fullMessage += delta;

        const chunkDone =
          (parsed.done === true) ||
          (Array.isArray(parsed.choices) &&
            (parsed.choices[0] as { finish_reason?: string | null })
              ?.finish_reason != null);

        yield {
          delta,
          fullMessage,
          role: 'assistant',
          datetime: Date.now(),
          done: Boolean(chunkDone),
        };

        if (chunkDone) return;
      }
    }

    // Flush remaining buffer — no explicit [DONE] sentinel received, so mark as partial
    const remaining = (buffer + decoder.decode()).trim();
    if (remaining !== '' && remaining.startsWith('data:')) {
      const payload = remaining.slice('data:'.length).trim();
      if (payload !== '' && payload !== '[DONE]') {
        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
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
    }

    // Stream consumed without a [DONE] sentinel — this is a partial/truncated response
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
