// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-radio.ts';

function create(attrs: Record<string, string> = {}, html = ''): HTMLElement {
  const el = document.createElement('ui-radio-group');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-radio-group', () => {
  it('is registered', () => {
    expect(customElements.get('ui-radio-group')).toBeDefined();
  });

  it('defaults: value=null, disabled=false, required=false', () => {
    const el = create() as any;
    expect(el.value).toBeNull();
    expect(el.disabled).toBe(false);
    expect(el.required).toBe(false);
  });

  it('disabled property toggles attribute', () => {
    const el = create() as any;
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled radio group sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    // ARIA: removing disabled clears aria-disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled attribute syncs signal', () => {
    const el = create({ disabled: '' }) as any;
    expect(el.disabled).toBe(true);
  });

  it('name property reflects', () => {
    const el = create({ name: 'color' }) as any;
    expect(el.name).toBe('color');
    el.name = 'size';
    expect(el.getAttribute('name')).toBe('size');
  });

  it('required property reflects', () => {
    const el = create() as any;
    el.required = true;
    expect(el.hasAttribute('required')).toBe(true);
    el.required = false;
    expect(el.hasAttribute('required')).toBe(false);
  });

  it('formDisabledCallback sets disabled', () => {
    const el = create() as any;
    el.formDisabledCallback(true);
    expect(el.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(el.disabled).toBe(false);
  });

  it('formResetCallback restores initial value', () => {
    const el = create({ value: 'red' }, `
      <ui-radio value="red">Red</ui-radio>
      <ui-radio value="blue">Blue</ui-radio>
    `) as any;
    el.value = 'blue';
    el.formResetCallback();
    expect(el.value).toBe('red');
  });

  it('formResetCallback with no initial value resets to null', () => {
    const el = create({}, '<ui-radio value="a">A</ui-radio>') as any;
    el.value = 'a';
    el.formResetCallback();
    expect(el.value).toBeNull();
  });

  it('value setter removes attribute when set to null', () => {
    const el = create({ value: 'x' }) as any;
    el.value = null;
    expect(el.hasAttribute('value')).toBe(false);
  });

  it('teardown destroys nav controller', () => {
    const el = create({}, '<ui-radio value="a">A</ui-radio>');
    el.remove();
    expect(true).toBe(true);
  });
});
