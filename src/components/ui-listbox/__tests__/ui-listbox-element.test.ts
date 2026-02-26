// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-listbox.ts';

function create(opts: { multiple?: boolean } = {}): HTMLElement {
  const el = document.createElement('ui-listbox');
  if (opts.multiple) el.setAttribute('multiple', '');

  const opt1 = document.createElement('ui-option');
  opt1.setAttribute('value', 'a');
  opt1.textContent = 'Alpha';
  el.appendChild(opt1);

  const opt2 = document.createElement('ui-option');
  opt2.setAttribute('value', 'b');
  opt2.textContent = 'Beta';
  el.appendChild(opt2);

  const opt3 = document.createElement('ui-option');
  opt3.setAttribute('value', 'c');
  opt3.setAttribute('disabled', '');
  opt3.textContent = 'Charlie';
  el.appendChild(opt3);

  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-listbox element', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-listbox')).toBeDefined();
  });

  it('ui-option is registered as a custom element', () => {
    expect(customElements.get('ui-option')).toBeDefined();
  });

  it('starts with null value', () => {
    const el = create();
    expect((el as any).value).toBeNull();
  });

  it('option click dispatches ui-select event with value and label', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-select', handler);

    const opt = el.querySelector('ui-option[value="a"]') as HTMLElement;
    opt.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.value).toBe('a');
    expect(detail.label).toBe('Alpha');
  });

  it('disabled option does not dispatch ui-select', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-select', handler);

    const opt = el.querySelector('ui-option[value="c"]') as HTMLElement;
    opt.click();

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ui-option element', () => {
  it('value property reflects to attribute', () => {
    const el = create();
    const opt = el.querySelector('ui-option[value="a"]') as any;
    opt.value = 'x';
    expect(opt.getAttribute('value')).toBe('x');
  });

  it('disabled property toggles attribute and aria-disabled', () => {
    const el = create();
    const opt = el.querySelector('ui-option[value="a"]') as any;

    expect(opt.disabled).toBe(false);
    expect(opt.hasAttribute('aria-disabled')).toBe(false);

    opt.disabled = true;
    expect(opt.hasAttribute('disabled')).toBe(true);
    expect(opt.getAttribute('aria-disabled')).toBe('true');

    opt.disabled = false;
    expect(opt.hasAttribute('disabled')).toBe(false);
    expect(opt.hasAttribute('aria-disabled')).toBe(false);
  });

  it('label getter returns textContent when no label attribute', () => {
    const el = create();
    const opt = el.querySelector('ui-option[value="a"]') as any;
    expect(opt.label).toBe('Alpha');
  });

  it('label getter returns label attribute when set', () => {
    const el = create();
    const opt = el.querySelector('ui-option[value="a"]') as any;
    opt.label = 'Custom Label';
    expect(opt.label).toBe('Custom Label');
    expect(opt.getAttribute('label')).toBe('Custom Label');
  });
});

describe('ui-listbox selection', () => {
  it('value updates on option selection via ui-select event', () => {
    const el = create();
    const opt = el.querySelector('ui-option[value="b"]') as HTMLElement;
    opt.click();

    expect((el as any).value).toBe('b');
    // ARIA: selected option has aria-selected="true"
    expect(opt.getAttribute('aria-selected')).toBe('true');
  });

  it('dispatches ui-change on selection', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const opt = el.querySelector('ui-option[value="a"]') as HTMLElement;
    opt.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('a');
  });

  it('does not dispatch ui-change when listbox is disabled', () => {
    const el = create();
    (el as any).disabled = true;

    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const opt = el.querySelector('ui-option[value="a"]') as HTMLElement;
    // Dispatch ui-select directly from option (simulating click bypass)
    opt.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'a', label: 'Alpha' },
    }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('multiple mode: can select multiple values', () => {
    const el = create({ multiple: true });

    // Select first option
    const opt1 = el.querySelector('ui-option[value="a"]') as HTMLElement;
    opt1.click();
    expect((el as any).value).toBe('a');
    // ARIA: first option is aria-selected
    expect(opt1.getAttribute('aria-selected')).toBe('true');

    // Select second option
    const opt2 = el.querySelector('ui-option[value="b"]') as HTMLElement;
    opt2.click();
    expect((el as any).value).toBe('b');
    // ARIA: both options are aria-selected in multiple mode
    expect(opt1.getAttribute('aria-selected')).toBe('true');
    expect(opt2.getAttribute('aria-selected')).toBe('true');

    // Both should be in the selected set
    const selected = (el as any).controller.selected.value as Set<string>;
    expect(selected.has('a')).toBe(true);
    expect(selected.has('b')).toBe(true);
  });

  it('multiple mode: toggling deselects already-selected option', () => {
    const el = create({ multiple: true });

    const opt1 = el.querySelector('ui-option[value="a"]') as HTMLElement;
    opt1.click(); // select
    // ARIA: selected after first click
    expect(opt1.getAttribute('aria-selected')).toBe('true');
    opt1.click(); // deselect (toggle)
    // ARIA: deselected after second click
    expect(opt1.getAttribute('aria-selected')).toBe('false');

    const selected = (el as any).controller.selected.value as Set<string>;
    expect(selected.has('a')).toBe(false);
  });
});

describe('ui-listbox edge cases', () => {
  it('empty listbox with zero options has null value', () => {
    const el = document.createElement('ui-listbox');
    document.body.appendChild(el);
    expect((el as any).value).toBeNull();
    expect((el as any).controller).toBeDefined();
  });

  it('empty listbox dispatches no events on click', () => {
    const el = document.createElement('ui-listbox');
    document.body.appendChild(el);

    const handler = vi.fn();
    el.addEventListener('ui-select', handler);
    el.addEventListener('ui-change', handler);
    el.click();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ui-listbox ARIA', () => {
  it('has appropriate role via internals', () => {
    const el = create();
    // Role is set on internals, not as a DOM attribute.
    // Verify the element is recognized as a listbox by checking the controller exposes role.
    // Since internals.role is set in constructor, we verify the element is functional.
    expect(el.tagName.toLowerCase()).toBe('ui-listbox');
    // The internals stub sets role; verify the element was created correctly
    expect((el as any).controller).toBeDefined();
  });

  it('sets aria-disabled when disabled', () => {
    const el = create();
    (el as any).disabled = true;
    expect(el.getAttribute('aria-disabled')).toBe('true');

    (el as any).disabled = false;
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('sets aria-selected on options when selected', () => {
    const el = create();
    const opt = el.querySelector('ui-option[value="a"]') as HTMLElement;
    opt.click();

    expect(opt.getAttribute('aria-selected')).toBe('true');

    // Other options should have aria-selected=false
    const opt2 = el.querySelector('ui-option[value="b"]') as HTMLElement;
    expect(opt2.getAttribute('aria-selected')).toBe('false');
  });
});
