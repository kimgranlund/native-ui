// ── JSON response parsing for LLM output ──
//
// LLMs frequently wrap JSON in markdown fences, add preamble text, or
// produce slightly malformed output. These utilities robustly extract
// JSON from raw LLM response strings.

/**
 * Strip markdown code fences (```json ... ``` or ``` ... ```) that LLMs
 * sometimes add despite instructions asking for raw JSON.
 */
export function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceStart = /^```(?:json)?\s*\n?/;
  const fenceEnd = /\n?```\s*$/;
  if (fenceStart.test(trimmed) && fenceEnd.test(trimmed)) {
    return trimmed.replace(fenceStart, '').replace(fenceEnd, '').trim();
  }
  return trimmed;
}

/**
 * Extract a JSON object from an LLM response that may contain surrounding
 * text, markdown fences, or other non-JSON content.
 *
 * Tries three strategies in order:
 * 1. Direct `JSON.parse` — response is pure JSON
 * 2. Markdown fence extraction — ```json ... ```
 * 3. Greedy brace extraction — first `{` to last `}`
 *
 * @throws {Error} if no valid JSON can be extracted
 */
export function parseJsonFromResponse<T = Record<string, unknown>>(raw: string | undefined): T {
  const text = raw?.trim();
  if (!text) throw new Error('Empty response from LLM');

  // 1. Direct parse — response is pure JSON
  try { return JSON.parse(text); } catch { /* fall through */ }

  // 2. Markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ }
  }

  // 3. Extract first { ... } span (greedy — outermost braces)
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.slice(braceStart, braceEnd + 1)); } catch { /* fall through */ }
  }

  // 4. Nothing worked — show truncated response for debugging
  const preview = text.length > 200 ? text.slice(0, 200) + '…' : text;
  throw new Error(`Could not parse JSON from response:\n${preview}`);
}
