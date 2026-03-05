/**
 * A2UI Diagnostics — CodeMirror Lint Source
 *
 * Validates A2UI JSON content using brace-counting envelope parsing.
 * Supports both single-line JSONL and multi-line pretty-printed JSON
 * separated by blank lines (as used by the A2UI workbench editor).
 *
 * Returns CodeMirror Diagnostic objects for inline error/warning display.
 *
 * Checks performed:
 * 1. JSON syntax — each envelope must be valid JSON
 * 2. Must be an object — not array/null/primitive
 * 3. Envelope key — must be a known A2UI message type
 * 4. Surface ID — envelope body must contain surfaceId (except requestCatalog)
 * 5. Version field — warning if missing
 * 6. Surface lifecycle — warns if a surfaceId is used before createSurface
 * 7. Root component — warns if no surface has a root component
 */

import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';

// ── Known envelope keys ──

const KNOWN_ENVELOPE_KEYS: ReadonlySet<string> = new Set([
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
  'requestCatalog',
]);

// ── Envelope boundary detection ──

interface EnvelopeSpan {
  /** Character offset of the opening `{` in the document */
  from: number;
  /** Character offset one past the closing `}` in the document */
  to: number;
  /** Raw text of the envelope (`text.substring(from, to)`) */
  text: string;
}

/**
 * Find top-level `{}` blocks using brace-counting with string-escape awareness.
 * Same algorithm as the workbench's `#getEnvelopes()` method.
 */
function findEnvelopes(text: string): EnvelopeSpan[] {
  const result: EnvelopeSpan[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        result.push({ from: start, to: i + 1, text: text.substring(start, i + 1) });
        start = -1;
      }
    }
  }

  return result;
}

// ── Lint Source ──

/**
 * CodeMirror lint source for A2UI JSON content.
 *
 * Use with the `linter()` extension from `@codemirror/lint`:
 * ```ts
 * import { linter } from '@codemirror/lint';
 * const ext = linter(a2uiLinter);
 * ```
 */
export function a2uiLinter(view: EditorView): Diagnostic[] {
  const doc = view.state.doc;
  const text = doc.toString();
  const diagnostics: Diagnostic[] = [];

  const envelopes = findEnvelopes(text);

  // Track surface lifecycle across envelopes
  const createdSurfaces = new Set<string>();
  // Track which surfaces have a root component
  const surfacesWithRoot = new Set<string>();
  // Track surfaces referenced before creation (for cross-envelope warnings)
  const referencedBeforeCreation: Array<{
    surfaceId: string;
    from: number;
    to: number;
  }> = [];
  // Track createSurface envelope positions for root-component warnings
  const createSurfaceSpans = new Map<string, { from: number; to: number }>();

  for (const envelope of envelopes) {
    const { from, to, text: envelopeText } = envelope;

    // 1. JSON syntax check
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(envelopeText) as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof SyntaxError
        ? `Invalid JSON: ${err.message}`
        : 'Invalid JSON';
      diagnostics.push({ from, to, severity: 'error', message });
      continue;
    }

    // 2. Must be an object
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: 'A2UI envelope must be a JSON object',
      });
      continue;
    }

    // 3. Find the envelope key
    const keys = Object.keys(parsed);
    const envelopeKey = keys.find((k) => KNOWN_ENVELOPE_KEYS.has(k));
    const unknownKeys = keys.filter(
      (k) => !KNOWN_ENVELOPE_KEYS.has(k) && k !== 'version',
    );

    if (!envelopeKey && unknownKeys.length > 0) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: `Unknown envelope key: "${unknownKeys[0]}". Expected one of: ${[...KNOWN_ENVELOPE_KEYS].join(', ')}`,
      });
      continue;
    }

    if (!envelopeKey) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: `Missing envelope key. Expected one of: ${[...KNOWN_ENVELOPE_KEYS].join(', ')}`,
      });
      continue;
    }

    // 4. Version field — warning if missing
    if (!('version' in parsed)) {
      diagnostics.push({
        from,
        to,
        severity: 'warning',
        message: 'Missing "version" field in envelope',
      });
    }

    // 5. Extract the envelope body and check for surfaceId
    const body = parsed[envelopeKey];

    // requestCatalog may have optional surfaceId, so skip the surfaceId check for it
    if (envelopeKey !== 'requestCatalog') {
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        diagnostics.push({
          from,
          to,
          severity: 'error',
          message: `"${envelopeKey}" body must be an object`,
        });
        continue;
      }

      const bodyObj = body as Record<string, unknown>;
      if (!('surfaceId' in bodyObj) || typeof bodyObj.surfaceId !== 'string') {
        diagnostics.push({
          from,
          to,
          severity: 'error',
          message: `Missing "surfaceId" in "${envelopeKey}" body`,
        });
        continue;
      }

      const surfaceId = bodyObj.surfaceId as string;

      // 6. Surface lifecycle tracking
      if (envelopeKey === 'createSurface') {
        createdSurfaces.add(surfaceId);
        createSurfaceSpans.set(surfaceId, { from, to });
      } else {
        // Check if surface was created before this reference
        if (!createdSurfaces.has(surfaceId)) {
          referencedBeforeCreation.push({ surfaceId, from, to });
        }
      }

      // 7. Track root components
      if (envelopeKey === 'updateComponents') {
        const components = bodyObj.components;
        if (Array.isArray(components)) {
          for (const comp of components) {
            if (
              comp !== null &&
              typeof comp === 'object' &&
              'id' in comp &&
              (comp as Record<string, unknown>).id === 'root'
            ) {
              surfacesWithRoot.add(surfaceId);
            }
          }
        }
      }
    }
  }

  // ── Cross-envelope diagnostics ──

  // Warn about surfaces referenced before creation
  for (const ref of referencedBeforeCreation) {
    // Only warn if the surface was never created anywhere in the document
    if (!createdSurfaces.has(ref.surfaceId)) {
      diagnostics.push({
        from: ref.from,
        to: ref.to,
        severity: 'warning',
        message: `Surface "${ref.surfaceId}" is used before a "createSurface" message`,
      });
    }
  }

  // Warn about surfaces with createSurface but no root component
  for (const surfaceId of createdSurfaces) {
    if (!surfacesWithRoot.has(surfaceId)) {
      const span = createSurfaceSpans.get(surfaceId);
      if (span) {
        diagnostics.push({
          from: span.from,
          to: span.to,
          severity: 'warning',
          message: `Surface "${surfaceId}" has no component with id "root"`,
        });
      }
    }
  }

  return diagnostics;
}
