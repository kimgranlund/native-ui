import type { ChatStreamChunk } from './types.ts';

/**
 * Parse a standard JSON response as a single ChatStreamChunk.
 *
 * Reads the entire response body, parses as JSON, and yields one chunk
 * with `done: true`.
 */
export async function* parseJSON(
  response: Response,
): AsyncGenerator<ChatStreamChunk> {
  const parsed = (await response.json()) as Record<string, unknown>;

  let content = '';
  if (typeof parsed.content === 'string') {
    content = parsed.content;
  } else if (typeof parsed.message === 'string') {
    content = parsed.message;
  } else if (typeof parsed.delta === 'string') {
    content = parsed.delta;
  } else if (
    Array.isArray(parsed.choices) &&
    typeof (parsed.choices[0] as { message?: { content?: string } })?.message
      ?.content === 'string'
  ) {
    content = (
      parsed.choices[0] as { message: { content: string } }
    ).message.content;
  }

  yield {
    delta: content,
    fullMessage: content,
    role: 'assistant',
    datetime: Date.now(),
    done: true,
  };
}
