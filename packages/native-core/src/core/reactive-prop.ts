import { signal } from '../reactivity/signal.ts';
import type { Signal } from '../reactivity/types.ts';

// ── Types ──

interface BooleanPropConfig {
  type: 'boolean';
  attribute?: string;
}

interface NumberPropConfig {
  type: 'number';
  attribute?: string;
  initial?: number;
}

interface StringPropConfig {
  type: 'string';
  attribute?: string;
  initial?: string;
}

type PropConfig = BooleanPropConfig | NumberPropConfig | StringPropConfig;

/**
 * A reactive property backed by a signal, with attribute parsing and reflection.
 *
 * Eliminates the 4-part signal/getter/setter/attributeChangedCallback pattern:
 *
 * ```ts
 * // Before: ~10 lines per property
 * #disabled = signal(false);
 * get disabled() { return this.#disabled.value; }
 * set disabled(val) { this.#disabled.value = val; this.toggleAttribute('disabled', val); }
 * // + attributeChangedCallback case
 *
 * // After: 1 line declaration + auto-handled attribute sync
 * #disabled = prop(this, 'disabled', { type: 'boolean' });
 * get disabled() { return this.#disabled.value; }
 * set disabled(val) { this.#disabled.set(val); }
 * ```
 */
export interface ReactiveProp<T> {
  /** The underlying signal. */
  readonly signal: Signal<T>;
  /** Read the current value (tracks in effects). */
  readonly value: T;
  /** Update value and reflect to attribute. */
  set(val: T): void;
  /** Parse an attribute value and update the signal (for attributeChangedCallback). */
  fromAttribute(val: string | null): void;
}

// ── Factory ──

export function prop(el: HTMLElement, attribute: string, config: BooleanPropConfig): ReactiveProp<boolean>;
export function prop(el: HTMLElement, attribute: string, config: NumberPropConfig): ReactiveProp<number>;
export function prop(el: HTMLElement, attribute: string, config: StringPropConfig): ReactiveProp<string>;
export function prop(el: HTMLElement, attribute: string, config: PropConfig): ReactiveProp<boolean | number | string> {
  const attr = config.attribute ?? attribute;

  if (config.type === 'boolean') {
    const s = signal(false);
    return {
      get signal() { return s; },
      get value() { return s.value; },
      set(val: boolean) {
        s.value = val;
        el.toggleAttribute(attr, val);
      },
      fromAttribute(val: string | null) {
        s.value = val !== null;
      },
    };
  }

  if (config.type === 'number') {
    const initial = config.initial ?? 0;
    const s = signal(initial);
    return {
      get signal() { return s; },
      get value() { return s.value; },
      set(val: number) {
        s.value = val;
        el.setAttribute(attr, String(val));
      },
      fromAttribute(val: string | null) {
        s.value = parseFloat(val ?? String(initial)) || initial;
      },
    };
  }

  // string
  const initial = config.initial ?? '';
  const s = signal(initial);
  return {
    get signal() { return s; },
    get value() { return s.value; },
    set(val: string) {
      s.value = val;
      if (val) {
        if (el.getAttribute(attr) !== val) el.setAttribute(attr, val);
      } else {
        el.removeAttribute(attr);
      }
    },
    fromAttribute(val: string | null) {
      s.value = val ?? initial;
    },
  };
}

// ── Attribute dispatch helper ──

/**
 * Dispatches an attribute change to the matching reactive prop.
 * Returns true if handled, false if no matching prop was found.
 *
 * ```ts
 * attributeChangedCallback(name, old, val) {
 *   if (old === val) return;
 *   if (syncProp(this.#props, name, val)) return;
 *   // handle non-prop attributes...
 *   super.attributeChangedCallback?.(name, old, val);
 * }
 * ```
 */
export function syncProp(
  props: Record<string, ReactiveProp<boolean | number | string>>,
  name: string,
  val: string | null,
): boolean {
  const p = props[name];
  if (!p) return false;
  p.fromAttribute(val);
  return true;
}
