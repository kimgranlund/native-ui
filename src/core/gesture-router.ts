/**
 * GestureRouter — Central arbiter for pointer-based gesture conflicts.
 *
 * When multiple gesture controllers (drag, range-select, swipe) are active on
 * the same or overlapping elements, the router ensures only one "wins" per
 * pointer sequence (pointerdown → pointermove → pointerup).
 *
 * Controllers register as participants. On pointerdown, the router queries
 * participants in priority order. The first to return 'claim' wins; others
 * are told to stand down.
 */

export interface GestureParticipant {
  /** Unique identifier for this participant instance. */
  readonly id: string;
  /** Lower number = higher priority. Drag=10, RangeSelect=20, Swipe=30. */
  readonly priority: number;
  /** The element this participant manages. */
  readonly host: HTMLElement;
  /**
   * Called by the router on pointerdown. Return 'claim' to own the gesture
   * or 'pass' to decline.
   */
  onGestureStart(e: PointerEvent): 'claim' | 'pass';
  /** Called when another participant claims the gesture. */
  onGestureCancel?(): void;
}

export class GestureRouter {
  readonly #participants = new Set<GestureParticipant>();
  #activeParticipant: GestureParticipant | null = null;
  #listening = false;

  register(participant: GestureParticipant): void {
    this.#participants.add(participant);
    this.#attachListener();
  }

  unregister(participant: GestureParticipant): void {
    this.#participants.delete(participant);
    if (this.#activeParticipant === participant) {
      this.#activeParticipant = null;
    }
    if (this.#participants.size === 0) {
      this.#detachListener();
    }
  }

  /** Release the current claim (e.g. on pointerup). */
  release(): void {
    this.#activeParticipant = null;
  }

  /** Get the currently active (claiming) participant, if any. */
  get activeParticipant(): GestureParticipant | null {
    return this.#activeParticipant;
  }

  #onPointerDown = (e: PointerEvent): void => {
    // Already claimed — ignore additional pointers
    if (this.#activeParticipant) return;

    // Find participants whose host contains or is the event target
    const target = e.target as Node;
    const candidates: GestureParticipant[] = [];

    for (const p of this.#participants) {
      if (p.host.contains(target)) {
        candidates.push(p);
      }
    }

    if (candidates.length === 0) return;

    // Sort by priority (ascending = higher priority first)
    candidates.sort((a, b) => a.priority - b.priority);

    // Query each candidate in priority order
    for (const candidate of candidates) {
      const result = candidate.onGestureStart(e);
      if (result === 'claim') {
        this.#activeParticipant = candidate;
        // Notify other candidates that they lost
        for (const other of candidates) {
          if (other !== candidate) other.onGestureCancel?.();
        }
        return;
      }
    }
  };

  #onPointerUp = (): void => {
    this.release();
  };

  #attachListener(): void {
    if (this.#listening) return;
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('pointerup', this.#onPointerUp, true);
    document.addEventListener('pointercancel', this.#onPointerUp, true);
    this.#listening = true;
  }

  #detachListener(): void {
    if (!this.#listening) return;
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    document.removeEventListener('pointerup', this.#onPointerUp, true);
    document.removeEventListener('pointercancel', this.#onPointerUp, true);
    this.#listening = false;
  }
}
