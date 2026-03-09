// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { FocusTrapController } from './focus-trap-controller.ts';
import { define } from '../../core/define.ts';

class FocusTrapTestEl extends NativeElement {
  #trap: FocusTrapController | null = null;
  setup() { super.setup(); this.#trap = new FocusTrapController(this); }
  teardown() { this.disableFocusTrap(); this.#trap = null; super.teardown(); }

  enableFocusTrap(): void {
    this.#trap?.enable();
  }

  disableFocusTrap(): void {
    this.#trap?.disable();
  }
}

if (!customElements.get('focus-trap-test')) {
  define('focus-trap-test', FocusTrapTestEl);
}

function create(children: string[] = ['button', 'input', 'button']): FocusTrapTestEl {
  const el = document.createElement('focus-trap-test') as FocusTrapTestEl;
  for (const tag of children) {
    el.appendChild(document.createElement(tag));
  }
  document.body.appendChild(el);
  return el;
}

function focusables(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('button, input, [tabindex]')];
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('FocusTrappable — enableFocusTrap', () => {
  it('focuses the first focusable child on enable', () => {
    const el = create();
    const first = focusables(el)[0];
    const spy = vi.spyOn(first, 'focus');
    el.enableFocusTrap();
    expect(spy).toHaveBeenCalled();
  });

  it('focuses [autofocus] child when present', () => {
    const el = create();
    const input = el.querySelector('input')!;
    input.setAttribute('autofocus', '');
    const spy = vi.spyOn(input, 'focus');
    el.enableFocusTrap();
    expect(spy).toHaveBeenCalled();
  });

  it('focuses self with tabindex=-1 when no focusable children', () => {
    const el = document.createElement('focus-trap-test') as FocusTrapTestEl;
    el.innerHTML = '<span>no focusables here</span>';
    document.body.appendChild(el);
    const spy = vi.spyOn(el, 'focus');
    el.enableFocusTrap();
    expect(el.getAttribute('tabindex')).toBe('-1');
    expect(spy).toHaveBeenCalled();
  });
});

describe('FocusTrappable — Tab trapping', () => {
  it('wraps Tab from last to first', () => {
    const el = create();
    el.enableFocusTrap();
    const items = focusables(el);
    const last = items[items.length - 1];
    const first = items[0];

    // Simulate focus on last element
    Object.defineProperty(document, 'activeElement', { value: last, configurable: true });
    const focusSpy = vi.spyOn(first, 'focus');
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.dispatchEvent(tabEvent);
    expect(focusSpy).toHaveBeenCalled();
    expect(tabEvent.defaultPrevented).toBe(true);

    // Restore
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('wraps Shift+Tab from first to last', () => {
    const el = create();
    el.enableFocusTrap();
    const items = focusables(el);
    const first = items[0];
    const last = items[items.length - 1];

    Object.defineProperty(document, 'activeElement', { value: first, configurable: true });
    const focusSpy = vi.spyOn(last, 'focus');
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    el.dispatchEvent(tabEvent);
    expect(focusSpy).toHaveBeenCalled();
    expect(tabEvent.defaultPrevented).toBe(true);

    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('does not prevent Tab when focus is in the middle', () => {
    const el = create();
    el.enableFocusTrap();
    const items = focusables(el);
    const middle = items[1];

    Object.defineProperty(document, 'activeElement', { value: middle, configurable: true });
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);

    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('ignores non-Tab keys', () => {
    const el = create();
    el.enableFocusTrap();
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(false);
  });
});

describe('FocusTrappable — disableFocusTrap', () => {
  it('restores previous focus on disable', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const el = create();
    // Mock document.activeElement to simulate the outside button being focused
    Object.defineProperty(document, 'activeElement', { value: outside, configurable: true });
    el.enableFocusTrap();
    const spy = vi.spyOn(outside, 'focus');
    el.disableFocusTrap();
    expect(spy).toHaveBeenCalled();
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('stops trapping after disable', () => {
    const el = create();
    el.enableFocusTrap();
    el.disableFocusTrap();
    const items = focusables(el);
    const last = items[items.length - 1];
    Object.defineProperty(document, 'activeElement', { value: last, configurable: true });
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.dispatchEvent(tabEvent);
    // Handler was removed — no wrapping, no preventDefault
    expect(tabEvent.defaultPrevented).toBe(false);
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });
});

describe('FocusTrappable — teardown', () => {
  it('calls disableFocusTrap on teardown', () => {
    const el = create();
    el.enableFocusTrap();
    const spy = vi.spyOn(el, 'disableFocusTrap');
    el.teardown();
    expect(spy).toHaveBeenCalled();
  });
});

describe('FocusTrappable — idempotency', () => {
  it('double enable does not throw', () => {
    const el = create();
    expect(() => {
      el.enableFocusTrap();
      el.enableFocusTrap();
    }).not.toThrow();
  });

  it('double disable does not throw', () => {
    const el = create();
    el.enableFocusTrap();
    expect(() => {
      el.disableFocusTrap();
      el.disableFocusTrap();
    }).not.toThrow();
  });
});

describe('FocusTrappable — tabindex elements', () => {
  it('traps focus on elements with tabindex=0', () => {
    const el = document.createElement('focus-trap-test') as FocusTrapTestEl;
    const div1 = document.createElement('div');
    div1.setAttribute('tabindex', '0');
    const div2 = document.createElement('div');
    div2.setAttribute('tabindex', '0');
    el.appendChild(div1);
    el.appendChild(div2);
    document.body.appendChild(el);

    el.enableFocusTrap();

    Object.defineProperty(document, 'activeElement', { value: div2, configurable: true });
    const focusSpy = vi.spyOn(div1, 'focus');
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.dispatchEvent(tabEvent);
    expect(focusSpy).toHaveBeenCalled();
    expect(tabEvent.defaultPrevented).toBe(true);
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });
});
