/**
 * A2UI JSONL Diagnostics — CodeMirror Lint Source
 *
 * Validates A2UI JSONL content line-by-line and cross-line.
 * Returns CodeMirror Diagnostic objects for inline error/warning display.
 *
 * Checks performed:
 * 1. JSON syntax — each non-empty line must be valid JSON
 * 2. Envelope key — must be a known A2UI message type
 * 3. Surface ID — envelope body must contain surfaceId
 * 4. Version field — warning if missing
 * 5. Surface lifecycle — warns if a surfaceId is used before createSurface
 * 6. Root component — warns if no surface has a root component
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

// ── Lint Source ──

/**
 * CodeMirror lint source for A2UI JSONL content.
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
  const rawLines = text.split('\n');
  const diagnostics: Diagnostic[] = [];

  // Track surface lifecycle across lines
  const createdSurfaces = new Set<string>();
  // Track which surfaces have a root component
  const surfacesWithRoot = new Set<string>();
  // Track surfaces referenced before creation (for cross-line warnings)
  const referencedBeforeCreation: Array<{
    surfaceId: string;
    line: number;
    from: number;
    to: number;
  }> = [];

  let offset = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lineFrom = offset;
    const lineTo = offset + line.length;

    offset = lineTo + 1; // +1 for the newline character

    // Skip empty/whitespace-only lines
    const trimmed = line.trim();
    if (trimmed === '') continue;

    // 1. JSON syntax check
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof SyntaxError
        ? `Invalid JSON: ${err.message}`
        : 'Invalid JSON';
      diagnostics.push({
        from: lineFrom,
        to: lineTo,
        severity: 'error',
        message,
      });
      continue;
    }

    // Ensure it's an object
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      diagnostics.push({
        from: lineFrom,
        to: lineTo,
        severity: 'error',
        message: 'A2UI envelope must be a JSON object',
      });
      continue;
    }

    // 2. Find the envelope key
    const keys = Object.keys(parsed);
    const envelopeKey = keys.find((k) => KNOWN_ENVELOPE_KEYS.has(k));
    const unknownKeys = keys.filter(
      (k) => !KNOWN_ENVELOPE_KEYS.has(k) && k !== 'version',
    );

    if (!envelopeKey && unknownKeys.length > 0) {
      diagnostics.push({
        from: lineFrom,
        to: lineTo,
        severity: 'error',
        message: `Unknown envelope key: "${unknownKeys[0]}". Expected one of: ${[...KNOWN_ENVELOPE_KEYS].join(', ')}`,
      });
      continue;
    }

    if (!envelopeKey) {
      diagnostics.push({
        from: lineFrom,
        to: lineTo,
        severity: 'error',
        message: `Missing envelope key. Expected one of: ${[...KNOWN_ENVELOPE_KEYS].join(', ')}`,
      });
      continue;
    }

    // 3. Version field — warning if missing
    if (!('version' in parsed)) {
      diagnostics.push({
        from: lineFrom,
        to: lineTo,
        severity: 'warning',
        message: 'Missing "version" field in envelope',
      });
    }

    // 4. Extract the envelope body and check for surfaceId
    const body = parsed[envelopeKey];

    // requestCatalog may have optional surfaceId, so skip the surfaceId check for it
    if (envelopeKey !== 'requestCatalog') {
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        diagnostics.push({
          from: lineFrom,
          to: lineTo,
          severity: 'error',
          message: `"${envelopeKey}" body must be an object`,
        });
        continue;
      }

      const bodyObj = body as Record<string, unknown>;
      if (!('surfaceId' in bodyObj) || typeof bodyObj.surfaceId !== 'string') {
        diagnostics.push({
          from: lineFrom,
          to: lineTo,
          severity: 'error',
          message: `Missing "surfaceId" in "${envelopeKey}" body`,
        });
        continue;
      }

      const surfaceId = bodyObj.surfaceId as string;

      // 5. Surface lifecycle tracking
      if (envelopeKey === 'createSurface') {
        createdSurfaces.add(surfaceId);
      } else {
        // Check if surface was created before this reference
        if (!createdSurfaces.has(surfaceId)) {
          referencedBeforeCreation.push({
            surfaceId,
            line: i,
            from: lineFrom,
            to: lineTo,
          });
        }
      }

      // 6. Track root components
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

  // ── Cross-line diagnostics ──

  // Warn about surfaces referenced before creation
  for (const ref of referencedBeforeCreation) {
    // Only warn if the surface was never created anywhere in the document
    // (if it was created later, the protocol allows it but it's unusual)
    if (!createdSurfaces.has(ref.surfaceId)) {
      diagnostics.push({
        from: ref.from,
        to: ref.to,
        severity: 'warning',
        message: `Surface "${ref.surfaceId}" is used before a "createSurface" message`,
      });
    }
  }

  // Warn about surfaces with updateComponents but no root component
  for (const surfaceId of createdSurfaces) {
    if (!surfacesWithRoot.has(surfaceId)) {
      // Find the createSurface line for this surface to attach the warning
      const createLineInfo = findEnvelopeLine(
        rawLines,
        'createSurface',
        surfaceId,
      );
      if (createLineInfo) {
        diagnostics.push({
          from: createLineInfo.from,
          to: createLineInfo.to,
          severity: 'warning',
          message: `Surface "${surfaceId}" has no component with id "root"`,
        });
      }
    }
  }

  return diagnostics;
}

// ── Helpers ──

/**
 * Find the line offset range for a specific envelope key + surfaceId.
 */
function findEnvelopeLine(
  rawLines: string[],
  envelopeKey: string,
  surfaceId: string,
): { from: number; to: number } | null {
  let offset = 0;
  for (const line of rawLines) {
    const from = offset;
    const to = offset + line.length;
    offset = to + 1;

    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (envelopeKey in parsed) {
        const body = parsed[envelopeKey];
        if (
          body !== null &&
          typeof body === 'object' &&
          !Array.isArray(body) &&
          (body as Record<string, unknown>).surfaceId === surfaceId
        ) {
          return { from, to };
        }
      }
    } catch {
      // Skip lines that aren't valid JSON
    }
  }
  return null;
}
