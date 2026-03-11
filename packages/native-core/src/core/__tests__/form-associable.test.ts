// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { FormAssociable } from '../form-associable.ts';

class Base {
  connectedCallback() {}
}

describe('FormAssociable', () => {
  it('sets static formAssociated = true on the class', () => {
    const Mixed = FormAssociable(Base as any);
    expect((Mixed as any).formAssociated).toBe(true);
  });

  it('provides default no-op onFormDisabled', () => {
    const Mixed = FormAssociable(Base as any);
    const instance = new Mixed();
    // Should not throw
    expect(() => instance.onFormDisabled(true)).not.toThrow();
  });

  it('provides default no-op onFormReset', () => {
    const Mixed = FormAssociable(Base as any);
    const instance = new Mixed();
    expect(() => instance.onFormReset()).not.toThrow();
  });

  it('formDisabledCallback delegates to onFormDisabled', () => {
    const Mixed = FormAssociable(Base as any);
    const instance = new Mixed();
    let received: boolean | undefined;
    instance.onFormDisabled = (d: boolean) => { received = d; };
    instance.formDisabledCallback(true);
    expect(received).toBe(true);
  });

  it('formResetCallback delegates to onFormReset', () => {
    const Mixed = FormAssociable(Base as any);
    const instance = new Mixed();
    let called = false;
    instance.onFormReset = () => { called = true; };
    instance.formResetCallback();
    expect(called).toBe(true);
  });

  it('allows subclass override of onFormDisabled', () => {
    const Mixed = FormAssociable(Base as any);
    class Sub extends Mixed {
      disabledValue: boolean | null = null;
      override onFormDisabled(disabled: boolean) {
        this.disabledValue = disabled;
      }
    }
    const instance = new Sub();
    instance.formDisabledCallback(false);
    expect(instance.disabledValue).toBe(false);
  });
});
