// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-combobox.ts';
import '../../ui-input/ui-input.ts';
import '../../ui-listbox/ui-listbox.ts';
import '../../ui-listbox/ui-option.ts';
// ── Element tests ──

function create(opts: { value?: string; disabled?: boolean } = {}): HTMLElement {
  const el = document.createElement('ui-combobox');
  if (opts.disabled) el.setAttribute('disabled', '');
  if (opts.value) el.setAttribute('value', opts.value);

  const input = document.createElement('ui-input');
  el.appendChild(input);

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

  el.appendChild(listbox);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-combobox', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-combobox')).toBeDefined();
  });

  it('starts with null value', () => {
    const el = create();
    expect((el as any).value).toBeNull();
  });

  it('input has role="combobox", aria-autocomplete="list", and aria-expanded="false"', () => {
    const el = create();
    const input = el.querySelector('ui-input')!;
    // ARIA: combobox wires role and autocomplete on the input
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('value setter updates value', () => {
    const el = create();
    (el as any).value = 'us';
    expect((el as any).value).toBe('us');
  });

  it('value setter with null resets', () => {
    const el = create();
    (el as any).value = 'us';
    (el as any).value = null;
    expect((el as any).value).toBeNull();
  });

  it('disabled property toggles attribute', () => {
    const el = create();
    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled combobox sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('name property reflects to attribute', () => {
    const el = create();
    (el as any).name = 'country';
    expect(el.getAttribute('name')).toBe('country');
  });

  it('store is accessible', () => {
    const el = create();
    expect((el as any).store).toBeDefined();
    expect((el as any).store.value).toBeDefined();
    expect((el as any).store.query).toBeDefined();
    expect((el as any).store.data).toBeDefined();
  });

  it('dispatches ui-change on ui-select event from option', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

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
    const el = create();
    const opt = el.querySelector('ui-option[value="gb"]')!;
    opt.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'gb', label: 'United Kingdom' },
    }));

    expect((el as any).value).toBe('gb');
  });

  it('stops internal ui-change from listbox (stopImmediatePropagation)', () => {
    const el = create();
    const externalHandler = vi.fn();
    el.addEventListener('ui-change', externalHandler);

    const listbox = el.querySelector('ui-listbox')!;
    const internalEvent = new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { value: 'us', label: 'United States' },
    });
    listbox.dispatchEvent(internalEvent);

    expect(externalHandler).not.toHaveBeenCalled();
  });

  it('formResetCallback resets value', () => {
    const el = create();
    (el as any).value = 'us';
    (el as any).formResetCallback();
    expect((el as any).value).toBeNull();
  });

  it('value attribute sets initial value (deferChildren microtask)', async () => {
    const el = create({ value: 'us' });
    await new Promise(r => queueMicrotask(r));
    expect((el as any).value).toBe('us');
  });
});

// ── Data-driven mode tests ──

const testOptions = JSON.stringify([
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
]);

function createDataDriven(attrs: { options?: string; placeholder?: string; value?: string } = {}): HTMLElement {
  const el = document.createElement('ui-combobox');
  el.setAttribute('options', attrs.options ?? testOptions);
  if (attrs.placeholder) el.setAttribute('placeholder', attrs.placeholder);
  if (attrs.value) el.setAttribute('value', attrs.value);
  document.body.appendChild(el);
  return el;
}

describe('ui-combobox data-driven', () => {
  it('stamps ui-input and ui-listbox children', () => {
    const el = createDataDriven();
    expect(el.querySelector('ui-input')).not.toBeNull();
    expect(el.querySelector('ui-listbox')).not.toBeNull();
  });

  it('stamps ui-option elements from options attribute', async () => {
    const el = createDataDriven();
    await new Promise(r => queueMicrotask(r));
    const options = el.querySelectorAll('ui-option');
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute('value')).toBe('us');
    expect(options[1].getAttribute('value')).toBe('gb');
    expect(options[2].getAttribute('value')).toBe('fr');
  });

  it('options property setter reflects to attribute', () => {
    const el = createDataDriven();
    const newOpts = [{ value: 'de', label: 'Germany' }];
    (el as any).options = newOpts;
    expect(el.getAttribute('options')).toBe(JSON.stringify(newOpts));
  });

  it('placeholder attribute sets input placeholder', () => {
    const el = createDataDriven({ placeholder: 'Pick a country' });
    const input = el.querySelector('ui-input');
    expect(input?.getAttribute('placeholder')).toBe('Pick a country');
  });

  it('dispatches ui-change on option selection in data mode', async () => {
    const el = createDataDriven();
    await new Promise(r => queueMicrotask(r));

    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const opt = el.querySelector('ui-option[value="us"]')!;
    opt.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'us', label: 'United States' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('us');
  });

  it('value attribute works in data mode', async () => {
    const el = createDataDriven({ value: 'gb' });
    await new Promise(r => queueMicrotask(r));
    expect((el as any).value).toBe('gb');
  });

  it('src property setter reflects to attribute', () => {
    const el = createDataDriven();
    (el as any).src = '/api/countries';
    expect(el.getAttribute('src')).toBe('/api/countries');
    (el as any).src = null;
    expect(el.hasAttribute('src')).toBe(false);
  });

  it('store options are populated from options attribute', async () => {
    const el = createDataDriven();
    await new Promise(r => queueMicrotask(r));
    expect((el as any).store.data.value).toHaveLength(3);
  });

  it('invalid options JSON logs warning and uses empty array', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createDataDriven({ options: 'not-json' });
    expect((el as any).options).toEqual([]);
    spy.mockRestore();
  });
});
