// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../ui-element.ts';
import { signal } from '../../reactivity/signal.ts';
import { define } from '../define.ts';

// Register a test element
class TestElement extends UIElement {
  setupCount = 0;
  teardownCount = 0;
  effects: (() => void)[] = [];

  setup(): void {
    super.setup();
    this.setupCount++;
    for (const fn of this.effects) this.addEffect(fn);
  }

  teardown(): void {
    this.teardownCount++;
    super.teardown();
  }
}
define('test-ui-element', TestElement);

class TestDeferElement extends UIElement {
  deferCalled = false;

  setup(): void {
    super.setup();
    this.deferChildren(() => {
      this.deferCalled = true;
    });
  }
}
define('test-defer-element', TestDeferElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('UIElement — lifecycle', () => {
  it('calls setup() on connectedCallback', () => {
    const el = document.createElement('test-ui-element') as TestElement;
    document.body.appendChild(el);
    expect(el.setupCount).toBe(1);
  });

  it('calls teardown() on disconnectedCallback', () => {
    const el = document.createElement('test-ui-element') as TestElement;
    document.body.appendChild(el);
    el.remove();
    expect(el.teardownCount).toBe(1);
  });

  it('guards against double setup on reconnect without disconnect', () => {
    const el = document.createElement('test-ui-element') as TestElement;
    document.body.appendChild(el);
    // Simulate second connectedCallback without disconnectedCallback
    el.connectedCallback();
    expect(el.setupCount).toBe(1);
  });

  it('allows setup after disconnect + reconnect', () => {
    const el = document.createElement('test-ui-element') as TestElement;
    document.body.appendChild(el);
    el.remove();
    document.body.appendChild(el);
    expect(el.setupCount).toBe(2);
    expect(el.teardownCount).toBe(1);
  });
});

describe('UIElement — addEffect', () => {
  it('runs effect on connect', () => {
    const s = signal(0);
    let effectValue = -1;
    const el = document.createElement('test-ui-element') as TestElement;
    el.effects = [() => { effectValue = s.value; }];
    document.body.appendChild(el);
    expect(effectValue).toBe(0);
  });

  it('effect reacts to signal changes', () => {
    const s = signal(0);
    let effectValue = -1;
    const el = document.createElement('test-ui-element') as TestElement;
    el.effects = [() => { effectValue = s.value; }];
    document.body.appendChild(el);
    s.value = 42;
    expect(effectValue).toBe(42);
  });

  it('disposes effects on disconnect', () => {
    const s = signal(0);
    let effectValue = -1;
    const el = document.createElement('test-ui-element') as TestElement;
    el.effects = [() => { effectValue = s.value; }];
    document.body.appendChild(el);
    el.remove();
    s.value = 99;
    expect(effectValue).toBe(0); // Not updated after disconnect
  });
});

describe('UIElement — deferChildren', () => {
  it('runs immediately when children exist', () => {
    const el = document.createElement('test-defer-element') as TestDeferElement;
    el.innerHTML = '<span>child</span>';
    document.body.appendChild(el);
    expect(el.deferCalled).toBe(true);
  });

  it('defers to microtask when no children', async () => {
    const el = document.createElement('test-defer-element') as TestDeferElement;
    document.body.appendChild(el);
    expect(el.deferCalled).toBe(false);
    await new Promise(resolve => queueMicrotask(resolve));
    expect(el.deferCalled).toBe(true);
  });

  it('does not run deferred fn if disconnected before microtask', async () => {
    const el = document.createElement('test-defer-element') as TestDeferElement;
    document.body.appendChild(el);
    el.remove();
    await new Promise(resolve => queueMicrotask(resolve));
    expect(el.deferCalled).toBe(false);
  });
});

describe('UIElement — attributeChangedCallback', () => {
  it('exists as no-op by default', () => {
    const el = document.createElement('test-ui-element') as TestElement;
    expect(() => el.attributeChangedCallback('foo', null, 'bar')).not.toThrow();
  });
});

describe('UIElement — getTraitController', () => {
  it('returns null when no trait is active', () => {
    const el = document.createElement('test-ui-element') as TestElement;
    document.body.appendChild(el);
    expect(el.getTraitController('pressable')).toBeNull();
  });
});
