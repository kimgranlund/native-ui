// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement, define } from '@nonoun/native-core';
import { ValidateController } from './validate-controller.ts';

class ValidateTestEl extends NativeElement {
  disabled = false;
  #ctrl: ValidateController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new ValidateController(this);
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  get valid(): boolean { return this.#ctrl?.valid ?? true; }
  get errorMessage(): string { return this.#ctrl?.errorMessage ?? ''; }

  get validationRules() { return this.#ctrl!.rules; }
  set validationRules(rules) { this.#ctrl!.rules = rules; }

  validate(value?: string): boolean { return this.#ctrl!.validate(value); }
  clearValidation(): void { this.#ctrl!.clearValidation(); }

  static required(message?: string) { return ValidateController.required(message); }
  static minLength(min: number, message?: string) { return ValidateController.minLength(min, message); }
  static maxLength(max: number, message?: string) { return ValidateController.maxLength(max, message); }
  static pattern(regex: RegExp, message?: string) { return ValidateController.pattern(regex, message); }
}

if (!customElements.get('validate-test')) {
  define('validate-test', ValidateTestEl);
}

function create(): ValidateTestEl {
  const el = document.createElement('validate-test') as ValidateTestEl;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Validatable', () => {
  it('starts valid', () => {
    const el = create();
    expect(el.valid).toBe(true);
    expect(el.errorMessage).toBe('');
  });

  it('validate() returns true with no rules', () => {
    const el = create();
    expect(el.validate('anything')).toBe(true);
  });

  it('validate() checks rules in order, first failure wins', () => {
    const el = create();
    el.validationRules = [
      { test: (v) => v.length > 0, message: 'Required' },
      { test: (v) => v.length >= 5, message: 'Too short' },
    ];
    expect(el.validate('')).toBe(false);
    expect(el.errorMessage).toBe('Required');

    expect(el.validate('ab')).toBe(false);
    expect(el.errorMessage).toBe('Too short');

    expect(el.validate('hello')).toBe(true);
    expect(el.errorMessage).toBe('');
  });

  it('sets invalid and aria-invalid attributes on failure', () => {
    const el = create();
    el.validationRules = [{ test: (v) => v.length > 0, message: 'Required' }];
    el.validate('');
    expect(el.hasAttribute('invalid')).toBe(true);
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('removes invalid attributes on success', () => {
    const el = create();
    el.validationRules = [{ test: (v) => v.length > 0, message: 'Required' }];
    el.validate('');
    expect(el.hasAttribute('invalid')).toBe(true);
    el.validate('x');
    expect(el.hasAttribute('invalid')).toBe(false);
    expect(el.hasAttribute('aria-invalid')).toBe(false);
  });

  it('dispatches native:invalid event', () => {
    const el = create();
    el.validationRules = [{ test: (v) => v.length > 0, message: 'Required' }];
    const handler = vi.fn();
    el.addEventListener('native:invalid', handler);
    el.validate('');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.message).toBe('Required');
  });

  it('dispatches native:valid event', () => {
    const el = create();
    el.validationRules = [{ test: (v) => v.length > 0, message: 'Required' }];
    const handler = vi.fn();
    el.addEventListener('native:valid', handler);
    el.validate('ok');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clearValidation resets state', () => {
    const el = create();
    el.validationRules = [{ test: (v) => v.length > 0, message: 'Required' }];
    el.validate('');
    expect(el.valid).toBe(false);
    el.clearValidation();
    expect(el.valid).toBe(true);
    expect(el.errorMessage).toBe('');
    expect(el.hasAttribute('invalid')).toBe(false);
  });

  it('static required() works', () => {
    const rule = ValidateTestEl.required('Name needed');
    expect(rule.test('')).toBe(false);
    expect(rule.test('  ')).toBe(false);
    expect(rule.test('Kim')).toBe(true);
    expect(rule.message).toBe('Name needed');
  });

  it('static minLength() works', () => {
    const rule = ValidateTestEl.minLength(3);
    expect(rule.test('ab')).toBe(false);
    expect(rule.test('abc')).toBe(true);
  });

  it('static maxLength() works', () => {
    const rule = ValidateTestEl.maxLength(5);
    expect(rule.test('hello')).toBe(true);
    expect(rule.test('toolong')).toBe(false);
  });

  it('static pattern() works', () => {
    const rule = ValidateTestEl.pattern(/^\d+$/, 'Numbers only');
    expect(rule.test('123')).toBe(true);
    expect(rule.test('abc')).toBe(false);
    expect(rule.message).toBe('Numbers only');
  });

  it('reads value from child input when no value passed', () => {
    const el = create();
    const input = document.createElement('input');
    input.value = 'from-input';
    el.appendChild(input);
    el.validationRules = [{ test: (v) => v === 'from-input', message: 'Wrong' }];
    expect(el.validate()).toBe(true);
  });
});
