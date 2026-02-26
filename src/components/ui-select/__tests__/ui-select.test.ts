// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-select.ts';
import '../../ui-button/ui-button.ts';
import '../../ui-listbox/ui-listbox.ts';
import '../../ui-listbox/ui-option.ts';
import { SelectController } from '../select-controller.ts';

// ── SelectController standalone tests ──

describe('SelectController', () => {
  it('defaults to closed, null value, empty label', () => {
    const ctrl = new SelectController();
    expect(ctrl.open.value).toBe(false);
    expect(ctrl.value.value).toBeNull();
    expect(ctrl.label.value).toBe('');
  });

  it('toggle flips open state', () => {
    const ctrl = new SelectController();
    ctrl.toggle();
    expect(ctrl.open.value).toBe(true);
    ctrl.toggle();
    expect(ctrl.open.value).toBe(false);
  });

  it('show and hide', () => {
    const ctrl = new SelectController();
    ctrl.show();
    expect(ctrl.open.value).toBe(true);
    ctrl.hide();
    expect(ctrl.open.value).toBe(false);
  });

  it('select sets value, label, and closes', () => {
    const ctrl = new SelectController();
    ctrl.show();
    ctrl.select('us', 'United States');
    expect(ctrl.value.value).toBe('us');
    expect(ctrl.label.value).toBe('United States');
    expect(ctrl.open.value).toBe(false);
  });

  it('reset clears value, label, and closes', () => {
    const ctrl = new SelectController();
    ctrl.select('us', 'United States');
    ctrl.reset();
    expect(ctrl.value.value).toBeNull();
    expect(ctrl.label.value).toBe('');
    expect(ctrl.open.value).toBe(false);
  });
});

// ── Element tests ──

function createManual(opts: { value?: string; disabled?: boolean } = {}): HTMLElement {
  const el = document.createElement('ui-select');
  if (opts.disabled) el.setAttribute('disabled', '');
  if (opts.value) el.setAttribute('value', opts.value);

  // Manual mode: author writes children
  const button = document.createElement('ui-button');
  button.setAttribute('justify', 'spread');
  const labelSpan = document.createElement('span');
  labelSpan.setAttribute('slot', 'label');
  labelSpan.textContent = 'Pick';
  button.appendChild(labelSpan);
  el.appendChild(button);

  const listbox = document.createElement('ui-listbox');
  listbox.setAttribute('popover', 'manual');

  const opt1 = document.createElement('ui-option');
  opt1.setAttribute('value', 'us');
  opt1.textContent = 'United States';
  listbox.appendChild(opt1);

  const opt2 = document.createElement('ui-option');
  opt2.setAttribute('value', 'gb');
  opt2.textContent = 'United Kingdom';
  listbox.appendChild(opt2);

  const opt3 = document.createElement('ui-option');
  opt3.setAttribute('value', 'de');
  opt3.setAttribute('disabled', '');
  opt3.textContent = 'Germany';
  listbox.appendChild(opt3);

  el.appendChild(listbox);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('ui-select', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-select')).toBeDefined();
  });

  it('starts with null value', () => {
    const el = createManual();
    expect((el as any).value).toBeNull();
  });

  it('trigger has aria-haspopup="listbox" and aria-expanded="false" initially', () => {
    const el = createManual();
    const trigger = el.querySelector('ui-button')!;
    // ARIA: trigger button announces listbox popup
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    // ARIA: starts closed
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets value from attribute on setup', () => {
    const el = createManual({ value: 'us' });
    expect((el as any).value).toBe('us');
  });

  it('disabled property toggles attribute', () => {
    const el = createManual();
    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled select sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
    // ARIA: disabled cascades to trigger button
    const trigger = el.querySelector('ui-button')!;
    expect(trigger.hasAttribute('disabled')).toBe(true);
    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('name property reflects to attribute', () => {
    const el = createManual();
    (el as any).name = 'country';
    expect(el.getAttribute('name')).toBe('country');
  });

  it('placeholder property reflects to attribute', () => {
    const el = createManual();
    (el as any).placeholder = 'Select a country';
    expect(el.getAttribute('placeholder')).toBe('Select a country');
  });

  it('controller is accessible', () => {
    const el = createManual();
    expect((el as any).controller).toBeDefined();
    expect((el as any).controller.open).toBeDefined();
  });

  it('dispatches ui-change when option selected via ui-select event', () => {
    const el = createManual();
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    // Simulate option click dispatching ui-select
    const opt = el.querySelector('ui-option[value="us"]')!;
    opt.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'us', label: 'United States' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('us');
  });

  it('updates value on option selection', () => {
    const el = createManual();
    const opt = el.querySelector('ui-option[value="gb"]')!;
    opt.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'gb', label: 'United Kingdom' },
    }));

    expect((el as any).value).toBe('gb');
    // ARIA: selected option has aria-selected="true", others "false"
    expect(opt.getAttribute('aria-selected')).toBe('true');
    const otherOpt = el.querySelector('ui-option[value="us"]')!;
    expect(otherOpt.getAttribute('aria-selected')).toBe('false');
  });

  it('stops internal ui-change from listbox', () => {
    const el = createManual();
    const externalHandler = vi.fn();
    // Add external listener AFTER setup (which adds the stop listener)
    el.addEventListener('ui-change', externalHandler);

    // Simulate a ui-change from the listbox (target !== el)
    const listbox = el.querySelector('ui-listbox')!;
    const internalEvent = new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { value: 'us', label: 'United States' },
    });
    listbox.dispatchEvent(internalEvent);

    // Should be stopped by stopImmediatePropagation
    expect(externalHandler).not.toHaveBeenCalled();
  });

  it('value setter updates controller', () => {
    const el = createManual();
    (el as any).value = 'us';
    expect((el as any).value).toBe('us');
  });

  it('value setter with null resets', () => {
    const el = createManual();
    (el as any).value = 'us';
    (el as any).value = null;
    expect((el as any).value).toBeNull();
  });

  it('reflects value to attribute', () => {
    const el = createManual();
    const opt = el.querySelector('ui-option[value="us"]')!;
    opt.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'us', label: 'United States' },
    }));

    expect(el.getAttribute('value')).toBe('us');
  });

  it('formResetCallback resets value', () => {
    const el = createManual();
    (el as any).value = 'us';
    (el as any).formResetCallback();
    expect((el as any).value).toBeNull();
  });
});

