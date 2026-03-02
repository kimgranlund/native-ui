import type { Signal } from '../reactivity/types.ts';

export function createDisabledEffect(
  el: HTMLElement,
  disabled: Signal<boolean>,
  _internals?: ElementInternals,
  options?: { manageTabindex?: boolean },
): () => void {
  let prev: boolean | undefined;

  return () => {
    const val = disabled.value;
    el.toggleAttribute('disabled', val);
    // WHY: setAttribute (not internals.ariaDisabled) so CSS [aria-disabled] selectors match
    if (val) {
      el.setAttribute('aria-disabled', 'true');
    } else {
      el.removeAttribute('aria-disabled');
    }

    if (options?.manageTabindex) {
      el.setAttribute('tabindex', val ? '-1' : '0');
    }

    if (prev !== undefined && prev !== val) {
      el.dispatchEvent(new CustomEvent('native:disabled', {
        bubbles: true,
        composed: true,
        detail: { disabled: val },
      }));
    }
    prev = val;
  };
}
