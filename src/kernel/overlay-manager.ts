import { signal } from '@nonoun/native-core';
import { computed } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';
import type { Signal, ReadonlySignal } from '@nonoun/native-core';
import type { OverlayType, OverlayEntry } from './types.ts';

let Z_INDEX = 1000;
const Z_STEP = 10;

export interface OverlayHandle {
  readonly id: string;
  readonly closed: Promise<void>;
}

export class OverlayManager {
  #stack: Signal<OverlayEntry[]> = signal([]);
  #listenersAttached = false;
  #closeResolvers = new Map<string, () => void>();

  readonly stack: ReadonlySignal<readonly OverlayEntry[]> = computed(() => this.#stack.value);
  readonly topOverlay: ReadonlySignal<OverlayEntry | null> = computed(() => {
    const s = this.#stack.value;
    return s.length > 0 ? s[s.length - 1]! : null;
  });

  open(opts: { type: OverlayType; element: HTMLElement; owner?: HTMLElement }): OverlayHandle {
    const id = uid('overlay');
    const zIndex = this.getNextZIndex();
    const entry: OverlayEntry = Object.freeze({
      id,
      type: opts.type,
      element: opts.element,
      zIndex,
      ...(opts.owner ? { owner: opts.owner } : {}),
    });

    const closed = new Promise<void>(resolve => {
      this.#closeResolvers.set(id, resolve);
    });

    this.#stack.value = [...this.#stack.value, entry];
    this.#attachGlobalListeners();
    return { id, closed };
  }

  close(id: string): void {
    const stack = this.#stack.value;
    const idx = stack.findIndex((e) => e.id === id);
    if (idx === -1) return;
    this.#stack.value = [...stack.slice(0, idx), ...stack.slice(idx + 1)];
    this.#resolveClose(id);
    this.#maybeDetachGlobalListeners();
  }

  closeAll(): void {
    const ids = this.#stack.value.map(e => e.id);
    this.#stack.value = [];
    for (const id of ids) this.#resolveClose(id);
    this.#maybeDetachGlobalListeners();
  }

  closeType(type: OverlayType): void {
    const closing = this.#stack.value.filter(e => e.type === type);
    this.#stack.value = this.#stack.value.filter((e) => e.type !== type);
    for (const entry of closing) this.#resolveClose(entry.id);
    this.#maybeDetachGlobalListeners();
  }

  #resolveClose(id: string): void {
    const resolve = this.#closeResolvers.get(id);
    if (resolve) {
      resolve();
      this.#closeResolvers.delete(id);
    }
  }

  isOpen(id: string): boolean {
    return this.#stack.value.some((e) => e.id === id);
  }

  getEntry(id: string): OverlayEntry | null {
    return this.#stack.value.find((e) => e.id === id) ?? null;
  }

  getNextZIndex(): number {
    Z_INDEX += Z_STEP;
    return Z_INDEX;
  }

  destroy(): void {
    const ids = this.#stack.value.map(e => e.id);
    this.#stack.value = [];
    for (const id of ids) this.#resolveClose(id);
    this.#detachGlobalListeners();
  }

  #attachGlobalListeners(): void {
    if (this.#listenersAttached) return;
    document.addEventListener('pointerdown', this.#onGlobalPointerDown, true);
    document.addEventListener('keydown', this.#onGlobalKeyDown);
    this.#listenersAttached = true;
  }

  #detachGlobalListeners(): void {
    if (!this.#listenersAttached) return;
    document.removeEventListener('pointerdown', this.#onGlobalPointerDown, true);
    document.removeEventListener('keydown', this.#onGlobalKeyDown);
    this.#listenersAttached = false;
  }

  #maybeDetachGlobalListeners(): void {
    if (this.#stack.value.length === 0) this.#detachGlobalListeners();
  }

  #onGlobalPointerDown = (e: PointerEvent): void => {
    const top = this.topOverlay.peek();
    if (!top) return;
    if (top.element.contains(e.target as Node)) return;
    // Also check if click is on the owner (trigger) element
    if (top.owner?.contains(e.target as Node)) return;
    this.close(top.id);
  };

  #onGlobalKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    const top = this.topOverlay.peek();
    if (!top) return;
    e.preventDefault();
    this.close(top.id);
  };
}

export function createOverlayManager(): OverlayManager {
  return new OverlayManager();
}
