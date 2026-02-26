// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '../../reactivity/signal.ts';
import { effect } from '../../reactivity/effect.ts';
import { createDisabledEffect } from '../effects.ts';

describe('createDisabledEffect', () => {
  let el: HTMLElement;
  let disabled: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    disabled = signal(false);
  });

  afterEach(() => {
    el.remove();
  });

  it('sets disabled attribute when signal is true', () => {
    const dispose = effect(createDisabledEffect(el, disabled));
    disabled.value = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    dispose();
  });

  it('removes disabled attribute when signal is false', () => {
    disabled.value = true;
    const dispose = effect(createDisabledEffect(el, disabled));
    disabled.value = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    dispose();
  });

  it('sets aria-disabled attribute when disabled', () => {
    const dispose = effect(createDisabledEffect(el, disabled));
    disabled.value = true;
    expect(el.getAttribute('aria-disabled')).toBe('true');
    dispose();
  });

  it('removes aria-disabled attribute when not disabled', () => {
    disabled.value = true;
    const dispose = effect(createDisabledEffect(el, disabled));
    disabled.value = false;
    expect(el.hasAttribute('aria-disabled')).toBe(false);
    dispose();
  });

  it('manages tabindex when option is set', () => {
    const dispose = effect(createDisabledEffect(el, disabled, undefined, { manageTabindex: true }));
    expect(el.getAttribute('tabindex')).toBe('0');
    disabled.value = true;
    expect(el.getAttribute('tabindex')).toBe('-1');
    disabled.value = false;
    expect(el.getAttribute('tabindex')).toBe('0');
    dispose();
  });

  it('does not manage tabindex by default', () => {
    const dispose = effect(createDisabledEffect(el, disabled));
    disabled.value = true;
    expect(el.hasAttribute('tabindex')).toBe(false);
    dispose();
  });

  it('dispatches ui-disabled event on state change (not initial)', () => {
    const events: boolean[] = [];
    el.addEventListener('ui-disabled', ((e: CustomEvent) => {
      events.push(e.detail.disabled);
    }) as EventListener);

    const dispose = effect(createDisabledEffect(el, disabled));
    // Initial run: no event
    expect(events).toEqual([]);

    disabled.value = true;
    expect(events).toEqual([true]);

    disabled.value = false;
    expect(events).toEqual([true, false]);
    dispose();
  });

  it('does not dispatch event when value is unchanged', () => {
    const events: boolean[] = [];
    el.addEventListener('ui-disabled', ((e: CustomEvent) => {
      events.push(e.detail.disabled);
    }) as EventListener);

    disabled.value = true;
    const dispose = effect(createDisabledEffect(el, disabled));
    // Initial run (true) — no event (first run)
    expect(events).toEqual([]);

    // Set to same value
    disabled.value = true;
    // Signal skips notification for same value
    expect(events).toEqual([]);
    dispose();
  });
});
