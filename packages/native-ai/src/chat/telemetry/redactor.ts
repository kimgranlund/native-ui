import type { TelemetryEvent, TelemetryLevel, TelemetryRedactor } from './types.ts';
import { SENSITIVE_FIELDS } from './events.ts';

// ── PII Patterns ──

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
const CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

/**
 * Scrub common PII patterns from a string.
 *
 * Replaces email addresses, phone-like numbers, and credit-card-like
 * number sequences with `[redacted]` placeholders.
 */
export function scrubPII(text: string): string {
  return text
    .replace(EMAIL_PATTERN, '[redacted:email]')
    .replace(CARD_PATTERN, '[redacted:card]')
    .replace(PHONE_PATTERN, '[redacted:phone]');
}

// ── Set for O(1) sensitive-field lookup ──

const sensitiveSet = new Set<string>(SENSITIVE_FIELDS);

/**
 * Create a default redactor for the given telemetry level.
 *
 * - **minimal**: Sensitive fields in `detail` are replaced with
 *   `[redacted:Nchars]` indicating the original length.
 * - **debug**: All fields pass through unmodified.
 */
export function createDefaultRedactor(level: TelemetryLevel): TelemetryRedactor {
  if (level === 'debug') {
    return (event: TelemetryEvent) => event;
  }

  return (event: TelemetryEvent): TelemetryEvent => {
    if (!event.detail) return event;

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.detail)) {
      if (sensitiveSet.has(key) && typeof value === 'string') {
        redacted[key] = `[redacted:${value.length}chars]`;
      } else {
        redacted[key] = value;
      }
    }

    return { ...event, detail: redacted };
  };
}
