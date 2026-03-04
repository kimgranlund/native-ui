import type {
  TelemetryCorrelation,
  TelemetryEvent,
  TelemetryLevel,
  TelemetryRedactor,
} from './types.ts';
import { CHAT_EVENTS } from './events.ts';
import { createDefaultRedactor } from './redactor.ts';

/**
 * Dispatches telemetry events as `CustomEvent` instances on a given
 * `EventTarget`, applying a configurable redactor before emission.
 */
export class TelemetryEmitter {
  #target: EventTarget;
  #redactor: TelemetryRedactor;

  constructor(target: EventTarget, level: TelemetryLevel = 'minimal') {
    this.#target = target;
    this.#redactor = createDefaultRedactor(level);
  }

  /** Change the telemetry level, replacing the redactor. */
  setLevel(level: TelemetryLevel): void {
    this.#redactor = createDefaultRedactor(level);
  }

  /** Replace the redactor with a custom implementation. */
  setRedactor(fn: TelemetryRedactor): void {
    this.#redactor = fn;
  }

  /** Apply the redactor and dispatch the event on the target. */
  emit(event: TelemetryEvent): void {
    const redacted = this.#redactor(event);
    this.#target.dispatchEvent(
      new CustomEvent(redacted.type, { detail: redacted, bubbles: true }),
    );
  }

  // ── Convenience Methods ──

  emitTransport(
    correlation: TelemetryCorrelation,
    mode: string,
    contentType: string,
  ): void {
    this.emit({
      type: CHAT_EVENTS.TRANSPORT,
      correlation,
      detail: { mode, contentType },
    });
  }

  emitGenerationStart(correlation: TelemetryCorrelation): void {
    this.emit({
      type: CHAT_EVENTS.GENERATION_START,
      correlation,
      timing: { startedAt: Date.now() },
    });
  }

  emitGenerationComplete(
    correlation: TelemetryCorrelation,
    durationMs: number,
  ): void {
    this.emit({
      type: CHAT_EVENTS.GENERATION_COMPLETE,
      correlation,
      timing: { completedAt: Date.now(), durationMs },
    });
  }

  emitWarning(
    correlation: TelemetryCorrelation,
    message: string,
    detail?: Record<string, unknown>,
  ): void {
    this.emit({
      type: CHAT_EVENTS.WARNING,
      correlation,
      detail: { message, ...detail },
    });
  }
}