// ── Data-driven mode tests ──

function createDataDriven(opts: { placeholder?: string; options?: string } = {}): HTMLElement {
  const el = document.createElement('ui-select');
  el.setAttribute('placeholder', opts.placeholder ?? 'Pick a country');
  el.setAttribute('options', opts.options ?? JSON.stringify([
    { value: 'us', label: 'United States' },
    { value: 'gb', label: 'United Kingdom' },
    { value: 'de', label: 'Germany' },
  ]));
  document.body.appendChild(el);
  return el;
}

describe('ui-select data-driven mode', () => {
  it('stamps trigger button and listbox', () => {
    const el = createDataDriven();
    const button = el.querySelector('ui-button');
    const listbox = el.querySelector('ui-listbox');
    expect(button).not.toBeNull();
    expect(listbox).not.toBeNull();
  });

  it('stamps options from JSON attribute', () => {
    const el = createDataDriven();
    const options = el.querySelectorAll('ui-option');
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute('value')).toBe('us');
    expect(options[0].textContent).toBe('United States');
  });

  it('sets placeholder on trigger label', () => {
    const el = createDataDriven({ placeholder: 'Choose...' });
    const labelEl = el.querySelector('[slot="label"]');
    expect(labelEl?.textContent).toBe('Choose...');
  });

  it('adds justify="spread" on trigger button', () => {
    const el = createDataDriven();
    const button = el.querySelector('ui-button');
    expect(button?.getAttribute('justify')).toBe('spread');
  });

  it('options property setter updates attribute and re-renders', () => {
    const el = createDataDriven();
    (el as any).options = [
      { value: 'fr', label: 'France' },
      { value: 'it', label: 'Italy' },
    ];

    const options = el.querySelectorAll('ui-option');
    expect(options).toHaveLength(2);
    expect(options[0].getAttribute('value')).toBe('fr');
  });

  it('handles invalid JSON gracefully', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createDataDriven({ options: 'not-json' });
    const options = el.querySelectorAll('ui-option');
    expect(options).toHaveLength(0);
    spy.mockRestore();
  });

  it('filters out invalid option objects', () => {
    const el = createDataDriven({
      options: JSON.stringify([
        { value: 'us', label: 'United States' },
        { value: 123, label: 'Bad' },
        'not-an-object',
        null,
      ]),
    });
    const options = el.querySelectorAll('ui-option');
    expect(options).toHaveLength(1);
  });
});
