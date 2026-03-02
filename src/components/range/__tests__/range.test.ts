// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../range.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-range');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-range', () => {
  // ── Registration ──

  it('is registered as a custom element', () => {
    expect(customElements.get('n-range')).toBeDefined();
  });

  // ── Setup ──

  it('creates a .n-range-thumb child element on setup', () => {
    const el = create();
    const thumb = el.querySelector('.n-range-thumb');
    expect(thumb).toBeTruthy();
  });

  it('sets tabindex=0 on setup', () => {
    const el = create();
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('sets tabindex=-1 when disabled attribute is present at connect time', () => {
    const el = create({ disabled: '' });
    // createDisabledEffect with manageTabindex:true writes tabindex based on disabled state
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  // ── Defaults ──

  it('defaults value to 50', () => {
    const el = create();
    expect((el as any).value).toBe(50);
  });

  it('defaults min to 0', () => {
    const el = create();
    expect((el as any).min).toBe(0);
  });

  it('defaults max to 100', () => {
    const el = create();
    expect((el as any).max).toBe(100);
  });

  it('defaults step to 1', () => {
    const el = create();
    expect((el as any).step).toBe(1);
  });

  // ── Value getter/setter ──

  it('value getter returns current signal value', () => {
    const el = create({ value: '30' });
    expect((el as any).value).toBe(30);
  });

  it('value setter updates the signal', () => {
    const el = create();
    (el as any).value = 75;
    expect((el as any).value).toBe(75);
  });

  it('value setter replaces a previous value', () => {
    const el = create();
    (el as any).value = 20;
    (el as any).value = 80;
    expect((el as any).value).toBe(80);
  });

  // ── Clamping ──

  it('clamps value to min when set below min', () => {
    const el = create({ min: '10', max: '100' });
    (el as any).value = -5;
    expect((el as any).value).toBe(10);
  });

  it('clamps value to max when set above max', () => {
    const el = create({ min: '0', max: '50' });
    (el as any).value = 200;
    expect((el as any).value).toBe(50);
  });

  it('allows value exactly at min', () => {
    const el = create({ min: '5', max: '95' });
    (el as any).value = 5;
    expect((el as any).value).toBe(5);
  });

  it('allows value exactly at max', () => {
    const el = create({ min: '5', max: '95' });
    (el as any).value = 95;
    expect((el as any).value).toBe(95);
  });

  // ── Step snapping ──

  it('snaps value to nearest step', () => {
    const el = create({ min: '0', max: '100', step: '10' });
    (el as any).value = 23;
    // Nearest step from 0: 20 and 30 — 23 rounds to 20 (round((23-0)/10)*10+0 = 20)
    expect((el as any).value).toBe(20);
  });

  it('snaps value to step rounding up', () => {
    const el = create({ min: '0', max: '100', step: '10' });
    (el as any).value = 27;
    // round((27-0)/10)*10 = round(2.7)*10 = 3*10 = 30
    expect((el as any).value).toBe(30);
  });

  it('does not snap when step is 1 (default)', () => {
    const el = create();
    (el as any).value = 37;
    expect((el as any).value).toBe(37);
  });

  // ── Min property ──

  it('min property setter updates signal', () => {
    const el = create();
    (el as any).min = 10;
    expect((el as any).min).toBe(10);
  });

  it('min attribute sets min signal on connect', () => {
    const el = create({ min: '20' });
    expect((el as any).min).toBe(20);
  });

  // ── Max property ──

  it('max property setter updates signal', () => {
    const el = create();
    (el as any).max = 200;
    expect((el as any).max).toBe(200);
  });

  it('max attribute sets max signal on connect', () => {
    const el = create({ max: '50' });
    expect((el as any).max).toBe(50);
  });

  // ── Step property ──

  it('step property setter updates signal', () => {
    const el = create();
    (el as any).step = 5;
    expect((el as any).step).toBe(5);
  });

  it('step attribute sets step signal on connect', () => {
    const el = create({ step: '0.5' });
    expect((el as any).step).toBe(0.5);
  });

  // ── Disabled ──

  it('disabled property defaults to false', () => {
    const el = create();
    expect((el as any).disabled).toBe(false);
  });

  it('disabled property setter adds the disabled attribute', () => {
    const el = create();
    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
  });

  it('disabled property setter removes the disabled attribute when set to false', () => {
    const el = create({ disabled: '' });
    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('disabled attribute sets disabled signal to true', () => {
    const el = create({ disabled: '' });
    expect((el as any).disabled).toBe(true);
  });

  // ── Keyboard: ArrowRight / ArrowUp ──

  it('ArrowRight increases value by one step', () => {
    const el = create({ value: '50' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(51);
  });

  it('ArrowUp increases value by one step', () => {
    const el = create({ value: '50' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(51);
  });

  // ── Keyboard: ArrowLeft / ArrowDown ──

  it('ArrowLeft decreases value by one step', () => {
    const el = create({ value: '50' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(49);
  });

  it('ArrowDown decreases value by one step', () => {
    const el = create({ value: '50' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(49);
  });

  // ── Keyboard: PageUp / PageDown ──

  it('PageUp increases value by 10 steps', () => {
    const el = create({ value: '50', step: '2' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
    // bigStep = step * 10 = 20
    expect((el as any).value).toBe(70);
  });

  it('PageDown decreases value by 10 steps', () => {
    const el = create({ value: '50', step: '2' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(30);
  });

  // ── Keyboard: Home / End ──

  it('Home sets value to min', () => {
    const el = create({ value: '75', min: '10', max: '100' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(10);
  });

  it('End sets value to max', () => {
    const el = create({ value: '25', min: '0', max: '90' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(90);
  });

  // ── Keyboard: ArrowRight clamps at max ──

  it('ArrowRight clamps value at max', () => {
    const el = create({ value: '100', min: '0', max: '100' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(100);
  });

  it('ArrowLeft clamps value at min', () => {
    // Use min:10 and value:10 — note value="0" would trigger || 50 fallback in attributeChangedCallback
    const el = create({ value: '10', min: '10', max: '100' });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect((el as any).value).toBe(10);
  });

  // ── Keyboard dispatches events ──

  it('keyboard dispatches native:input when value changes', () => {
    const el = create({ value: '50' });
    const handler = vi.fn();
    el.addEventListener('native:input', handler);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 51 });
  });

  it('keyboard dispatches native:change when value changes', () => {
    const el = create({ value: '50' });
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 51 });
  });

  it('keyboard does not dispatch events when value does not change (already at boundary)', () => {
    const el = create({ value: '100', min: '0', max: '100' });
    const inputHandler = vi.fn();
    const changeHandler = vi.fn();
    el.addEventListener('native:input', inputHandler);
    el.addEventListener('native:change', changeHandler);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(inputHandler).not.toHaveBeenCalled();
    expect(changeHandler).not.toHaveBeenCalled();
  });

  // ── Keyboard disabled guard ──

  it('keyboard does nothing when disabled', () => {
    const el = create({ value: '50', disabled: '' });
    const handler = vi.fn();
    el.addEventListener('native:input', handler);
    el.addEventListener('native:change', handler);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));

    expect(handler).not.toHaveBeenCalled();
    expect((el as any).value).toBe(50);
  });

  it('keyboard does not change value when disabled', () => {
    const el = create({ value: '50', disabled: '' });

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect((el as any).value).toBe(50);
  });

  // ── formResetCallback ──

  it('formResetCallback restores value from the value attribute', () => {
    const el = create({ value: '30' });
    (el as any).value = 80;
    expect((el as any).value).toBe(80);

    (el as any).formResetCallback();

    expect((el as any).value).toBe(30);
  });

  it('formResetCallback restores to 50 when no value attribute is set', () => {
    const el = create();
    (el as any).value = 90;

    (el as any).formResetCallback();

    expect((el as any).value).toBe(50);
  });

  it('formResetCallback does not change other properties', () => {
    const el = create({ value: '20', min: '5', max: '200', step: '5' });
    (el as any).value = 100;
    (el as any).formResetCallback();

    expect((el as any).min).toBe(5);
    expect((el as any).max).toBe(200);
    expect((el as any).step).toBe(5);
    expect((el as any).value).toBe(20);
  });

  // ── n-input and native:change bubble ──

  it('native:input event bubbles', () => {
    const el = create({ value: '50' });
    const handler = vi.fn();
    document.body.addEventListener('native:input', handler);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('native:input', handler);
  });

  it('native:change event bubbles', () => {
    const el = create({ value: '50' });
    const handler = vi.fn();
    document.body.addEventListener('native:change', handler);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('native:change', handler);
  });
});
