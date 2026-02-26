// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { prop, syncProp } from '../reactive-prop.ts';

describe('prop — boolean', () => {
  it('starts as false', () => {
    const el = document.createElement('div');
    const p = prop(el, 'disabled', { type: 'boolean' });
    expect(p.value).toBe(false);
  });

  it('set(true) toggles attribute on', () => {
    const el = document.createElement('div');
    const p = prop(el, 'disabled', { type: 'boolean' });
    p.set(true);
    expect(p.value).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
  });

  it('set(false) removes attribute', () => {
    const el = document.createElement('div');
    const p = prop(el, 'disabled', { type: 'boolean' });
    p.set(true);
    p.set(false);
    expect(p.value).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('fromAttribute parses presence', () => {
    const el = document.createElement('div');
    const p = prop(el, 'disabled', { type: 'boolean' });
    p.fromAttribute('');
    expect(p.value).toBe(true);
    p.fromAttribute(null);
    expect(p.value).toBe(false);
  });

  it('exposes underlying signal', () => {
    const el = document.createElement('div');
    const p = prop(el, 'disabled', { type: 'boolean' });
    expect(p.signal).toBeDefined();
    expect(p.signal.value).toBe(false);
  });
});

describe('prop — number', () => {
  it('starts at initial value (default 0)', () => {
    const el = document.createElement('div');
    const p = prop(el, 'count', { type: 'number' });
    expect(p.value).toBe(0);
  });

  it('starts at custom initial value', () => {
    const el = document.createElement('div');
    const p = prop(el, 'count', { type: 'number', initial: 5 });
    expect(p.value).toBe(5);
  });

  it('set updates value and reflects to attribute', () => {
    const el = document.createElement('div');
    const p = prop(el, 'count', { type: 'number' });
    p.set(42);
    expect(p.value).toBe(42);
    expect(el.getAttribute('count')).toBe('42');
  });

  it('fromAttribute parses number', () => {
    const el = document.createElement('div');
    const p = prop(el, 'count', { type: 'number', initial: 5 });
    p.fromAttribute('10');
    expect(p.value).toBe(10);
  });

  it('fromAttribute falls back to initial for invalid input', () => {
    const el = document.createElement('div');
    const p = prop(el, 'count', { type: 'number', initial: 5 });
    p.fromAttribute('abc');
    expect(p.value).toBe(5);
    p.fromAttribute(null);
    expect(p.value).toBe(5);
  });
});

describe('prop — string', () => {
  it('starts at initial value (default "")', () => {
    const el = document.createElement('div');
    const p = prop(el, 'name', { type: 'string' });
    expect(p.value).toBe('');
  });

  it('starts at custom initial value', () => {
    const el = document.createElement('div');
    const p = prop(el, 'variant', { type: 'string', initial: 'default' });
    expect(p.value).toBe('default');
  });

  it('set reflects non-empty to attribute', () => {
    const el = document.createElement('div');
    const p = prop(el, 'name', { type: 'string' });
    p.set('hello');
    expect(p.value).toBe('hello');
    expect(el.getAttribute('name')).toBe('hello');
  });

  it('set removes attribute for empty string', () => {
    const el = document.createElement('div');
    const p = prop(el, 'name', { type: 'string' });
    p.set('hello');
    p.set('');
    expect(p.value).toBe('');
    expect(el.hasAttribute('name')).toBe(false);
  });

  it('fromAttribute updates value', () => {
    const el = document.createElement('div');
    const p = prop(el, 'name', { type: 'string', initial: 'default' });
    p.fromAttribute('test');
    expect(p.value).toBe('test');
    p.fromAttribute(null);
    expect(p.value).toBe('default');
  });

  it('uses custom attribute name when provided', () => {
    const el = document.createElement('div');
    const p = prop(el, 'myProp', { type: 'string', attribute: 'data-value' });
    p.set('hello');
    expect(el.getAttribute('data-value')).toBe('hello');
    expect(el.hasAttribute('myProp')).toBe(false);
  });
});

describe('syncProp', () => {
  it('dispatches to matching prop and returns true', () => {
    const el = document.createElement('div');
    const disabled = prop(el, 'disabled', { type: 'boolean' });
    const result = syncProp({ disabled }, 'disabled', '');
    expect(result).toBe(true);
    expect(disabled.value).toBe(true);
  });

  it('returns false for unmatched name', () => {
    const el = document.createElement('div');
    const disabled = prop(el, 'disabled', { type: 'boolean' });
    const result = syncProp({ disabled }, 'unknown', 'val');
    expect(result).toBe(false);
  });

  it('handles multiple props', () => {
    const el = document.createElement('div');
    const checked = prop(el, 'checked', { type: 'boolean' });
    const disabled = prop(el, 'disabled', { type: 'boolean' });
    const props = { checked, disabled };

    syncProp(props, 'checked', '');
    expect(checked.value).toBe(true);
    expect(disabled.value).toBe(false);

    syncProp(props, 'disabled', '');
    expect(disabled.value).toBe(true);
  });
});
