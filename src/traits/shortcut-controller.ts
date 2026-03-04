// ── Platform detection ──

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

// ── Types ──

export interface ShortcutBinding {
  /** Unique identifier for the shortcut. */
  id: string;
  /** Combo string, e.g. "mod+k", "escape", "shift+?". `mod` = meta on Mac, ctrl otherwise. */
  combo: string;
  /** Direct callback (optional — also fires `native:shortcut` event). */
  handler?: (e: KeyboardEvent) => void;
  /** Conditional guard — skip this binding if returns false. */
  when?: () => boolean;
  /** Prevent default browser action on match. Default true. */
  preventDefault?: boolean;
  /** Stop event propagation on match. Default false. */
  stopPropagation?: boolean;
  /** Allow firing inside inputs, textareas, and contenteditable. Default false. */
  allowEditable?: boolean;
}

export interface ShortcutOptions {
  /** Initial shortcut bindings. */
  shortcuts?: ShortcutBinding[];
  /** Listen on document (capture phase) instead of host. Default false. */
  global?: boolean;
}

// ── Internal types ──

interface ParsedCombo {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

interface BindingEntry {
  binding: ShortcutBinding;
  parsed: ParsedCombo;
}

// ── Utilities ──

/** Parse a combo string into key + modifier booleans. */
export function parseCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop()!;
  const mods = new Set(parts);
  return {
    key,
    ctrl: mods.has('ctrl') || (mods.has('mod') && !IS_MAC),
    meta: mods.has('meta') || (mods.has('mod') && IS_MAC),
    shift: mods.has('shift'),
    alt: mods.has('alt'),
  };
}

function matchesCombo(e: KeyboardEvent, parsed: ParsedCombo): boolean {
  if (e.key.toLowerCase() !== parsed.key) return false;
  if (e.ctrlKey !== parsed.ctrl) return false;
  if (e.metaKey !== parsed.meta) return false;
  if (e.shiftKey !== parsed.shift) return false;
  if (e.altKey !== parsed.alt) return false;
  return true;
}

import { isTypingContext } from './typing-context.ts';


// ── Controller ──

/**
 * Keyboard shortcut controller.
 *
 * Registers keyboard shortcuts on a host element (or globally on `document`).
 * Fires `native:shortcut` event on the host with `{ id, combo }` detail.
 *
 * ```ts
 * const ctrl = new ShortcutController(host, {
 *   shortcuts: [
 *     { id: 'search', combo: 'mod+k', handler: () => openSearch() },
 *     { id: 'help', combo: 'shift+?', handler: () => showHelp() },
 *   ],
 *   global: true,
 * });
 * ```
 */
export class ShortcutController {
  readonly host: HTMLElement;
  readonly global: boolean;

  #bindings: BindingEntry[] = [];
  #attached = false;

  constructor(host: HTMLElement, options: ShortcutOptions = {}) {
    this.host = host;
    this.global = options.global ?? false;

    if (options.shortcuts) {
      for (const binding of options.shortcuts) {
        this.#bindings.push({ binding, parsed: parseCombo(binding.combo) });
      }
    }

    this.#attach();
  }

  /** Add a shortcut binding at runtime. */
  add(binding: ShortcutBinding): void {
    this.#bindings.push({ binding, parsed: parseCombo(binding.combo) });
    this.#attach();
  }

  /** Remove a shortcut binding by id. */
  remove(id: string): void {
    this.#bindings = this.#bindings.filter((e) => e.binding.id !== id);
    if (this.#bindings.length === 0) this.#detach();
  }

  /** Remove all bindings and detach listeners. */
  destroy(): void {
    this.#bindings = [];
    this.#detach();
  }

  // ── Private ──

  #attach(): void {
    if (this.#attached) return;
    if (this.#bindings.length === 0) return;
    this.#attached = true;

    const target = this.global ? document : this.host;
    target.addEventListener('keydown', this.#onKeyDown as EventListener, this.global);
  }

  #detach(): void {
    if (!this.#attached) return;
    this.#attached = false;

    const target = this.global ? document : this.host;
    target.removeEventListener('keydown', this.#onKeyDown as EventListener, this.global);
  }

  #onKeyDown = (e: KeyboardEvent): void => {
    for (const entry of this.#bindings) {
      const { binding, parsed } = entry;

      // Editable filtering — skip if target is an input/textarea/contenteditable.
      // Uses composedPath() to handle shadow DOM retargeting.
      if (!binding.allowEditable && isTypingContext(e)) continue;

      // Conditional guard
      if (binding.when && !binding.when()) continue;

      // Key matching
      if (!matchesCombo(e, parsed)) continue;

      // Match found
      if (binding.preventDefault !== false) e.preventDefault();
      if (binding.stopPropagation) e.stopPropagation();

      this.host.dispatchEvent(new CustomEvent('native:shortcut', {
        bubbles: true,
        composed: true,
        detail: { id: binding.id, combo: binding.combo },
      }));

      binding.handler?.(e);
      return; // first match wins
    }
  };
}
